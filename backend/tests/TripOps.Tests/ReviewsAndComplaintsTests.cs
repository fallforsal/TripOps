using System.Text.Json;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Service.Payments;
using TripOps.Service.Reviews;
using TripOps.Service.Settlements;

namespace TripOps.Tests;

// Đánh giá (7 ngày, sao tour; sao Agency tính bằng công thức) và khiếu nại (chuyến đi trong 1 ngày / nền tảng; khách ↔ Admin).
public sealed partial class BookingFlowTests
{
    private static App ReviewApp(TestClock clock, bool localStorage = false) => new(builder =>
    {
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PayOsPayout:ClientId"] = "payout-client",
            ["PayOsPayout:ApiKey"] = "payout-api",
            ["PayOsPayout:ChecksumKey"] = PayoutChecksum,
            ["PayOsPayout:BaseUrl"] = "https://payout.test",
            ["Settlement:AutoPayoutEnabled"] = "false",
            ["Settlement:AutoPayoutDelayDays"] = "2",
            ["Settlement:BankAccountCooldownHours"] = "0",
            ["Storage:UseLocal"] = localStorage ? "true" : "false",
        }));
        builder.ConfigureServices(services =>
        {
            services.AddSingleton<PaymentClock>(clock);
            services.AddHttpClient<PayOsPayoutGateway>().ConfigurePrimaryHttpMessageHandler(() => new FakePayout());
        });
    });

    private static MultipartFormDataContent ComplaintBody(string type, int? bookingId, string reason, string title, string description,
        params (byte[] Bytes, string Mime)[] images)
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent(type), "Type" },
            { new StringContent(reason), "ReasonCode" },
            { new StringContent(title), "Title" },
            { new StringContent(description), "Description" },
        };
        if (bookingId is { } id) form.Add(new StringContent(id.ToString()), "BookingId");
        foreach (var (bytes, mime) in images)
        {
            var file = new ByteArrayContent(bytes);
            file.Headers.ContentType = new MediaTypeHeaderValue(mime);
            form.Add(file, "Images", mime == "image/png" ? "evidence.png" : "evidence.jpg");
        }
        return form;
    }

    [Fact]
    public void Agency_score_pulls_few_reviews_toward_the_platform_average()
    {
        Assert.Equal(4.42m, ReviewRules.BayesianScore(1, 5, 4.3m));
        Assert.Equal(4.78m, ReviewRules.BayesianScore(100, 480, 4.3m));
        Assert.True(ReviewRules.BayesianScore(100, 480, 4.3m) > ReviewRules.BayesianScore(1, 5, 4.3m));
        Assert.True(ReviewRules.ComplaintWindow < TimeSpan.FromDays(2), "Hạn khiếu nại phải ngắn hơn thời gian chờ tự chuyển tiền cho Agency.");
    }

    [Fact]
    public async Task Customer_reviews_a_completed_tour_once_and_agency_replies_publicly()
    {
        var clock = new TestClock { Fixed = Now() };
        using var app = ReviewApp(clock);
        await app.Initialize();
        var (_, agency, booking) = await CompletedTour(app, paid: true);
        using var customer = await app.Client("customer1@example.test");

        var reviewable = await customer.GetFromJsonAsync<List<ReviewableBookingDto>>("/api/v1/me/feedbacks/reviewable-bookings");
        var option = Assert.Single(reviewable!, b => b.BookingId == booking.Id);
        Assert.Equal(clock.Fixed!.Value.AddDays(7), option.Deadline);

        var created = await customer.PostAsJsonAsync("/api/v1/me/feedbacks", new CreateFeedbackRequest(booking.Id, 4, "Lịch trình hợp lý, HDV nhiệt tình."));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await customer.PostAsJsonAsync("/api/v1/me/feedbacks", new CreateFeedbackRequest(booking.Id, 5, null))).StatusCode);
        Assert.DoesNotContain((await customer.GetFromJsonAsync<List<ReviewableBookingDto>>("/api/v1/me/feedbacks/reviewable-bookings"))!,
            b => b.BookingId == booking.Id);

        using (var other = await app.Client("customer2@example.test"))
            Assert.Equal(HttpStatusCode.NotFound,
                (await other.PostAsJsonAsync("/api/v1/me/feedbacks", new CreateFeedbackRequest(booking.Id, 1, null))).StatusCode);

        // Sao tour và sao Agency (Agency không do khách chấm, tính từ đánh giá các tour).
        int tourId;
        using (var scope = app.Services.CreateScope())
            tourId = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>().Bookings.Single(b => b.Id == booking.Id).TourId!.Value;
        using var anonymous = app.CreateClient();
        var tourReviews = await anonymous.GetFromJsonAsync<TourReviewsDto>($"/api/v1/tours/{tourId}/reviews");
        Assert.Equal(1, tourReviews!.Count);
        Assert.Equal(4.0m, tourReviews.Average);
        Assert.Equal(1, tourReviews.Distribution[3]);
        var rating = await anonymous.GetFromJsonAsync<AgencyRatingDto>("/api/v1/agencies/agency1/rating");
        Assert.Equal(1, rating!.Count);
        Assert.Equal(4.0m, rating.Average);
        Assert.Equal(4.0m, rating.Score);

        var overview = await agency.GetFromJsonAsync<AgencyFeedbackOverviewDto>("/api/v1/agency/feedbacks");
        var item = Assert.Single(overview!.Items);
        Assert.Equal("Customer One", item.CustomerName);
        var replied = await agency.PutAsJsonAsync($"/api/v1/agency/feedbacks/{item.Id}/reply", new FeedbackReplyRequest("Cảm ơn anh/chị đã đồng hành!"));
        replied.EnsureSuccessStatusCode();
        using (var otherAgency = await app.Client("agency2@example.test"))
            Assert.Equal(HttpStatusCode.NotFound,
                (await otherAgency.PutAsJsonAsync($"/api/v1/agency/feedbacks/{item.Id}/reply", new FeedbackReplyRequest("Không phải của tôi"))).StatusCode);

        var mine = Assert.Single((await customer.GetFromJsonAsync<List<MyFeedbackDto>>("/api/v1/me/feedbacks"))!);
        Assert.Equal("Cảm ơn anh/chị đã đồng hành!", mine.AgencyReply);
        var publicReview = Assert.Single((await anonymous.GetFromJsonAsync<TourReviewsDto>($"/api/v1/tours/{tourId}/reviews"))!.Reviews);
        Assert.Equal("Customer One", publicReview.CustomerName);
        Assert.Equal("Cảm ơn anh/chị đã đồng hành!", publicReview.AgencyReply);
    }

    [Fact]
    public async Task Review_window_closes_seven_days_after_completion()
    {
        var clock = new TestClock { Fixed = Now() };
        using var app = ReviewApp(clock);
        await app.Initialize();
        var (_, _, booking) = await CompletedTour(app, paid: true);
        using var customer = await app.Client("customer1@example.test");

        clock.Fixed = clock.Fixed!.Value.AddDays(7).AddMinutes(1);
        Assert.Empty((await customer.GetFromJsonAsync<List<ReviewableBookingDto>>("/api/v1/me/feedbacks/reviewable-bookings"))!);
        Assert.Equal(HttpStatusCode.Conflict,
            (await customer.PostAsJsonAsync("/api/v1/me/feedbacks", new CreateFeedbackRequest(booking.Id, 5, null))).StatusCode);
    }

    [Fact]
    public async Task Admin_resolves_a_trip_complaint_the_agency_sees_it_and_platform_complaints_stay_hidden()
    {
        var clock = new TestClock { Fixed = Now() };
        using var app = ReviewApp(clock);
        await app.Initialize();
        var (admin, agency, booking) = await CompletedTour(app, paid: true);
        using var customer = await app.Client("customer1@example.test");

        var option = Assert.Single((await customer.GetFromJsonAsync<List<ComplaintBookingOptionDto>>("/api/v1/me/complaints/booking-options"))!,
            b => b.BookingId == booking.Id);
        Assert.True(option.CanComplain);
        Assert.Equal(clock.Fixed!.Value.AddDays(1), option.Deadline);

        var response = await customer.PostAsync("/api/v1/me/complaints",
            ComplaintBody("Trip", booking.Id, "accommodation_food", "Phòng khách sạn sai hạng", "Đêm 2 bị đổi sang phòng khu phụ, không đúng 4 sao như cam kết."));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var complaint = await Read<ComplaintDto>(response);
        Assert.Equal("Trip", complaint.Type);
        Assert.Equal("Pending", complaint.Status);
        Assert.Equal("agency1", complaint.AgencyId);

        // Một chuyến đi chỉ có một khiếu nại đang mở.
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync("/api/v1/me/complaints",
            ComplaintBody("Trip", booking.Id, "other", "Thêm một khiếu nại", "Nội dung khiếu nại thứ hai cho cùng chuyến."))).StatusCode);
        Assert.Equal(1, (await Settlement(admin, booking.Id)).OpenComplaints);

        // Agency xem (chỉ đọc) khiếu nại về booking của mình, không vào được trang Admin.
        Assert.Equal(HttpStatusCode.Forbidden, (await agency.GetAsync("/api/v1/admin/complaints")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await agency.GetAsync($"/api/v1/me/complaints/{complaint.Id}")).StatusCode);
        var agencyList = await agency.GetFromJsonAsync<List<ComplaintSummaryDto>>("/api/v1/agency/complaints");
        Assert.Equal(complaint.Id, Assert.Single(agencyList!).Id);
        Assert.Equal("Pending", (await agency.GetFromJsonAsync<ComplaintDto>($"/api/v1/agency/complaints/{complaint.Id}"))!.Status);
        using (var otherAgency = await app.Client("agency2@example.test"))
        {
            Assert.Empty((await otherAgency.GetFromJsonAsync<List<ComplaintSummaryDto>>("/api/v1/agency/complaints"))!);
            Assert.Equal(HttpStatusCode.NotFound, (await otherAgency.GetAsync($"/api/v1/agency/complaints/{complaint.Id}")).StatusCode);
        }

        // Admin gắn thẻ khiếu nại khi chat với Agency.
        var conversation = (await Read<JsonElement>(await admin.PostAsJsonAsync("/api/v1/chat/conversations", new { userId = "agency1" }))).GetProperty("id").GetInt32();
        Assert.True((await admin.PostAsJsonAsync($"/api/v1/chat/conversations/{conversation}/messages",
            new { content = "Agency kiểm tra giúp phòng đêm 2", clientMessageId = Guid.NewGuid(), context = new { kind = "complaint", id = complaint.Id } })).IsSuccessStatusCode);

        // Khiếu nại không còn từ chối: chỉ đánh dấu đã giải quyết.
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/api/v1/admin/complaints/{complaint.Id}/resolve",
            new ResolveComplaintRequest("Rejected", "Không chấp nhận khiếu nại này."))).StatusCode);

        // Admin xem (có SĐT/email khách để liên hệ), ghi cách giải quyết rồi đánh dấu đã giải quyết.
        var forAdmin = await admin.GetFromJsonAsync<ComplaintDto>($"/api/v1/admin/complaints/{complaint.Id}");
        Assert.Equal("Customer One", forAdmin!.CustomerName);
        var resolved = await Read<ComplaintDto>(await admin.PostAsJsonAsync($"/api/v1/admin/complaints/{complaint.Id}/resolve",
            new ResolveComplaintRequest("Resolved", "Agency xác nhận đổi phòng; hoàn 500.000đ cho khách.")));
        Assert.Equal("Resolved", resolved.Status);
        var seen = await customer.GetFromJsonAsync<ComplaintDto>($"/api/v1/me/complaints/{complaint.Id}");
        Assert.Equal("Agency xác nhận đổi phòng; hoàn 500.000đ cho khách.", seen!.AdminNotes);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/complaints/{complaint.Id}/resolve",
            new ResolveComplaintRequest("Resolved", "Giải quyết lại lần hai."))).StatusCode);
        Assert.Equal("Resolved", (await agency.GetFromJsonAsync<ComplaintDto>($"/api/v1/agency/complaints/{complaint.Id}"))!.Status);
        Assert.Equal(0, (await Settlement(admin, booking.Id)).OpenComplaints);

        var stats = await admin.GetFromJsonAsync<List<AgencyComplaintStatDto>>("/api/v1/admin/complaints/agency-stats");
        var agencyStat = Assert.Single(stats!, s => s.AgencyId == "agency1");
        Assert.Equal(1, agencyStat.Upheld);
        Assert.Equal(0, agencyStat.Open);

        // Khiếu nại nền tảng: không cần booking, không gắn Agency, không bị giới hạn 1 ngày.
        clock.Fixed = clock.Fixed!.Value.AddDays(30);
        var platform = await Read<ComplaintDto>(await customer.PostAsync("/api/v1/me/complaints",
            ComplaintBody("Platform", null, "payment_refund", "Chưa nhận được tiền hoàn", "Đã 10 ngày từ khi được duyệt hoàn tiền nhưng chưa nhận được.")));
        Assert.Null(platform.BookingId);
        Assert.Null(platform.AgencyId);
        Assert.Equal(2, (await customer.GetFromJsonAsync<List<ComplaintSummaryDto>>("/api/v1/me/complaints"))!.Count);
        Assert.Single((await agency.GetFromJsonAsync<List<ComplaintSummaryDto>>("/api/v1/agency/complaints"))!);
    }

    [Fact]
    public async Task Trip_complaint_window_closes_one_day_after_completion_and_reasons_are_validated()
    {
        var clock = new TestClock { Fixed = Now() };
        using var app = ReviewApp(clock);
        await app.Initialize();
        var (_, _, booking) = await CompletedTour(app, paid: true);
        using var customer = await app.Client("customer1@example.test");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsync("/api/v1/me/complaints",
            ComplaintBody("Platform", null, "guide_attitude", "Sai phân loại", "Lý do này chỉ dành cho khiếu nại chuyến đi."))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsync("/api/v1/me/complaints",
            ComplaintBody("Trip", null, "other", "Thiếu booking", "Khiếu nại chuyến đi phải chọn booking."))).StatusCode);

        clock.Fixed = clock.Fixed!.Value.AddDays(1).AddMinutes(1);
        var option = Assert.Single((await customer.GetFromJsonAsync<List<ComplaintBookingOptionDto>>("/api/v1/me/complaints/booking-options"))!,
            b => b.BookingId == booking.Id);
        Assert.False(option.CanComplain);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync("/api/v1/me/complaints",
            ComplaintBody("Trip", booking.Id, "other", "Khiếu nại muộn", "Gửi sau khi đã quá hạn một ngày."))).StatusCode);
    }

    [Fact]
    public async Task Complaint_evidence_images_are_private_to_the_customer_and_admin()
    {
        var clock = new TestClock { Fixed = Now() };
        using var app = ReviewApp(clock, localStorage: true);
        await app.Initialize();
        var (admin, _, booking) = await CompletedTour(app, paid: true);
        using var customer = await app.Client("customer1@example.test");
        var png = new byte[] { 137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13 };

        var complaint = await Read<ComplaintDto>(await customer.PostAsync("/api/v1/me/complaints",
            ComplaintBody("Trip", booking.Id, "service_quality", "Xe đón trễ hai tiếng", "Xe đón đoàn trễ hai tiếng ở điểm hẹn ngày đầu.", (png, "image/png"))));
        var url = Assert.Single(complaint.Evidence);
        Assert.StartsWith("/api/v1/files/complaints/customer1/", url);

        Assert.Equal(HttpStatusCode.OK, (await customer.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync(url)).StatusCode);
        using var other = await app.Client("customer2@example.test");
        Assert.Equal(HttpStatusCode.Forbidden, (await other.GetAsync(url)).StatusCode);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsync("/api/v1/me/complaints",
            ComplaintBody("Platform", null, "app_error", "Ảnh không hợp lệ", "Tệp gửi lên không phải ảnh thật.", ("not-an-image"u8.ToArray(), "image/png")))).StatusCode);
    }
}
