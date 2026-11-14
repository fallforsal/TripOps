using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Net.Mail;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using TripOps.Service.Accounts;
using TripOps.Service.Notifications;

namespace TripOps.Tests;

// Email chào mừng, quên mật khẩu bằng OTP qua email, đổi mật khẩu trong hồ sơ (đăng xuất các thiết bị khác).
public sealed partial class BookingFlowTests
{
    private sealed class FakeEmail(bool fail = false) : EmailSender(new SmtpOptions(), NullLogger<EmailSender>.Instance)
    {
        public ConcurrentQueue<(string To, string Subject, string Body)> Sent { get; } = new();
        public override bool IsConfigured => true;
        public override Task Send(string to, string subject, string htmlBody, CancellationToken ct)
        {
            if (fail) throw new SmtpException("SMTP down");
            Sent.Enqueue((to, subject, htmlBody));
            return Task.CompletedTask;
        }
        public string LastCode(string to) =>
            Regex.Match(Sent.Last(m => m.To == to && m.Subject.Contains("đặt lại mật khẩu")).Subject, @"\d{6}").Value;
    }

    private static App EmailApp(FakeEmail email) => new(builder => builder.ConfigureServices(s => s.AddSingleton<EmailSender>(email)));

    private static HttpClient Anonymous(App app) =>
        app.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, BaseAddress = new Uri("http://localhost") });

    [Fact]
    public async Task Forgot_password_emails_a_code_and_resetting_signs_out_existing_sessions()
    {
        var email = new FakeEmail();
        using var app = EmailApp(email);
        await app.Initialize();
        using var oldSession = await app.Client("customer1@example.test");
        using var anon = Anonymous(app);
        const string address = "customer1@example.test";

        var sent = await Read<ForgotPasswordResponse>(await anon.PostAsJsonAsync("/api/v1/auth/password/forgot", new ForgotPasswordRequest(address)));
        Assert.Null(sent.DevelopmentCode);
        Assert.Equal(60, sent.ResendAfterSeconds);
        var code = email.LastCode(address);
        Assert.Matches(@"^\d{6}$", code);

        // Gửi lại ngay và email không có tài khoản: trả lời y hệt, không gửi thêm mail.
        var again = await Read<ForgotPasswordResponse>(await anon.PostAsJsonAsync("/api/v1/auth/password/forgot", new ForgotPasswordRequest(address)));
        var unknown = await Read<ForgotPasswordResponse>(await anon.PostAsJsonAsync("/api/v1/auth/password/forgot", new ForgotPasswordRequest("nobody@example.test")));
        Assert.Equal(sent.Message, again.Message);
        Assert.Equal(sent.Message, unknown.Message);
        Assert.Single(email.Sent);

        var wrong = code == "000000" ? "111111" : "000000";
        Assert.Equal(HttpStatusCode.BadRequest, (await anon.PostAsJsonAsync("/api/v1/auth/password/verify", new VerifyResetCodeRequest(address, wrong))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await anon.PostAsJsonAsync("/api/v1/auth/password/verify", new VerifyResetCodeRequest(address, code))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await anon.PostAsJsonAsync("/api/v1/auth/password/reset",
            new ResetPasswordRequest(address, code, "NewPass456!", "Khac123456"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await anon.PostAsJsonAsync("/api/v1/auth/password/reset",
            new ResetPasswordRequest(address, code, "NewPass456!", "NewPass456!"))).StatusCode);
        Assert.Contains(email.Sent, m => m.To == address && m.Subject.Contains("vừa được thay đổi"));

        // Phiên cũ bị đăng xuất; mã đã dùng không dùng lại được; chỉ mật khẩu mới đăng nhập được.
        Assert.Equal(HttpStatusCode.Unauthorized, (await oldSession.GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await anon.PostAsJsonAsync("/api/v1/auth/password/reset",
            new ResetPasswordRequest(address, code, "Another789!", "Another789!"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/v1/auth/login", new { email = address, password = "Password123!" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await anon.PostAsJsonAsync("/api/v1/auth/login", new { email = address, password = "NewPass456!" })).StatusCode);
    }

    [Fact]
    public async Task Five_wrong_codes_lock_the_reset_code()
    {
        var email = new FakeEmail();
        using var app = EmailApp(email);
        await app.Initialize();
        using var anon = Anonymous(app);
        const string address = "customer1@example.test";
        (await anon.PostAsJsonAsync("/api/v1/auth/password/forgot", new ForgotPasswordRequest(address))).EnsureSuccessStatusCode();
        var code = email.LastCode(address);
        var wrong = code == "000000" ? "111111" : "000000";

        for (var i = 0; i < 4; i++)
            Assert.Equal(HttpStatusCode.BadRequest, (await anon.PostAsJsonAsync("/api/v1/auth/password/verify", new VerifyResetCodeRequest(address, wrong))).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await anon.PostAsJsonAsync("/api/v1/auth/password/verify", new VerifyResetCodeRequest(address, wrong))).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await anon.PostAsJsonAsync("/api/v1/auth/password/verify", new VerifyResetCodeRequest(address, code))).StatusCode);
    }

    [Fact]
    public async Task Changing_password_needs_the_current_one_and_signs_out_other_devices_only()
    {
        var email = new FakeEmail();
        using var app = EmailApp(email);
        await app.Initialize();
        using var thisDevice = await app.Client("customer1@example.test");
        using var otherDevice = await app.Client("customer1@example.test");

        Assert.Equal(HttpStatusCode.BadRequest, (await thisDevice.PutAsJsonAsync("/api/v1/me/password",
            new ChangePasswordRequest("WrongPass1!", "NewPass456!", "NewPass456!"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await thisDevice.PutAsJsonAsync("/api/v1/me/password",
            new ChangePasswordRequest("Password123!", "Password123!", "Password123!"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await thisDevice.PutAsJsonAsync("/api/v1/me/password",
            new ChangePasswordRequest("Password123!", "NewPass456!", "NewPass456!"))).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await thisDevice.GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await otherDevice.GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Contains(email.Sent, m => m.Subject.Contains("vừa được thay đổi"));
        using var anon = Anonymous(app);
        Assert.Equal(HttpStatusCode.OK, (await anon.PostAsJsonAsync("/api/v1/auth/login",
            new { email = "customer1@example.test", password = "NewPass456!" })).StatusCode);
    }

    [Fact]
    public async Task Registration_sends_a_welcome_email_and_still_succeeds_when_email_fails()
    {
        var email = new FakeEmail();
        using (var app = EmailApp(email))
        {
            await app.Initialize();
            using var anon = Anonymous(app);
            var response = await anon.PostAsJsonAsync("/api/v1/auth/register",
                new RegisterRequest("Lê Minh Khoa", "khoa.new@example.test", "Password123!", "user", true));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var welcome = Assert.Single(email.Sent);
            Assert.Equal("khoa.new@example.test", welcome.To);
            Assert.Contains("Chào mừng", welcome.Subject);
        }

        using var broken = EmailApp(new FakeEmail(fail: true));
        await broken.Initialize();
        using var client = Anonymous(broken);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest("Công ty Du lịch Mới", "agency.new@example.test", "Password123!", "agency", true))).StatusCode);
    }

    [Fact]
    public async Task Development_without_smtp_shows_the_reset_code_for_demo()
    {
        using var app = new App();
        await app.Initialize();
        using var anon = Anonymous(app);
        var sent = await Read<ForgotPasswordResponse>(await anon.PostAsJsonAsync("/api/v1/auth/password/forgot",
            new ForgotPasswordRequest("customer1@example.test")));
        Assert.Matches(@"^\d{6}$", sent.DevelopmentCode!);
        Assert.Equal(HttpStatusCode.NoContent, (await anon.PostAsJsonAsync("/api/v1/auth/password/verify",
            new VerifyResetCodeRequest("customer1@example.test", sent.DevelopmentCode!))).StatusCode);
    }
}
