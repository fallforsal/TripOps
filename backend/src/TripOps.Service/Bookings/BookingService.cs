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
    TripOps.Service.Notifications.EmailSender email, BookingQuotationService quotations, TripOps.Service.Tours.TourService tourService,
    CloudinaryStorage photoStorage, TripOps.Service.Contracts.ContractTemplateService contractTemplates)
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

    private static string MealCheckinLabel(string? mealType) => (mealType ?? "").ToLowerInvariant() switch
    {
        "breakfast" => "Bữa sáng",
        "lunch" => "Bữa trưa",
        "dinner" => "Bữa tối",
        _ => "Bữa ăn"
    };

    private static TimeSpan DefaultMealTime(string? mealType) => (mealType ?? "").ToLowerInvariant() switch
    {
        "breakfast" => new TimeSpan(7, 30, 0),
        "lunch" => new TimeSpan(12, 0, 0),
        "dinner" => new TimeSpan(18, 30, 0),
        _ => new TimeSpan(12, 0, 0)
    };

    private async Task EnsureMealCheckinStopsAsync(Booking booking, CancellationToken ct)
    {
        var changed = false;
        foreach (var timeline in booking.Timelines)
        {
            foreach (var meal in timeline.Meals)
            {
                var tag = $"[MEAL:{meal.Id}]";
                var name = $"{MealCheckinLabel(meal.MealType)}: {meal.CurrentRestaurantName ?? meal.OriginalRestaurantName}";
                var orig = $"{MealCheckinLabel(meal.MealType)}: {meal.OriginalRestaurantName}";
                var mealTime = meal.Time ?? (meal.DateService?.Date.Add(DefaultMealTime(meal.MealType))
                    ?? booking.StartDate.Date.AddDays(Math.Max(0, timeline.DayNumber - 1)).Add(DefaultMealTime(meal.MealType)));
                var agencyId = meal.AgencyId ?? booking.Tour?.AgencyId;

                var existing = timeline.Attractions.FirstOrDefault(a => a.CustomerNote == tag);
                if (existing is null)
                {
                    timeline.Attractions.Add(new BookingTimelineAttraction
                    {
                        BookingTimelineId = timeline.Id,
                        AgencyId = agencyId,
                        OriginalLocationName = orig,
                        CurrentLocationName = name,
                        Time = mealTime,
                        CustomerNote = tag,
                    });
                    changed = true;
                }
                else
                {
                    if (existing.CurrentLocationName != name) { existing.CurrentLocationName = name; changed = true; }
                    if (existing.Time != mealTime) { existing.Time = mealTime; changed = true; }
                    if (existing.AgencyId != agencyId && agencyId is not null) { existing.AgencyId = agencyId; changed = true; }
                }
            }
        }
        if (changed) await repository.SaveChangesAsync(ct);
    }

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

            // Chênh lệch dịch vụ tự chọn chỉ áp cho vé tính tiền; vé miễn phí (em bé) giữ 0đ.
            // Chênh lệch âm không làm giá vé xuống dưới 0.
            price = price > 0 ? Money(Math.Max(0, price + extra)) : 0;
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


        var locationChoices = (request.LocationChoices ?? [])
            .Where(l => l.DayNumber >= 1 && !string.IsNullOrWhiteSpace(l.OriginalLocationName) && !string.IsNullOrWhiteSpace(l.RequestedLocationName))
            .GroupBy(l => (l.DayNumber, Original: l.OriginalLocationName.Trim().ToLowerInvariant()))
            .ToDictionary(g => g.Key, g => g.First());

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
            // Chính sách hủy và điều khoản bổ sung của Agency chủ trì tại lúc đặt: Agency sửa mẫu sau không đổi đơn này.
            ContractTermsSnapshot = (await contractTemplates.TermsFor(tour.AgencyId, ct)).ToJson(),
            StartDate = request.StartDate.Date,
            TotalAmount = totalAmount,
            // Giá lúc khách đặt (đã gồm tùy chọn dịch vụ). Chỉ Agency điều chỉnh sau đó mới tạo chênh lệch.
            OriginalTotalPrice = totalAmount,
            HasCustomization = hotelSelections.Count>0 || mealSelections.Count>0 || locationChoices.Count>0,
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
                    Attractions = (day?.Attractions ?? []).Select(a => {
                        var origName = a.Name ?? "";
                        var hasCustomLoc = locationChoices.TryGetValue((number, origName.Trim().ToLowerInvariant()), out var customLoc);
                        var chosenName = hasCustomLoc ? customLoc!.RequestedLocationName.Trim() : origName;
                        var note = hasCustomLoc ? "__CUSTOMER_CHANGED__" : null;
                        return new BookingTimelineAttraction {
                            AgencyId = a.AgencyId ?? tour.AgencyId,
                            OriginalLocationName = origName,
                            CurrentLocationName = chosenName,
                            CustomerNote = note,
                            Time = a.Time.HasValue ? request.StartDate.Date.AddDays(number-1).Add(a.Time.Value.TimeOfDay) : null
                        };
                    }).ToList(),
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

        await EnsureMealCheckinStopsAsync(booking, ct);

        var snapshots = await quotations.SelectionSnapshots(id, ct);
        var dto=await quotations.AllianceDetails(booking,ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name, snapshots),isAgency||isAdmin,ct);
        var proofPhotos = booking.Timelines.SelectMany(d => d.Attractions).SelectMany(a => a.Checkins)
            .ToDictionary(c => c.Id, c => (
                Checkin: (IReadOnlyList<string>)GuideCheckinPhotoRules.Decode(c.PhotoUrl)
                    .Select(url => photoStorage.DeliveryUrl(url)!).ToArray(),
                Checkout: (IReadOnlyList<string>)GuideCheckinPhotoRules.Decode(c.CheckoutPhotoUrl)
                    .Select(url => photoStorage.DeliveryUrl(url)!).ToArray()));
        if (dto.AttractionCheckins is { Count: > 0 })
            dto = dto with
            {
                AttractionCheckins = dto.AttractionCheckins.Select(c =>
                    proofPhotos.TryGetValue(c.Id, out var photos)
                        ? c with { PhotoUrls = photos.Checkin, CheckoutPhotoUrls = photos.Checkout }
                        : c).ToArray()
            };
        if(isAgency && booking.Tour!.AgencyId!=actorId && !isAdmin)
            return BookingAlliance.PartnerView(booking,dto,actorId);
        if(isGuide && !isAgency && !isAdmin) {
            var ownAgency=booking.AssignedGuides.Single(a=>a.GuideId==actorId).AgencyId;
            var schedule=GuideBookingRules.Schedule(booking,actorId,ownAgency);
            var ownedStopIds=GuideLocationCheckinRules.OrderedStopsForGuide(booking,actorId,ownAgency).Select(a=>a.Id).ToHashSet();
            var guideCheckinsByLocation = booking.Timelines
                .SelectMany(d => d.Attractions)
                .ToDictionary(a => a.Id, a => a.Checkins.SingleOrDefault(c => c.GuideId == actorId));
            var sourceDays = ownedStopIds.Count > 0
                ? dto.SnapshotDays?.Select(d => d with { Locations = d.Locations.Where(l => ownedStopIds.Contains(l.Id)).ToArray() }).Where(d => d.Locations.Count > 0)
                : dto.SnapshotDays;
            var guideDays = sourceDays?.Select(d => d with
            {
                Locations = d.Locations.Select(l =>
                {
                    var own = guideCheckinsByLocation.GetValueOrDefault(l.Id);
                    if (own is not null)
                    {
                        var photos = proofPhotos.GetValueOrDefault(own.Id);
                        return l with
                        {
                            AttendanceStatus = own.AttendanceStatus?.ToString() ?? "Pending",
                            PhotoUrls = photos.Checkin ?? [],
                            CheckinNote = own.Note,
                            CheckoutPhotoUrls = photos.Checkout ?? [],
                            CheckoutNote = own.CheckoutNote,
                            CheckoutAt = own.CheckoutTime
                        };
                    }
                    var hasOtherGuideCheckins = booking.Timelines
                        .SelectMany(t => t.Attractions)
                        .Any(a => a.Id == l.Id && a.Checkins.Count > 0);
                    return hasOtherGuideCheckins
                        ? l with { AttendanceStatus = "Pending", PhotoUrls = [], CheckinNote = null, CheckoutPhotoUrls = [], CheckoutNote = null, CheckoutAt = null }
                        : l;
                }).ToArray()
            }).ToArray();
            var ownAgencyName=booking.BookingAgencies.FirstOrDefault(a=>a.AgencyId==ownAgency)?.Agency?.BusinessProfile?.BusinessName
                ?? booking.BookingAgencies.FirstOrDefault(a=>a.AgencyId==ownAgency)?.Agency?.Name
                ?? dto.AgencyName;
            dto=dto with {
                StartDate=schedule.StartDate,EndDate=schedule.EndDate,AgencyName=ownAgencyName,SnapshotDays=guideDays,
                AttractionCheckins=dto.AttractionCheckins?.Where(c=>c.GuideId==actorId).ToArray(),
                Participants=dto.Participants.Where(p=>p.AgencyId==ownAgency).ToArray(),TotalGuests=BookingAlliance.GuestCount(booking,ownAgency),
                CanStartTour=GuideBookingRules.CanStartTour(booking,actorId,ownAgency,UtcNow),
                CanRecordAttendance=GuideBookingRules.CanRecordAttendance(booking,actorId,ownAgency,UtcNow),
                AttendanceDate=schedule.StartDate,
                CanCheckInLocations=GuideLocationCheckinRules.CanCheckIn(booking,actorId,ownAgency,UtcNow),
                NextLocationCheckInId=GuideLocationCheckinRules.NextUncheckedStopIdForGuide(booking,actorId,ownAgency)};
        } else if(isOwner && !isAgency && !isAdmin) {
            dto=dto with {Incidents=dto.Incidents?.Select(i=>i with {EvidenceUrls=[]}).ToArray(),
                Participants=dto.Participants.GroupBy(p=>p.ParticipantIndex).Select(g=> {
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

        repository.Notify(booking.CustomerId!, request.Decision == "approve"
            ? $"Booking {booking.BookingCode} đã được Agency xác nhận. Vui lòng kiểm tra và ký hợp đồng."
            : $"Booking {booking.BookingCode} bị từ chối. Lý do: {request.Reason?.Trim() ?? "Không được cung cấp"}",
            booking.Id, agencyId);
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

        repository.NotifyAgencies(booking,
            $"Khách đã hủy booking {booking.BookingCode}. Lý do: {request.Reason.Trim()}", customerId);
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
        var assignmentChanged = existing is null
            || (request.Role is not null && existing.Role != request.Role)
            || (request.Notes is not null && existing.Notes != request.Notes);
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
        if (assignmentChanged)
            repository.Notify(request.GuideId,
                $"Bạn được phân công booking {booking.BookingCode} - {booking.Tour?.Name ?? "Tour"}. Ngày khởi hành: {booking.StartDate:dd/MM/yyyy}.",
                id, agencyId);
        await repository.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await Get(agencyId,id,ct);
    }

    // WF06: Guide xem danh sách tour được giao
    public async Task<IReadOnlyList<AvailableGuideDto>> AvailableGuides(string agencyId, CancellationToken ct, int? bookingId = null)
    {
        Booking? booking = null;
        if (bookingId.HasValue) {
            booking = await repository.Find(bookingId.Value,ct) ?? throw new BookingException(404,"Không tìm thấy booking.");
            if (!BookingAlliance.IsMember(booking,agencyId)) throw new BookingException(403,"Agency không thuộc booking.");
        }
        var result = new List<AvailableGuideDto>();
        foreach (var guide in await repository.AvailableGuides(agencyId,ct)) {
            var conflict = booking is not null && await repository.GuideHasConflict(guide.Id,booking.Id,booking.StartDate,EndDate(booking),ct);
            var suspended = guide.GuideProfile?.SuspendedAt is not null;
            result.Add(new(guide.Id,guide.Name,guide.Phone,guide.Avatar,!conflict && !suspended,
                suspended ? "HDV đang bị tạm ngưng." : conflict ? "Trùng lịch với booking khác." : null));
        }
        return result;
    }

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
        var bookingsById = await repository.GuideSchedules(rows.Select(r => r.Id), ct);
        var items = rows.Select(b => {
            var startDate = b.StartDate;
            DateTime? endDate = null;
            if (bookingsById.TryGetValue(b.Id, out var full) &&
                full.AssignedGuides.FirstOrDefault(ag => ag.GuideId == guideId) is { } assignment)
            {
                var schedule = GuideBookingRules.Schedule(full, guideId, assignment.AgencyId);
                startDate = schedule.StartDate;
                endDate = schedule.EndDate;
            }
            return new BookingListItem(
                b.Id, b.BookingCode, b.TourName, b.CustomerName, b.ContactPhone,
                startDate, b.Guests, b.TotalAmount, b.PaidAmount,
                b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(), b.CreatedAt ?? DateTime.UnixEpoch,
                TourThumbnailFromJson(b.ThumbnailUrls, b.TourImages),
                endDate);
        }).ToList();

        return new BookingPage<BookingListItem>(items, total, page, pageSize);
    }

    private static string? TourThumbnailFromJson(string? thumbnailUrls, string? images)
    {
        foreach (var json in new[] { thumbnailUrls, images })
        {
            if (string.IsNullOrWhiteSpace(json)) continue;
            try
            {
                using var doc = JsonDocument.Parse(json);
                var first = doc.RootElement.EnumerateArray().FirstOrDefault().GetString();
                if (!string.IsNullOrWhiteSpace(first)) return first;
            }
            catch { }
        }
        return null;
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
        if (!GuideBookingRules.CanRecordAttendance(booking, guideId, guideAgency, UtcNow))
            throw new BookingException(409, "Chỉ được điểm danh vào ngày khởi hành hoặc ngày bắt đầu chặng được phân công.");
        if (Enum.TryParse<AttendanceStatus>(request.Status, true, out var status))
            participant.AttendanceStatus = status;
        else
            throw new BookingException(400, "Trạng thái điểm danh không hợp lệ.");

        if (request.Note is not null)
            participant.StatusNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        participant.CheckedBy = guideId;
        participant.CheckedAt = DateTime.UtcNow;
        await repository.SaveChangesAsync(ct);

        return Participant(participant);
    }

    // WF06: Báo cáo sự cố
    public async Task<IncidentDto> ReportIncident(
        string guideId, int bookingId, ReportIncidentRequest request, CancellationToken ct,
        IReadOnlyList<string>? evidenceUrls = null)
    {
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var assignment = booking.AssignedGuides.SingleOrDefault(ag => ag.GuideId == guideId)
            ?? throw new BookingException(403, "Chỉ Hướng dẫn viên được phân công cho chuyến này mới có quyền báo sự cố.");

        if (!IncidentTypeRules.IsAllowed(request.IncidentType))
            throw new BookingException(422, "Loại sự cố không hợp lệ.");
        var normalizedType = request.IncidentType!.Trim().ToUpperInvariant();
        var incident = new BookingIncident
        {
            BookingId = bookingId,
            AgencyId = assignment.AgencyId,
            IncidentType = normalizedType,
            Title = normalizedType.Equals("OTHER", StringComparison.OrdinalIgnoreCase)
                ? request.Title.Trim()
                : $"[{normalizedType}] {request.Title.Trim()}",
            Description = IncidentDescription(request.Description, request.Severity),
            ReportedBy = guideId,
            EvidenceUrls = evidenceUrls is { Count: > 0 } ? GuideCheckinPhotoRules.Encode(evidenceUrls) : null,
        };

        repository.AddIncident(incident);
        foreach (var agency in new[] { assignment.AgencyId, booking.Tour!.AgencyId }.Distinct())
            repository.Notify(agency,
                $"Sự cố [{normalizedType}] trong booking {booking.BookingCode}: {request.Title.Trim()}. Vui lòng xem Incident Reports.",
                bookingId, guideId);
        await repository.SaveChangesAsync(ct);

        return IncidentToDto(incident, assignment.Guide?.Name);
    }

    private IncidentDto IncidentToDto(BookingIncident i, string? reporterName) => new(
        i.Id, i.BookingId,
        i.Title, i.Description, Severity(i.Description),
        i.CreatedAt ?? DateTime.UnixEpoch,
        GuideCheckinPhotoRules.Decode(i.EvidenceUrls)
            .Select(url => photoStorage.DeliveryUrl(url)!)
            .Distinct()
            .ToArray(),
        i.ReportedBy,
        reporterName ?? i.Reporter?.Name,
        i.AgencyId,
        i.IncidentType);

    private BookingDto ToDto(Booking b, string? tourName, string? agencyId, string? agencyName,
        Dictionary<string, TripOps.Service.Tours.SupplierSnapshotInput>? snapshots = null)
    {
        var bookedConfig = string.IsNullOrWhiteSpace(b.TourConfigurationData)
            ? null
            : JsonSerializer.Deserialize<TripOps.Service.Tours.TourConfiguration>(b.TourConfigurationData, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return new(b.Id, b.BookingCode, b.CustomerId ?? "", b.Customer?.Name ?? "",
            b.TourId, tourName, agencyId, agencyName,
            b.StartDate, EndDate(b), TotalGuests(b), b.TotalAmount,
            DisplayDeposit(b), PaidAmount(b), b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(),
            b.ContactName, b.ContactPhone, b.ContactEmail, b.SpecialRequests,
            b.Participants.OrderBy(p => p.ParticipantIndex).Select(Participant).ToList(),
            b.AssignedGuides.Select(ag => new AssignedGuideDto(
                ag.Id, ag.GuideId, ag.Guide?.Name ?? "", ag.Guide?.Phone,
                ag.Role, "ASSIGNED", ag.Notes, ag.AssignedAt, ag.AgencyId, ag.Guide?.Avatar)).ToList(),
            b.CreatedAt ?? DateTime.UnixEpoch, b.UpdatedAt,
            b.Incidents.OrderByDescending(i => i.CreatedAt).Select(i => IncidentToDto(i, i.Reporter?.Name)).ToList(),
            b.Timelines.OrderBy(t=>t.DayNumber).Select(t=>new BookingDayDto(t.Id,t.DayNumber,t.Title,t.Description,
                GuideLocationCheckinRules.OrderedStops([t]).Select(a=>new BookingLocationDto(a.Id,a.CurrentLocationName??a.OriginalLocationName,a.Time,a.AttendanceStatus,a.OriginalLocationName,a.CustomerNote,a.AgencyId,
                    a.Checkins.SelectMany(c => GuideCheckinPhotoRules.Decode(c.PhotoUrl))
                        .Select(url => photoStorage.DeliveryUrl(url)!).Distinct().ToArray(),
                    a.Checkins.OrderByDescending(c => c.CheckinTime).Select(c => c.Note).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)),
                    a.Checkins.SelectMany(c => GuideCheckinPhotoRules.Decode(c.CheckoutPhotoUrl))
                        .Select(url => photoStorage.DeliveryUrl(url)!).Distinct().ToArray(),
                    a.Checkins.OrderByDescending(c => c.CheckoutTime).Select(c => c.CheckoutNote).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)),
                    a.Checkins.Select(c => c.CheckoutTime).Max())).ToList(),
                t.Meals.Select(m=>new BookingMealDto(m.Id,m.MealType,m.CurrentRestaurantName??m.OriginalRestaurantName,m.DateService,m.Time,m.ServiceId,m.PriceDifference??0,
                    SupplierOfMeal(snapshots, bookedConfig, t.DayNumber, m),m.OriginalRestaurantName,m.AgencyId)).ToList())).ToList(),
            b.Accommodations.Select(h=>new BookingHotelDto(h.Id,h.Destination,h.CurrentHotelName??h.OriginalHotelName,h.CurrentStars??h.OriginalStars,h.NightsCount,h.ServiceId,h.PriceDifference??0,
                SupplierOfHotel(snapshots, bookedConfig, h),h.OriginalHotelName,h.AgencyId,h.DateFrom,h.DateTo)).ToList(),
            Schedule(b), Transactions(b), Cancellation(b), ContractOf(b), b.OriginalTotalPrice,
            b.PriceAdjustments.OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.Id).Select(a => new BookingPriceAdjustmentDto(a.Id,
                a.Adjuster?.Name ?? a.AdjustedBy, a.PreviousTotalPrice, a.Amount, a.NewTotalPrice, a.Reason, a.CreatedAt,a.AgencyId)).ToList(), BaseTourAmount(b), SurchargeTotal(b), HasBeenApproved(b), CanRecordAttendance: b.StartDate.Date == PaymentRules.VietnamDate(UtcNow),
            CanCheckInLocations: GuideLocationCheckinRules.CanCheckIn(b, UtcNow),
            NextLocationCheckInId: GuideLocationCheckinRules.NextUncheckedStopId(b.Timelines));
    }

    private static BookingSupplierDto? ToSupplierDto(TripOps.Service.Tours.SupplierSnapshotInput? s) =>
        s is null ? null : new BookingSupplierDto(s.Address, s.ContactPhone, s.Area, s.ContactName, s.ReferencePrice, s.Conditions);

    private static BookingSupplierDto? SupplierOfMeal(
        Dictionary<string, TripOps.Service.Tours.SupplierSnapshotInput>? snapshots,
        TripOps.Service.Tours.TourConfiguration? config,
        int dayNumber,
        BookingTimelineMeal m)
    {
        var snap = snapshots?.GetValueOrDefault($"meal:{m.Id}");
        if (snap is not null) return ToSupplierDto(snap);
        var name = m.CurrentRestaurantName ?? m.OriginalRestaurantName;
        var configured = config?.Timelines?.FirstOrDefault(d => d.DayNumber == dayNumber)?.Meals?
            .FirstOrDefault(x => x.MealType == m.MealType && (string.Equals(x.RestaurantName, name, StringComparison.OrdinalIgnoreCase)));
        return ToSupplierDto(configured?.Supplier);
    }

    private static BookingSupplierDto? SupplierOfHotel(
        Dictionary<string, TripOps.Service.Tours.SupplierSnapshotInput>? snapshots,
        TripOps.Service.Tours.TourConfiguration? config,
        BookingAccommodation h)
    {
        var snap = snapshots?.GetValueOrDefault($"hotel:{h.Id}");
        if (snap is not null) return ToSupplierDto(snap);
        var name = h.CurrentHotelName ?? h.OriginalHotelName;
        var configured = config?.Timelines?.SelectMany(d => d.Accommodations ?? [])
            .FirstOrDefault(x => string.Equals(x.DestinationName, h.Destination, StringComparison.OrdinalIgnoreCase)
                && string.Equals(x.HotelName, name, StringComparison.OrdinalIgnoreCase));
        return ToSupplierDto(configured?.Supplier);
    }

    private static ParticipantDto Participant(BookingParticipant p) => new(p.Id, p.FullName, p.PhoneNumber,
        p.DateOfBirth, p.Gender, p.IdentityNumber, p.AttendanceStatus.GetValueOrDefault(AttendanceStatus.Pending).ToString(),
        p.Status ?? "ACTIVE", p.AssignedGuide?.Name, p.Price, p.TierName, p.AgencyId, p.ParticipantIndex, p.IsPrimary, p.Note, p.RoommateNote, p.RestaurantNote, p.CheckedBy, p.CheckedAt, p.AssignedGuideId, p.StatusNote);
    private static int TotalGuests(Booking booking) => BookingAlliance.GuestCount(booking);
    private static decimal PaidAmount(Booking booking) => BookingBilling.NetPaidAmount(booking);
    private static DateTime EndDate(Booking booking) => booking.StartDate.AddDays(Math.Max(1,
        booking.Timelines.Select(t => t.DayNumber).DefaultIfEmpty(booking.Tour?.DurationDays ?? 1).Max()) - 1);
    private static string IncidentDescription(string description, string? severity) => string.IsNullOrWhiteSpace(severity)
        ? description.Trim() : $"{description.Trim()}\nMức độ: {severity.Trim()}";
    private static string? Severity(string? description) => string.IsNullOrWhiteSpace(description) ? null
        : System.Text.RegularExpressions.Regex.Match(description, @"(?:^|\n)Mức độ: ([^\r\n]+)") is { Success: true } match ? match.Groups[1].Value : null;
}
