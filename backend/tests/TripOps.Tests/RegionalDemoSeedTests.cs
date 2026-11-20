using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Api.Infrastructure;
using TripOps.Data.Enums;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Regional_demo_is_additive_repeatable_and_consistent_without_external_payments()
    {
        await using var app = new App(); await app.Initialize();
        var province = new RegionalDemoSeed.Province("DA_NANG", "48", "TP. Đà Nẵng", "Đà Nẵng",
            new("https://example.test/danang", Image: "https://example.test/danang.jpg"),
            ["Mỹ Khê", "Sơn Trà", "Ngũ Hành Sơn", "Hội An", "Thanh Hà", "Bảy Mẫu"],
            [new("Hotel reference A", 4, "Đà Nẵng", new("https://example.test/hotel-a", Restaurants: ["Nhà hàng A"])),
             new("Hotel reference B", 4, "Hội An, Đà Nẵng", new("https://example.test/hotel-b", Restaurants: ["Nhà hàng B"]))], 1800000);
        var manifest = new RegionalDemoSeed.Manifest("REGIONAL-DEMO-2026", true, "https://example.test/boundaries", [province]);
        var first = await RegionalDemoSeed.Run(app.Services, manifest);
        Assert.Equal(1, first.Agencies); Assert.Equal(10, first.Accounts); Assert.Equal(2, first.PublicTours);
        Assert.Equal(5, first.Services); Assert.Equal(4, first.Suppliers); Assert.Equal(12, first.Bookings);
        Assert.Equal(6, first.CompletedBookings); Assert.True(first.Reviews > 0);
        await app.Inspect(async db => {
            Assert.Equal(6, await db.Users.CountAsync(u => !u.Email.EndsWith("@" + RegionalDemoSeed.Domain)));
            var bookings = await db.Bookings.Include(b => b.Participants).Include(b => b.BookingAgencies)
                .Include(b => b.PaymentRequests).ThenInclude(p => p.Transactions)
                .Where(b => b.BookingCode.StartsWith(RegionalDemoSeed.Prefix)).AsSplitQuery().ToListAsync();
            foreach (var b in bookings)
            {
                Assert.Equal(b.TotalAmount, b.Participants.Sum(p => p.Price));
                Assert.Equal(b.Participants.Count, b.Participants.Select(p => p.ParticipantIndex).Distinct().Count());
                Assert.NotNull(b.TourConfigurationData);
                var owner = Assert.Single(b.BookingAgencies);
                Assert.Null(owner.AutoPayoutAt); // Even if a developer later enables automatic payouts.
                Assert.All(b.PaymentRequests.SelectMany(p => p.Transactions), t => {
                    Assert.Equal("DEMO", t.PaymentMethod); Assert.Null(t.GatewayLinkId); Assert.Null(t.CheckoutUrl);
                    Assert.True(t.PaidAt <= new DateTime(2026,11,15,5,0,0,DateTimeKind.Utc));
                });
                if (b.Status == BookingStatus.Completed)
                {
                    Assert.Equal(PaymentStatus.Paid, b.PaymentStatus); Assert.NotNull(owner.TourCompletedAt);
                    Assert.Equal(SettlementStatus.Paid, owner.SettlementStatus);
                    Assert.Equal(b.TotalAmount, b.PaymentRequests.SelectMany(p => p.Transactions).Sum(t => t.Amount));
                    Assert.Equal(owner.FinalAmount, owner.NetPayout + owner.PlatformFee);
                }
            }
        });
        var again = await RegionalDemoSeed.Run(app.Services, manifest);
        Assert.Equal(first.Bookings, again.Bookings); Assert.Equal(first.Services, again.Services);
        Assert.Equal(first.Reviews, again.Reviews); Assert.Equal(first.Accounts, again.Accounts);
        using var anonymous = app.CreateClient();
        var evidence = (await anonymous.GetFromJsonAsync<AgencyChoiceDto[]>(Discovery + "?provinceCode=DA_NANG"))!
            .Single(a => a.Email.EndsWith("@" + RegionalDemoSeed.Domain)).Evidence!;
        Assert.Equal(6, evidence.MatchedCompletedTrips); Assert.Equal(2, evidence.MatchedTourCount);
        using var customer = app.CreateClient();
        (await customer.PostAsJsonAsync("/api/v1/auth/login", new { email = "customer.1.da-nang@" + RegionalDemoSeed.Domain, password = RegionalDemoPassword })).EnsureSuccessStatusCode();
        await app.Inspect(async db => {
            var id = await db.Bookings.Where(b => b.BookingCode == "REG26-DA_NANG-1-B01").Select(b => b.Id).SingleAsync();
            (await customer.GetAsync($"/api/v1/bookings/{id}")).EnsureSuccessStatusCode();
        });
    }

    [Fact]
    public async Task Current_provinces_group_historical_tours_and_bookings_without_rewriting_the_snapshot()
    {
        Assert.Equal(34, VietnamProvinceCatalog.All.Count);
        Assert.Equal("AN_GIANG", VietnamProvinceCatalog.CurrentCode("KIEN_GIANG"));
        Assert.Equal("HUE", VietnamProvinceCatalog.CurrentCode("THUA_THIEN_HUE"));
        await using var app = new App(); await app.Initialize();
        using var agency = await app.Login("agency"); using var anonymous = app.CreateClient();
        var tour = await Create(agency, Complete() with { ProvinceCodes = ["QUANG_NAM"] });
        tour = await Command(agency, tour, "publish");
        var snapshot = JsonSerializer.Serialize(Complete() with { ProvinceCodes = ["QUANG_NAM", "DA_NANG"] }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        await app.Inspect(async db => {
            var b = DiscoveryBooking("CURRENT-PROVINCE", null, "agency"); b.TourConfigurationData = snapshot;
            db.Bookings.Add(b); await db.SaveChangesAsync();
        });
        var rows = await anonymous.GetFromJsonAsync<AgencyChoiceDto[]>(Discovery + "?provinceCode=DA_NANG");
        var evidence = rows!.Single(a => a.Id == "agency").Evidence!;
        Assert.Equal(1, evidence.MatchedCompletedTrips); Assert.Equal(1, evidence.MatchedTourCount);
        Assert.Equal("DA_NANG", Assert.Single(evidence.Areas).ProvinceCode);
        Assert.Equal(tour.Id, Assert.Single((await anonymous.GetFromJsonAsync<TourPage<TourListItem>>("/api/v1/tours?provinceCode=DA_NANG"))!.Items).Id);
        await app.Inspect(async db => Assert.Equal(snapshot, (await db.Bookings.SingleAsync(b => b.BookingCode == "CURRENT-PROVINCE")).TourConfigurationData));
    }
}
