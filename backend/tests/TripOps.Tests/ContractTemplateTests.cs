using System.Net;
using System.Net.Http.Json;
using TripOps.Service.Bookings;
using TripOps.Service.Contracts;
using TripOps.Service.Payments;
using TripOps.Service.Tours;

namespace TripOps.Tests;

// Mẫu hợp đồng riêng của Agency: chính sách hủy do Agency soạn được dùng để tính phí thật, booking giữ bản chụp lúc đặt.
public sealed partial class BookingFlowTests
{
    private static ContractTemplateRequest CustomTemplate(string? extra = "Khách mang theo CCCD bản gốc.") => new(
        [new CancellationTier(30, 10m), new CancellationTier(14, 40m), new CancellationTier(5, 80m)],
        "Mùa cao điểm Tết áp dụng như ngày thường.", extra);

    [Fact]
    public void Contract_terms_compute_fee_from_agency_tiers_with_fixed_platform_rules()
    {
        var terms = ContractTerms.Validate(CustomTemplate().Tiers, null, null);
        Assert.Equal(10m, terms.FeePercent(45, false));
        Assert.Equal(10m, terms.FeePercent(30, false));
        Assert.Equal(40m, terms.FeePercent(29, false));
        Assert.Equal(40m, terms.FeePercent(14, false));
        Assert.Equal(80m, terms.FeePercent(13, false));
        Assert.Equal(80m, terms.FeePercent(5, false));
        Assert.Equal(100m, terms.FeePercent(4, false)); // dưới mốc thấp nhất
        Assert.Equal(100m, terms.FeePercent(0, true));  // ngày khởi hành: luôn 100%
        Assert.Equal(0m, terms.FeePercent(20, true));   // 72 giờ cân nhắc vẫn là luật chung

        Assert.Equal(["Từ 30 ngày trở lên", "Từ 14 đến 29 ngày", "Từ 5 đến 13 ngày", "Từ 1 đến 4 ngày", "Ngày khởi hành hoặc không tham gia"],
            terms.TableRows().Select(r => r.Range));
        Assert.Equal(["10%", "40%", "80%", "100%", "100%"], terms.TableRows().Select(r => r.Fee));

        // Mặc định TripOps giữ nguyên bảng cũ.
        Assert.Equal(25m, CancellationPolicy.FeePercent(15, false));
        Assert.Same(ContractTerms.Default, ContractTerms.Parse(null));
        Assert.Same(ContractTerms.Default, ContractTerms.Parse("{not json"));
        var roundTrip = ContractTerms.Parse(ContractTerms.Validate(CustomTemplate().Tiers, "x", "y").ToJson());
        Assert.Equal((40m, "x", "y"), (roundTrip.FeePercent(20, false), roundTrip.CancellationNote, roundTrip.AdditionalTerms));
    }

    [Theory]
    [InlineData("empty")]
    [InlineData("duplicate")]
    [InlineData("lower-near-departure")]
    [InlineData("over-100")]
    [InlineData("zero-days")]
    public void Invalid_cancellation_tiers_are_rejected(string kind)
    {
        CancellationTier[] tiers = kind switch
        {
            "empty" => [],
            "duplicate" => [new(10, 20m), new(10, 30m)],
            "lower-near-departure" => [new(30, 50m), new(7, 20m)],
            "over-100" => [new(10, 120m)],
            _ => [new(0, 10m)],
        };
        var error = Assert.Throws<BookingException>(() => ContractTerms.Validate(tiers, null, null));
        Assert.Equal(422, error.Status);
    }

    [Fact]
    public void Contract_pdf_renders_with_agency_terms()
    {
        var data = new ContractData("HD-1", 1, DateTime.UtcNow, null, "Agency", null, null, null, null, [],
            "Khách", null, null, null, "BK1", "Tour", DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(2), 1,
            [("Khách", "Người lớn", 1000000m)], [new ContractDay(1, DateTime.UtcNow.Date, "Ngày 1", "Sáng", null)], 1000000m,
            [("Đợt 1 – đặt cọc", 500000m, "hôm nay")], ContractTerms.Validate(CustomTemplate().Tiers, "Ghi chú", "Điều khoản 1\nĐiều khoản 2"));
        var pdf = ContractPdf.Generate(data);
        Assert.True(pdf.Length > 1000);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(pdf, 0, 4));
    }

    [Fact]
    public async Task Agency_template_is_saved_validated_and_shown_on_the_public_tour()
    {
        using var app = new App(); await app.Initialize();
        var agency = await app.Client("agency1@example.test");
        var initial = (await agency.GetFromJsonAsync<ContractTemplateDto>("/api/v1/agency/contract-template"))!;
        Assert.True(initial.IsDefault);
        Assert.Equal(25m, initial.Tiers.Single(t => t.MinDays == 15).FeePercent);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PutAsJsonAsync("/api/v1/agency/contract-template",
            new ContractTemplateRequest([new CancellationTier(30, 50m), new CancellationTier(7, 20m)], null, null))).StatusCode);
        var customer = await app.Client("customer1@example.test");
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PutAsJsonAsync("/api/v1/agency/contract-template", CustomTemplate())).StatusCode);

        var saved = await Read<ContractTemplateDto>(await agency.PutAsJsonAsync("/api/v1/agency/contract-template", CustomTemplate()));
        Assert.False(saved.IsDefault);
        Assert.Equal([30, 14, 5], saved.Tiers.Select(t => t.MinDays));
        Assert.Equal("Khách mang theo CCCD bản gốc.", saved.AdditionalTerms);
        var again = (await agency.GetFromJsonAsync<ContractTemplateDto>("/api/v1/agency/contract-template"))!;
        Assert.Equal(saved.Tiers, again.Tiers);

        // Agency khác vẫn dùng mặc định; trang tour công khai hiển thị chính sách của Agency sở hữu tour.
        var other = (await (await app.Client("agency2@example.test")).GetFromJsonAsync<ContractTemplateDto>("/api/v1/agency/contract-template"))!;
        Assert.True(other.IsDefault);
        var tour = (await app.CreateClient().GetFromJsonAsync<PublicTourDto>("/api/v1/tours/1"))!;
        Assert.Equal("40%", tour.CancellationPolicy!.Rows.Single(r => r.Range == "Từ 14 đến 29 ngày").Fee);
        Assert.Equal("Mùa cao điểm Tết áp dụng như ngày thường.", tour.CancellationPolicy.Note);
        Assert.False(tour.CancellationPolicy.IsDefault);
    }

    [Fact]
    public async Task Customer_cancellation_uses_the_policy_snapshot_taken_when_booking()
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        using var app = PayOsApp(new FakePayOs(), clock); await app.Initialize();
        var agency = await app.Client("agency1@example.test");
        await Read<ContractTemplateDto>(await agency.PutAsJsonAsync("/api/v1/agency/contract-template", CustomTemplate()));

        var (customer, _, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(20) });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-T1", null)));

        // Agency đổi mẫu sau khi khách đã đặt: đơn cũ vẫn theo bản chụp (còn 16 ngày → mốc 14 ngày → 40%).
        await Read<ContractTemplateDto>(await agency.PutAsJsonAsync("/api/v1/agency/contract-template",
            new ContractTemplateRequest([new CancellationTier(1, 0m)], null, null)));
        clock.Fixed = clock.Fixed.Value.AddDays(4);
        var quote = (await customer.GetFromJsonAsync<CancellationQuoteDto>($"/api/v1/bookings/{booking.Id}/cancellation-quote"))!;
        Assert.Equal("customer", quote.Mode);
        Assert.Equal(40m, quote.FeePercent);
        Assert.Equal(1200000m, quote.Fee);      // 40% × 3.000.000đ
        Assert.Equal(300000m, quote.RefundAmount);
        Assert.Equal("40%", quote.Policy!.Rows.Single(r => r.Range == "Từ 14 đến 29 ngày").Fee);

        var cancelled = await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancellation-requests", CancelWithBank()));
        Assert.Equal("Cancelled", cancelled.Status);
        Assert.Equal(300000m, cancelled.Cancellation!.SuggestedRefund);

        // Đơn mới đặt sau khi đổi mẫu dùng chính sách mới (0% từ 1 ngày).
        var (_, _, second) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(20) });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{second.Id}/deposit", new BookingDepositRequest(1500000, "DEP-T2", null)));
        clock.Fixed = clock.Fixed.Value.AddDays(4);
        var secondQuote = (await customer.GetFromJsonAsync<CancellationQuoteDto>($"/api/v1/bookings/{second.Id}/cancellation-quote"))!;
        Assert.Equal(0m, secondQuote.FeePercent);
        Assert.Equal(1500000m, secondQuote.RefundAmount);

        // Hợp đồng của đơn đang hiệu lực tải được theo chính sách trong bản chụp của đơn đó.
        Assert.Equal(HttpStatusCode.OK, (await customer.GetAsync($"/api/v1/files/contracts/{second.Id}/document")).StatusCode);
    }
}
