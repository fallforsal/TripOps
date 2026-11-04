using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

// Ký hợp đồng trực tuyến: mã phiên một lần (QR) + OTP email, máy chủ ghép chữ ký vào PDF, ký xong mở thanh toán ngay.
public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task Online_signing_with_qr_token_and_otp_stamps_the_pdf_and_opens_payment()
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        using var app = PayOsApp(new FakePayOs(), clock); await app.Initialize();
        var (customer, agency, booking) = await ApprovedUnsigned(app);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await app.Client("customer2@example.test"))
            .PostAsync($"/api/v1/bookings/{booking.Id}/contract/sign-sessions", null)).StatusCode);

        var start = await Read<SignSessionStartDto>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/contract/sign-sessions", null));
        Assert.True(start.Token.Length >= 40);
        Assert.Equal(booking.Contract!.ContractNo, start.ContractNo);

        // Điện thoại quét QR: không đăng nhập vẫn đọc được hợp đồng của đúng phiên; email bị che bớt.
        using var phone = app.CreateClient();
        var info = (await phone.GetFromJsonAsync<SignSessionDto>($"/api/v1/contract-signing/{start.Token}"))!;
        Assert.Equal("open", info.Status);
        Assert.Equal(start.Version, info.Version);
        Assert.Equal("c***1@example.test", info.MaskedEmail);
        var unsigned = await phone.GetAsync($"/api/v1/files/contracts/signing/{start.Token}/document");
        Assert.Equal("%PDF-", Encoding.ASCII.GetString((await unsigned.Content.ReadAsByteArrayAsync())[..5]));
        Assert.Equal(HttpStatusCode.NotFound, (await phone.GetAsync("/api/v1/contract-signing/ma-sai-khong-ton-tai")).StatusCode);

        // Chưa gửi OTP thì chưa ký được; gửi lại OTP phải chờ 60 giây.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await phone.PostAsJsonAsync($"/api/v1/contract-signing/{start.Token}/sign",
            new WebSignRequest(SignaturePng, "123456", true))).StatusCode);
        var otp = await Read<SignSessionDto>(await phone.PostAsync($"/api/v1/contract-signing/{start.Token}/otp", null));
        Assert.Matches("^[0-9]{6}$", otp.DevelopmentOtp!); // Development chưa cấu hình SMTP
        Assert.Equal((HttpStatusCode)429, (await phone.PostAsync($"/api/v1/contract-signing/{start.Token}/otp", null)).StatusCode);

        // Chưa tích đồng ý, chữ ký không phải PNG, sai OTP: đều bị từ chối.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await phone.PostAsJsonAsync($"/api/v1/contract-signing/{start.Token}/sign",
            new WebSignRequest(SignaturePng, otp.DevelopmentOtp!, false))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await phone.PostAsJsonAsync($"/api/v1/contract-signing/{start.Token}/sign",
            new WebSignRequest("data:image/png;base64,bm90LWEtcG5n", otp.DevelopmentOtp!, true))).StatusCode);
        var wrongOtp = otp.DevelopmentOtp == "000000" ? "111111" : "000000";
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await phone.PostAsJsonAsync($"/api/v1/contract-signing/{start.Token}/sign",
            new WebSignRequest(SignaturePng, wrongOtp, true))).StatusCode);

        var done = await Read<SignSessionDto>(await phone.PostAsJsonAsync($"/api/v1/contract-signing/{start.Token}/sign",
            new WebSignRequest(SignaturePng, otp.DevelopmentOtp!, true)));
        Assert.Equal("completed", done.Status);
        // Mã đã dùng: không ký lần hai, nhưng xem lại bản đã ký được.
        Assert.Equal(HttpStatusCode.Conflict, (await phone.PostAsJsonAsync($"/api/v1/contract-signing/{start.Token}/sign",
            new WebSignRequest(SignaturePng, otp.DevelopmentOtp!, true))).StatusCode);
        var signedView = await (await phone.GetAsync($"/api/v1/files/contracts/signing/{start.Token}/document")).Content.ReadAsByteArrayAsync();

        var after = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal(BookingService.ContractSigned, after.Contract!.Status);
        Assert.Equal("web", after.Contract.SignMethod);
        Assert.False(after.Contract.RequiredBeforePayment); // ký trực tuyến có OTP: mở thanh toán ngay
        var stored = await (await agency.GetAsync($"/api/v1/files/contracts/{booking.Id}/signed")).Content.ReadAsByteArrayAsync();
        Assert.Equal(stored, signedView);
        Assert.Equal("%PDF-", Encoding.ASCII.GetString(stored[..5]));
        Assert.Equal(HttpStatusCode.Conflict, (await UploadContract(customer, booking.Id, SignedPdf)).StatusCode); // không đè bằng bản tải lên
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/contract/sign-sessions", null)).StatusCode);
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-WEB", null)));

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var contract = await db.BookingContracts.SingleAsync(c => c.BookingId == booking.Id);
        Assert.Equal(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(stored)).ToLowerInvariant(), contract.SignedFileSha256);
        var session = await db.ContractSignSessions.SingleAsync(s => s.ContractId == contract.Id);
        Assert.NotNull(session.CompletedAt);
        Assert.Null(session.OtpHash);
        Assert.NotEqual(start.Token, session.TokenHash); // chỉ lưu mã băm
    }

    [Fact]
    public async Task Sign_tokens_expire_are_replaced_by_new_ones_and_lock_after_five_wrong_otps()
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        using var app = PayOsApp(new FakePayOs(), clock); await app.Initialize();
        var (customer, _, booking) = await ApprovedUnsigned(app);
        using var phone = app.CreateClient();

        // Tạo mã mới thì mã cũ hết hiệu lực.
        var first = await Read<SignSessionStartDto>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/contract/sign-sessions", null));
        var second = await Read<SignSessionStartDto>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/contract/sign-sessions", null));
        Assert.Equal("expired", (await phone.GetFromJsonAsync<SignSessionDto>($"/api/v1/contract-signing/{first.Token}"))!.Status);
        Assert.Equal(HttpStatusCode.Gone, (await phone.PostAsync($"/api/v1/contract-signing/{first.Token}/otp", null)).StatusCode);

        // Sai OTP 5 lần thì khóa phiên.
        var otp = await Read<SignSessionDto>(await phone.PostAsync($"/api/v1/contract-signing/{second.Token}/otp", null));
        var wrong = otp.DevelopmentOtp == "000000" ? "111111" : "000000";
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.UnprocessableEntity, (await phone.PostAsJsonAsync($"/api/v1/contract-signing/{second.Token}/sign",
                new WebSignRequest(SignaturePng, wrong, true))).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await phone.PostAsJsonAsync($"/api/v1/contract-signing/{second.Token}/sign",
            new WebSignRequest(SignaturePng, otp.DevelopmentOtp!, true))).StatusCode);

        // Mã hết hạn sau 15 phút.
        var third = await Read<SignSessionStartDto>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/contract/sign-sessions", null));
        clock.Fixed = clock.Fixed.Value.AddMinutes(16);
        Assert.Equal(HttpStatusCode.Gone, (await phone.PostAsync($"/api/v1/contract-signing/{third.Token}/otp", null)).StatusCode);

        // OTP hết hạn sau 5 phút thì phải gửi lại.
        var fourth = await Read<SignSessionStartDto>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/contract/sign-sessions", null));
        var code = await Read<SignSessionDto>(await phone.PostAsync($"/api/v1/contract-signing/{fourth.Token}/otp", null));
        clock.Fixed = clock.Fixed.Value.AddMinutes(6);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await phone.PostAsJsonAsync($"/api/v1/contract-signing/{fourth.Token}/sign",
            new WebSignRequest(SignaturePng, code.DevelopmentOtp!, true))).StatusCode);
        var again = await Read<SignSessionDto>(await phone.PostAsync($"/api/v1/contract-signing/{fourth.Token}/otp", null));
        Assert.Equal("completed", (await Read<SignSessionDto>(await phone.PostAsJsonAsync($"/api/v1/contract-signing/{fourth.Token}/sign",
            new WebSignRequest(SignaturePng, again.DevelopmentOtp!, true)))).Status);
    }
}
