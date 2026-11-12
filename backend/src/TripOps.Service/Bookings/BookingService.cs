using static TripOps.Service.Bookings.BookingBilling;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Data.Repositories;
using TripOps.Service.Accounts;
using Microsoft.Extensions.Hosting;
using System.Text.Json;
using TripOps.Service.Payments;

namespace TripOps.Service.Bookings;

public sealed partial class BookingService(BookingRepository repository, AccountService accounts,
    PayOsGateway payOs, PaymentClock clock, PayOsPayoutGateway payouts, IHostEnvironment environment,
    TripOps.Service.Notifications.EmailSender email, BookingQuotationService quotations, TripOps.Service.Tours.TourService tourService)
{
    // Dùng trong phần partial BookingPayments.cs (tham số primary constructor chỉ có phạm vi trong file này).
    private BookingQuotationService quotationsForPayment => quotations;
    private BookingRepository Repo => repository;
    private PayOsGateway PayOs => payOs;
    private PayOsPayoutGateway Payouts => payouts;
    private AccountService Accounts => accounts;
    private IHostEnvironment Env => environment;
    private TripOps.Service.Notifications.EmailSender Email => email;
    /// <summary>Giờ hiện tại (UTC) cho nghiệp vụ thanh toán — test thay được để cố định thời điểm duyệt/quá hạn.</summary>
    private DateTime UtcNow => clock.UtcNow;

    private static decimal Money(decimal value) => decimal.Round(value, 0, MidpointRounding.AwayFromZero);

    public async Task<BookingDto> Create(string customerId, CreateBookingRequest request, CancellationToken ct)
    {
        var customer = await accounts.Current(customerId, ct);
        if (customer.Status != UserStatus.Active)
            throw new BookingException(403, "Tài khoản khách hàng không hợp lệ hoặc đã bị khóa.");

        await using var transaction = await repository.BeginCreate(ct);
        var tour = await repository.FindBookableTour(request.TourId, customerId, ct);
        if (tour is null)
            throw new BookingException(404, "Tour không tồn tại hoặc chưa được công bố mở bán.");

        if (!await repository.CanStartDesignBooking(tour, customerId, ct, request.TourVersion, request.TourRevision))
            throw new BookingException(409, "Phương án đã thay đổi hoặc yêu cầu đã có booking. Vui lòng tải lại phương án đang chia sẻ.");

        tour = await tourService.BookingSnapshot(tour, ct, request.TourVersion);

        if (request.Participants.Length == 0)
            throw new BookingException(400, "Cần có ít nhất một hành khách trong đơn đặt.");

        if (tour.MinGuests.HasValue && request.Participants.Length < tour.MinGuests.Value)
            throw new BookingException(422, $"Số lượng khách tối thiểu cho tour này là {tour.MinGuests.Value} người.");

        if (tour.MaxGuests.HasValue && request.Participants.Length > tour.MaxGuests.Value)
            throw new BookingException(422, $"Số lượng khách tối đa cho tour này là {tour.MaxGuests.Value} người.");

        if (request.StartDate.Date < DateTime.UtcNow.Date)
            throw new BookingException(422, "Ngày khởi hành phải từ hôm nay trở đi.");

        static string Clean(string value) => System.Text.RegularExpressions.Regex.Replace(value.Trim(), @"\s*\(\d+★\)\s*$", "");
        var hotelSelections = new Dictionary<string,TourAccommodation>(StringComparer.OrdinalIgnoreCase);
        var mealSelections = new Dictionary<(int,string),TourMeal>();
        decimal extra = 0;
        foreach (var choice in request.HotelChoices ?? []) {
            if (hotelSelections.ContainsKey(choice.Destination)) throw new BookingException(422,"Duplicate hotel selection.");
            var option = tour.Accommodations.FirstOrDefault(h => h.DestinationName.Equals(choice.Destination,StringComparison.OrdinalIgnoreCase) && (choice.ServiceId.HasValue ? h.ServiceId == choice.ServiceId : h.HotelName.Equals(Clean(choice.Name),StringComparison.OrdinalIgnoreCase)));
            if (option is null) throw new BookingException(422,"Khách sạn phải thuộc phương án Agency đã cấu hình.");
            hotelSelections[choice.Destination] = option; extra += option.PriceDifference ?? 0;
        }
        foreach (var choice in request.MealChoices ?? []) {
            var key = (choice.DayNumber,choice.MealType);
            if (mealSelections.ContainsKey(key)) throw new BookingException(422,"Duplicate meal selection.");
            var option = tour.Timelines.FirstOrDefault(d => d.DayNumber == choice.DayNumber)?.Meals.FirstOrDefault(m => m.MealType == choice.MealType && (choice.ServiceId.HasValue ? m.ServiceId == choice.ServiceId : m.RestaurantName.Equals(Clean(choice.Name),StringComparison.OrdinalIgnoreCase)));
            if (option is null) throw new BookingException(422,"Bữa ăn phải thuộc phương án Agency đã cấu hình.");
            mealSelections[key]=option;extra+=option.PriceDifference;
        }
        var selectedServiceIds = tour.Accommodations.Where(h=>h.IsDefault==true).Select(h=>hotelSelections.GetValueOrDefault(h.DestinationName,h).ServiceId)
            .Concat(tour.Timelines.SelectMany(d=>d.Meals.Where(m=>m.IsDefault).Select(m=>mealSelections.GetValueOrDefault((d.DayNumber,m.MealType),m).ServiceId)))
            .Where(id=>id.HasValue).Select(id=>id!.Value).Distinct().ToArray();
        if(await repository.EligibleServiceCount(selectedServiceIds,ct)!=selectedServiceIds.Length)throw new BookingException(422,"Dịch vụ Provider trong phương án đã ngừng hoạt động; vui lòng liên hệ Agency.");
        // Tính toán tổng tiền theo pricing tiers hoặc base price
        var tiers = tour.PricingTiers.ToDictionary(t => t.Id);
        decimal totalAmount = 0;
        var participants = new List<BookingParticipant>();

        foreach (var p in request.Participants)
        {
            decimal price = tour.BasePrice ?? 0;
            string? tierName = null;
            int? age = null;
            if (p.DateOfBirth.HasValue)
            {
                var birth = p.DateOfBirth.Value.Date;
                if (birth > request.StartDate.Date)
                    throw new BookingException(422, "Ngày sinh không được sau ngày khởi hành.");
                age = request.StartDate.Year - birth.Year;
                if (birth.AddYears(age.Value) > request.StartDate.Date) age--;
            }
            if (p.PricingTierId.HasValue)
            {
                if (!tiers.TryGetValue(p.PricingTierId.Value, out var tier))
                    throw new BookingException(422, "Nhóm giá không thuộc tour đang đặt.");
                if (age.HasValue && ((tier.MinAge.HasValue && age < tier.MinAge) || (tier.MaxAge.HasValue && age > tier.MaxAge)))
                    throw new BookingException(422, "Nhóm giá không phù hợp với tuổi hành khách.");
                price = tier.PricePerGuest ?? 0;
                tierName = tier.Name;
            }
            else if (age.HasValue)
            {
                var tier = tour.PricingTiers.OrderBy(t => t.DisplayOrder).FirstOrDefault(t =>
                    (!t.MinAge.HasValue || age >= t.MinAge) && (!t.MaxAge.HasValue || age <= t.MaxAge));
                if (tier is not null) { price = tier.PricePerGuest ?? 0; tierName = tier.Name; }
            }

            price = Money(price + extra);
            if(price<0)throw new BookingException(422,"Giá khách sau phụ thu không hợp lệ.");
            totalAmount += price;

            participants.Add(new BookingParticipant
            {
                AgencyId = tour.AgencyId ?? throw new BookingException(422, "Tour requires an Agency."),
                ParticipantIndex = participants.Count + 1,
                IsPrimary = true,
                TierName = tierName,
                Price = Money(price),
                RoommateNote = p.RoommateNote, RestaurantNote = p.RestaurantNote,
                FullName = p.FullName.Trim(),
                PhoneNumber = string.IsNullOrWhiteSpace(p.PhoneNumber) ? null : p.PhoneNumber.Trim(),
                Note = p.Note?.Trim(),
                DateOfBirth = p.DateOfBirth,
                Gender = p.Gender?.Trim(),
                IdentityNumber = p.IdentityNumber?.Trim(),
                AttendanceStatus = AttendanceStatus.Pending,
                Status = "ACTIVE"
            });
        }

        totalAmount = Money(totalAmount);
        // Không tạo khoản thu lúc đặt tour: đợt cọc chỉ mở sau khi Agency duyệt đơn (xem Decide).

        var code = $"BK{DateTime.UtcNow:yyMMddHHmmss}{Random.Shared.Next(100, 999)}";


        var stayOffsets=new Dictionary<TourAccommodation,int>();
        var stayOffset=0;
        foreach(var stay in tour.Accommodations.Where(h=>h.IsDefault==true)) {stayOffsets[stay]=stayOffset;stayOffset+=stay.NightsCount??0;}

        var booking = new Booking
        {
            BookingCode = code,
            CustomerId = customerId,
            TourId = tour.Id,
            TourVersion = tour.Version ?? 1,
            TourConfigurationData = System.Text.Json.JsonSerializer.Serialize(tourService.CurrentConfiguration(tour), new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)),
            DesignRequestId = tour.DesignRequestId,
            StartDate = request.StartDate.Date,
            TotalAmount = totalAmount,
            OriginalTotalPrice = totalAmount - extra*participants.Count,
            HasCustomization = hotelSelections.Count>0 || mealSelections.Count>0,
            Status = BookingStatus.Pending,
            PaymentStatus = PaymentStatus.Unpaid,
            ContactName = request.ContactName.Trim(),
            ContactPhone = request.ContactPhone.Trim(),
            ContactEmail = request.ContactEmail.Trim().ToLowerInvariant(),
            SpecialRequests = request.SpecialRequests?.Trim(),
            Participants = participants,
            BookingAgencies = await tourService.BookingAllocations(tour,participants,request.StartDate.Date,totalAmount,request.Participants.Select(p=>p.PricingTierId).ToArray(),ct),
            Timelines = Enumerable.Range(1, Math.Max(1, tour.DurationDays ?? 1)).Select(number => {
                var day = tour.Timelines.SingleOrDefault(d => d.DayNumber == number);
                return new BookingTimeline {
                    DayNumber = number, Title = day?.Title ?? $"Ngày {number}", Description = day?.Description,
                    Attractions = (day?.Attractions ?? []).Select(a => new BookingTimelineAttraction {
                        AgencyId = a.AgencyId ?? tour.AgencyId, OriginalLocationName = a.Name ?? "", CurrentLocationName = a.Name ?? "", Time = a.Time.HasValue ? request.StartDate.Date.AddDays(number-1).Add(a.Time.Value.TimeOfDay) : null }).ToList(),
                    Meals = (day?.Meals ?? []).Where(m => m.IsDefault == true).Select(m => new BookingTimelineMeal {
                        AgencyId = m.AgencyId ?? tour.AgencyId, MealType = m.MealType, OriginalRestaurantName = mealSelections.TryGetValue((number,m.MealType),out var bookedMeal) ? bookedMeal.RestaurantName : m.RestaurantName,
                        CurrentRestaurantName = mealSelections.TryGetValue((number,m.MealType),out var chosenMeal) ? chosenMeal.RestaurantName : m.RestaurantName,
                        IsCustomized = mealSelections.ContainsKey((number,m.MealType)),
                        PriceDifference = mealSelections.TryGetValue((number,m.MealType),out var mealOption) ? mealOption.PriceDifference : 0,
                        ServiceId = mealSelections.TryGetValue((number,m.MealType),out var selectedMeal) ? selectedMeal.ServiceId : m.ServiceId, DateService = request.StartDate.Date.AddDays(number-1), Time = m.Time.HasValue ? request.StartDate.Date.AddDays(number-1).Add(m.Time.Value.TimeOfDay) : null }).ToList()
                };
            }).ToList(),
            Accommodations = tour.Accommodations.Where(a => a.IsDefault == true).Select(a => new BookingAccommodation {
                AgencyId = a.AgencyId ?? tour.AgencyId, CurrentHotelName = hotelSelections.TryGetValue(a.DestinationName,out var chosenHotel) ? chosenHotel.HotelName : a.HotelName,
                CurrentStars = hotelSelections.TryGetValue(a.DestinationName,out var starsHotel) ? starsHotel.StarRating : a.StarRating,
                IsCustomized = hotelSelections.ContainsKey(a.DestinationName),
                PriceDifference = hotelSelections.TryGetValue(a.DestinationName,out var priceHotel) ? priceHotel.PriceDifference : 0,
                ServiceId = hotelSelections.TryGetValue(a.DestinationName,out var selectedHotel) ? selectedHotel.ServiceId : a.ServiceId, DateFrom = request.StartDate.Date.AddDays(stayOffsets[a]), DateTo = request.StartDate.Date.AddDays(stayOffsets[a]+(a.NightsCount ?? 1)), Destination = a.DestinationName, OriginalHotelName = hotelSelections.TryGetValue(a.DestinationName,out var bookedHotel) ? bookedHotel.HotelName : a.HotelName, OriginalStars = hotelSelections.TryGetValue(a.DestinationName,out var bookedStars) ? bookedStars.StarRating : a.StarRating,
                NightsCount = a.NightsCount }).ToList()
        };

        await quotations.InitializeAllianceRoster(booking,ct);
        await repository.MarkDesignBooked(booking.DesignRequestId,ct);
        repository.Add(booking);
        await repository.SaveChangesAsync(ct);

        await quotations.Initialize(booking.Id, ct, tour);
        await quotations.NotifyAllianceBooking(booking,ct);
        await transaction.CommitAsync(ct);

        return await Get(customerId,booking.Id,ct);
    }

    public async Task<BookingDto> Get(string actorId, int id, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var user = await accounts.Current(actorId, ct);

        bool isOwner = booking.CustomerId == actorId;
        bool isAgency = BookingAlliance.IsMember(booking,actorId);
        bool isGuide = booking.AssignedGuides.Any(ag => ag.GuideId == actorId);
        bool isAdmin = user.Role == UserRole.Admin;

        if (!isOwner && !isAgency && !isGuide && !isAdmin)
            throw new BookingException(403, "Bạn không có quyền xem thông tin đơn đặt này.");

        var snapshots = await quotations.SelectionSnapshots(id, ct);
        var dto=await quotations.AllianceDetails(booking,ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name, snapshots),isAgency||isAdmin,ct);
        if(isAgency && booking.Tour!.AgencyId!=actorId && !isAdmin)
            return BookingAlliance.PartnerView(booking,dto,actorId);
        if(isGuide && !isAgency && !isAdmin) {
            var ownAgency=booking.AssignedGuides.Single(a=>a.GuideId==actorId).AgencyId;
            dto=dto with {Participants=dto.Participants.Where(p=>p.AgencyId==ownAgency).ToArray(),TotalGuests=BookingAlliance.GuestCount(booking,ownAgency),
                CanRecordAttendance=GuideBookingRules.CanRecordAttendance(booking,ownAgency,UtcNow),
                AttendanceDate=GuideBookingRules.AttendanceDate(booking,ownAgency)};
        } else if(isOwner && !isAgency && !isAdmin) {
            dto=dto with {Participants=dto.Participants.GroupBy(p=>p.ParticipantIndex).Select(g=> {
                var active=g.Where(p=>p.Status!="INACTIVE").ToArray();var first=active.FirstOrDefault()??g.First();
                return first with {Price=active.Sum(p=>p.Price??0),IsPrimary=true,Status=active.Length>0?"ACTIVE":"INACTIVE"};
            }).ToArray()};
        }
        return dto;
    }

    public async Task<BookingPage<BookingListItem>> ListForCustomer(
        string customerId, string? statusStr, int page, int pageSize, CancellationToken ct)
    {
        BookingStatus? status = null;
        if (!string.IsNullOrWhiteSpace(statusStr) && Enum.TryParse<BookingStatus>(statusStr, true, out var s))
            status = s;

        var (rows, total) = await repository.ListForCustomer(customerId, status, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
        var items = rows.Select(b => new BookingListItem(
            b.Id, b.BookingCode, b.Tour?.Name, b.Customer?.Name, b.ContactPhone,
            b.StartDate, TotalGuests(b), b.TotalAmount, PaidAmount(b),
            b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(), b.CreatedAt ?? DateTime.UnixEpoch)).ToList();

        return new BookingPage<BookingListItem>(items, total, page, pageSize);
    }

    public async Task<BookingPage<BookingListItem>> ListForAgency(
        string agencyId, string? statusStr, string? search, int page, int pageSize, CancellationToken ct)
    {
        await accounts.Current(agencyId, ct);
        BookingStatus? status = null;
        if (!string.IsNullOrWhiteSpace(statusStr) && Enum.TryParse<BookingStatus>(statusStr, true, out var s))
            status = s;

        var (rows, total) = await repository.ListForAgency(agencyId, status, search, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
        var items = rows.Select(b => new BookingListItem(
            b.Id, b.BookingCode, b.Tour?.Name, b.Customer?.Name, b.ContactPhone,
            b.StartDate, b.Tour!.AgencyId==agencyId?TotalGuests(b):BookingAlliance.GuestCount(b,agencyId),
            b.Tour.AgencyId==agencyId?b.TotalAmount:b.BookingAgencies.Single(a=>a.AgencyId==agencyId).FinalAmount,
            b.Tour.AgencyId==agencyId?PaidAmount(b):0,
            b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(), b.CreatedAt ?? DateTime.UnixEpoch)).ToList();

        return new BookingPage<BookingListItem>(items, total, page, pageSize);
    }

    public async Task<BookingDto> Decide(string agencyId, int id, BookingDecisionRequest request, CancellationToken ct)
    {
        await using var transaction = await repository.BeginPaymentChange(id, ct);
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId)
            throw new BookingException(403, "Chỉ Agency sở hữu tour mới có quyền duyệt đơn này.");

        // Duyệt lặp (bấm 2 lần, gửi lại request): trả kết quả hiện tại, không tạo khoản cọc mới, không gia hạn.
        if (request.Decision == "approve" && booking.Status == BookingStatus.Confirmed && ActiveRequest(booking, DepositStage) is not null)
        {
            await transaction.CommitAsync(ct);
            return await Get(agencyId,id,ct);
        }

        if (booking.Status is not (BookingStatus.Pending or BookingStatus.Deposited))
            throw new BookingException(422, $"Không thể duyệt đơn đặt đang ở trạng thái {booking.Status}.");

        if (request.Decision == "approve")
        {
            await quotations.RequireCurrentPlan(booking.Id, ct);
            foreach(var allocation in booking.BookingAgencies)allocation.OriginalAmount=allocation.FinalAmount;
            booking.Status = BookingStatus.Confirmed;
            // Mở Đợt 1 – đặt cọc 50%, hạn = thời điểm duyệt + 24 giờ; Đợt 2 – phần còn lại, hạn = trước khởi hành 1 tuần.
            // Tour sát ngày (hạn Đợt 2 không sau hạn cọc): chỉ một khoản thu 100%, hạn = duyệt + 24 giờ.
            var first = EnsureDepositRequest(booking, agencyId, UtcNow);
            // Lập hợp đồng phiên bản 1 với giá đã chốt; khách ký rồi mới thanh toán.
            EnsureContract(booking, UtcNow);
            if (!IsFullPayment(booking, first))
                EnsureBalanceRequest(booking, agencyId, UtcNow);
        }
        else if (request.Decision == "reject")
        {
            booking.Status = BookingStatus.Rejected;
            booking.CancelReason = request.Reason?.Trim();
            if (!string.IsNullOrWhiteSpace(request.Reason))
                booking.SpecialRequests = $"{booking.SpecialRequests} [Lý do từ chối: {request.Reason}]".Trim();
            CloseOpenRequests(booking);
        }

        await repository.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await Get(agencyId,id,ct);
    }

    // Deposit / VNPAY / lịch thanh toán: xem BookingPayments.cs.

    public async Task<BookingDto> Cancel(string customerId, int id, BookingCancellationRequest request, CancellationToken ct)
    {
        // Khóa đơn để không hủy chen giữa lúc VNPAY đang báo kết quả thanh toán.
        await using var transaction = await repository.BeginPaymentChange(id, ct);
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");

        if (booking.Status is BookingStatus.Cancelled or BookingStatus.Rejected or BookingStatus.Completed or BookingStatus.InProgress)
            throw new BookingException(422, $"Không thể hủy đơn đặt đang ở trạng thái {booking.Status}.");
        // Đơn đã có tiền: không hủy thẳng. Hủy kèm hoàn tiền phải do Admin xem xét (quy trình hoàn tiền riêng).
        if (PaidAmount(booking) > 0)
            throw new BookingException(409, "Đơn đã có khoản thanh toán nên không thể tự hủy. Vui lòng gửi yêu cầu hoàn tiền/hủy để Admin xem xét.");
        if (HasOpenGatewayPayment(booking, UtcNow))
            throw new BookingException(409, "Đơn đang có link thanh toán payOS còn hiệu lực. Vui lòng chờ link hết hạn hoặc bấm \"Kiểm tra thanh toán\" trước khi hủy.");

        CloseOpenRequests(booking);

        booking.Status = BookingStatus.Cancelled;
        booking.CancelReason = request.Reason.Trim();
        booking.CancelledAt = DateTime.UtcNow;
        booking.SpecialRequests = $"{booking.SpecialRequests} [Khách hủy: {request.Reason}]".Trim();

        await repository.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await Get(customerId,id,ct);
    }

    // WF06: Phân công Hướng dẫn viên
    public async Task<BookingDto> AssignGuide(string agencyId, int id, GuideAssignmentRequest request, CancellationToken ct)
    {
        await using var transaction = await repository.BeginGuideAssignment(ct);
        await repository.LockGuide(request.GuideId, ct);
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (!BookingAlliance.IsMember(booking,agencyId))
            throw new BookingException(403, "Agency không thuộc booking này.");

        var guide = await repository.FindUser(request.GuideId, ct);
        if (guide is null || guide.Role != UserRole.TourGuide || guide.Status != UserStatus.Active || guide.AgencyId != agencyId)
            throw new BookingException(404, "Hướng dẫn viên không tồn tại hoặc đã bị vô hiệu hóa.");

        if (booking.Status is not (BookingStatus.Confirmed or BookingStatus.Paid or BookingStatus.InProgress))
            throw new BookingException(422, "Chỉ phân công hướng dẫn viên cho đơn đã được Agency xác nhận.");

        if (await repository.GuideHasConflict(request.GuideId, id, booking.StartDate, EndDate(booking), ct))
            throw new BookingException(409, "HDV đã được phân công cho chuyến khác trùng thời gian.");

        var existing = booking.AssignedGuides.FirstOrDefault(ag => ag.GuideId == request.GuideId);
        if (existing is null)
        {
            booking.AssignedGuides.Add(new BookingAssignedGuide
            {
                BookingId = id,
                GuideId = request.GuideId,
                AgencyId = agencyId,
                AssignedAt = DateTime.UtcNow,
                Role = request.Role ?? "Lead",
                    Notes = request.Notes
            });
        }
        else
        {
            existing.AgencyId = agencyId;
            existing.AssignedAt ??= DateTime.UtcNow;
            existing.Role = request.Role ?? existing.Role;
            existing.Notes = request.Notes ?? existing.Notes;
        }

        foreach(var p in booking.Participants.Where(p=>p.AgencyId==agencyId && p.Status!="INACTIVE" && p.AssignedGuideId==null))p.AssignedGuideId=request.GuideId;
        await repository.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await Get(agencyId,id,ct);
    }

    // WF06: Guide xem danh sách tour được giao
    public async Task<IReadOnlyList<AvailableGuideDto>> AvailableGuides(string agencyId, CancellationToken ct) =>
        (await repository.AvailableGuides(agencyId,ct)).Select(g => new AvailableGuideDto(g.Id, g.Name, g.Phone)).ToList();

    // Tour media is stored as JSON arrays. Prefer the explicit thumbnail, then
    // use the first valid gallery image (older tours may lack ThumbnailUrls).
    // Uploaded images use public /api/v1/files/tours/... paths; others are HTTPS.
    private static string? TourThumbnail(Tour? tour)
    {
        if (tour is null) return null;
        foreach (var json in new[] { tour.ThumbnailUrls, tour.Images })
        {
            if (string.IsNullOrWhiteSpace(json)) continue;
            try
            {
                foreach (var url in JsonSerializer.Deserialize<string[]>(json) ?? [])
                {
                    var candidate = url?.Trim();
                    if (string.IsNullOrWhiteSpace(candidate) || candidate.Length > 2048) continue;
                    if (candidate.StartsWith("/api/v1/files/tours/", StringComparison.Ordinal) ||
                        Uri.TryCreate(candidate, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps)
                        return candidate;
                }
            }
            catch (JsonException) { /* Ignore malformed legacy media and try Images. */ }
        }
        return null;
    }

    public async Task<BookingPage<BookingListItem>> ListForGuide(string guideId, int page, int pageSize, CancellationToken ct)
    {
        var (rows, total) = await repository.ListForGuide(guideId, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
        var items = rows.Select(b => new BookingListItem(
            b.Id, b.BookingCode, b.Tour?.Name, b.Customer?.Name, b.ContactPhone,
            b.StartDate, BookingAlliance.GuestCount(b,b.AssignedGuides.Single(g=>g.GuideId==guideId).AgencyId), b.TotalAmount, PaidAmount(b),
            b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(), b.CreatedAt ?? DateTime.UnixEpoch, TourThumbnail(b.Tour))).ToList();

        return new BookingPage<BookingListItem>(items, total, page, pageSize);
    }

    // WF06: Điểm danh hành khách
    public async Task<ParticipantDto> RecordAttendance(string guideId, int bookingId, AttendanceCheckinRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (!booking.AssignedGuides.Any(ag => ag.GuideId == guideId))
            throw new BookingException(403, "Chỉ Hướng dẫn viên được phân công cho chuyến này mới có quyền điểm danh.");

        var guideAgency = booking.AssignedGuides.Single(g => g.GuideId == guideId).AgencyId;
        var participant = booking.Participants.FirstOrDefault(p => p.Id == request.ParticipantId)
            ?? throw new BookingException(404, "Không tìm thấy hành khách trong danh sách đoàn.");

        if(participant.AgencyId!=booking.AssignedGuides.Single(g=>g.GuideId==guideId).AgencyId || participant.Status=="INACTIVE")throw new BookingException(403,"HDV chỉ điểm danh hành khách đang tham gia chặng của công ty mình.");
        if (!GuideBookingRules.CanRecordAttendance(booking, guideAgency, UtcNow))
            throw new BookingException(409, "Chỉ được điểm danh vào ngày khởi hành hoặc ngày bắt đầu chặng được phân công.");
        if (Enum.TryParse<AttendanceStatus>(request.Status, true, out var status))
            participant.AttendanceStatus = status;
        else
            throw new BookingException(400, "Trạng thái điểm danh không hợp lệ.");

        participant.CheckedBy = guideId;
        participant.CheckedAt = DateTime.UtcNow;
        await repository.SaveChangesAsync(ct);

        return Participant(participant);
    }

    // WF06: Báo cáo sự cố
    public async Task<IncidentDto> ReportIncident(string guideId, int bookingId, ReportIncidentRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (!booking.AssignedGuides.Any(ag => ag.GuideId == guideId))
            throw new BookingException(403, "Chỉ Hướng dẫn viên được phân công cho chuyến này mới có quyền báo sự cố.");

        var incident = new BookingIncident
        {
            BookingId = bookingId,
            AgencyId = booking.AssignedGuides.Single(g=>g.GuideId==guideId).AgencyId,
            IncidentType = request.IncidentType.Trim(),
            Title = string.IsNullOrWhiteSpace(request.IncidentType) ? request.Title.Trim() : $"[{request.IncidentType.Trim()}] {request.Title.Trim()}",
            Description = IncidentDescription(request.Description, request.Severity),
            Status = IncidentStatus.Reported,
            ReportedBy = guideId
        };

        repository.AddIncident(incident);
        await repository.SaveChangesAsync(ct);

        return new IncidentDto(
            incident.Id, incident.BookingId,
            incident.Title, incident.Description, Severity(incident.Description),
            incident.Status.GetValueOrDefault(IncidentStatus.Reported).ToString(), incident.CreatedAt ?? DateTime.UnixEpoch);
    }

    private BookingDto ToDto(Booking b, string? tourName, string? agencyId, string? agencyName,
        Dictionary<string, TripOps.Service.Tours.SupplierSnapshotInput>? snapshots = null) =>
        new(b.Id, b.BookingCode, b.CustomerId ?? "", b.Customer?.Name ?? "",
            b.TourId, tourName, agencyId, agencyName,
            b.StartDate, EndDate(b), TotalGuests(b), b.TotalAmount,
            DisplayDeposit(b), PaidAmount(b), b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(),
            b.ContactName, b.ContactPhone, b.ContactEmail, b.SpecialRequests,
            b.Participants.OrderBy(p => p.ParticipantIndex).Select(Participant).ToList(),
            b.AssignedGuides.Select(ag => new AssignedGuideDto(
                ag.Id, ag.GuideId, ag.Guide?.Name ?? "", ag.Guide?.Phone,
                ag.Role, "ASSIGNED", ag.Notes, ag.AssignedAt, ag.AgencyId)).ToList(),
            b.CreatedAt ?? DateTime.UnixEpoch, b.UpdatedAt,
            b.Incidents.OrderByDescending(i => i.CreatedAt).Select(i => new IncidentDto(
                i.Id, i.BookingId, i.Title, i.Description, Severity(i.Description), i.Status.GetValueOrDefault(IncidentStatus.Reported).ToString(), i.CreatedAt ?? DateTime.UnixEpoch)).ToList(),
            b.Timelines.OrderBy(t=>t.DayNumber).Select(t=>new BookingDayDto(t.Id,t.DayNumber,t.Title,t.Description,
                t.Attractions.Select(a=>new BookingLocationDto(a.Id,a.CurrentLocationName??a.OriginalLocationName,a.Time,a.AttendanceStatus,a.OriginalLocationName,a.CustomerNote,a.AgencyId)).ToList(),
                t.Meals.Select(m=>new BookingMealDto(m.Id,m.MealType,m.CurrentRestaurantName??m.OriginalRestaurantName,m.DateService,m.Time,m.ServiceId,m.PriceDifference??0,
                    SupplierOf(snapshots, $"meal:{m.Id}"),m.OriginalRestaurantName,m.AgencyId)).ToList())).ToList(),
            b.Accommodations.Select(h=>new BookingHotelDto(h.Id,h.Destination,h.CurrentHotelName??h.OriginalHotelName,h.CurrentStars??h.OriginalStars,h.NightsCount,h.ServiceId,h.PriceDifference??0,
                SupplierOf(snapshots, $"hotel:{h.Id}"),h.OriginalHotelName,h.AgencyId,h.DateFrom,h.DateTo)).ToList(),
            Schedule(b), Transactions(b), Cancellation(b), ContractOf(b), b.OriginalTotalPrice,
            b.PriceAdjustments.OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.Id).Select(a => new BookingPriceAdjustmentDto(a.Id,
                a.Adjuster?.Name ?? a.AdjustedBy, a.PreviousTotalPrice, a.Amount, a.NewTotalPrice, a.Reason, a.CreatedAt,a.AgencyId)).ToList(), BaseTourAmount(b), SurchargeTotal(b), HasBeenApproved(b), CanRecordAttendance: b.StartDate.Date == PaymentRules.VietnamDate(UtcNow));

    private static BookingSupplierDto? SupplierOf(Dictionary<string, TripOps.Service.Tours.SupplierSnapshotInput>? snapshots, string slot) =>
        snapshots?.GetValueOrDefault(slot) is { } s ? new BookingSupplierDto(s.Address, s.ContactPhone) : null;

    private static ParticipantDto Participant(BookingParticipant p) => new(p.Id, p.FullName, p.PhoneNumber,
        p.DateOfBirth, p.Gender, p.IdentityNumber, p.AttendanceStatus.GetValueOrDefault(AttendanceStatus.Pending).ToString(),
        p.Status ?? "ACTIVE", p.AssignedGuide?.Name, p.Price, p.TierName, p.AgencyId, p.ParticipantIndex, p.IsPrimary, p.Note, p.RoommateNote, p.RestaurantNote, p.CheckedBy, p.CheckedAt, p.AssignedGuideId);
    private static int TotalGuests(Booking booking) => BookingAlliance.GuestCount(booking);
    private static decimal PaidAmount(Booking booking) => BookingBilling.NetPaidAmount(booking);
    private static DateTime EndDate(Booking booking) => booking.StartDate.AddDays(Math.Max(1,
        booking.Timelines.Select(t => t.DayNumber).DefaultIfEmpty(booking.Tour?.DurationDays ?? 1).Max()) - 1);
    private static string IncidentDescription(string description, string? severity) => string.IsNullOrWhiteSpace(severity)
        ? description.Trim() : $"{description.Trim()}\nMức độ: {severity.Trim()}";
    private static string? Severity(string? description) => string.IsNullOrWhiteSpace(description) ? null
        : System.Text.RegularExpressions.Regex.Match(description, @"(?:^|\n)Mức độ: ([^\r\n]+)") is { Success: true } match ? match.Groups[1].Value : null;
}
