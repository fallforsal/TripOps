using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Tests;

// Hỗ trợ cho unit test của Report5 (F-07 → F-45): gọi thẳng service trong một scope DI, mỗi test một database mới.
// Tên test: F{mã function}_UTCID{số}_{mô tả} — khớp cột UTCID trong file Report5_Unit_Test.
public sealed partial class BookingFlowTests
{
    private static readonly byte[] TinyPng = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZAAAAABJRU5ErkJggg==");

    private static async Task<App> UtApp(Action<IWebHostBuilder>? configure = null)
    {
        var app = new App(configure);
        await app.Initialize();
        return app;
    }

    private static Action<IWebHostBuilder> LocalStorage => builder => builder.ConfigureAppConfiguration((_, config) =>
        config.AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:UseLocal"] = "true" }));

    private static async Task<TResult> Use<TService, TResult>(App app, Func<TService, Task<TResult>> action) where TService : notnull
    {
        using var scope = app.Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<TService>());
    }

    private static async Task Use<TService>(App app, Func<TService, Task> action) where TService : notnull
    {
        using var scope = app.Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<TService>());
    }

    private static async Task<T> InDb<T>(App app, Func<TripOpsDbContext, Task<T>> action)
    {
        using var scope = app.Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<TripOpsDbContext>());
    }

    private static async Task InDb(App app, Func<TripOpsDbContext, Task> action)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        await action(db);
        await db.SaveChangesAsync();
    }

    /// <summary>Lỗi nghiệp vụ (AccountException, BookingException, TourException...) đều có Status và Message.</summary>
    private static async Task<(int Status, string Message)> Rejects(Func<Task> action)
    {
        try { await action(); }
        catch (Exception e) when (e.GetType().GetProperty("Status")?.GetValue(e) is int status) { return (status, e.Message); }
        throw new Xunit.Sdk.XunitException("Expected a business exception but the call succeeded.");
    }

    private static async Task<User> AddUser(App app, string id, UserRole role, BusinessProfileStatus? profile = null,
        string? licenseUrl = "https://example.test/licenses/license.png", UserStatus status = UserStatus.Active)
    {
        var user = new User { Id = id, Name = $"User {id}", Email = $"{id}@example.test", Role = role, Status = status };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "Password123!");
        if (profile is { } state)
            user.BusinessProfile = new BusinessProfile { UserId = id, BusinessName = $"{id} Ltd", TaxCode = "0101010101",
                BusinessAddress = "1 Lê Lợi", BusinessLicenseUrl = licenseUrl, Status = state,
                RejectionReason = state == BusinessProfileStatus.Rejected ? "Ảnh mờ" : null };
        await InDb(app, db => { db.Users.Add(user); return Task.CompletedTask; });
        return user;
    }
}
