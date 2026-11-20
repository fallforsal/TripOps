using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    private const string Discovery = "/api/v1/tour-design-requests/agencies";
    private static Booking DiscoveryBooking(string code, TourConfiguration? config, params string[] agencies) => new() {
        BookingCode = code, CustomerId = "customer", Status = BookingStatus.Completed,
        ContactName = "PRIVATE CUSTOMER", ContactPhone = "PRIVATE PHONE", TotalAmount = 987654321,
        StartDate = DateTime.UtcNow.AddDays(-10), UpdatedAt = DateTime.UtcNow.AddDays(-2),
        TourConfigurationData = config is null ? null : JsonSerializer.Serialize(config, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
        BookingAgencies = agencies.Select((a, i) => new BookingAgency {
            AgencyId = a, IsHost = i == 0, TourCompletedAt = DateTime.UtcNow.AddDays(-2)
        }).ToArray()
    };

    [Fact]
    public async Task Agency_discovery_is_public_and_keeps_approved_newcomers_selectable()
    {
        await using var app = new App(); await app.Initialize(); using var client = app.CreateClient();
        var rows = await Read<AgencyChoiceDto[]>(await client.GetAsync(Discovery + "?provinceCode=LAM_DONG"));
        Assert.Equal(new[] { "agency", "other" }, rows.Select(a => a.Id).Order().ToArray());
        Assert.All(rows, a => { Assert.NotNull(a.Evidence); Assert.Equal(0, a.Evidence.CompletedTrips);
            Assert.Null(a.Evidence.RatingAverage); Assert.Equal(0, a.Evidence.MatchedTourCount); });
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync(Discovery + "?provinceCode=MADE_UP")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(Root + "/candidate-agencies?provinceCode=LAM_DONG")).StatusCode);
        using var customer = await app.Login("customer");
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync(Root + "/candidate-agencies?provinceCode=LAM_DONG")).StatusCode);
    }

    [Fact]
    public async Task Agency_discovery_counts_booking_once_and_uses_frozen_regions_not_mutated_tours_or_versions()
    {
        await using var app = new App(); await app.Initialize(); using var client = app.CreateClient();
        await app.Inspect(async db => {
            var tour = new Tour { AgencyId = "agency", Code = "DISC-PUBLIC", Name = "Public beach tour", Destination = "Nha Trang",
                Status = TourStatus.Completed, Visibility = TourVisibility.Public, Version = 5,
                Images = "[\"https://example.test/beach.jpg\"]", Provinces = [new() { ProvinceCode = "KHANH_HOA" }],
                Versions = Enumerable.Range(1, 5).Select(v => new TourVersion { VersionNumber = v, SnapshotData = "{}" }).ToList() };
            db.Tours.Add(tour);
            var booking = DiscoveryBooking("DISC-1", Complete("PRIVATE DESIGN") with { ProvinceCodes = ["LAM_DONG", "LAM_DONG"] }, "agency");
            booking.Tour = tour; booking.TourVersion = 1; db.Bookings.Add(booking);
            var cancelled = DiscoveryBooking("DISC-CANCEL", Complete(), "agency"); cancelled.Status = BookingStatus.Cancelled;
            db.Bookings.Add(cancelled);
            db.Tours.Add(new Tour { AgencyId = "agency", Code = "DISC-DRAFT", Name = "PRIVATE DRAFT", Status = TourStatus.Draft,
                Visibility = TourVisibility.Hidden, Provinces = [new() { ProvinceCode = "LAM_DONG" }] });
            await db.SaveChangesAsync();
        });
        var response = await client.GetAsync(Discovery + "?provinceCode=LAM_DONG");
        var text = await response.Content.ReadAsStringAsync();
        var agency = (await Read<AgencyChoiceDto[]>(response)).First();
        Assert.Equal("agency", agency.Id);
        var evidence = agency.Evidence!;
        Assert.Equal(1, evidence.CompletedTrips); Assert.Equal(1, evidence.MatchedCompletedTrips);
        Assert.Equal(1, evidence.PublishedTourCount); Assert.Equal(0, evidence.MatchedTourCount);
        Assert.Equal("LAM_DONG", Assert.Single(evidence.Areas).ProvinceCode);
        Assert.Equal(1, evidence.Areas[0].CompletedTrips); Assert.Empty(evidence.Examples);
        Assert.DoesNotContain("PRIVATE", text); Assert.DoesNotContain("987654321", text);
        var beach = (await Read<AgencyChoiceDto[]>(await client.GetAsync(Discovery + "?provinceCode=KHANH_HOA"))).Single(a => a.Id == "agency").Evidence!;
        Assert.Equal(0, beach.MatchedCompletedTrips); Assert.Equal(1, beach.MatchedTourCount);
        Assert.Equal("Public beach tour", Assert.Single(beach.Examples).Name);
        using var host = await app.Login("other");
        var candidates = await Read<CandidateAgencyDto[]>(await host.GetAsync(Root + "/candidate-agencies?provinceCode=LAM_DONG"));
        Assert.Equal("agency", Assert.Single(candidates).AgencyId); // History can qualify without a matching current public tour.
        Assert.Equal(1, candidates[0].Evidence!.MatchedCompletedTrips);
    }

    [Fact]
    public async Task Agency_discovery_attributes_only_owned_regions_on_multi_province_alliances()
    {
        await using var app = new App(); await app.Initialize(); using var client = app.CreateClient();
        var config = Complete() with { ProvinceCodes = ["LAM_DONG", "KHANH_HOA"], Timelines = [
            new(1, "Host day", AgencyId: "agency", Accommodations: [
                new("Host hotel", "Nha Trang", Supplier: new(Area: "KHANH_HOA"), AgencyId: "agency"),
                new("Partner hotel", "Đà Lạt", Supplier: new(Area: "Lâm Đồng"), AgencyId: "other"),
                new("Unchosen partner hotel", "Khánh Hòa", IsDefault: false, AgencyId: "other")])
        ] };
        await app.Inspect(async db => { db.Bookings.Add(DiscoveryBooking("DISC-JOINT", config, "agency", "other")); await db.SaveChangesAsync(); });
        var rows = await Read<AgencyChoiceDto[]>(await client.GetAsync(Discovery + "?provinceCode=LAM_DONG"));
        Assert.Equal("other", rows[0].Id);
        var host = rows.Single(a => a.Id == "agency").Evidence!; var partner = rows.Single(a => a.Id == "other").Evidence!;
        Assert.Equal(0, host.MatchedCompletedTrips); Assert.Equal(1, partner.MatchedCompletedTrips);
        Assert.Equal("KHANH_HOA", Assert.Single(host.Areas).ProvinceCode);
        Assert.Equal("LAM_DONG", Assert.Single(partner.Areas).ProvinceCode);
        Assert.Equal(1, host.CompletedTrips); Assert.Equal(1, partner.CompletedTrips);
    }

    [Fact]
    public async Task Agency_discovery_does_not_invent_regions_for_ambiguous_or_missing_historical_snapshots()
    {
        await using var app = new App(); await app.Initialize(); using var client = app.CreateClient();
        await app.Inspect(async db => {
            db.Bookings.Add(DiscoveryBooking("DISC-MISSING", null, "agency"));
            var invalid = DiscoveryBooking("DISC-BROKEN", null, "agency"); invalid.TourConfigurationData = "broken-json"; db.Bookings.Add(invalid);
            db.Bookings.Add(DiscoveryBooking("DISC-AMBIGUOUS", Complete() with { ProvinceCodes = ["LAM_DONG", "KHANH_HOA"] }, "agency", "other"));
            await db.SaveChangesAsync();
        });
        var evidence = (await Read<AgencyChoiceDto[]>(await client.GetAsync(Discovery + "?provinceCode=LAM_DONG"))).Single(a => a.Id == "agency").Evidence!;
        Assert.Equal(3, evidence.CompletedTrips); Assert.Equal(0, evidence.MatchedCompletedTrips);
        Assert.Equal(3, evidence.UnattributedCompletedTrips); Assert.Empty(evidence.Areas); Assert.Empty(evidence.MatchedProvinceCodes);
    }

    [Fact]
    public async Task Agency_discovery_counts_only_visible_ratings_and_excludes_suspended_businesses()
    {
        await using var app = new App(); await app.Initialize(); using var client = app.CreateClient();
        await app.Inspect(async db => {
            var visible = DiscoveryBooking("DISC-REVIEW", Complete(), "agency");
            var hidden = DiscoveryBooking("DISC-HIDDEN", Complete(), "agency");
            db.Feedbacks.AddRange(new Feedback { Booking = visible, AgencyId = "agency", CustomerId = "customer", Rating = 4, AgencyRating = 4, Status = FeedbackStatus.Visible, Comment = "PRIVATE REVIEW" },
                new Feedback { Booking = hidden, AgencyId = "agency", CustomerId = "customer", Rating = 1, AgencyRating = 1, Status = FeedbackStatus.Hidden });
            (await db.BusinessProfiles.SingleAsync(p => p.UserId == "other")).Status = BusinessProfileStatus.Suspended;
            await db.SaveChangesAsync();
        });
        var response = await client.GetAsync(Discovery);
        Assert.DoesNotContain("PRIVATE REVIEW", await response.Content.ReadAsStringAsync());
        var evidence = Assert.Single(await Read<AgencyChoiceDto[]>(response)).Evidence!;
        Assert.Equal(1, evidence.ReviewCount); Assert.Equal(4m, evidence.RatingAverage);
    }
}
