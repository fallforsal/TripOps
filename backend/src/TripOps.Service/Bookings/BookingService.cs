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

        // Tính toán tổng tiền theo pricing tiers hoặc base price
        var tiers = tour.PricingTiers.ToDictionary(t => t.Id);
        decimal totalAmount = 0;
        var participants = new List<BookingParticipant>();

        foreach (var p in request.Participants)
        {
            decimal price = tour.BasePrice;
            if (p.PricingTierId.HasValue && tiers.TryGetValue(p.PricingTierId.Value, out var tier))
            {
                price = tier.PricePerGuest;
            }

            totalAmount += price;

            participants.Add(new BookingParticipant
            {
                FullName = p.FullName.Trim(),
                PhoneNumber = p.PhoneNumber?.Trim(),
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
        var endDate = request.StartDate.Date.AddDays(Math.Max(1, tour.DurationDays) - 1);

        var booking = new Booking
        {
            BookingCode = code,
            CustomerId = customerId,
            TourId = tour.Id,
            StartDate = request.StartDate.Date,
            EndDate = endDate,
            TotalGuests = participants.Count,
            TotalAmount = totalAmount,
            DepositAmount = depositAmount,
            PaidAmount = 0,
            Status = BookingStatus.Pending,
            PaymentStatus = PaymentStatus.Unpaid,
            ContactName = request.ContactName.Trim(),
            ContactPhone = request.ContactPhone.Trim(),
            ContactEmail = request.ContactEmail.Trim().ToLowerInvariant(),
            SpecialRequests = request.SpecialRequests?.Trim(),
            Participants = participants
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
            b.StartDate, b.TotalGuests, b.TotalAmount, b.PaidAmount,
            b.Status.ToString(), b.PaymentStatus.ToString(), b.CreatedAt)).ToList();

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
            b.StartDate, b.TotalGuests, b.TotalAmount, b.PaidAmount,
            b.Status.ToString(), b.PaymentStatus.ToString(), b.CreatedAt)).ToList();

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

        booking.PaidAmount = Money(booking.PaidAmount + request.Amount);

        if (booking.PaidAmount >= booking.TotalAmount)
        {
            booking.PaymentStatus = PaymentStatus.Paid;
            if (booking.Status is BookingStatus.Pending or BookingStatus.Deposited or BookingStatus.Confirmed)
                booking.Status = BookingStatus.Paid;
        }
        else if (booking.PaidAmount > 0)
        {
            booking.PaymentStatus = PaymentStatus.PartiallyPaid;
            if (booking.PaidAmount >= booking.DepositAmount && booking.Status == BookingStatus.Pending)
                booking.Status = BookingStatus.Deposited;
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
        booking.SpecialRequests = $"{booking.SpecialRequests} [Khách hủy: {request.Reason}]".Trim();

        await repository.SaveChangesAsync(ct);
        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
    }

    // WF06: Phân công Hướng dẫn viên
    public async Task<BookingDto> AssignGuide(string agencyId, int id, GuideAssignmentRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId)
            throw new BookingException(403, "Chỉ Agency sở hữu tour mới có quyền phân công hướng dẫn viên.");

        var guide = await repository.FindUser(request.GuideId, ct);
        if (guide is null || guide.Status != UserStatus.Active)
            throw new BookingException(404, "Hướng dẫn viên không tồn tại hoặc đã bị vô hiệu hóa.");

        var existing = booking.AssignedGuides.FirstOrDefault(ag => ag.GuideId == request.GuideId);
        if (existing is null)
        {
            booking.AssignedGuides.Add(new BookingAssignedGuide
            {
                BookingId = id,
                GuideId = request.GuideId,
                Role = request.Role ?? "Lead",
                Status = "ASSIGNED",
                Notes = request.Notes
            });
        }
        else
        {
            existing.Role = request.Role ?? existing.Role;
            existing.Notes = request.Notes ?? existing.Notes;
            existing.Status = "ASSIGNED";
        }

        await repository.SaveChangesAsync(ct);
        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
    }

    // WF06: Guide xem danh sách tour được giao
    public async Task<BookingPage<BookingListItem>> ListForGuide(string guideId, int page, int pageSize, CancellationToken ct)
    {
        var (rows, total) = await repository.ListForGuide(guideId, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
        var items = rows.Select(b => new BookingListItem(
            b.Id, b.BookingCode, b.Tour?.Name, b.Customer?.Name, b.ContactPhone,
            b.StartDate, b.TotalGuests, b.TotalAmount, b.PaidAmount,
            b.Status.ToString(), b.PaymentStatus.ToString(), b.CreatedAt)).ToList();

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

        await repository.SaveChangesAsync(ct);

        return new ParticipantDto(
            participant.Id, participant.FullName, participant.PhoneNumber,
            participant.DateOfBirth, participant.Gender, participant.IdentityNumber,
            participant.AttendanceStatus.ToString(), participant.Status,
            participant.AssignedGuide?.Guide?.Name);
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
            Title = string.IsNullOrWhiteSpace(request.IncidentType) ? request.Title.Trim() : $"[{request.IncidentType.Trim()}] {request.Title.Trim()}",
            Description = request.Description.Trim(),
            ResolutionNotes = request.Severity?.Trim(),
            Status = IncidentStatus.Reported,
            ReportedBy = guideId
        };

        repository.AddIncident(incident);
        await repository.SaveChangesAsync(ct);

        return new IncidentDto(
            incident.Id, incident.BookingId,
            incident.Title, incident.Description, incident.ResolutionNotes,
            incident.Status.ToString(), incident.CreatedAt);
    }

    private static BookingDto ToDto(Booking b, string? tourName, string? agencyId, string? agencyName) =>
        new(b.Id, b.BookingCode, b.CustomerId, b.Customer?.Name ?? "",
            b.TourId, tourName, agencyId, agencyName,
            b.StartDate, b.EndDate, b.TotalGuests, b.TotalAmount,
            b.DepositAmount, b.PaidAmount, b.Status.ToString(), b.PaymentStatus.ToString(),
            b.ContactName, b.ContactPhone, b.ContactEmail, b.SpecialRequests,
            b.Participants.Select(p => new ParticipantDto(
                p.Id, p.FullName, p.PhoneNumber, p.DateOfBirth, p.Gender,
                p.IdentityNumber, p.AttendanceStatus.ToString(), p.Status,
                p.AssignedGuide?.Guide?.Name)).ToList(),
            b.AssignedGuides.Select(ag => new AssignedGuideDto(
                ag.Id, ag.GuideId, ag.Guide?.Name ?? "", ag.Guide?.Phone,
                ag.Role, ag.Status, ag.Notes)).ToList(),
            b.CreatedAt, b.UpdatedAt);
}
