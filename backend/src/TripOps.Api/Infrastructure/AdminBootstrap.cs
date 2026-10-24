using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Api.Infrastructure;

// Local provisioning command only; no HTTP endpoint and no seeded credentials.
public static class AdminBootstrap
{
    public static async Task Run(IServiceProvider services, IConfiguration configuration)
    {
        var email = configuration["AdminEmail"]?.Trim().ToLowerInvariant();
        var name = configuration["AdminName"]?.Trim();
        var password = Environment.GetEnvironmentVariable("TRIPOPS_ADMIN_PASSWORD");
        if (email is null || !new EmailAddressAttribute().IsValid(email) || email.Length > 191 ||
            string.IsNullOrWhiteSpace(name) || name.Length > 150 || password is null || password.Length is < 8 or > 128)
            throw new InvalidOperationException("Set --AdminEmail, --AdminName and TRIPOPS_ADMIN_PASSWORD (8-128 characters).");
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        if (await db.Users.IgnoreQueryFilters().AnyAsync(user => user.Email.ToLower() == email))
            throw new InvalidOperationException("Email already exists. Existing users are never promoted or overwritten by this command.");
        var admin = new User { Id = Guid.NewGuid().ToString(), Name = name, Email = email,
            Role = UserRole.Admin, Status = UserStatus.Active, IsVerified = false };
        admin.PasswordHash = new PasswordHasher<User>().HashPassword(admin, password);
        db.Users.Add(admin);
        await db.SaveChangesAsync();
        Console.WriteLine("Admin account created. No web server was started.");
    }
}
