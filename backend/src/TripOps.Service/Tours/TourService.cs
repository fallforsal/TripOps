using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Data.Repositories;
using TripOps.Service.Accounts;

namespace TripOps.Service.Tours;

public sealed class TourService(TourRepository repository, AccountService accounts, IItineraryDraftGenerator generator)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static string State<T>(T value) where T : Enum => value.ToString().ToLowerInvariant();
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
    private static void Expected(Tour tour, int version)
    {
        if (tour.Version != version || tour.Status == TourStatus.Deleted) throw Conflict();
    }
    private static decimal Money(decimal value) => decimal.Round(value, 0, MidpointRounding.AwayFromZero);

    // Also validates calls from non-HTTP boundaries such as AI and restore.
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
                    if (item is not string) ValidateObject(item!);
                }
            }
        }
    }

    private async Task Validate(TourConfiguration config, bool complete, CancellationToken ct)
    {
        Require(config != null, "Configuration is required.");
        ValidateObject(config!);
        Require(config!.MinGuests == null || config.MaxGuests == null || config.MinGuests <= config.MaxGuests, "Invalid guest range.");
        Require(config.DurationNights <= config.DurationDays, "Nights cannot exceed duration days.");
        foreach (var url in config.Images ?? []) Require(Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == "https" && url.Length <= 2048, "Images must be HTTPS URLs.");
        var tiers = config.PricingTiers ?? [];
        foreach (var tier in tiers) Require(tier.MaxAge == null || tier.MinAge <= tier.MaxAge, "Invalid age range.");
        var ages = tiers.OrderBy(t => t.MinAge).ToArray();
        for (var i = 1; i < ages.Length; i++) Require(ages[i].MinAge > (ages[i - 1].MaxAge ?? 150), "Pricing age ranges overlap.");
        var days = config.Timelines ?? [];
        Require(days.Select(d => d.DayNumber).Distinct().Count() == days.Length && days.All(d => d.DayNumber <= config.DurationDays), "Invalid or duplicate itinerary day.");
        var links = new List<(int Id, ServiceCategory Category)>();
        var stays = new List<(int StartDay, int EndDay)>();
        foreach (var day in days)
        {
            if (day.TransportationServiceId is int transport) links.Add((transport, ServiceCategory.Transportation));
            var activities = day.Activities ?? [];
            Require(activities.Select(a => a.OrderIndex).Distinct().Count() == activities.Length, "Activity order must be unique within each day.");
            foreach (var activity in activities)
            {
                Require(activity.EstimatedTime == null || activity.EstimatedTime >= TimeSpan.Zero && activity.EstimatedTime < TimeSpan.FromDays(1), "Activity time must be within a day.");
                if (activity.ServiceId is int id) links.Add((id, ServiceCategory.Attraction));
            }
            var meals = day.Meals ?? [];
            foreach (var meal in meals)
            {
                Require(meal.MealType is "breakfast" or "lunch" or "dinner", "Invalid meal type.");
                Require(!meal.IsDefault || meal.PriceDifference == 0, "Default meal must have zero price difference.");
                if (meal.ServiceId is int id) links.Add((id, ServiceCategory.Fnb));
            }
            foreach (var group in meals.GroupBy(m => m.MealType)) Require(group.Count(m => m.IsDefault) == 1, "Each meal group needs one default.");
            var hotels = day.Accommodations ?? [];
            foreach (var hotel in hotels)
            {
                Require(!hotel.IsDefault || hotel.PriceDifference == 0, "Default accommodation must have zero price difference.");
                Require(day.DayNumber + hotel.NightsCount - 1 <= config.DurationNights, "Accommodation exceeds tour nights.");
                if (hotel.ServiceId is int id) links.Add((id, ServiceCategory.Hotel));
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
            Require(!string.IsNullOrWhiteSpace(config.Destination), "Destination is required for publication.");
            Require(!string.IsNullOrWhiteSpace(config.CancellationPolicy), "Cancellation policy is required for publication.");
            Require(tiers.Length > 0, "Pricing tiers are required for publication.");
            Require(days.Length == config.DurationDays, "An itinerary for every day is required for publication.");
            Require(config.MinGuests != null && config.MaxGuests != null, "Guest limits are required for publication.");
        }
        var eligible = await repository.EligibleServices(links.Select(l => l.Id).Distinct().ToArray(), ct);
        Require(links.All(l => eligible.Any(s => s.Id == l.Id && s.Category == l.Category)), "Linked services must be approved, match the option category, and belong to active approved Providers.");
    }

    private static TourConfiguration Configuration(Tour t) => new(t.Name, t.Description, t.Destination,
        t.DurationDays, t.DurationNights, t.BasePrice, t.MinGuests, t.MaxGuests, t.OperationPeriod,
        t.Highlights, t.Inclusions, t.Exclusions, t.CancellationPolicy, t.Message,
        t.Images == null ? [] : JsonSerializer.Deserialize<string[]>(t.Images, Json),
        t.PricingTiers.OrderBy(p => p.DisplayOrder).ThenBy(p => p.Id).Select(p => new PricingTierInput(p.Name, p.MinAge, p.MaxAge, p.PricePerGuest, p.DisplayOrder)).ToArray(),
        t.Timelines.OrderBy(d => d.DayNumber).Select(d => new TimelineInput(d.DayNumber, d.Title ?? "", d.Description, d.TransportationServiceId,
            d.Attractions.OrderBy(a => a.OrderIndex).Select(a => new ActivityInput(a.Name, a.ServiceId, a.Description, a.EstimatedTime, a.OrderIndex)).ToArray(),
            d.Meals.OrderBy(m => m.Id).Select(m => new MealInput(m.MealType, m.RestaurantName ?? "", m.ServiceId, m.Description, m.IsDefault, m.PriceDifference)).ToArray(),
            d.Accommodations.OrderBy(a => a.Id).Select(a => new AccommodationInput(a.HotelName ?? "", a.DestinationName ?? "", a.ServiceId, a.RoomType, a.NightsCount, a.StarRating, a.IsDefault, a.PriceDifference, a.AddressNotes)).ToArray())).ToArray());

    private static TourDto Dto(Tour t) => new(t.Id, t.AgencyId, t.Code, State(t.Status), State(t.Visibility), t.IsRequest, t.IsAiGenerated,
        t.Version, Configuration(t), t.CreatedAt, t.UpdatedAt);

    private void Apply(Tour tour, TourConfiguration c)
    {
        repository.RemoveConfiguration(tour);
        tour.Name = c.Name.Trim(); tour.Description = c.Description; tour.Destination = c.Destination;
        tour.DurationDays = c.DurationDays; tour.DurationNights = c.DurationNights; tour.BasePrice = Money(c.BasePrice);
        tour.MinGuests = c.MinGuests; tour.MaxGuests = c.MaxGuests; tour.OperationPeriod = c.OperationPeriod;
        tour.Highlights = c.Highlights; tour.Inclusions = c.Inclusions; tour.Exclusions = c.Exclusions;
        tour.CancellationPolicy = c.CancellationPolicy; tour.Message = c.Message;
        tour.Images = JsonSerializer.Serialize(c.Images ?? [], Json);
        tour.PricingTiers = (c.PricingTiers ?? []).Select(p => new TourPricingTier { Name = p.Name,
            MinAge = p.MinAge, MaxAge = p.MaxAge, DisplayOrder = p.DisplayOrder, PricePerGuest = Money(p.PricePerGuest) }).ToList();
        tour.Timelines = (c.Timelines ?? []).Select(d => new TourTimeline {
            DayNumber = d.DayNumber, Title = d.Title, Description = d.Description, TransportationServiceId = d.TransportationServiceId,
            Attractions = (d.Activities ?? []).Select(a => new TouristAttraction { Name = a.Name, ServiceId = a.ServiceId,
                Description = a.Description, EstimatedTime = a.EstimatedTime, OrderIndex = a.OrderIndex }).ToList(),
            Meals = (d.Meals ?? []).Select(m => new TourMeal { MealType = m.MealType, RestaurantName = m.RestaurantName,
                ServiceId = m.ServiceId, Description = m.Description, IsDefault = m.IsDefault, PriceDifference = Money(m.PriceDifference) }).ToList(),
            Accommodations = (d.Accommodations ?? []).Select(a => new TourAccommodation { HotelName = a.HotelName,
                DestinationName = a.DestinationName, ServiceId = a.ServiceId, RoomType = a.RoomType, NightsCount = a.NightsCount,
                StarRating = a.StarRating, IsDefault = a.IsDefault, PriceDifference = Money(a.PriceDifference), AddressNotes = a.AddressNotes }).ToList()
        }).ToList();
    }
    private static void ResetApproval(Tour tour)
    {
        tour.Status = TourStatus.Draft; tour.Visibility = TourVisibility.Hidden;
        // Legacy columns remain mapped until a separately reviewed schema cleanup.
        tour.ApprovalStatus = TourApprovalStatus.NotSubmitted; tour.SubmittedVersion = null; tour.ApprovedVersion = null;
        tour.ReviewedBy = null; tour.ReviewedAt = null; tour.RejectionReason = null;
    }
    private void Snapshot(Tour tour, string actor, string note)
    {
        repository.AddVersion(tour, new TourVersion { VersionNumber = tour.Version, CreatedBy = actor,
            Price = tour.BasePrice, ChangeLog = note, SnapshotData = JsonSerializer.Serialize(new TourSnapshot(1,
                tour.Version, tour.IsRequest, tour.IsAiGenerated, State(tour.Status), State(tour.Visibility), Configuration(tour)), Json) });
    }
    private async Task Baseline(Tour tour, string actor, CancellationToken ct)
    {
        if (!await repository.HasVersion(tour.Id, tour.Version, ct))
            Snapshot(tour, actor, "Baseline of existing tour before WF02 modification");
    }
    private async Task<TourDto> Save(Tour tour, string actor, string note, CancellationToken ct)
    {
        Snapshot(tour, actor, note);
        try { await repository.Save(ct); }
        catch (DbUpdateConcurrencyException) { throw Conflict(); }
        catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 }) { throw Conflict(); }
        return Dto(tour);
    }

    public async Task<TourDto> Create(string actor, TourConfiguration config, CancellationToken ct)
        => await CreateDraft(actor, config, false, ct);

    private async Task<TourDto> CreateDraft(string actor, TourConfiguration config, bool aiGenerated, CancellationToken ct)
    {
        await Agency(actor, ct); await Validate(config, false, ct);
        var tour = new Tour { AgencyId = actor, Code = $"TOUR-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}", IsAiGenerated = aiGenerated };
        Apply(tour, config); repository.Add(tour);
        return await Save(tour, actor, "Created draft", ct);
    }
    public async Task<TourDto> Update(string actor, int id, UpdateTourRequest request, CancellationToken ct)
    {
        ValidateObject(request); var tour = await Owned(actor, id, ct); Expected(tour, request.Version);
        await Validate(request.Configuration, false, ct); await Baseline(tour, actor, ct);
        Apply(tour, request.Configuration); ResetApproval(tour); tour.Version++;
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
        return new(tour.Id, tour.Code, tour.Version, Configuration(tour));
    }
    public async Task<TourPage<TourListItem>> List(string? actor, bool admin, string? status,
        string? search, string? destination, decimal? maxPrice, int? headcount, int page, int pageSize, CancellationToken ct)
    {
        if (actor != null) { if (admin) await Admin(actor, ct); else await Agency(actor, ct); }
        TourStatus? state = null;
        if (status != null) { if (!Enum.TryParse<TourStatus>(status, true, out var s) || !Enum.IsDefined(s)) throw new TourException(400, "Invalid status."); state = s; }
        if (maxPrice < 0 || headcount <= 0) throw new TourException(400, "Invalid price or headcount filter.");
        page = Math.Clamp(page, 1, 1000000); pageSize = Math.Clamp(pageSize, 1, 100);
        var result = await repository.List(admin ? null : actor, actor == null, state, search, destination, maxPrice, headcount, page, pageSize, ct);
        return new(result.Rows.Select(t => new TourListItem(t.Id, t.Name, t.Destination, t.BasePrice, State(t.Status), State(t.Visibility), t.Version)).ToList(), result.Total, page, pageSize);
    }
    public async Task<TourValidationResult> ValidateDraft(string actor, int id, CancellationToken ct)
    {
        var tour = await Owned(actor, id, ct);
        try { await Validate(Configuration(tour), true, ct); return new(true, []); }
        catch (TourException e) when (e.Status == 422) { return new(false, [e.Message]); }
    }
    public async Task<TourDto> Command(string actor, int id, string action, TourCommand request, CancellationToken ct, bool administrator = false)
    {
        ValidateObject(request);
        Tour tour;
        if (administrator && action == "hide") { await Admin(actor, ct); tour = await repository.Find(id, null, false, ct) ?? throw new TourException(404, "Tour not found."); }
        else tour = await Owned(actor, id, ct);
        Expected(tour, request.Version);
        switch (action)
        {
            case "publish":
                if (tour.IsRequest || tour.Status is not (TourStatus.Draft or TourStatus.Completed) || tour.Visibility != TourVisibility.Hidden) throw Conflict();
                await Validate(Configuration(tour), true, ct); break;
            case "hide":
                if (tour.Status != TourStatus.Completed || tour.Visibility != TourVisibility.Public) throw Conflict();
                Require(!string.IsNullOrWhiteSpace(request.Reason), "Hiding requires a reason."); break;
            case "delete":
                if (tour.Visibility == TourVisibility.Public) throw Conflict();
                break;
            default: throw new TourException(400, "Unknown tour action.");
        }
        await Baseline(tour, actor, ct);
        tour.Version++;
        switch (action)
        {
            case "publish": ResetApproval(tour); tour.Status = TourStatus.Completed; tour.Visibility = TourVisibility.Public; break;
            case "hide": tour.Visibility = TourVisibility.Hidden; break;
            case "delete": tour.Status = TourStatus.Deleted; tour.Visibility = TourVisibility.Hidden;
                tour.IsDeleted = true; tour.DeletedAt = DateTime.UtcNow; break;
        }
        return await Save(tour, actor, $"{action}: {request.Reason}".TrimEnd(' ', ':'), ct);
    }
    public async Task<TourPage<TourVersionDto>> Versions(string actor, int id, int page, int pageSize, CancellationToken ct)
    {
        await Owned(actor, id, ct, true);
        page = Math.Clamp(page, 1, 1000000); pageSize = Math.Clamp(pageSize, 1, 100);
        var versions = await repository.VersionPage(id, page, pageSize, ct);
        return new(versions.Rows.Select(v => VersionDto(v, false)).ToList(), versions.Total, page, pageSize);
    }
    private static TourVersionDto VersionDto(TourVersion v, bool snapshot) => new(v.VersionNumber, v.ChangeLog, v.CreatedBy, v.Price, v.CreatedAt, snapshot ? v.SnapshotData : null);
    public async Task<TourVersionDto> Version(string actor, int id, int number, CancellationToken ct)
    {
        await Owned(actor, id, ct, true);
        return VersionDto(await repository.Version(id, number, ct) ?? throw new TourException(404, "Version not found."), true);
    }
    public async Task<TourDto> Restore(string actor, int id, int number, TourCommand request, CancellationToken ct)
    {
        ValidateObject(request); Require(!string.IsNullOrWhiteSpace(request.Reason), "Restore requires a reason.");
        var tour = await Owned(actor, id, ct); Expected(tour, request.Version);
        var version = await repository.Version(id, number, ct) ?? throw new TourException(404, "Version not found.");
        TourSnapshot? snapshot;
        try { snapshot = JsonSerializer.Deserialize<TourSnapshot>(version.SnapshotData, Json); }
        catch (JsonException) { throw new TourException(409, "Legacy snapshot format cannot be restored automatically."); }
        if (snapshot?.SchemaVersion != 1) throw new TourException(409, "Unsupported snapshot schema.");
        await Validate(snapshot.Configuration, false, ct); await Baseline(tour, actor, ct);
        Apply(tour, snapshot.Configuration); ResetApproval(tour); tour.Version++;
        return await Save(tour, actor, $"Restored v{number}: {request.Reason}", ct);
    }
    public async Task<TourDto> Duplicate(string actor, int id, DuplicateTourRequest request, CancellationToken ct)
    {
        ValidateObject(request); var tour = await Owned(actor, id, ct);
        return await Create(actor, Configuration(tour) with { Name = request.Name }, ct);
    }
    public async Task<TourDto> AiCreate(string actor, AiDraftRequest request, CancellationToken ct)
    {
        await Agency(actor, ct); ValidateObject(request);
        var config = await generator.Generate(request, ct);
        return await CreateDraft(actor, config, true, ct);
    }

    private static TourServiceReference Reference(Data.Entities.Service service) => new(service.Id, service.ProviderId,
        State(service.Category), service.Name, service.Price);
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
