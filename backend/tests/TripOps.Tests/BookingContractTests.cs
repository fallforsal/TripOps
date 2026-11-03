using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

// Hợp đồng lữ hành: lập khi Agency duyệt, khách tải PDF, ký, tải bản đã ký lên rồi mới thanh toán; Agency kiểm tra bản ký.
public sealed partial class BookingFlowTests
{
    private static async Task<(HttpClient Customer, HttpClient Agency, BookingDto Booking)> ApprovedUnsigned(App app)
    {
        var customer = await app.Client("customer1@example.test");
        var agency = await app.Client("agency1@example.test");
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings", Sample()));
        Assert.Equal(HttpStatusCode.Conflict, (await customer.GetAsync($"/api/v1/files/contracts/{booking.Id}/document")).StatusCode); // chưa duyệt
        var approved = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
        return (customer, agency, approved);
    }

    [Fact]
    public async Task Approval_creates_the_contract_and_payment_waits_for_the_signed_copy()
    {
        using var app = new App(); await app.Initialize();
        var (customer, agency, booking) = await ApprovedUnsigned(app);
        var contract = booking.Contract!;
        Assert.Equal(1, contract.Version);
        Assert.Equal(BookingService.ContractAwaiting, contract.Status);
        Assert.Equal(booking.TotalAmount, contract.TotalAmount);
        Assert.True(contract.RequiredBeforePayment);
        Assert.StartsWith("HD-", contract.ContractNo);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(1500000, "DEP-UNSIGNED", null))).StatusCode);

        // Khách, Agency chủ tour và Admin tải được PDF; người khác thì không.
        var pdf = await customer.GetAsync($"/api/v1/files/contracts/{booking.Id}/document");
        Assert.Equal(HttpStatusCode.OK, pdf.StatusCode);
        Assert.Equal("application/pdf", pdf.Content.Headers.ContentType!.MediaType);
        Assert.Equal("%PDF-", Encoding.ASCII.GetString((await pdf.Content.ReadAsByteArrayAsync())[..5]));
        Assert.Equal(HttpStatusCode.OK, (await agency.GetAsync($"/api/v1/files/contracts/{booking.Id}/document")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await (await app.Client("admin1@example.test")).GetAsync($"/api/v1/files/contracts/{booking.Id}/document")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await app.Client("customer2@example.test")).GetAsync($"/api/v1/files/contracts/{booking.Id}/document")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await customer.GetAsync($"/api/v1/files/contracts/{booking.Id}/signed")).StatusCode);

        // Chỉ nhận PDF/PNG/JPG thật (kiểm tra nội dung file, không tin tên file).
        Assert.Equal(HttpStatusCode.BadRequest, (await UploadContract(customer, booking.Id, "not a pdf"u8.ToArray(), "fake.pdf")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await UploadContract(await app.Client("customer2@example.test"), booking.Id, SignedPdf)).StatusCode);

        var signed = await Read<BookingDto>(await UploadContract(customer, booking.Id, SignedPdf));
        Assert.Equal(BookingService.ContractSigned, signed.Contract!.Status);
        Assert.False(signed.Contract.RequiredBeforePayment);
        Assert.Equal("upload", signed.Contract.SignMethod);
        var copy = await agency.GetAsync($"/api/v1/files/contracts/{booking.Id}/signed");
        Assert.Equal(SignedPdf, await copy.Content.ReadAsByteArrayAsync());

        // Ký xong là thanh toán được, không cần chờ Agency kiểm tra.
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-SIGNED", null)));

        using var scope = app.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<TripOpsDbContext>().BookingContracts.SingleAsync(c => c.BookingId == booking.Id);
        Assert.Equal(64, stored.SignedFileSha256!.Length);
    }

    [Fact]
    public async Task Agency_verifies_or_asks_to_sign_again_and_a_price_change_needs_a_new_version()
    {
        using var app = new App(); await app.Initialize();
        var (customer, agency, booking) = await ApprovedUnsigned(app);
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/contract/review",
            new ContractReviewRequest("verify", null))).StatusCode); // chưa có bản ký
        await SignContract(customer, booking.Id);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/contract/review",
            new ContractReviewRequest("resign", null))).StatusCode); // thiếu lý do
        Assert.Equal(HttpStatusCode.Forbidden, (await (await app.Client("agency2@example.test")).PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/contract/review",
            new ContractReviewRequest("verify", null))).StatusCode);
        var resign = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/contract/review",
            new ContractReviewRequest("resign", "Thiếu chữ ký ở trang 2")));
        Assert.Equal(BookingService.ContractResign, resign.Contract!.Status);
        Assert.Equal("Thiếu chữ ký ở trang 2", resign.Contract.ReviewNote);
        Assert.True(resign.Contract.RequiredBeforePayment);

        await SignContract(customer, booking.Id);
        var verified = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/contract/review",
            new ContractReviewRequest("verify", null)));
        Assert.Equal(BookingService.ContractVerified, verified.Contract!.Status);
        Assert.Equal(HttpStatusCode.Conflict, (await UploadContract(customer, booking.Id, SignedPdf)).StatusCode); // đã xác nhận

        // Giá đổi sau khi duyệt: hợp đồng cũ bị thay, khách phải ký phiên bản mới trước khi trả tiền.
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var row = await db.Bookings.SingleAsync(b => b.Id == booking.Id);
            row.TotalAmount += 500000;
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.OK, (await customer.GetAsync($"/api/v1/files/contracts/{booking.Id}/document")).StatusCode);
        var current = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal(2, current.Contract!.Version);
        Assert.Equal(BookingService.ContractAwaiting, current.Contract.Status);
        Assert.Equal(current.TotalAmount, current.Contract.TotalAmount);
        Assert.True(current.Contract.RequiredBeforePayment);
        using var check = app.Services.CreateScope();
        Assert.Equal(BookingService.ContractSuperseded, (await check.ServiceProvider.GetRequiredService<TripOpsDbContext>()
            .BookingContracts.SingleAsync(c => c.BookingId == booking.Id && c.Version == 1)).Status);
    }
}
