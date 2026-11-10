using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Data.Repositories;

public sealed class BookingRepository(TripOpsDbContext db)
{
    public Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginGuideAssignment(CancellationToken ct) => db.Database.BeginTransactionAsync(ct);
    public Task<int> LockGuide(string guideId, CancellationToken ct) => db.Users.Where(u => u.Id == guideId)
        .ExecuteUpdateAsync(s => s.SetProperty(u => u.UpdatedAt, u => u.UpdatedAt), ct);
    public async Task<bool> GuideHasConflict(string guideId, int bookingId, DateTime start, DateTime end, CancellationToken ct)
    {
        var trips = await db.Bookings.AsNoTracking().IgnoreQueryFilters().Include(b => b.Timelines).Include(b => b.Tour)
            .Where(b => b.Id != bookingId && b.AssignedGuides.Any(g => g.GuideId == guideId)
                && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.Rejected && b.Status != BookingStatus.Completed)
            .ToListAsync(ct);
        return trips.Any(b => b.StartDate.Date <= end.Date &&
            b.StartDate.Date.AddDays(Math.Max(1, b.Timelines.Select(t => t.DayNumber).DefaultIfEmpty(b.Tour?.DurationDays ?? 1).Max()) - 1) >= start.Date);
    }
    private IQueryable<Booking> Details() => db.Bookings
        .Include(b => b.Customer)
        .Include(b => b.Tour!).ThenInclude(t => t.Agency).ThenInclude(a => a.BusinessProfile)
        .Include(b => b.Participants!).ThenInclude(p => p.AssignedGuide)
        .Include(b => b.AssignedGuides!).ThenInclude(ag => ag.Guide)
        .Include(b => b.Incidents)
        .Include(b => b.PaymentTransactions)
        .Include(b => b.PaymentRequests)
        .Include(b => b.RefundRequests)
        .Include(b => b.Contracts)
        .Include(b => b.PriceAdjustments).ThenInclude(a => a.Adjuster)
        .Include(b => b.Timelines).ThenInclude(t => t.Attractions)
        .Include(b => b.Timelines).ThenInclude(t => t.Meals)
        .Include(b => b.Accommodations)
        .AsSplitQuery();

    public Task<Booking?> Find(int id, CancellationToken ct) =>
        Details().SingleOrDefaultAsync(b => b.Id == id, ct);

    public Task<Booking?> FindByCode(string code, CancellationToken ct) =>
        Details().SingleOrDefaultAsync(b => b.BookingCode == code, ct);

    public async Task<(List<Booking> Rows, int Total)> ListForCustomer(
        string customerId, BookingStatus? status, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Bookings.AsNoTracking()
            .Include(b => b.Tour)
            .Include(b => b.Customer)
            .Include(b => b.Participants)
            .Include(b => b.PaymentTransactions)
            .Include(b => b.PaymentRequests).AsSplitQuery()
            .Where(b => b.CustomerId == customerId);

        if (status.HasValue)
            query = query.Where(b => b.Status == status.Value);

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        return (rows, total);
    }

    public async Task<(List<Booking> Rows, int Total)> ListForAgency(
        string agencyId, BookingStatus? status, string? search, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Bookings.AsNoTracking()
            .Include(b => b.Tour)
            .Include(b => b.Customer)
            .Include(b => b.Participants)
            .Include(b => b.PaymentTransactions)
            .Include(b => b.PaymentRequests).AsSplitQuery()
            .Where(b => b.Tour != null && b.Tour.AgencyId == agencyId);

        if (status.HasValue)
            query = query.Where(b => b.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(b => b.BookingCode.Contains(s) ||
                                     (b.ContactName != null && b.ContactName.Contains(s)) ||
                                     (b.ContactPhone != null && b.ContactPhone.Contains(s)) ||
                                     (b.Tour != null && b.Tour.Name != null && b.Tour.Name.Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        return (rows, total);
    }

    public async Task<(List<Booking> Rows, int Total)> ListForGuide(
        string guideId, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Bookings.AsNoTracking()
            .Include(b => b.Tour)
            .Include(b => b.Customer)
            .Include(b => b.Participants)
            .Include(b => b.PaymentTransactions)
            .Include(b => b.PaymentRequests).AsSplitQuery()
            .Where(b => b.AssignedGuides.Any(ag => ag.GuideId == guideId));

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(b => b.StartDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        return (rows, total);
    }

    public Task<Tour?> FindBookableTour(int tourId, string customerId, CancellationToken ct) =>
        db.Tours.Include(t => t.PricingTiers)
            .Include(t => t.Agency)
            .Include(t => t.Timelines).ThenInclude(t => t.Attractions)
            .Include(t => t.Timelines).ThenInclude(t => t.Meals)
            .Include(t => t.Accommodations).AsSplitQuery()
            .SingleOrDefaultAsync(t => t.Id == tourId &&
                                       t.Status == TourStatus.Completed &&
                                       ((t.Visibility == TourVisibility.Public && t.IsRequest != true) ||
                                        (t.IsRequest == true && t.IsSharedToCustomer == true && t.DesignRequestId.HasValue &&
                                         db.TourDesignRequests.Any(r => r.Id == t.DesignRequestId && r.CustomerId == customerId))) &&
                                       t.Agency.Status == UserStatus.Active && t.Agency.BusinessProfile != null &&
                                       t.Agency.BusinessProfile.Status == BusinessProfileStatus.Approved, ct);

    public Task<int> EligibleServiceCount(int[] ids,CancellationToken ct)=>db.Services.CountAsync(s=>ids.Contains(s.Id)&&s.Status==ServiceStatus.Approved&&!s.IsPaused&&s.Provider.Status==UserStatus.Active&&s.Provider.BusinessProfile!=null&&s.Provider.BusinessProfile.Status==BusinessProfileStatus.Approved,ct);

    public Task<User?> FindUser(string userId, CancellationToken ct) =>
        db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct);

    public Task<List<User>> AvailableGuides(string agencyId, CancellationToken ct) =>
        db.Users.AsNoTracking()
            .Where(u => u.Role == UserRole.TourGuide && u.Status == UserStatus.Active && u.AgencyId == agencyId)
            .OrderBy(u => u.Name).ToListAsync(ct);

    public Task<BookingParticipant?> FindParticipant(int participantId, CancellationToken ct) =>
        db.BookingParticipants.Include(p => p.Booking)
            .SingleOrDefaultAsync(p => p.Id == participantId, ct);

    public async Task<bool> CanStartDesignBooking(Tour tour, string customerId, CancellationToken ct)
    {
        if (!tour.DesignRequestId.HasValue) return true;
        await db.TourDesignRequests.Where(r => r.Id == tour.DesignRequestId).ExecuteUpdateAsync(s => s.SetProperty(r => r.Revision, r => r.Revision + 1), ct);
        var request = await db.TourDesignRequests.AsNoTracking().SingleOrDefaultAsync(r => r.Id == tour.DesignRequestId && r.CustomerId == customerId, ct);
        return request != null && request.AgreedTourId == tour.Id && request.AgreedTourVersion == tour.Version &&
            !await db.Bookings.AnyAsync(b => b.DesignRequestId == request.Id && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.Rejected, ct);
    }
    public void NotifyPayment(Booking booking)
    {
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = booking.CustomerId!, BookingId = booking.Id, Message = "Backend đã xác nhận thanh toán cho Booking." });
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = booking.Tour!.AgencyId, BookingId = booking.Id, Message = "Booking đã nhận thanh toán; tiếp tục đặt dịch vụ chính thức." });
    }
    public void Add(Booking booking) => db.Bookings.Add(booking);
    public Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginCreate(CancellationToken ct) =>
        db.Database.BeginTransactionAsync(ct);

    /// <summary>Đơn của một phiên ký trực tuyến (tìm theo mã băm của mã phiên).</summary>
    public Task<int?> BookingIdForSignToken(string tokenHash, CancellationToken ct) =>
        db.ContractSignSessions.Where(s => s.TokenHash == tokenHash).Select(s => (int?)s.Contract.BookingId).SingleOrDefaultAsync(ct);

    public Task<ContractSignSession?> FindSignSession(string tokenHash, CancellationToken ct) =>
        db.ContractSignSessions.SingleOrDefaultAsync(s => s.TokenHash == tokenHash, ct);

    public Task<List<ContractSignSession>> OpenSignSessions(int contractId, DateTime now, CancellationToken ct) =>
        db.ContractSignSessions.Where(s => s.ContractId == contractId && s.CompletedAt == null && s.ExpiresAt > now).ToListAsync(ct);

    public void AddSignSession(ContractSignSession session) => db.ContractSignSessions.Add(session);

    /// <summary>
    /// Mở giao dịch DB và khóa dòng booking (UPDATE giả) để các thao tác tiền trên cùng một đơn chạy tuần tự:
    /// hai lần bấm thanh toán, IPN và trang return của VNPAY đến cùng lúc sẽ không ghi trùng.
    /// </summary>
    public async Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginPaymentChange(int bookingId, CancellationToken ct)
    {
        var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Bookings.IgnoreQueryFilters().Where(b => b.Id == bookingId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.UpdatedAt, b => b.UpdatedAt), ct);
        return transaction;
    }

    /// <summary>Bỏ các entity đang theo dõi để lần đọc kế tiếp (sau khi đã khóa đơn) lấy dữ liệu mới nhất từ DB.</summary>
    public void ResetTracking() => db.ChangeTracker.Clear();

    public Task<PaymentTransaction?> FindTransaction(string code, CancellationToken ct) =>
        db.PaymentTransactions.AsNoTracking().SingleOrDefaultAsync(t => t.TransactionCode == code, ct);

    /// <summary>Yêu cầu hủy/hoàn tiền cho màn hình Admin, mới nhất trước (chờ duyệt lên đầu).</summary>
    public Task<List<RefundRequest>> ListRefunds(RefundStatus? status, CancellationToken ct)
    {
        IQueryable<RefundRequest> query = db.RefundRequests.AsNoTracking()
            .Include(r => r.Booking).ThenInclude(b => b.Customer)
            .Include(r => r.Booking).ThenInclude(b => b.Tour!).ThenInclude(t => t.Agency)
            .Include(r => r.Booking).ThenInclude(b => b.PaymentTransactions)
            .AsSplitQuery();
        if (status is { } value)
            query = query.Where(r => r.Status == value);
        return query
            .OrderBy(r => r.Status == RefundStatus.Pending ? 0 : 1).ThenByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
            .Take(500)
            .ToListAsync(ct);
    }

    public Task<int?> RefundBookingId(int refundId, CancellationToken ct) =>
        db.RefundRequests.Where(r => r.Id == refundId).Select(r => (int?)r.BookingId).SingleOrDefaultAsync(ct);

    public void AddIncident(BookingIncident incident) => db.BookingIncidents.Add(incident);

    public Task SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
}
