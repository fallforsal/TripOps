using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Tours;

namespace TripOps.Api.Infrastructure;

internal static class DemoSeed
{
    public static async Task Run(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        await db.Database.MigrateAsync();
        if (await db.Users.AnyAsync()) throw new InvalidOperationException("Demo seed requires an empty database.");
        var password = "TripOps@123";
        var hasher = new PasswordHasher<User>();
        var roles = new[] { ("admin", UserRole.Admin), ("agency", UserRole.TravelAgency), ("provider", UserRole.Provider), ("guide", UserRole.TourGuide), ("customer", UserRole.Customer) };
        var users = roles.ToDictionary(x => x.Item1, x => new User
        {
            Id = Guid.NewGuid().ToString(),
            Name = "TripOps " + x.Item1,
            Email = x.Item1 + "@tripops.test",
            Role = x.Item2,
            Status = UserStatus.Active,
            Phone = "0901234567",
            IsVerified = true
        });
        foreach (var u in users.Values) u.PasswordHash = hasher.HashPassword(u, password);
        users["guide"].AgencyId = users["agency"].Id;
        db.Users.AddRange(users.Values);
        await db.SaveChangesAsync();
        foreach (var key in new[] { "agency", "provider" }) db.BusinessProfiles.Add(new BusinessProfile
        {
            UserId = users[key].Id,
            BusinessName = key == "agency" ? "TripOps Travel" : "TripOps Hospitality",
            TaxCode = key == "agency" ? "0101234567" : "0107654321",
            BusinessAddress = "Đà Lạt, Lâm Đồng",
            Status = BusinessProfileStatus.Approved,
            ApprovedAt = DateTime.UtcNow,
            Description = "Đối tác dữ liệu mẫu để kiểm thử."
        });
        await db.SaveChangesAsync();
        var hotel = new TripOps.Data.Entities.Service { ProviderId = users["provider"].Id, Category = ServiceCategory.Hotel, Name = "Khách sạn mẫu Đà Lạt", Province = "Lâm Đồng", Street = "Trung tâm Đà Lạt", Price = 600000, PriceFrom = 500000, PriceTo = 800000, StarRating = 4, Status = ServiceStatus.Approved, ThumbnailUrl = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1000", Description = "Dịch vụ lưu trú đối tác, báo giá đoàn khi có booking." };
        var upgrade = new TripOps.Data.Entities.Service { ProviderId = users["provider"].Id, Category = ServiceCategory.Hotel, Name = "Resort mẫu Tuyền Lâm", Province = "Lâm Đồng", Price = 900000, StarRating = 5, Status = ServiceStatus.Approved, ThumbnailUrl = hotel.ThumbnailUrl };
        var meal = new TripOps.Data.Entities.Service { ProviderId = users["provider"].Id, Category = ServiceCategory.Fnb, Name = "Nhà hàng mẫu Đà Lạt", Province = "Lâm Đồng", Price = 150000, PriceFrom = 120000, PriceTo = 200000, Status = ServiceStatus.Approved, ThumbnailUrl = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000", Description = "Phục vụ cơm đoàn, thực đơn đặc sản." };
        db.Services.AddRange(hotel, upgrade, meal);
        await db.SaveChangesAsync();
        var tours = scope.ServiceProvider.GetRequiredService<TourService>();
        var config = new TourConfiguration("Đà Lạt 3 ngày 2 đêm", "Tour mẫu cho kiểm thử đầy đủ luồng đặt tour.", "Đà Lạt", 3, 2, 2500000, 1, 40,
            "Quanh năm", "Tham quan Đà Lạt", "Lưu trú, ăn uống theo chương trình", "Chi phí cá nhân", "Liên hệ Agency trước khi hủy tour.", null,
            [hotel.ThumbnailUrl], [new("Người lớn", 12, 150, 2500000), new("Trẻ em", 5, 11, 1750000, 1), new("Em bé", 0, 4, 0, 2)],
            Enumerable.Range(1, 3).Select(day => new TimelineInput(day, $"Ngày {day}: Khám phá Đà Lạt", "Lịch trình mẫu.",
                [new ActivityInput(day == 1 ? "Hồ Xuân Hương" : day == 2 ? "Hồ Tuyền Lâm" : "Chợ Đà Lạt", EstimatedTime: new TimeSpan(9, 0, 0))],
                [new MealInput("lunch", meal.Name, "Cơm đoàn", true, 0, meal.Id, new TimeSpan(12, 0, 0))],
                day == 1 ? [new AccommodationInput(hotel.Name, "Đà Lạt", NightsCount: 2, StarRating: 4, ServiceId: hotel.Id), new AccommodationInput(upgrade.Name, "Đà Lạt", NightsCount: 2, StarRating: 5, IsDefault: false, PriceDifference: 300000, ServiceId: upgrade.Id)] : [])).ToArray(), "TP. Hồ Chí Minh");
        var tour = await tours.Create(users["agency"].Id, config, CancellationToken.None);
        await tours.Command(users["agency"].Id, tour.Id, "publish", new TourCommand(tour.Version), CancellationToken.None);
        Console.WriteLine("Seeded demo accounts: admin/agency/provider/guide/customer@tripops.test; password TripOps@123.");
    }
}
