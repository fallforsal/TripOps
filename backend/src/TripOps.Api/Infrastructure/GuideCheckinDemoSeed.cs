using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Payments;

namespace TripOps.Api.Infrastructure;

/// <summary>
/// Explicit, development-only, repeatable fixture for Tour Guide operations.
/// Creates demo identities and one confirmed booking departing today (Vietnam time), with ordered stops and NO GPS requirement.
/// Does not modify bookings or attendance/check-ins when executed again.
/// </summary>
public static class GuideCheckinDemoSeed
{
    public const string AgencyEmail = "agency-gps-demo@tripops.test";
    public const string CustomerEmail = "customer-gps-demo@tripops.test";
    public const string GuideEmail = "guide-gps-demo@tripops.test";
    public const string DemoPassword = "DemoGps#2026!";

    public static async Task<SeedSummary> Run(IServiceProvider services,
        bool applyMigrations = true, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        if (applyMigrations) await db.Database.MigrateAsync(cancellationToken);

        var departure = PaymentRules.VietnamDate(DateTime.UtcNow);
        var dayKey = departure.ToString("yyyyMMdd", System.Globalization.CultureInfo.InvariantCulture);
        var tourCode = $"GPSDEMO-{dayKey}";
        var bookingCode = $"GPS-TEST-{dayKey}";
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        // Do not touch real accounts; demo identities have distinct emails.
        var hasher = new PasswordHasher<User>();
        async Task<User> DemoUser(string email, string name, UserRole role, string? agencyId = null)
        {
            var existing = await db.Users.SingleOrDefaultAsync(
                x => x.Email == email, cancellationToken);
            if (existing is not null)
            {
                if (existing.Role != role || existing.Status != UserStatus.Active ||
                    (agencyId is not null && existing.AgencyId != agencyId))
                    throw new InvalidOperationException(
                        $"Demo identity '{email}' already exists with an unexpected role/status/agency.");
                return existing;
            }

            var user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = email,
                Name = name,
                Role = role,
                Status = UserStatus.Active,
                AgencyId = agencyId,
                Phone = "0900000000",
                IsVerified = true,
            };
            user.PasswordHash = hasher.HashPassword(user, DemoPassword);
            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken);
            return user;
        }

        var agency = await DemoUser(AgencyEmail, "[DEMO GPS] Agency", UserRole.TravelAgency);
        var profile = await db.BusinessProfiles.SingleOrDefaultAsync(
            x => x.UserId == agency.Id, cancellationToken);
        if (profile is null)
        {
            db.BusinessProfiles.Add(new BusinessProfile
            {
                UserId = agency.Id,
                BusinessName = "[DEMO GPS] TripOps Agency",
                TaxCode = "0000000000",
                BusinessAddress = "Vũng Tàu (dữ liệu thử nghiệm)",
                Status = BusinessProfileStatus.Approved,
                ApprovedAt = DateTime.UtcNow,
            });
        }
        else if (profile.Status != BusinessProfileStatus.Approved)
        {
            throw new InvalidOperationException("Demo Agency exists but is not approved.");
        }
        var customer = await DemoUser(CustomerEmail, "[DEMO GPS] Người đặt tour", UserRole.Customer);
        var guide = await DemoUser(GuideEmail, "[DEMO GPS] Hướng dẫn viên", UserRole.TourGuide, agency.Id);
        if (!await db.GuideProfiles.AnyAsync(x => x.UserId == guide.Id, cancellationToken))
        {
            db.GuideProfiles.Add(new GuideProfile
            {
                UserId = guide.Id,
                ExperienceYears = 3,
                Languages = "[\"Tiếng Việt\"]",
                Routes = "[\"Vũng Tàu\"]",
                Specialties = "[\"Tour thứ tự demo\"]",
                Bio = "Tài khoản dùng để kiểm thử check-in đúng thứ tự, không phải HDV thực tế.",
            });
        }
        await db.SaveChangesAsync(cancellationToken);

        // Three ordered test stops, no GPS coordinates or location checks.
        var points = new (string Name, int Hour)[]
        {
            ("[TEST] Điểm A - Vũng Tàu", 8),
            ("[TEST] Điểm B - Vũng Tàu", 10),
            ("[TEST] Điểm C - Vũng Tàu", 14),
        };
        var tour = await db.Tours.SingleOrDefaultAsync(
            x => x.Code == tourCode, cancellationToken);
        if (tour is null)
        {
            tour = new Tour
            {
                AgencyId = agency.Id,
                Code = tourCode,
                Name = $"[TEST] Tour Vũng Tàu - {departure:dd/MM/yyyy}",
                Destination = "Vũng Tàu",
                DepartureLocation = "Vũng Tàu",
                DurationDays = 1,
                DurationNights = 0,
                DurationTour = "1 ngày",
                BasePrice = 600000m,
                MinGuests = 1,
                MaxGuests = 20,
                Status = TourStatus.Completed,
                Visibility = TourVisibility.Public,
                Version = 1,
                Images = "[]",
                ThumbnailUrls = "[]",
                PricingTiers =
                [
                    new TourPricingTier
                    {
                        AgencyId = agency.Id,
                        Name = "Khách demo",
                        MinAge = 0,
                        MaxAge = 150,
                        PricePerGuest = 600000m,
                    },
                ],
                Timelines =
                [
                    new TourTimeline
                    {
                        DayNumber = 1,
                        Title = "Ngày 1 - Kiểm thử thứ tự check-in",
                        Description = "Điểm A → B → C. Không cần vị trí GPS.",
                        Attractions = points.Select(p => new TouristAttraction
                        {
                            Name = p.Name,
                            AgencyId = agency.Id,

                            Time = new DateTime(2000, 1, 1, p.Hour, 0, 0),
                        }).ToList(),
                    },
                ],
            };
            db.Tours.Add(tour);
            await db.SaveChangesAsync(cancellationToken);
        }
        else if (tour.AgencyId != agency.Id)
        {
            throw new InvalidOperationException("Demo tour code is owned by another Agency.");
        }

        var booking = await db.Bookings.SingleOrDefaultAsync(
            x => x.BookingCode == bookingCode, cancellationToken);
        var created = false;
        if (booking is null)
        {
            booking = new Booking
            {
                BookingCode = bookingCode,
                TourId = tour.Id,
                CustomerId = customer.Id,
                StartDate = departure,
                ContactName = "[TEST] Trưởng đoàn",
                ContactPhone = "0900000001",
                ContactEmail = CustomerEmail,
                SpecialRequests = "DỮ LIỆU MẪU — không phải booking thật.",
                Status = BookingStatus.Confirmed,
                PaymentStatus = PaymentStatus.Unpaid,
                TotalAmount = 2400000m,
                BookingAgencies =
                [
                    new BookingAgency
                    {
                        AgencyId = agency.Id,
                        IsHost = true,
                        OriginalAmount = 2400000m,
                        FinalAmount = 2400000m,
                        NetPayout = 2400000m,
                    },
                ],
                AssignedGuides =
                [
                    new BookingAssignedGuide
                    {
                        AgencyId = agency.Id,
                        GuideId = guide.Id,
                        Role = "lead_guide",
                        Notes = "Phân công demo để kiểm thử Flutter.",
                    },
                ],
                Participants = Enumerable.Range(1, 4).Select(i => new BookingParticipant
                {
                    AgencyId = agency.Id,
                    ParticipantIndex = i,
                    IsPrimary = true,
                    FullName = i switch
                    {
                        1 => "Nguyễn Văn An (TEST)",
                        2 => "Trần Thị Bình (TEST)",
                        3 => "Nguyễn Gia Hưng (TEST)",
                        _ => "Nguyễn Bảo Ngọc (TEST)",
                    },
                    Note = $"Dữ liệu thử nghiệm\nĐiện thoại: 090000000{i}",
                    AttendanceStatus = AttendanceStatus.Pending,
                    Status = "ACTIVE",
                    Price = 600000m,
                    TierName = "Khách demo",
                }).ToList(),
                Timelines =
                [
                    new BookingTimeline
                    {
                        DayNumber = 1,
                        Title = "Ngày 1 - Vũng Tàu",
                        Description = "Check-in bắt buộc theo đúng thứ tự A → B → C.",
                        Attractions = points.Select(p => new BookingTimelineAttraction
                        {

                            AgencyId = agency.Id,
                            OriginalLocationName = p.Name,
                            CurrentLocationName = p.Name,

                            Time = departure.AddHours(p.Hour),
                            AttendanceStatus = "Pending",
                        }).ToList(),
                    },
                ],
            };
            db.Bookings.Add(booking);
            await db.SaveChangesAsync(cancellationToken);
            created = true;
        }
        else if (booking.TourId != tour.Id || booking.CustomerId != customer.Id ||
                 booking.StartDate.Date != departure)
        {
            throw new InvalidOperationException("Demo booking code conflicts with other data.");
        }

        await transaction.CommitAsync(cancellationToken);
        var result = new SeedSummary(departure, booking.Id, bookingCode, tour.Id, tourCode, GuideEmail, created);
        Console.WriteLine($"Guide check-in demo seed {(created ? "created" : "already exists")}: {bookingCode} ({departure:dd/MM/yyyy}, VN), booking ID={booking.Id}.");
        Console.WriteLine($"Guide: {GuideEmail} / password {DemoPassword} (only when the account was newly created).");
        Console.WriteLine("Check-in order: " + string.Join(" -> ", points.Select(p => p.Name)));
        Console.WriteLine("No GPS or location permissions required.");
        return result;
    }
}

public sealed record SeedSummary(
    DateTime DepartureDate,
    int BookingId,
    string BookingCode,
    int TourId,
    string TourCode,
    string GuideEmail,
    bool Created);
