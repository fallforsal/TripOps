using Microsoft.AspNetCore.Mvc;
using TripOps.Api.Infrastructure;
using TripOps.Service;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using TripOps.Service.Accounts;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole();
builder.Services.AddTripOpsServices(builder.Configuration);
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
{
    options.Cookie.Name = "TripOps.Session";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
    options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
    options.Events.OnValidatePrincipal = async context => {
        try {
            var account = await context.HttpContext.RequestServices.GetRequiredService<AccountService>().Current(
                context.Principal!.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value, context.HttpContext.RequestAborted);
            if (AccountService.RoleName(account.Role) != context.Principal.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value) context.RejectPrincipal();
        } catch (AccountException) { context.RejectPrincipal(); }
    };
});
builder.Services.AddAuthorization();
builder.Services.AddSignalR(options => options.MaximumReceiveMessageSize = 16 * 1024);
builder.Services.AddScoped<TripOps.Service.Chat.IChatEvents, TripOps.Api.Hubs.SignalRChatEvents>();
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = 429;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    // Tra cứu trạng thái payOS: giới hạn theo IP + đơn để polling của FE không làm quá tải payOS.
    options.AddPolicy("payment-sync", context => RateLimitPartition.GetFixedWindowLimiter(
        $"{context.Connection.RemoteIpAddress}:{context.Request.RouteValues["id"]}",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 12, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    // Trang ký hợp đồng không cần đăng nhập (chỉ có mã phiên): giới hạn theo IP để chống dò mã/OTP.
    options.AddPolicy("contract-signing", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 40, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = context =>
        new BadRequestObjectResult(new ValidationProblemDetails(context.ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Request validation failed.",
            Extensions = { ["traceId"] = context.HttpContext.TraceIdentifier }
        });
});
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
    context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier);
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddTripOpsOpenApi();
builder.Services.AddHealthChecks();
if (builder.Environment.IsDevelopment())
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    builder.Services.AddCors(options => options.AddPolicy("Development", policy =>
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
}

var app = builder.Build();
if (builder.Configuration.GetValue<bool>("SeedDemo"))
{
    if (!app.Environment.IsDevelopment()) throw new InvalidOperationException("Demo seed is only available in Development.");
    await DemoSeed.Run(app.Services, builder.Configuration.GetValue<bool>("ClearDemoData"));
    return;
}
if (builder.Configuration.GetValue<bool>("SeedGuideGpsDemo"))
{
    if (!app.Environment.IsDevelopment())
        throw new InvalidOperationException("Guide demo seed is only available in Development.");
    await GuideCheckinDemoSeed.Run(app.Services);
    return;
}
if (builder.Configuration.GetValue<bool>("CreateAdmin"))
{
    await AdminBootstrap.Run(app.Services, builder.Configuration);
    return;
}
app.UseExceptionHandler();
app.UseStatusCodePages();
app.Use(async (context, next) => {
    // Browser mutations must originate from this app or an explicitly allowed frontend.
    if (context.Request.Path.StartsWithSegments("/hubs/chat") || HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method) || HttpMethods.IsPatch(context.Request.Method) || HttpMethods.IsDelete(context.Request.Method)) {
        var origin = context.Request.Headers.Origin.ToString();
        var allowed = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        var crossSite = context.Request.Headers["Sec-Fetch-Site"] == "cross-site";
        var untrustedOrigin = !string.IsNullOrEmpty(origin) &&
            origin != $"{context.Request.Scheme}://{context.Request.Host}" && !allowed.Contains(origin);
        if (crossSite || untrustedOrigin) {
            app.Logger.LogWarning("Browser mutation rejected: {Method} {Path}; crossSite={CrossSite}; untrustedOrigin={UntrustedOrigin}",
                context.Request.Method, context.Request.Path, crossSite, untrustedOrigin);
            await Results.Problem(statusCode: StatusCodes.Status403Forbidden,
                title: "Nguồn truy cập chưa được cho phép. Hãy kiểm tra cấu hình tên miền của ứng dụng.",
                extensions: new Dictionary<string, object?> { ["code"] = "untrusted_request_origin" }).ExecuteAsync(context);
            return;
        }
    }
    try { await next(); }
    catch (AccountException exception) {
        context.Response.StatusCode = exception.Status;
        await context.Response.WriteAsJsonAsync(new ProblemDetails { Status = exception.Status, Title = exception.Message });
    }
});
if (app.Environment.IsDevelopment())
{
    app.UseCors("Development");
    app.MapOpenApi();
    app.UseSwaggerUI(options => {
        options.SwaggerEndpoint("/openapi/v1.json", "TripOps WF01 & WF02 v1");
        options.DocumentTitle = "TripOps API testing";
        options.EnableFilter();
        options.EnableDeepLinking();
        options.DisplayRequestDuration();
        options.ConfigObject.AdditionalItems["withCredentials"] = true;
    });
}
// Liveness only: neither endpoint asserts database or external integrations are ready.
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");
app.MapControllers();
app.MapHub<TripOps.Api.Hubs.ChatHub>("/hubs/chat", options => options.CloseOnAuthenticationExpiration = true);
app.Run();

public partial class Program;
