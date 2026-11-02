using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Data.Repositories;
using TripOps.Service.Accounts;

namespace TripOps.Service.Bookings;

public sealed class BookingService(BookingRepository repository, AccountService accounts)
{
    private static decimal Money(decimal value) => decimal.Round(value, 0, MidpointRounding.AwayFromZero);

    public async Task<BookingDto> Create(string customerId, CreateBookingRequest request, CancellationToken ct)
    {
        var customer = await accounts.Current(customerId, ct);
        if (customer.Status != UserStatus.Active)
            throw new BookingException(403, "Tài khoản khách hàng không hợp lệ hoặc đã bị khóa.");

        var tour = await repository.FindPublicTour(request.TourId, ct);
        if (tour is null)
            throw new BookingException(404, "Tour không tồn tại hoặc chưa được công bố mở bán.");

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
                Note = ParticipantNote(p.Note, p.PhoneNumber),
                DateOfBirth = p.DateOfBirth,
                Gender = p.Gender?.Trim(),
                IdentityNumber = p.IdentityNumber?.Trim(),
                AttendanceStatus = AttendanceStatus.Pending,
                Status = "ACTIVE"
            });
        }

        totalAmount = Money(totalAmount);
        var depositAmount = Money(totalAmount * 0.3m); // Mặc định cọc 30%

        var code = $"BK{DateTime.UtcNow:yyMMddHHmmss}{Random.Shared.Next(100, 999)}";


        var booking = new Booking
        {
            BookingCode = code,
            CustomerId = customerId,
            TourId = tour.Id,
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
            BookingAgencies = [new BookingAgency { AgencyId = tour.AgencyId!, IsHost = true, OriginalAmount = totalAmount, FinalAmount = totalAmount, NetPayout = totalAmount }],
            Timelines = Enumerable.Range(1, Math.Max(1, tour.DurationDays ?? 1)).Select(number => {
                var day = tour.Timelines.SingleOrDefault(d => d.DayNumber == number);
                return new BookingTimeline {
                    DayNumber = number, Title = day?.Title ?? $"Ngày {number}", Description = day?.Description,
                    Attractions = (day?.Attractions ?? []).Select(a => new BookingTimelineAttraction {
                        AgencyId = a.AgencyId ?? tour.AgencyId, OriginalLocationName = a.Name ?? "", Time = a.Time.HasValue ? request.StartDate.Date.AddDays(number-1).Add(a.Time.Value.TimeOfDay) : null }).ToList(),
                    Meals = (day?.Meals ?? []).Where(m => m.IsDefault == true).Select(m => new BookingTimelineMeal {
                        MealType = m.MealType, OriginalRestaurantName = m.RestaurantName,
                        CustomizedRestaurantName = mealSelections.TryGetValue((number,m.MealType),out var chosenMeal) ? chosenMeal.RestaurantName : null,
                        IsCustomized = mealSelections.ContainsKey((number,m.MealType)),
                        PriceDifference = mealSelections.TryGetValue((number,m.MealType),out var mealOption) ? mealOption.PriceDifference : 0,
                        ServiceId = mealSelections.TryGetValue((number,m.MealType),out var selectedMeal) ? selectedMeal.ServiceId : m.ServiceId, DateService = request.StartDate.Date.AddDays(number-1), Time = m.Time.HasValue ? request.StartDate.Date.AddDays(number-1).Add(m.Time.Value.TimeOfDay) : null }).ToList()
                };
            }).ToList(),
            Accommodations = tour.Accommodations.Where(a => a.IsDefault == true).Select(a => new BookingAccommodation {
                CustomizedHotelName = hotelSelections.TryGetValue(a.DestinationName,out var chosenHotel) ? chosenHotel.HotelName : null,
                CustomizedStars = hotelSelections.TryGetValue(a.DestinationName,out var starsHotel) ? starsHotel.StarRating : null,
                IsCustomized = hotelSelections.ContainsKey(a.DestinationName),
                PriceDifference = hotelSelections.TryGetValue(a.DestinationName,out var priceHotel) ? priceHotel.PriceDifference : 0,
                ServiceId = hotelSelections.TryGetValue(a.DestinationName,out var selectedHotel) ? selectedHotel.ServiceId : a.ServiceId, DateFrom = request.StartDate.Date, DateTo = request.StartDate.Date.AddDays(a.NightsCount ?? 1), Destination = a.DestinationName, OriginalHotelName = a.HotelName, OriginalStars = a.StarRating,
                NightsCount = a.NightsCount }).ToList(),
            PaymentRequests = [new PaymentRequest { Description = "Đặt cọc 30%", Amount = depositAmount,
                DueDate = request.StartDate.Date, CreatedBy = customerId }]
        };

        repository.Add(booking);
        await repository.SaveChangesAsync(ct);

        return ToDto(booking, tour.Name, tour.AgencyId, tour.Agency?.Name);
    }

    public async Task<BookingDto> Get(string actorId, int id, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var user = await accounts.Current(actorId, ct);

        bool isOwner = booking.CustomerId == actorId;
        bool isAgency = booking.Tour?.AgencyId == actorId;
        bool isGuide = booking.AssignedGuides.Any(ag => ag.GuideId == actorId);
        bool isAdmin = user.Role == UserRole.Admin;

        if (!isOwner && !isAgency && !isGuide && !isAdmin)
            throw new BookingException(403, "Bạn không có quyền xem thông tin đơn đặt này.");

        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
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
            b.StartDate, TotalGuests(b), b.TotalAmount, PaidAmount(b),
            b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(), b.CreatedAt ?? DateTime.UnixEpoch)).ToList();

        return new BookingPage<BookingListItem>(items, total, page, pageSize);
    }

    public async Task<BookingDto> Decide(string agencyId, int id, BookingDecisionRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId)
            throw new BookingException(403, "Chỉ Agency sở hữu tour mới có quyền duyệt đơn này.");

        if (booking.Status is not (BookingStatus.Pending or BookingStatus.Deposited))
            throw new BookingException(422, $"Không thể duyệt đơn đặt đang ở trạng thái {booking.Status}.");

        if (request.Decision == "approve")
        {
            booking.Status = BookingStatus.Confirmed;
        }
        else if (request.Decision == "reject")
        {
            booking.Status = BookingStatus.Rejected;
            if (!string.IsNullOrWhiteSpace(request.Reason))
                booking.SpecialRequests = $"{booking.SpecialRequests} [Lý do từ chối: {request.Reason}]".Trim();
        }

        await repository.SaveChangesAsync(ct);
        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
    }

    public async Task<BookingDto> Deposit(string customerId, int id, BookingDepositRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");

        if (booking.Status is BookingStatus.Cancelled or BookingStatus.Rejected)
            throw new BookingException(422, "Không thể thanh toán cho đơn đã hủy hoặc bị từ chối.");

        var code = string.IsNullOrWhiteSpace(request.TransactionReference)
            ? $"DEMO-{Guid.NewGuid():N}" : request.TransactionReference.Trim();
        var previous = await repository.FindTransaction(code, ct);
        if (previous is not null)
        {
            if (previous.BookingId != id || previous.Amount != request.Amount)
                throw new BookingException(409, "Mã giao dịch đã được sử dụng.");
            return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
        }
        var paid = Money(PaidAmount(booking) + request.Amount);
        if (paid > booking.TotalAmount) throw new BookingException(422, "Số tiền vượt quá phần còn phải thanh toán.");
        var deposit = booking.PaymentRequests.FirstOrDefault(p => p.Description.StartsWith("Đặt cọc"));
        booking.PaymentTransactions.Add(new PaymentTransaction {
            TransactionCode = code, Amount = Money(request.Amount), PaymentMethod = "DEMO",
            Status = PaymentTransactionStatus.Success, ProofImageUrl = request.PaymentProofUrl,
            PayerName = booking.ContactName, PaidAt = DateTime.UtcNow, PaymentRequest = deposit });
        if (paid >= booking.TotalAmount)
        {
            booking.PaymentStatus = PaymentStatus.Paid;
            if (booking.Status is BookingStatus.Pending or BookingStatus.Deposited or BookingStatus.Confirmed)
                booking.Status = BookingStatus.Paid;
        }
        else
        {
            booking.PaymentStatus = PaymentStatus.PartiallyPaid;
            if (paid >= DepositAmount(booking) && booking.Status == BookingStatus.Pending)
                booking.Status = BookingStatus.Deposited;
        }
        if (deposit is not null && paid >= deposit.Amount)
        {
            deposit.Status = PaymentRequestStatus.Paid;
            deposit.PaidAt = DateTime.UtcNow;
        }

        await repository.SaveChangesAsync(ct);
        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
    }

    public async Task<BookingDto> Cancel(string customerId, int id, BookingCancellationRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");

        if (booking.Status is BookingStatus.Cancelled or BookingStatus.Rejected or BookingStatus.Completed)
            throw new BookingException(422, $"Không thể hủy đơn đặt đang ở trạng thái {booking.Status}.");

        booking.Status = BookingStatus.Cancelled;
        booking.CancelReason = request.Reason.Trim();
        booking.CancelledAt = DateTime.UtcNow;
        booking.SpecialRequests = $"{booking.SpecialRequests} [Khách hủy: {request.Reason}]".Trim();

        await repository.SaveChangesAsync(ct);
        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
    }

    // WF06: Phân công Hướng dẫn viên
    public async Task<BookingDto> AssignGuide(string agencyId, int id, GuideAssignmentRequest request, CancellationToken ct)
    {
        await using var transaction = await repository.BeginGuideAssignment(ct);
        await repository.LockGuide(request.GuideId, ct);
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId)
            throw new BookingException(403, "Chỉ Agency sở hữu tour mới có quyền phân công hướng dẫn viên.");

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

        await repository.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
    }

    // WF06: Guide xem danh sách tour được giao
    public async Task<IReadOnlyList<AvailableGuideDto>> AvailableGuides(string agencyId, CancellationToken ct) =>
        (await repository.AvailableGuides(agencyId,ct)).Select(g => new AvailableGuideDto(g.Id, g.Name, g.Phone)).ToList();

    public async Task<BookingPage<BookingListItem>> ListForGuide(string guideId, int page, int pageSize, CancellationToken ct)
    {
        var (rows, total) = await repository.ListForGuide(guideId, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
        var items = rows.Select(b => new BookingListItem(
            b.Id, b.BookingCode, b.Tour?.Name, b.Customer?.Name, b.ContactPhone,
            b.StartDate, TotalGuests(b), b.TotalAmount, PaidAmount(b),
            b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(), b.CreatedAt ?? DateTime.UnixEpoch)).ToList();

        return new BookingPage<BookingListItem>(items, total, page, pageSize);
    }

    // WF06: Điểm danh hành khách
    public async Task<ParticipantDto> RecordAttendance(string guideId, int bookingId, AttendanceCheckinRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (!booking.AssignedGuides.Any(ag => ag.GuideId == guideId))
            throw new BookingException(403, "Chỉ Hướng dẫn viên được phân công cho chuyến này mới có quyền điểm danh.");

        var participant = booking.Participants.FirstOrDefault(p => p.Id == request.ParticipantId)
            ?? throw new BookingException(404, "Không tìm thấy hành khách trong danh sách đoàn.");

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
            AgencyId = booking.Tour!.AgencyId ?? throw new BookingException(422, "Booking requires an Agency."),
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

    private static BookingDto ToDto(Booking b, string? tourName, string? agencyId, string? agencyName) =>
        new(b.Id, b.BookingCode, b.CustomerId ?? "", b.Customer?.Name ?? "",
            b.TourId, tourName, agencyId, agencyName,
            b.StartDate, EndDate(b), TotalGuests(b), b.TotalAmount,
            DepositAmount(b), PaidAmount(b), b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(),
            b.ContactName, b.ContactPhone, b.ContactEmail, b.SpecialRequests,
            b.Participants.OrderBy(p => p.ParticipantIndex).Select(Participant).ToList(),
            b.AssignedGuides.Select(ag => new AssignedGuideDto(
                ag.Id, ag.GuideId, ag.Guide?.Name ?? "", ag.Guide?.Phone,
                ag.Role, "ASSIGNED", ag.Notes, ag.AssignedAt, ag.AgencyId)).ToList(),
            b.CreatedAt ?? DateTime.UnixEpoch, b.UpdatedAt,
            b.Incidents.OrderByDescending(i => i.CreatedAt).Select(i => new IncidentDto(
                i.Id, i.BookingId, i.Title, i.Description, Severity(i.Description), i.Status.GetValueOrDefault(IncidentStatus.Reported).ToString(), i.CreatedAt ?? DateTime.UnixEpoch)).ToList(),
            b.Timelines.OrderBy(t=>t.DayNumber).Select(t=>new BookingDayDto(t.Id,t.DayNumber,t.Title,t.Description,
                t.Attractions.Select(a=>new BookingLocationDto(a.Id,a.CustomizedLocationName??a.OriginalLocationName,a.Time,a.AttendanceStatus)).ToList(),
                t.Meals.Select(m=>new BookingMealDto(m.Id,m.MealType,m.CustomizedRestaurantName??m.OriginalRestaurantName,m.DateService,m.Time,m.ServiceId,m.PriceDifference??0)).ToList())).ToList(),
            b.Accommodations.Select(h=>new BookingHotelDto(h.Id,h.Destination,h.CustomizedHotelName??h.OriginalHotelName,h.CustomizedStars??h.OriginalStars,h.NightsCount,h.ServiceId,h.PriceDifference??0)).ToList());

    private static ParticipantDto Participant(BookingParticipant p) => new(p.Id, p.FullName, Phone(p.Note),
        p.DateOfBirth, p.Gender, p.IdentityNumber, p.AttendanceStatus.GetValueOrDefault(AttendanceStatus.Pending).ToString(),
        p.Status ?? "ACTIVE", p.AssignedGuide?.Name, p.Price, p.TierName, p.AgencyId, p.ParticipantIndex, p.IsPrimary, p.Note, p.RoommateNote, p.RestaurantNote, p.CheckedBy, p.CheckedAt, p.AssignedGuideId);
    private static int TotalGuests(Booking booking) => booking.Participants.Count(p => p.IsPrimary != false && p.Status != "INACTIVE");
    private static decimal PaidAmount(Booking booking) => booking.PaymentTransactions
        .Where(t => t.Status == PaymentTransactionStatus.Success).Sum(t => t.Amount);
    private static decimal DepositAmount(Booking booking) => booking.PaymentRequests
        .Where(p => p.Description.StartsWith("Đặt cọc")).Select(p => (decimal?)p.Amount).FirstOrDefault() ?? Money(booking.TotalAmount * 0.3m);
    private static DateTime EndDate(Booking booking) => booking.StartDate.AddDays(Math.Max(1,
        booking.Timelines.Select(t => t.DayNumber).DefaultIfEmpty(booking.Tour?.DurationDays ?? 1).Max()) - 1);
    private static string? ParticipantNote(string? note, string? phone) => string.IsNullOrWhiteSpace(phone)
        ? note?.Trim() : string.Join("\n", new[] { note?.Trim(), $"Điện thoại: {phone.Trim()}" }.Where(s => !string.IsNullOrWhiteSpace(s)));
    private static string? Phone(string? note) => string.IsNullOrWhiteSpace(note) ? null
        : System.Text.RegularExpressions.Regex.Match(note, @"(?:^|\n)Điện thoại: ([^\r\n]+)") is { Success: true } match ? match.Groups[1].Value : null;
    private static string IncidentDescription(string description, string? severity) => string.IsNullOrWhiteSpace(severity)
        ? description.Trim() : $"{description.Trim()}\nMức độ: {severity.Trim()}";
    private static string? Severity(string? description) => string.IsNullOrWhiteSpace(description) ? null
        : System.Text.RegularExpressions.Regex.Match(description, @"(?:^|\n)Mức độ: ([^\r\n]+)") is { Success: true } match ? match.Groups[1].Value : null;
}
