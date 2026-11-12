using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Data.Repositories;
using TripOps.Service.Accounts;

namespace TripOps.Service.Tours;

public sealed partial class TourService(TourRepository repository, AccountService accounts, IItineraryDraftGenerator generator, TripOps.Data.TripOpsDbContext db)
{
    private readonly System.Runtime.CompilerServices.ConditionalWeakTable<Tour, TourConfiguration> pending = new();
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static string State<T>(T value) where T : Enum => value.ToString().ToLowerInvariant();
    private static string State<T>(T? value) where T : struct, Enum => value?.ToString().ToLowerInvariant() ?? "";
    private static TourException Conflict() => new(409, "The tour state or version has changed. Reload the tour.");
    private static void Require(bool condition, string message) { if (!condition) throw new TourException(422, message); }

    public async Task Agency(string actor, CancellationToken ct)
    {
        var user = await accounts.Current(actor, ct);
        if (user.Role != UserRole.TravelAgency || user.BusinessProfile?.Status != BusinessProfileStatus.Approved)
            throw new TourException(403, "An approved Agency account is required.");
    }
    private async Task Admin(string actor, CancellationToken ct)
    {
        if ((await accounts.Current(actor, ct)).Role != UserRole.Admin)
            throw new TourException(403, "Administrator access is required.");
    }
    private async Task<Tour> Owned(string actor, int id, CancellationToken ct, bool includeDeleted = false)
    {
        await Agency(actor, ct);
        return await repository.Find(id, actor, false, ct, includeDeleted) ?? throw new TourException(404, "Tour not found.");
    }
    private static void Expected(Tour tour, int revision)
    {
        if (tour.Revision != revision || tour.Status == TourStatus.Deleted) throw Conflict();
    }
    private static decimal Money(decimal value) => decimal.Round(value, 0, MidpointRounding.AwayFromZero);
    private static SupplierDto SupplierDto(AgencySupplier s) => new(s.Id, s.SupplierType, s.Name, s.Address, s.Area,
        s.ContactName, s.ContactPhone, s.ContactEmail, s.StarRating, s.ReferencePrice, s.Conditions, s.Notes,
        s.Status, s.CreatedAt ?? DateTime.UtcNow, s.UpdatedAt ?? DateTime.UtcNow);
    public async Task<IReadOnlyList<SupplierDto>> Suppliers(string actor, string? type, string? search, CancellationToken ct)
    {
        await Agency(actor, ct);
        Require(type is null or AgencySupplier.Hotel or AgencySupplier.Restaurant, "Invalid supplier type.");
        return (await repository.SupplierDirectory(actor, type, search?.Trim(), ct)).Select(SupplierDto).ToArray();
    }
    public async Task<SupplierDto> CreateSupplier(string actor, SupplierRequest request, CancellationToken ct)
    {
        await Agency(actor, ct); ValidateObject(request);
        var supplier = new AgencySupplier { AgencyId = actor };
        AssignSupplier(supplier, request);
        repository.AddSupplier(supplier); await repository.Save(ct);
        return SupplierDto(supplier);
    }
    public async Task<SupplierDto> GetSupplier(string actor, int id, CancellationToken ct)
    {
        await Agency(actor, ct);
        var supplier = await repository.Supplier(actor, id, ct);
        if (supplier is null || supplier.Status != AgencySupplier.Active)
            throw new TourException(404, "Nhà cung cấp không còn trong danh bạ.");
        return SupplierDto(supplier);
    }
    public async Task DeleteSupplier(string actor, int id, CancellationToken ct)
    {
        await Agency(actor, ct);
        var supplier = await repository.Supplier(actor, id, ct)
            ?? throw new TourException(404, "Nhà cung cấp không có trong danh bạ.");
        if (supplier.Status == AgencySupplier.Archived) return;
        // Keep FK references and per-tour snapshots intact; only remove from future directory choices.
        supplier.Status = AgencySupplier.Archived;
        supplier.UpdatedAt = DateTime.UtcNow;
        await repository.Save(ct);
    }
    public async Task<SupplierDto> UpdateSupplier(string actor, int id, SupplierRequest request, CancellationToken ct)
    {
        await Agency(actor, ct); ValidateObject(request);
        var supplier = await repository.Supplier(actor, id, ct) ?? throw new TourException(404, "Supplier not found.");
        if (supplier.Status != AgencySupplier.Active)
            throw new TourException(404, "Nhà cung cấp không còn trong danh bạ.");
        Require(supplier.SupplierType == request.Type, "Supplier type cannot be changed.");
        AssignSupplier(supplier, request); await repository.Save(ct);
        return SupplierDto(supplier);
    }
    private static void AssignSupplier(AgencySupplier s, SupplierRequest r)
    {
        s.SupplierType = r.Type; s.Name = r.Name.Trim(); s.Address = r.Address; s.Area = r.Area;
        s.ContactName = r.ContactName; s.ContactPhone = r.ContactPhone; s.ContactEmail = r.ContactEmail;
        s.StarRating = r.StarRating; s.ReferencePrice = r.ReferencePrice; s.Conditions = r.Conditions;
        s.Notes = r.Notes; s.UpdatedAt = DateTime.UtcNow;
        s.Status = r.Status;
    }

    // Also validates calls from non-HTTP boundaries such as AI generation.
    private static void ValidateObject(object value)
    {
        foreach (var parameter in value.GetType().GetConstructors().OrderByDescending(c => c.GetParameters().Length).First().GetParameters())
        {
            var property = value.GetType().GetProperty(parameter.Name!, BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase);
            var field = property?.GetValue(value);
            foreach (var attribute in parameter.GetCustomAttributes<ValidationAttribute>())
                Require(attribute.IsValid(field), $"Invalid {parameter.Name}.");
            if (field is Array array)
            {
                Require(array.Length <= 1000, $"Too many {parameter.Name}.");
                foreach (var item in array)
                {
                    Require(item != null, $"Null {parameter.Name} entries are invalid.");
                    if (item is not string && !item!.GetType().IsPrimitive && !item.GetType().IsEnum) ValidateObject(item);
                }
            }
        }
    }

    private async Task Validate(TourConfiguration config, bool complete, CancellationToken ct, string? actor = null, int? designRequestId = null)
    {
        Require(config != null, "Configuration is required.");
        ValidateObject(config!);
        Require(config!.MinGuests == null || config.MaxGuests == null || config.MinGuests <= config.MaxGuests, "Invalid guest range.");
        Require(config.DurationNights <= config.DurationDays, "Nights cannot exceed duration days.");
        if (config.ProvinceCodes is not null)
        {
            Require(config.ProvinceCodes.Length <= VietnamProvinceCatalog.MaxCount, "Số lượng tỉnh/thành không được vượt quá 63.");
            var seenProvinces = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var rawProvince in config.ProvinceCodes)
            {
                var normalized = VietnamProvinceCatalog.NormalizeCode(rawProvince);
                Require(VietnamProvinceCatalog.IsValidCode(normalized), $"Mã tỉnh/thành không hợp lệ: '{rawProvince}'.");
                Require(seenProvinces.Add(normalized), $"Tỉnh/thành bị trùng lặp: '{normalized}'.");
            }
        }
        foreach (var url in config.Images ?? []) Require(
            Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == "https" && url.Length <= 2048 ||
            System.Text.RegularExpressions.Regex.IsMatch(url,@"^/api/v1/files/tours/[a-zA-Z0-9-]{1,36}/[a-f0-9]{32}\.(png|jpg)$"),
            "Images must be uploaded files or HTTPS URLs.");
        await ValidateSuppliers(config, actor, complete, ct, designRequestId);
        var linked = (config.Timelines ?? []).SelectMany(d =>
            (d.Meals ?? []).Where(m => m.ServiceId.HasValue && SupplierSources.Resolve(m.SupplierSource, m.ServiceId) == SupplierSources.PlatformPartner).Select(m => (Id: m.ServiceId!.Value, Category: ServiceCategory.Fnb))
            .Concat((d.Accommodations ?? []).Where(a => a.ServiceId.HasValue && SupplierSources.Resolve(a.SupplierSource, a.ServiceId) == SupplierSources.PlatformPartner).Select(a => (Id: a.ServiceId!.Value, Category: ServiceCategory.Hotel)))).ToArray();
        var eligible = await repository.EligibleServices(linked.Select(x => x.Id).Distinct().ToArray(), ct);
        foreach (var link in linked) Require(eligible.Any(x => x.Id == link.Id && x.Category == link.Category), "Selected Provider service is unavailable or has the wrong category.");
        var tiers = config.PricingTiers ?? [];
        foreach (var tier in tiers) Require(tier.MaxAge == null || tier.MinAge <= tier.MaxAge, "Invalid age range.");
        var ages = tiers.OrderBy(t => t.MinAge).ToArray();
        for (var i = 1; i < ages.Length; i++) Require(ages[i].MinAge > (ages[i - 1].MaxAge ?? 150), "Pricing age ranges overlap.");
        var days = config.Timelines ?? [];
        Require(days.Select(d => d.DayNumber).Distinct().Count() == days.Length && days.All(d => d.DayNumber <= config.DurationDays), "Invalid or duplicate itinerary day.");
        var stays = new List<(int StartDay, int EndDay)>();
        foreach (var day in days)
        {
            var activities = day.Activities ?? [];
            Require(activities.Select(a => a.OrderIndex).Distinct().Count() == activities.Length, "Activity order must be unique within each day.");
            foreach (var activity in activities)
            {
                Require(activity.EstimatedTime == null || activity.EstimatedTime >= TimeSpan.Zero && activity.EstimatedTime < TimeSpan.FromDays(1), "Activity time must be within a day.");
            }
            var meals = day.Meals ?? [];
            foreach (var meal in meals)
            {
                Require(meal.MealType is "breakfast" or "lunch" or "dinner", "Invalid meal type.");
                Require(!meal.IsDefault || meal.PriceDifference == 0, "Default meal must have zero price difference.");
            }
            foreach (var group in meals.GroupBy(m => m.MealType)) Require(group.Count(m => m.IsDefault) == 1, "Each meal group needs one default.");
            var hotels = day.Accommodations ?? [];
            foreach (var hotel in hotels)
            {
                Require(!hotel.IsDefault || hotel.PriceDifference == 0, "Default accommodation must have zero price difference.");
                Require(day.DayNumber + hotel.NightsCount - 1 <= config.DurationNights, "Accommodation exceeds tour nights.");
            }
            if (hotels.Length > 0)
            {
                Require(hotels.Count(h => h.IsDefault) == 1, "Each accommodation group needs one default.");
                var defaultStay = hotels.Single(h => h.IsDefault);
                Require(hotels.All(h => h.NightsCount == defaultStay.NightsCount), "Accommodation alternatives must cover the same stay as their default.");
                // One group represents a continuous stay anchored to this day, not a
                // separate copy for every covered night. Alternatives are not additive.
                if (defaultStay.NightsCount > 0)
                    stays.Add((day.DayNumber, day.DayNumber + defaultStay.NightsCount));
            }
        }
        var orderedStays = stays.OrderBy(s => s.StartDay).ToArray();
        for (var i = 1; i < orderedStays.Length; i++)
            Require(orderedStays[i].StartDay >= orderedStays[i - 1].EndDay, "Accommodation stays overlap; list a continuous stay only on its starting day.");
        if (complete)
        {
            if(config.AgencyPricing!=null) Require(config.AgencyPricing.All(p=>p.Tiers.Length>0 && p.Tiers.Length==tiers.Length),"Mỗi Agency đã tham gia cần nhập giá đầy đủ cho các khung vé chung trước khi hoàn tất.");
            Require(!string.IsNullOrWhiteSpace(config.Destination), "Destination is required for publication.");
            Require(config.ProvinceCodes is { Length: > 0 }, "Vui lòng chọn ít nhất một tỉnh/thành tour đi qua trước khi hoàn tất hoặc đăng bán tour.");
            Require(!string.IsNullOrWhiteSpace(config.CancellationPolicy), "Cancellation policy is required for publication.");
            Require(tiers.Length > 0, "Pricing tiers are required for publication.");
            Require(days.Length == config.DurationDays, "An itinerary for every day is required for publication.");
            Require(config.MinGuests != null && config.MaxGuests != null, "Guest limits are required for publication.");
        }
    }

    private async Task ValidateSuppliers(TourConfiguration config, string? actor, bool complete, CancellationToken ct, int? designRequestId)
    {
        var entries = new List<(string Label, string Name, string Type, string? RawSource, string Source, int? ServiceId, int? SupplierId, SupplierSnapshotInput? Snapshot)>();
        foreach (var day in config.Timelines ?? [])
        {
            foreach (var m in day.Meals ?? [])
                entries.Add(($"Ngày {day.DayNumber} - nhà hàng", m.RestaurantName, AgencySupplier.Restaurant, m.SupplierSource, SupplierSources.Resolve(m.SupplierSource, m.ServiceId), m.ServiceId, m.AgencySupplierId, m.Supplier));
            foreach (var a in day.Accommodations ?? [])
                entries.Add(($"Ngày {day.DayNumber} - khách sạn", a.HotelName, AgencySupplier.Hotel, a.SupplierSource, SupplierSources.Resolve(a.SupplierSource, a.ServiceId), a.ServiceId, a.AgencySupplierId, a.Supplier));
        }
        foreach (var e in entries)
        {
            var who = $"{e.Label} '{e.Name}'";
            Require(e.Source is SupplierSources.PlatformPartner or SupplierSources.AgencySupplier,
                $"{who}: nguồn cung không hợp lệ (chỉ nhận PLATFORM_PARTNER hoặc AGENCY_SUPPLIER).");
            if (e.Source == SupplierSources.PlatformPartner)
            {
                Require(e.ServiceId.HasValue, $"{who}: hãy chọn Platform Partner trên sàn hoặc nhập nhà cung cấp riêng của agency.");
                Require(e.SupplierId is null, $"{who}: Platform Partner không dùng danh bạ nhà cung cấp riêng của agency.");
            }
            else
            {
                Require(e.ServiceId is null, $"{who}: nhà cung cấp của agency không dùng serviceId của Platform Partner.");
                if (complete && SupplierSources.Normalize(e.RawSource) == SupplierSources.AgencySupplier)
                {
                    Require(e.Snapshot is not null &&
                        (!string.IsNullOrWhiteSpace(e.Snapshot.Address) || !string.IsNullOrWhiteSpace(e.Snapshot.Area)) &&
                        e.Snapshot.ReferencePrice > 0,
                        $"{who}: nhà cung cấp của agency cần địa chỉ/khu vực và giá tham khảo hợp lệ.");
                }
            }
            if (e.Snapshot is not null) ValidateObject(e.Snapshot);
        }
        var ids = entries.Where(e => e.SupplierId.HasValue).Select(e => e.SupplierId!.Value).Distinct().ToArray();
        if (ids.Length == 0) return;
        Require(actor is not null, "Cần agency đăng nhập để dùng danh bạ nhà cung cấp.");
        // Both request membership and participation in this version are required.
        var versionOwners=(config.CoHosts??[]).Where(h=>h.Status=="accepted").Select(h=>h.CompanyId).ToArray();
        var partners = designRequestId.HasValue ? await db.TourDesignRequestAgencies.Where(a => a.TourDesignRequestId == designRequestId && a.Status == "accepted" && a.TourDesignRequest.AgencyId == actor && versionOwners.Contains(a.AgencyId)).Select(a => a.AgencyId).ToArrayAsync(ct) : [];
        var allowedOwners = new[] { actor! }.Concat(partners).Distinct().ToArray();
        var owned = await db.AgencySuppliers.AsNoTracking().Where(s => ids.Contains(s.Id) && allowedOwners.Contains(s.AgencyId)).ToListAsync(ct);
        foreach (var e in entries.Where(e => e.SupplierId.HasValue))
            Require(owned.Any(s => s.Id == e.SupplierId && s.SupplierType == e.Type),
                $"{e.Label} '{e.Name}': nhà cung cấp không có trong danh bạ của agency này hoặc sai loại (khách sạn/nhà hàng).");
    }

    private static TourConfiguration NormalizeSources(TourConfiguration c) => c with
    {
        Timelines = c.Timelines?.Select(d => d with
        {
            Meals = d.Meals?.Select(m => m with { SupplierSource = SupplierSources.Resolve(m.SupplierSource, m.ServiceId) }).ToArray(),
            Accommodations = d.Accommodations?.Select(a => a with { SupplierSource = SupplierSources.Resolve(a.SupplierSource, a.ServiceId) }).ToArray()
        }).ToArray()
    };

    private static string[] ExtractProvinces(Tour tour) =>
        tour.Provinces
            .OrderBy(p => p.Id)
            .Select(p => VietnamProvinceCatalog.NormalizeCode(p.ProvinceCode))
            .Where(c => !string.IsNullOrEmpty(c))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

    internal TourConfiguration CurrentConfiguration(Tour tour) => Configuration(tour);
    private TourConfiguration Configuration(Tour tour)
    {
        if (pending.TryGetValue(tour, out var configuration)) return configuration;
        if (tour.ConfigurationData is not null) {
            var current = JsonSerializer.Deserialize<TourConfiguration>(tour.ConfigurationData, Json);
            if (current is not null) {
                var provinces = ExtractProvinces(tour);
                return EnsureOwnership(current with { ProvinceCodes = provinces.Length > 0 ? provinces : current.ProvinceCodes }, tour.AgencyId);
            }
        }
        var relationalProvinces = ExtractProvinces(tour);
        var version = tour.Versions.SingleOrDefault(v => v.VersionNumber == tour.Version);
        if (version is not null)
        {
            try
            {
                var snapshot = JsonSerializer.Deserialize<TourSnapshot>(version.SnapshotData, Json);
                if (snapshot?.SchemaVersion == 1)
                {
                    var snapshotProvinces = VietnamProvinceCatalog.NormalizeDistinct(snapshot.Configuration.ProvinceCodes);
                    var resolvedProvinces = relationalProvinces.Length > 0 ? relationalProvinces : snapshotProvinces;
                    return EnsureOwnership(snapshot.Configuration with { ProvinceCodes = resolvedProvinces },tour.AgencyId);
                }
            }
            catch (JsonException) { /* Legacy rows fall back to their normalized relational data. */ }
        }
        var stays = new Dictionary<int, List<TourAccommodation>>();
        var nextNight = 1;
        var stayStart = 1;
        foreach (var stay in tour.Accommodations.OrderBy(a => a.Id))
        {
            if (stay.IsDefault == true) { stayStart = nextNight; nextNight += stay.NightsCount ?? 0; }
            if (!stays.TryGetValue(stayStart, out var group)) stays[stayStart] = group = [];
            group.Add(stay);
        }
        return new(tour.Name ?? "", null, tour.Destination,
            tour.DurationDays ?? 1, tour.DurationNights ?? 0, tour.BasePrice ?? 0,
            tour.MinGuests, tour.MaxGuests, tour.OperationPeriod, tour.Highlights,
            tour.Inclusions, tour.Exclusions, tour.CancellationPolicy, tour.Message,
            tour.Images is null ? [] : JsonSerializer.Deserialize<string[]>(tour.Images, Json),
            tour.PricingTiers.OrderBy(p => p.DisplayOrder).ThenBy(p => p.Id)
                .Select(p => new PricingTierInput(p.Name ?? "", p.MinAge, p.MaxAge, p.PricePerGuest ?? 0, p.DisplayOrder ?? 0)).ToArray(),
            tour.Timelines.OrderBy(d => d.DayNumber).Select(d => new TimelineInput(d.DayNumber, d.Title ?? "", d.Description,
                d.Attractions.OrderBy(a => a.Id).Select((a, index) => new ActivityInput(a.Name ?? "", null, a.Time.HasValue ? a.Time.Value.TimeOfDay : null, index)).ToArray(),
                d.Meals.OrderBy(m => m.Id).Select(m => new MealInput(m.MealType, m.RestaurantName, m.Description, m.IsDefault == true, m.PriceDifference, m.ServiceId, m.Time.HasValue ? m.Time.Value.TimeOfDay : null, m.SupplierSource, m.AgencySupplierId, m.SupplierSnapshot is null ? null : JsonSerializer.Deserialize<SupplierSnapshotInput>(m.SupplierSnapshot, Json))).ToArray(),
                stays.GetValueOrDefault(d.DayNumber, []).Select(a => new AccommodationInput(a.HotelName, a.DestinationName,
                    null, a.NightsCount ?? 0, a.StarRating ?? 3, a.IsDefault == true, a.PriceDifference ?? 0, a.AddressNotes, a.ServiceId, a.SupplierSource, a.AgencySupplierId, a.SupplierSnapshot is null ? null : JsonSerializer.Deserialize<SupplierSnapshotInput>(a.SupplierSnapshot, Json))).ToArray())).ToArray(),
            tour.DepartureLocation, tour.Code, relationalProvinces);
    }

    private TourDto Dto(Tour t) => new(t.Id, t.AgencyId ?? "", t.Code, State(t.Status), State(t.Visibility),
        t.IsRequest == true, t.IsAiGenerated == true, t.Version ?? 1, Configuration(t),
        t.CreatedAt ?? DateTime.UnixEpoch, t.UpdatedAt ?? t.CreatedAt ?? DateTime.UnixEpoch, t.DesignRequestId, t.SharedVersion, t.Revision, t.HasDraftChanges);

    private void Apply(Tour tour, TourConfiguration c)
    {
        var normalizedProvinces = VietnamProvinceCatalog.NormalizeDistinct(c.ProvinceCodes);
        // Snapshot is authoritative for configuration that database.md stores
        // only in tour_versions (descriptions, activity timing/order, room type).
        c = c with {
            Name = c.Name.Trim(), BasePrice = Money(c.BasePrice),
            DepartureLocation = string.IsNullOrWhiteSpace(c.DepartureLocation) ? null : c.DepartureLocation.Trim(),
            ProvinceCodes = normalizedProvinces,
            PricingTiers = (c.PricingTiers ?? []).Select(p => p with { PricePerGuest = Money(p.PricePerGuest) }).ToArray(),
            Timelines = (c.Timelines ?? []).Select(d => d with {
                Meals = (d.Meals ?? []).Select(m => m with { PriceDifference = Money(m.PriceDifference) }).ToArray(),
                Accommodations = (d.Accommodations ?? []).Select(a => a with { PriceDifference = Money(a.PriceDifference) }).ToArray()
            }).ToArray()
        };
        if(!string.IsNullOrWhiteSpace(c.Code))tour.Code=c.Code.Trim().ToUpperInvariant();
        c=c with {Code=tour.Code};
        pending.Remove(tour);
        pending.Add(tour, c);
        tour.ConfigurationData = JsonSerializer.Serialize(c, Json);
        repository.RemoveConfiguration(tour);
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
        tour.PricingTiers = (c.AgencyPricing ?? [new AgencyPricingInput(tour.AgencyId,c.PricingTiers??[])])
            .SelectMany(agency=>agency.Tiers.Select(tier=>new {agency.AgencyId,Tier=tier})).Select(item=> {var p=item.Tier;return new TourPricingTier { Name = p.Name, AgencyId = item.AgencyId,
            MinAge = p.MinAge, MaxAge = p.MaxAge, DisplayOrder = p.DisplayOrder, PricePerGuest = Money(p.PricePerGuest) }; }).ToList();
        tour.Timelines = (c.Timelines ?? []).Select(d => new TourTimeline {
            DayNumber = d.DayNumber, Title = d.Title, Description = d.Description,
            Attractions = (d.Activities ?? []).Select(a => new TouristAttraction { Name = a.Name, AgencyId = a.AgencyId ?? d.AgencyId ?? tour.AgencyId ?? "", Time = a.EstimatedTime.HasValue ? new DateTime(2000,1,1).Add(a.EstimatedTime.Value) : null
                 }).ToList(),
            Meals = (d.Meals ?? []).Select(m => new TourMeal { MealType = m.MealType, RestaurantName = m.RestaurantName, AgencyId = m.AgencyId ?? d.AgencyId ?? tour.AgencyId ?? "",
                ServiceId = m.ServiceId, SupplierSource = SupplierSources.Resolve(m.SupplierSource, m.ServiceId), AgencySupplierId = m.AgencySupplierId,
                SupplierSnapshot = m.Supplier is null ? null : JsonSerializer.Serialize(m.Supplier, Json), Time = m.Time.HasValue ? new DateTime(2000,1,1).Add(m.Time.Value) : null, Description = m.Description, IsDefault = m.IsDefault, PriceDifference = Money(m.PriceDifference) }).ToList(),
        }).ToList();
        tour.Accommodations = (c.Timelines ?? []).SelectMany(d => (d.Accommodations ?? []).Select(a => new { Accommodation = a, Owner = a.AgencyId ?? d.AgencyId })).Select(item => { var a = item.Accommodation; return new TourAccommodation {
            Tour = tour, AgencyId = item.Owner ?? tour.AgencyId, ServiceId = a.ServiceId, HotelName = a.HotelName, DestinationName = a.DestinationName,
            NightsCount = a.NightsCount, StarRating = a.StarRating, IsDefault = a.IsDefault,
            SupplierSource = SupplierSources.Resolve(a.SupplierSource, a.ServiceId), AgencySupplierId = a.AgencySupplierId,
            SupplierSnapshot = a.Supplier is null ? null : JsonSerializer.Serialize(a.Supplier, Json),
            PriceDifference = Money(a.PriceDifference), AddressNotes = a.AddressNotes }; }).ToList();
    }
    private static void ResetApproval(Tour tour)
    {
        tour.Status = TourStatus.Draft; tour.Visibility = TourVisibility.Hidden;
    }
    private void Snapshot(Tour tour, string actor, string note)
    {
        if (tour.IsRequest != true) return;
        repository.AddVersion(tour, new TourVersion { VersionNumber = tour.Version ?? 1, CreatedBy = actor,
            NumberOfGuests = Configuration(tour).NumberOfGuests,
            Price = tour.BasePrice, ChangeLog = note, SnapshotData = JsonSerializer.Serialize(new TourSnapshot(1,
                tour.Version ?? 1, true, tour.IsAiGenerated == true, State(tour.Status), State(tour.Visibility), Configuration(tour)), Json) });
    }

    private async Task<TourDto> Save(Tour tour, string actor, string note, CancellationToken ct)
    {
        tour.ConfigurationData = JsonSerializer.Serialize(Configuration(tour), Json);
        if (tour.DesignRequestId.HasValue)
        {
            var request = await db.TourDesignRequests.SingleAsync(r => r.Id == tour.DesignRequestId, ct);
            Require(request.Status == CustomRequestStatus.InProgress, "Yêu cầu đã đóng hoặc đã có booking. Hãy mở lại yêu cầu nếu được phép.");
            Require(!await db.Bookings.AnyAsync(b => b.DesignRequestId == request.Id && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.Rejected, ct), "Yêu cầu đã có booking. Hãy thay đổi dịch vụ trên booking, không sửa phương án nguồn.");
            request.Revision++;
            var current = await db.TourVersions.SingleOrDefaultAsync(v => v.TourId == tour.Id && v.VersionNumber == tour.Version, ct);
            if (current is null) { Snapshot(tour, actor, note); tour.HasDraftChanges = false; }
            else {
                // Each design version is editable until the request has a live booking.
                current.SnapshotData = JsonSerializer.Serialize(new TourSnapshot(1, tour.Version ?? 1, true,
                    tour.IsAiGenerated == true, State(tour.Status), State(tour.Visibility), Configuration(tour)), Json);
                current.Price = tour.BasePrice; current.ChangeLog = note; current.CreatedBy = actor;
                current.NumberOfGuests = Configuration(tour).NumberOfGuests;
                tour.HasDraftChanges = false;
            }
        }
        tour.ChangeNote = note;
        if (db.Entry(tour).State != EntityState.Added) tour.Revision++;
        try { await repository.Save(ct); }
        catch (DbUpdateConcurrencyException) { throw Conflict(); }
        catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 }) { throw Conflict(); }
        if(tour.DesignRequestId.HasValue)await EnsureVersionMembers(tour,ct);
        return Dto(tour);
    }

    public async Task<TourDto> Create(string actor, TourConfiguration config, CancellationToken ct)
        => await CreateDraft(actor, config, false, ct);
    public async Task<TourDto> CreateForRequest(string actor, int requestId, TourConfiguration config, CancellationToken ct)
    {
        await Agency(actor, ct);
        var request = await repository.DesignRequest(actor, requestId, ct) ?? throw new TourException(404, "Yêu cầu thiết kế không tồn tại.");
        Require(request.Status == CustomRequestStatus.InProgress, "Yêu cầu không còn ở trạng thái có thể thiết kế.");
        Require(!await db.Tours.AnyAsync(t => t.DesignRequestId == requestId, ct), "Yêu cầu đã có tour thiết kế. Hãy sửa tour hiện có.");
        config = await CollaborationConfiguration(request, MergeDesign(config with {Timelines=[],PricingTiers=[],AgencyPricing=[]},config,actor,actor), ct);
        await Validate(config, false, ct, actor, requestId);
        var tour = new Tour { AgencyId = actor, Code = $"TC-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
            IsRequest = true, DesignRequestId = requestId };
        Apply(tour, config); repository.Add(tour);
        request.Status = CustomRequestStatus.InProgress; request.UpdatedAt = DateTime.UtcNow;
        return await Save(tour, actor, "Created from customer request", ct);
    }
    public Task<TourDto> CustomerRequestTour(string actor, int requestId, CancellationToken ct) => SharedTour(actor, requestId, ct);
    public async Task<IReadOnlyList<TourDto>> CustomerRequestTours(string actor, int requestId, CancellationToken ct)
    {
        if (!await db.TourDesignRequests.AnyAsync(r => r.Id == requestId && r.CustomerId == actor, ct))
            throw new TourException(404, "Không tìm thấy yêu cầu.");
        try { return [await SharedTour(actor, requestId, ct)]; }
        catch (TourException e) when (e.Status == 404) { return []; }
    }
    private async Task<TourDto> CreateDraft(string actor, TourConfiguration config, bool aiGenerated, CancellationToken ct)
    {
        await Agency(actor, ct);
        config = SingleAgencyConfiguration(config,actor);
        await Validate(config, false, ct, actor);
        if(!string.IsNullOrWhiteSpace(config.Code) && await repository.CodeExists(config.Code.Trim().ToUpperInvariant(),0,ct))throw new TourException(409,"Mã tour đã được sử dụng.");
        var tour = new Tour { AgencyId = actor, Code = $"TOUR-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}", IsAiGenerated = aiGenerated };
        Apply(tour, config); repository.Add(tour);
        return await Save(tour, actor, "Created draft", ct);
    }
    public async Task<TourDto> Update(string actor, int id, UpdateTourRequest request, CancellationToken ct)
    {
        ValidateObject(request); var tour = await Owned(actor, id, ct); Expected(tour, request.Revision);
        if (tour.DesignRequestId.HasValue) {
            var design = await db.TourDesignRequests.SingleAsync(r => r.Id == tour.DesignRequestId, ct);
            var config = await CollaborationConfiguration(design, MergeDesign(Configuration(tour),request.Configuration,actor,actor), ct);
            request = request with { Configuration = config };
        }
        else request = request with { Configuration = SingleAgencyConfiguration(request.Configuration,actor) };
        await Validate(request.Configuration, tour.IsRequest != true && tour.Visibility == TourVisibility.Public, ct, actor, tour.DesignRequestId);
        if(!string.IsNullOrWhiteSpace(request.Configuration.Code) && await repository.CodeExists(request.Configuration.Code.Trim().ToUpperInvariant(),id,ct))throw new TourException(409,"Mã tour đã được sử dụng.");
        Apply(tour, request.Configuration);
        if (tour.IsRequest == true) ResetApproval(tour);
        return await Save(tour, actor, request.ChangeNote, ct);
    }
    public async Task<TourDto> Get(string actor, int id, bool admin, CancellationToken ct)
    {
        if (!admin) return Dto(await Owned(actor, id, ct));
        await Admin(actor, ct);
        return Dto(await repository.Find(id, null, false, ct) ?? throw new TourException(404, "Tour not found."));
    }
    public async Task<PublicTourDto> PublicGet(int id, CancellationToken ct)
    {
        var tour = await repository.Find(id, null, true, ct) ?? throw new TourException(404, "Tour not found.");
        return new(tour.Id, tour.Code, tour.Version ?? 1, DesignRequestService.CustomerConfiguration(Configuration(tour)), tour.AgencyId, await AgencyContact(tour.AgencyId, ct));
    }
    private Task<TourAgencyContact?> AgencyContact(string agencyId, CancellationToken ct) => db.Users.AsNoTracking()
        .Where(u => u.Id == agencyId).Select(u => new TourAgencyContact(u.Id,
            u.BusinessProfile != null ? u.BusinessProfile.BusinessName ?? u.Name : u.Name,
            u.BusinessProfile != null ? u.BusinessProfile.LogoUrl ?? u.Avatar : u.Avatar,
            u.Phone, u.Email)).SingleOrDefaultAsync(ct);
    private static string[]? ParseProvinceFilter(string? provinceCode)
    {
        if (string.IsNullOrWhiteSpace(provinceCode)) return null;
        var codes = provinceCode
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(VietnamProvinceCatalog.NormalizeCode)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (codes.Length == 0 || codes.Any(c => !VietnamProvinceCatalog.IsValidCode(c)))
            throw new TourException(400, "Invalid province code filter.");
        return codes;
    }
    public async Task<TourPage<TourListItem>> List(string? actor, bool admin, string? status,
        string? search, string? destination, decimal? maxPrice, int? headcount, int page, int pageSize, CancellationToken ct, string? provinceCode = null)
    {
        if (actor != null) { if (admin) await Admin(actor, ct); else await Agency(actor, ct); }
        TourStatus? state = null;
        if (status != null) { if (!Enum.TryParse<TourStatus>(status, true, out var s) || !Enum.IsDefined(s)) throw new TourException(400, "Invalid status."); state = s; }
        if (maxPrice < 0 || headcount <= 0) throw new TourException(400, "Invalid price or headcount filter.");
        var provinceFilter = ParseProvinceFilter(provinceCode);
        page = Math.Clamp(page, 1, 1000000); pageSize = Math.Clamp(pageSize, 1, 100);
        var result = await repository.List(admin ? null : actor, actor == null, state, search, destination, maxPrice, headcount, page, pageSize, ct, provinceFilter);
        return new(result.Rows.Select(t => new TourListItem(t.Id, t.Name ?? "", t.Destination, t.BasePrice ?? 0, State(t.Status), State(t.Visibility), t.Version ?? 1, ExtractProvinces(t))).ToList(), result.Total, page, pageSize);
    }
    public async Task<IReadOnlyList<CandidateAgencyDto>> FindCandidateAgencies(string actor, string? provinceCode, bool excludeSelf, CancellationToken ct)
    {
        await Agency(actor, ct);
        var codes = ParseProvinceFilter(provinceCode) ?? throw new TourException(400, "Province code is required.");
        var tours = await repository.PublishedToursByProvinces(codes, excludeSelf ? actor : null, ct);
        return tours
            .Where(t => !string.IsNullOrWhiteSpace(t.AgencyId) && t.Agency is not null)
            .GroupBy(t => t.AgencyId, StringComparer.OrdinalIgnoreCase)
            .Select(g =>
            {
                var agency = g.First().Agency;
                var matchedCodes = g.SelectMany(t => t.Provinces.Select(p => VietnamProvinceCatalog.NormalizeCode(p.ProvinceCode)))
                    .Where(c => codes.Contains(c, StringComparer.OrdinalIgnoreCase))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(c => c, StringComparer.OrdinalIgnoreCase)
                    .ToArray();
                return new CandidateAgencyDto(
                    agency.Id,
                    agency.BusinessProfile?.BusinessName ?? agency.Name ?? agency.Email,
                    agency.Email,
                    agency.Phone,
                    agency.Avatar,
                    matchedCodes,
                    g.Select(t => t.Id).Distinct().Count());
            })
            .OrderByDescending(a => a.MatchedProvinceCodes.Length)
            .ThenByDescending(a => a.MatchedTourCount)
            .ThenBy(a => a.BusinessName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
    public async Task<TourValidationResult> ValidateDraft(string actor, int id, CancellationToken ct)
    {
        var tour = await Owned(actor, id, ct);
        try { await Validate(Configuration(tour), true, ct, actor, tour.DesignRequestId); return new(true, []); }
        catch (TourException e) when (e.Status == 422) { return new(false, [e.Message]); }
    }
    public async Task<TourDto> Command(string actor, int id, string action, TourCommand request, CancellationToken ct, bool administrator = false)
    {
        ValidateObject(request);
        Tour tour;
        if (administrator && action == "hide") { await Admin(actor, ct); tour = await repository.Find(id, null, false, ct) ?? throw new TourException(404, "Tour not found."); }
        else tour = await Owned(actor, id, ct);
        Expected(tour, request.Revision);
        switch (action)
        {
            case "complete":
                if (tour.Status is not (TourStatus.Draft or TourStatus.Completed)) throw Conflict();
                await Validate(Configuration(tour), true, ct, actor, tour.DesignRequestId); break;
            case "publish":
                if (tour.IsRequest == true || tour.Status is not (TourStatus.Draft or TourStatus.Completed) || tour.Visibility != TourVisibility.Hidden) throw Conflict();
                await Validate(Configuration(tour), true, ct, actor, tour.DesignRequestId); break;
            case "hide":
                if (tour.Status != TourStatus.Completed || tour.Visibility != TourVisibility.Public) throw Conflict();
                Require(!string.IsNullOrWhiteSpace(request.Reason), "Hiding requires a reason."); break;
            case "delete":
                if (tour.Visibility == TourVisibility.Public) throw Conflict();
                break;
            default: throw new TourException(400, "Unknown tour action.");
        }
        var configuration = Configuration(tour);
        pending.Remove(tour);
        pending.Add(tour, configuration);
        switch (action)
        {
            case "complete": tour.Status = TourStatus.Completed; tour.Visibility = TourVisibility.Hidden;
                break;
            case "publish": ResetApproval(tour); tour.Status = TourStatus.Completed; tour.Visibility = TourVisibility.Public; break;
            case "hide": tour.Visibility = TourVisibility.Hidden; break;
            case "delete": tour.Status = TourStatus.Deleted; tour.Visibility = TourVisibility.Hidden;
                break;
        }
        return await Save(tour, actor, $"{action}: {request.Reason}".TrimEnd(' ', ':'), ct);
    }
    public async Task<TourPage<TourVersionDto>> Versions(string actor, int id, int page, int pageSize, CancellationToken ct)
    {
        var tour = await Owned(actor, id, ct, true);
        Require(tour.IsRequest == true, "Lịch sử phiên bản chỉ áp dụng cho tour thiết kế riêng.");
        page = Math.Clamp(page, 1, 1000000); pageSize = Math.Clamp(pageSize, 1, 100);
        var versions = await repository.VersionPage(id, page, pageSize, ct);
        return new(versions.Rows.Select(v => VersionDto(v, false)).ToList(), versions.Total, page, pageSize);
    }
    private static TourVersionDto VersionDto(TourVersion v, bool snapshot) => new(v.VersionNumber, v.ChangeLog, v.CreatedBy, v.Price, v.CreatedAt ?? DateTime.UnixEpoch, snapshot ? v.SnapshotData : null);
    public async Task<TourVersionDto> Version(string actor, int id, int number, CancellationToken ct)
    {
        var tour = await Owned(actor, id, ct, true);
        Require(tour.IsRequest == true, "Lịch sử phiên bản chỉ áp dụng cho tour thiết kế riêng.");
        return VersionDto(await repository.Version(id, number, ct) ?? throw new TourException(404, "Version not found."), true);
    }
    public async Task<TourDto> Duplicate(string actor, int id, DuplicateTourRequest request, CancellationToken ct)
    {
        ValidateObject(request); var tour = await Owned(actor, id, ct);
        return await Create(actor, Configuration(tour) with { Name = request.Name, Code = null }, ct);
    }
    public async Task<TourDto> AiCreate(string actor, AiDraftRequest request, CancellationToken ct)
    {
        await Agency(actor, ct); ValidateObject(request);
        var config = await generator.Generate(request, ct);
        return await CreateDraft(actor, config, true, ct);
    }

    private static TourServiceReference Reference(Data.Entities.Service service) => new(service.Id, service.ProviderId,
        State(service.Category), service.Name, service.Price,
        service.SubCategory, service.FullAddress, service.OperatingHours, service.HiddenReason,
        service.ThumbnailUrl, TripOps.Service.Common.ServiceMedia.AdditionalImages(service.Images, service.ThumbnailUrl), service.Capacity, service.IsPaused);
    public async Task<TourPage<TourServiceReference>> Catalogue(string actor, string? category, string? search,
        int page, int pageSize, CancellationToken ct)
    {
        await Agency(actor, ct);
        ServiceCategory? filter = null;
        if (category != null) {
            if (!Enum.TryParse<ServiceCategory>(category, true, out var c) || !Enum.IsDefined(c)) throw new TourException(400, "Invalid service category.");
            filter = c;
        }
        page = Math.Clamp(page, 1, 1000000); pageSize = Math.Clamp(pageSize, 1, 100);
        var result = await repository.Catalogue(filter, search, page, pageSize, ct);
        return new(result.Rows.Select(Reference).ToList(), result.Total, page, pageSize);
    }
    public async Task<TourServiceReference> CatalogueService(string actor, int id, CancellationToken ct)
    {
        await Agency(actor, ct);
        return Reference((await repository.EligibleServices([id], ct)).SingleOrDefault() ?? throw new TourException(404, "Service not found."));
    }
}
