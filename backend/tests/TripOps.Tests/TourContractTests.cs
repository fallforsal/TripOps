using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Theory]
    [InlineData("emptyName", 400)] [InlineData("zeroDays", 400)] [InlineData("negativeNights", 400)]
    [InlineData("zeroMinGuests", 400)] [InlineData("negativeBasePrice", 400)]
    [InlineData("missingMinAge", 400)] [InlineData("negativeMinAge", 400)] [InlineData("ageAbove150", 400)]
    [InlineData("invertedAge", 422)] [InlineData("negativeTierPrice", 400)]
    [InlineData("zeroDayNumber", 400)] [InlineData("dayOutOfRange", 422)]
    [InlineData("invalidMeal", 400)] [InlineData("zeroStars", 400)] [InlineData("sixStars", 400)]
    [InlineData("negativeStay", 400)] [InlineData("zeroActivityService", 400)]
    [InlineData("negativeTransportService", 400)] [InlineData("zeroMealService", 400)] [InlineData("zeroHotelService", 400)]
    public async Task Tour_contract_constraints_reject_invalid_values_without_writing(string invalid, int status)
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var config = invalid switch {
            "emptyName" => Complete() with { Name = " " },
            "zeroDays" => Complete() with { DurationDays = 0 },
            "negativeNights" => Complete() with { DurationNights = -1 },
            "zeroMinGuests" => Complete() with { MinGuests = 0 },
            "negativeBasePrice" => Complete() with { BasePrice = -1 },
            "missingMinAge" => Complete() with { PricingTiers = [new("Adult", null, null, 1)] },
            "negativeMinAge" => Complete() with { PricingTiers = [new("Child", -1, 11, 1)] },
            "ageAbove150" => Complete() with { PricingTiers = [new("Adult", 12, 151, 1)] },
            "invertedAge" => Complete() with { PricingTiers = [new("Child", 12, 11, 1)] },
            "negativeTierPrice" => Complete() with { PricingTiers = [new("Adult", 12, null, -1)] },
            "zeroDayNumber" => Complete() with { Timelines = [new(0, "Invalid day")] },
            "dayOutOfRange" => Complete() with { Timelines = [new(3, "Invalid day")] },
            "invalidMeal" => Complete() with { Timelines = [new(1, "Day", Meals: [new("Lunch", "Restaurant")])] },
            "zeroStars" => Complete() with { Timelines = [new(1, "Day", Accommodations: [new("Hotel", "Da Lat", StarRating: 0)])] },
            "sixStars" => Complete() with { Timelines = [new(1, "Day", Accommodations: [new("Hotel", "Da Lat", StarRating: 6)])] },
            "negativeStay" => Complete() with { Timelines = [new(1, "Day", Accommodations: [new("Hotel", "Da Lat", NightsCount: -1)])] },
            "zeroActivityService" => Complete() with { Timelines = [new(1, "Day", Activities: [new("Visit", ServiceId: 0)])] },
            "negativeTransportService" => Complete() with { Timelines = [new(1, "Day", TransportationServiceId: -1)] },
            "zeroMealService" => Complete() with { Timelines = [new(1, "Day", Meals: [new("lunch", "Restaurant", ServiceId: 0)])] },
            _ => Complete() with { Timelines = [new(1, "Day", Accommodations: [new("Hotel", "Da Lat", ServiceId: 0)])] }
        };
        Assert.Equal((HttpStatusCode)status, (await agency.PostAsJsonAsync(Root, config)).StatusCode);
        await app.Inspect(async db => {
            Assert.Equal(0, await db.Tours.CountAsync());
            Assert.Equal(0, await db.TourVersions.CountAsync());
        });
    }

    [Fact]
    public async Task Nullable_references_open_age_tier_and_zero_night_allocation_are_supported()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var config = Complete() with {
            DurationDays = 1, DurationNights = 0,
            PricingTiers = [new("Adult", 12, null, 1500000)],
            Timelines = [new(1, "Đà Nẵng trong ngày", TransportationServiceId: null,
                Activities: [new("Cầu Rồng", ServiceId: null, EstimatedTime: new TimeSpan(8, 30, 0))],
                Meals: [new("lunch", "Nhà hàng địa phương", ServiceId: null)],
                Accommodations: [new("Thông tin khách sạn, không lưu trú qua đêm", "Đà Nẵng", ServiceId: null, NightsCount: 0)])]
        };
        var tour = await Create(agency, config);
        var day = tour.Configuration.Timelines![0];
        Assert.Null(day.TransportationServiceId); Assert.Null(day.Activities![0].ServiceId);
        Assert.Null(day.Meals![0].ServiceId); Assert.Null(day.Accommodations![0].ServiceId);
        Assert.Equal(0, day.Accommodations[0].NightsCount);
        var persisted = (await agency.GetFromJsonAsync<TourDto>($"{Root}/{tour.Id}"))!;
        Assert.Equal(0, persisted.Configuration.Timelines![0].Accommodations![0].NightsCount);
        Assert.Null(tour.Configuration.PricingTiers![0].MaxAge);
        tour = await Command(agency, tour, "publish"); Assert.Equal("public", tour.Visibility);
    }

    [Theory]
    [InlineData("08:30:00", 201)] [InlineData("08:30:00.1234567", 201)]
    [InlineData("0.08:30:00", 201)] [InlineData("23:59:59.9999999", 201)]
    [InlineData("24:00:00", 400)] [InlineData("1.00:00:00", 422)] [InlineData("-01:00:00", 422)]
    [InlineData("PT8H30M", 400)] [InlineData("8:30", 201)] [InlineData("08:60:00", 400)]
    public async Task Estimated_time_retains_native_TimeSpan_JSON_contract_and_day_bounds(string time, int status)
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var payload = JsonSerializer.Serialize(new { name = "Kiểm thử thời gian", timelines = new[] { new {
            dayNumber = 1, title = "Đà Nẵng", activities = new[] { new { name = "Chùa Linh Ứng", estimatedTime = time } } } } });
        var response = await agency.PostAsync(Root, new StringContent(payload, Encoding.UTF8, "application/json"));
        Assert.True(response.StatusCode == (HttpStatusCode)status, $"{time}: {response.StatusCode} {await response.Content.ReadAsStringAsync()}");
    }

    [Theory]
    [InlineData(false)] [InlineData(true)]
    public async Task Hotel_stays_cannot_overlap_or_change_duration_between_alternatives(bool mismatchedAlternative)
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var config = Complete() with { DurationDays = 3, DurationNights = 2, Timelines = mismatchedAlternative
            ? [new(1, "Đà Nẵng", Accommodations: [new("Tiêu chuẩn", "Đà Nẵng", NightsCount: 2), new("Nâng hạng", "Đà Nẵng", NightsCount: 1, IsDefault: false, PriceDifference: 100000)]), new(2, "Hội An"), new(3, "Kết thúc")]
            : [new(1, "Đà Nẵng", Accommodations: [new("Tiêu chuẩn", "Đà Nẵng", NightsCount: 2)]), new(2, "Hội An", Accommodations: [new("Bản sao trùng đêm 2", "Đà Nẵng", NightsCount: 1)]), new(3, "Kết thúc")] };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(Root, config)).StatusCode);
        await app.Inspect(async db => Assert.Equal(0, await db.TourAccommodations.CountAsync()));
    }

    [Fact]
    public async Task Consecutive_hotel_stays_can_use_separate_nonoverlapping_days()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var config = Complete() with { DurationDays = 3, DurationNights = 2,
            Timelines = [new(1, "Đà Nẵng", Accommodations: [new("Khách sạn Đà Nẵng", "Đà Nẵng", NightsCount: 1)]),
                new(2, "Hội An", Accommodations: [new("Khách sạn Hội An", "Hội An", NightsCount: 1)]), new(3, "Kết thúc")] };
        var tour = await Create(agency, config);
        Assert.Equal(2, tour.Configuration.Timelines!.SelectMany(d => d.Accommodations ?? []).Where(h => h.IsDefault).Sum(h => h.NightsCount));
        Assert.Equal("public", (await Command(agency, tour, "publish")).Visibility);
    }

    [Theory]
    [InlineData("providerPending")] [InlineData("providerBanned")] [InlineData("deletedService")]
    public async Task Service_references_require_eligible_Provider_and_nondeleted_service(string state)
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        await app.Inspect(async db => {
            if (state == "providerPending") (await db.BusinessProfiles.SingleAsync(p => p.UserId == "provider")).Status = Data.Enums.BusinessProfileStatus.Pending;
            if (state == "providerBanned") (await db.Users.SingleAsync(u => u.Id == "provider")).Status = Data.Enums.UserStatus.Banned;
            if (state == "deletedService") (await db.Services.SingleAsync(s => s.Id == 101)).IsDeleted = true;
            await db.SaveChangesAsync();
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(Root, Complete())).StatusCode);
        await app.Inspect(async db => Assert.Equal(0, await db.Tours.CountAsync()));
    }

    [Fact]
    public async Task Swagger_examples_execute_create_configure_publish_and_versioned_edit()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        using var anonymous = app.CreateClient();
        using var document = JsonDocument.Parse(await anonymous.GetStringAsync("/openapi/v1.json"));
        var paths = document.RootElement.GetProperty("paths");
        string Example(string path, string example, string method = "post") => paths.GetProperty(path).GetProperty(method)
            .GetProperty("requestBody").GetProperty("content").GetProperty("application/json").GetProperty("examples").GetProperty(example).GetProperty("value").GetRawText();
        static StringContent Body(string json) => new(json, Encoding.UTF8, "application/json");

        var tour = await Read<TourDto>(await agency.PostAsync(Root, Body(Example(Root, "minimalDraft"))), HttpStatusCode.Created);
        Assert.Equal(1, tour.Version);
        tour = await Read<TourDto>(await agency.PutAsync($"{Root}/{tour.Id}", Body(Example("/api/v1/agency/tours/{id}", "configureThreeDayTour", "put"))));
        Assert.Equal(2, tour.Version);
        Assert.Equal("08:30:00", tour.Configuration.Timelines![0].Activities![0].EstimatedTime!.Value.ToString("c"));
        Assert.Equal(2, tour.Configuration.Timelines.SelectMany(d => d.Accommodations ?? []).Where(h => h.IsDefault).Sum(h => h.NightsCount));
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/v1/tours/{tour.Id}")).StatusCode);
        tour = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Version)));
        Assert.Equal(3, tour.Version); Assert.Equal("public", tour.Visibility);
        var published = (await anonymous.GetFromJsonAsync<PublicTourDto>($"/api/v1/tours/{tour.Id}"))!;
        Assert.Equal(3, published.Configuration.DurationDays); Assert.Equal(2, published.Configuration.DurationNights);
        var beforeEdit = (await agency.GetFromJsonAsync<TourVersionDto>($"{Root}/{tour.Id}/versions/3"))!.SnapshotData;
        tour = await Read<TourDto>(await agency.PutAsJsonAsync($"{Root}/{tour.Id}", new UpdateTourRequest(3, published.Configuration with { Message = "Rà soát chương trình" }, "Cập nhật sau công bố")));
        Assert.Equal(4, tour.Version); Assert.Equal("draft", tour.Status);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/v1/tours/{tour.Id}")).StatusCode);
        Assert.Equal(beforeEdit, (await agency.GetFromJsonAsync<TourVersionDto>($"{Root}/{tour.Id}/versions/3"))!.SnapshotData);
        await app.Inspect(async db => {
            // Two rows are mutually exclusive options for one two-night stay, not four booked nights.
            Assert.Equal(2, await db.TourAccommodations.CountAsync());
            Assert.Equal(2, await db.TourAccommodations.Where(h => h.IsDefault).SumAsync(h => h.NightsCount));
            Assert.Equal(0, await db.BookingAccommodations.CountAsync());
            Assert.Equal(0, await db.Bookings.CountAsync());
        });
    }
}
