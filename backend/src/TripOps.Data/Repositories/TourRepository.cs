using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Data.Repositories;

public sealed class TourRepository(TripOpsDbContext db)
{
    private IQueryable<Tour> Details() => db.Tours
        .Include(t => t.PricingTiers)
        .Include(t => t.Timelines).ThenInclude(d => d.Attractions)
        .Include(t => t.Timelines).ThenInclude(d => d.Meals)
        .Include(t => t.Timelines).ThenInclude(d => d.Accommodations).AsSplitQuery();

    private static IQueryable<Tour> Public(IQueryable<Tour> query) => query.Where(t =>
        t.Status == TourStatus.Completed && t.Visibility == TourVisibility.Public && !t.IsRequest &&
        !t.Agency.IsDeleted && t.Agency.Status == UserStatus.Active && t.Agency.Role == UserRole.TravelAgency &&
        t.Agency.BusinessProfile != null && t.Agency.BusinessProfile.Status == BusinessProfileStatus.Approved);

    public Task<Tour?> Find(int id, string? owner, bool publicOnly, CancellationToken ct, bool includeDeleted = false)
    {
        var query = Details();
        if (includeDeleted) query = query.IgnoreQueryFilters();
        query = query.Where(t => t.Id == id);
        if (owner != null) query = query.Where(t => t.AgencyId == owner);
        if (publicOnly) query = Public(query).AsNoTracking();
        return query.SingleOrDefaultAsync(ct);
    }

    public async Task<(List<Tour> Rows, int Total)> List(string? owner, bool publicOnly,
        TourStatus? status, string? search, string? destination,
        decimal? maxPrice, int? headcount, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Tours.AsNoTracking();
        if (owner != null) query = query.Where(t => t.AgencyId == owner);
        if (publicOnly) query = Public(query);
        if (status != null) query = query.Where(t => t.Status == status);
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(t => t.Name.Contains(search));
        if (!string.IsNullOrWhiteSpace(destination)) query = query.Where(t => t.Destination != null && t.Destination.Contains(destination));
        if (maxPrice != null) query = query.Where(t => t.BasePrice <= maxPrice);
        if (headcount != null) query = query.Where(t => (t.MinGuests == null || t.MinGuests <= headcount) && (t.MaxGuests == null || t.MaxGuests >= headcount));
        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(t => t.CreatedAt).ThenBy(t => t.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (rows, total);
    }

    public Task<List<Entities.Service>> EligibleServices(int[] ids, CancellationToken ct) => db.Services.AsNoTracking()
        .Where(s => ids.Contains(s.Id) && s.Status == ServiceStatus.Approved && !s.Provider.IsDeleted &&
            s.Provider.Status == UserStatus.Active && s.Provider.Role == UserRole.Provider &&
            s.Provider.BusinessProfile != null && s.Provider.BusinessProfile.Status == BusinessProfileStatus.Approved)
        .ToListAsync(ct);

    public async Task<(List<Entities.Service> Rows, int Total)> Catalogue(ServiceCategory? category,
        string? search, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Services.AsNoTracking().Where(s => s.Status == ServiceStatus.Approved &&
            !s.Provider.IsDeleted && s.Provider.Status == UserStatus.Active && s.Provider.Role == UserRole.Provider &&
            s.Provider.BusinessProfile != null && s.Provider.BusinessProfile.Status == BusinessProfileStatus.Approved);
        if (category != null) query = query.Where(s => s.Category == category);
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(s => s.Name.Contains(search));
        var total = await query.CountAsync(ct);
        return (await query.OrderBy(s => s.Name).ThenBy(s => s.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct), total);
    }

    public Task<bool> HasVersion(int id, int number, CancellationToken ct) =>
        db.TourVersions.AnyAsync(v => v.TourId == id && v.VersionNumber == number, ct);

    public Task<TourVersion?> Version(int id, int number, CancellationToken ct) => db.TourVersions.AsNoTracking()
        .SingleOrDefaultAsync(v => v.TourId == id && v.VersionNumber == number, ct);

    public async Task<(List<TourVersion> Rows, int Total)> VersionPage(int id, int page, int pageSize, CancellationToken ct)
    {
        var query = db.TourVersions.AsNoTracking().Where(v => v.TourId == id);
        var total = await query.CountAsync(ct);
        // History lists do not load potentially large configuration snapshots.
        var rows = await query.OrderByDescending(v => v.VersionNumber).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(v => new TourVersion { VersionNumber = v.VersionNumber, ChangeLog = v.ChangeLog,
                CreatedBy = v.CreatedBy, Price = v.Price, CreatedAt = v.CreatedAt }).ToListAsync(ct);
        return (rows, total);
    }

    public void Add(Tour tour) => db.Tours.Add(tour);
    public void AddVersion(Tour tour, TourVersion version) => tour.Versions.Add(version);
    public void RemoveConfiguration(Tour tour)
    {
        db.TourPricingTiers.RemoveRange(tour.PricingTiers);
        db.TourTimelines.RemoveRange(tour.Timelines);
        tour.PricingTiers.Clear();
        tour.Timelines.Clear();
    }
    // One SaveChanges transaction includes the aggregate, children, and immutable history.
    public Task<int> Save(CancellationToken ct) => db.SaveChangesAsync(ct);
}
