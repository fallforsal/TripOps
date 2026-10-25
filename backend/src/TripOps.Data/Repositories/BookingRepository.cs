using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Data.Repositories;

public sealed class BookingRepository(TripOpsDbContext db)
{
    private IQueryable<Booking> Details() => db.Bookings
        .Include(b => b.Customer)
        .Include(b => b.Tour!).ThenInclude(t => t.Agency)
        .Include(b => b.Participants!).ThenInclude(p => p.AssignedGuide!).ThenInclude(ag => ag.Guide)
        .Include(b => b.AssignedGuides!).ThenInclude(ag => ag.Guide)
        .Include(b => b.Incidents)
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
            .Where(b => b.Tour != null && b.Tour.AgencyId == agencyId);

        if (status.HasValue)
            query = query.Where(b => b.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(b => b.BookingCode.Contains(s) ||
                                     (b.ContactName != null && b.ContactName.Contains(s)) ||
                                     (b.ContactPhone != null && b.ContactPhone.Contains(s)) ||
                                     (b.Tour != null && b.Tour.Name.Contains(s)));
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
            .Where(b => b.AssignedGuides.Any(ag => ag.GuideId == guideId));

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(b => b.StartDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        return (rows, total);
    }

    public Task<Tour?> FindPublicTour(int tourId, CancellationToken ct) =>
        db.Tours.Include(t => t.PricingTiers)
            .Include(t => t.Agency)
            .SingleOrDefaultAsync(t => t.Id == tourId &&
                                       t.Status == TourStatus.Completed &&
                                       t.Visibility == TourVisibility.Public, ct);

    public Task<User?> FindUser(string userId, CancellationToken ct) =>
        db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct);

    public Task<BookingParticipant?> FindParticipant(int participantId, CancellationToken ct) =>
        db.BookingParticipants.Include(p => p.Booking)
            .SingleOrDefaultAsync(p => p.Id == participantId, ct);

    public void Add(Booking booking) => db.Bookings.Add(booking);

    public void AddIncident(BookingIncident incident) => db.BookingIncidents.Add(incident);

    public Task SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
}
