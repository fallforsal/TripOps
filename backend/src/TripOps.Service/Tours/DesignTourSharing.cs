using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Service.Tours;

public sealed partial class TourService
{
    public async Task<TourDto> CloneForRequest(string actor, int requestId, DesignCloneInput input, CancellationToken ct)
    {
        var source = await Owned(actor, input.TourId, ct);
        Require(source.IsRequest != true, "Hãy chọn tour có sẵn của Agency làm mẫu.");
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await LockDesignRequest(actor, requestId, ct);
        var created = await CreateForRequest(actor, requestId, DefaultServicesOnly(Configuration(source)) with { Code = null, Name = "Tour riêng: " + (source.Name ?? "Tour") }, ct);
        var tour = await db.Tours.SingleAsync(t => t.Id == created.Id, ct);
        tour.ClonedFromTourId = source.Id;
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return Dto(tour);
    }
    private static TourConfiguration DefaultServicesOnly(TourConfiguration configuration) => configuration with {
        Timelines = configuration.Timelines?.Select(day => day with {
            Meals = day.Meals?.Where(meal => meal.IsDefault).ToArray(),
            Accommodations = day.Accommodations?.Where(hotel => hotel.IsDefault).ToArray()
        }).ToArray()
    };
    public async Task<TourDto> SaveForRequest(string actor, int requestId, SaveDesignTourInput input, CancellationToken ct)
    {
        await Agency(actor, ct);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await LockDesignRequest(actor, requestId, ct);
        var request = await db.TourDesignRequests.SingleAsync(r => r.Id == requestId && r.AgencyId == actor, ct);
        Require(request.Status == CustomRequestStatus.InProgress, "Yêu cầu chưa tiếp nhận hoặc đã đóng.");
        await Validate(input.Configuration, input.Complete, ct, actor);
        var id = await db.Tours.Where(t => t.DesignRequestId == requestId).Select(t => (int?)t.Id).SingleOrDefaultAsync(ct);
        Tour tour;
        if (id.HasValue) {
            tour = await Owned(actor, id.Value, ct);
            if (!input.Version.HasValue) throw Conflict();
            Expected(tour, input.Version.Value);
            await Baseline(tour, actor, ct);
            restoredVersion = await db.TourVersions.Where(v => v.TourId == tour.Id && v.VersionNumber == tour.Version)
                .Select(v => v.RestoredFromVersion).SingleOrDefaultAsync(ct);
            tour.Version = (tour.Version ?? 1) + 1;
        } else {
            if (input.Version.HasValue) throw Conflict();
            tour = new Tour { AgencyId = actor, Code = $"TC-{Guid.NewGuid():N}", IsRequest = true, DesignRequestId = requestId, Version = 1 };
            repository.Add(tour);
        }
        Apply(tour, input.Configuration);
        tour.Status = input.Complete ? TourStatus.Completed : TourStatus.Draft;
        tour.Visibility = TourVisibility.Hidden;
        var result = await Save(tour, actor, input.Reason?.Trim() is { Length: > 0 } note ? note : "Lưu phương án thiết kế", ct);
        await tx.CommitAsync(ct);
        return result;
    }
    private async Task LockDesignRequest(string actor, int requestId, CancellationToken ct)
    {
        var count = await db.TourDesignRequests.Where(r => r.Id == requestId && r.AgencyId == actor)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Revision, r => r.Revision + 1), ct);
        if (count == 0) throw new TourException(404, "Không tìm thấy yêu cầu.");
    }
    public async Task<TourDto> ShareForRequest(string actor, int requestId, TourCommand input, CancellationToken ct)
    {
        await Agency(actor, ct);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await LockDesignRequest(actor, requestId, ct);
        var request = await db.TourDesignRequests.SingleAsync(r => r.Id == requestId && r.AgencyId == actor, ct);
        Require(request.Status == CustomRequestStatus.InProgress, "Yêu cầu chưa tiếp nhận hoặc đã đóng.");
        Require(!await db.Bookings.AnyAsync(b => b.DesignRequestId == requestId && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.Rejected, ct), "Yêu cầu đã có booking.");
        var tour = await repository.Find((await db.Tours.Where(t => t.DesignRequestId == requestId).Select(t => (int?)t.Id).SingleOrDefaultAsync(ct)) ?? 0, actor, false, ct)
            ?? throw new TourException(404, "Chưa có tour thiết kế.");
        Expected(tour, input.Version);
        Require(tour.Status == TourStatus.Completed, "Hãy hoàn tất và lưu tour trước khi chia sẻ.");
        await Validate(Configuration(tour), true, ct, actor);
        if (tour.SharedVersion != tour.Version) {
            var version = await db.TourVersions.SingleAsync(v => v.TourId == tour.Id && v.VersionNumber == tour.Version, ct);
            version.SharedAt ??= DateTime.UtcNow; version.SharedBy ??= actor;
            tour.SharedVersion = tour.Version;
            db.WorkflowNotifications.Add(new WorkflowNotification { UserId = request.CustomerId!, RequestId = requestId, Message = $"Agency đã chia sẻ phương án tour phiên bản {tour.Version}." });
            await db.SaveChangesAsync(ct);
        }
        await tx.CommitAsync(ct); return Dto(tour);
    }
    private async Task<TourDto> SharedTour(string actor, int requestId, CancellationToken ct)
    {
        var user = await accounts.Current(actor, ct);
        Require(user.Role == UserRole.Customer, "Cần tài khoản khách hàng.");
        _ = await db.TourDesignRequests.AsNoTracking().SingleOrDefaultAsync(r => r.Id == requestId && r.CustomerId == actor && r.Status == CustomRequestStatus.InProgress, ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu đang xử lý.");
        var tour = await db.Tours.AsNoTracking().SingleOrDefaultAsync(t => t.DesignRequestId == requestId && t.SharedVersion.HasValue && t.Status != TourStatus.Deleted, ct)
            ?? throw new TourException(404, "Agency chưa chia sẻ phương án.");
        var version = await db.TourVersions.AsNoTracking().SingleAsync(v => v.TourId == tour.Id && v.VersionNumber == tour.SharedVersion, ct);
        var snapshot = JsonSerializer.Deserialize<TourSnapshot>(version.SnapshotData, Json)!;
        return new TourDto(tour.Id, tour.AgencyId, tour.Code, "completed", "hidden", true, tour.IsAiGenerated == true,
            version.VersionNumber, DesignRequestService.CustomerConfiguration(snapshot.Configuration), tour.CreatedAt ?? DateTime.UnixEpoch,
            version.SharedAt ?? version.CreatedAt ?? DateTime.UnixEpoch, requestId, tour.SharedVersion);
    }
    public async Task<Tour> BookingSnapshot(Tour identity, CancellationToken ct)
    {
        if (identity.IsRequest != true) return identity;
        var version = await db.TourVersions.AsNoTracking().SingleOrDefaultAsync(v => v.TourId == identity.Id && v.VersionNumber == identity.SharedVersion, ct)
            ?? throw new TourException(409, "Phương án chưa được chia sẻ.");
        return MaterializeSnapshot(identity, version);
    }
    internal static Tour MaterializeSnapshot(Tour identity, TourVersion version)
    {
        var c = JsonSerializer.Deserialize<TourSnapshot>(version.SnapshotData, Json)!.Configuration;
        var tour = new Tour { Id = identity.Id, AgencyId = identity.AgencyId, Agency = identity.Agency,
            Code = identity.Code, DesignRequestId = identity.DesignRequestId, IsRequest = identity.IsRequest,
            Version = version.VersionNumber, SharedVersion = identity.SharedVersion, Status = TourStatus.Completed,
            Visibility = TourVisibility.Hidden };
        var normalizedProvinces = VietnamProvinceCatalog.NormalizeDistinct(c.ProvinceCodes);
        tour.Name = c.Name.Trim(); tour.Destination = c.Destination;
        tour.DepartureLocation = string.IsNullOrWhiteSpace(c.DepartureLocation) ? null : c.DepartureLocation.Trim();
        tour.DurationDays = c.DurationDays; tour.DurationNights = c.DurationNights; tour.BasePrice = Money(c.BasePrice);
        tour.DurationTour = $"{c.DurationDays} ngày {c.DurationNights} đêm";
        tour.ThumbnailUrls = JsonSerializer.Serialize((c.Images ?? []).Take(1), Json);
        tour.MinGuests = c.MinGuests; tour.MaxGuests = c.MaxGuests; tour.OperationPeriod = c.OperationPeriod;
        tour.Highlights = c.Highlights; tour.Inclusions = c.Inclusions; tour.Exclusions = c.Exclusions;
        tour.CancellationPolicy = c.CancellationPolicy; tour.Message = c.Message;
        tour.Images = JsonSerializer.Serialize(c.Images ?? [], Json);
        tour.Provinces = normalizedProvinces.Select(code => new TourProvince { ProvinceCode = code }).ToList();
        tour.PricingTiers = (c.PricingTiers ?? []).Select((p, index) => new TourPricingTier { Id = index + 1, Name = p.Name, AgencyId = tour.AgencyId ?? "",
            MinAge = p.MinAge, MaxAge = p.MaxAge, DisplayOrder = p.DisplayOrder, PricePerGuest = Money(p.PricePerGuest) }).ToList();
        tour.Timelines = (c.Timelines ?? []).Select(d => new TourTimeline {
            DayNumber = d.DayNumber, Title = d.Title, Description = d.Description,
            Attractions = (d.Activities ?? []).Select(a => new TouristAttraction { Name = a.Name, AgencyId = tour.AgencyId ?? "", Time = a.EstimatedTime.HasValue ? new DateTime(2000,1,1).Add(a.EstimatedTime.Value) : null
                 }).ToList(),
            Meals = (d.Meals ?? []).Select(m => new TourMeal { MealType = m.MealType, RestaurantName = m.RestaurantName, AgencyId = tour.AgencyId ?? "",
                ServiceId = m.ServiceId, SupplierSource = SupplierSources.Resolve(m.SupplierSource, m.ServiceId), AgencySupplierId = m.AgencySupplierId,
                SupplierSnapshot = m.Supplier is null ? null : JsonSerializer.Serialize(m.Supplier, Json), Time = m.Time.HasValue ? new DateTime(2000,1,1).Add(m.Time.Value) : null, Description = m.Description, IsDefault = m.IsDefault, PriceDifference = Money(m.PriceDifference) }).ToList(),
        }).ToList();
        tour.Accommodations = (c.Timelines ?? []).SelectMany(d => d.Accommodations ?? []).Select(a => new TourAccommodation {
            Tour = tour, AgencyId = tour.AgencyId, ServiceId = a.ServiceId, HotelName = a.HotelName, DestinationName = a.DestinationName,
            NightsCount = a.NightsCount, StarRating = a.StarRating, IsDefault = a.IsDefault,
            SupplierSource = SupplierSources.Resolve(a.SupplierSource, a.ServiceId), AgencySupplierId = a.AgencySupplierId,
            SupplierSnapshot = a.Supplier is null ? null : JsonSerializer.Serialize(a.Supplier, Json),
            PriceDifference = Money(a.PriceDifference), AddressNotes = a.AddressNotes }).ToList();

        return tour;
    }
}
