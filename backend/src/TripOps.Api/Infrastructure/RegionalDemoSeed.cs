using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Tours;

namespace TripOps.Api.Infrastructure;

/// <summary>Additive, atomic development fixture. Never invokes payment gateways, payout services or email.</summary>
public static class RegionalDemoSeed
{
    public const string Domain = "regional-demo.tripops.test";
    public const string Prefix = "REG26-";
    private const string Notice = "[DỮ LIỆU MẪU REGIONAL-DEMO-2026] Tài khoản, giá, sức chứa, giao dịch và đánh giá đều giả lập; không có đặt dịch vụ hoặc chuyển tiền thật.";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = false };
    public sealed record Manifest(string Dataset, bool Synthetic, string BoundarySource, Province[] Provinces);
    public sealed record Province(string Code, string AdministrativeCode, string Name, string Hub, Reference Source,
        string[] Points, Hotel[] Hotels, decimal BasePrice);
    public sealed record Hotel(string Name, int Stars, string Address, Reference Source);
    public sealed record Reference(string Url, string? Title = null, string? Image = null, string[]? Restaurants = null, int? HttpStatus = null);
    public sealed record Account(string Email, string Role, string Name, string? Province);
    public sealed record Report(int Agencies, int Accounts, int PublicTours, int Services, int Suppliers, int Bookings,
        int CompletedBookings, int Reviews, Account[] LoginAccounts);

    public static Manifest ReadManifest(string path)
    {
        var data = JsonSerializer.Deserialize<Manifest>(File.ReadAllText(path), Json) ?? throw new InvalidOperationException("Empty regional manifest.");
        if (data.Dataset != "REGIONAL-DEMO-2026" || !data.Synthetic || data.Provinces.Length is < 1 or > 19 ||
            data.Provinces.Select(p => p.Code).Distinct().Count() != data.Provinces.Length ||
            data.Provinces.Any(p => !VietnamProvinceCatalog.All.Any(c => c.Code == p.Code && c.Region != "Miền Bắc") || p.Hotels.Length != 2 || p.Points.Length != 6))
            throw new InvalidOperationException("Invalid current-province demo manifest.");
        return data;
    }

    public static async Task<Report> Run(IServiceProvider services, Manifest manifest, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        Console.WriteLine($"Regional demo database: {db.Database.GetDbConnection().DataSource} / {db.Database.GetDbConnection().Database}");
        var tours = scope.ServiceProvider.GetRequiredService<TourService>();
        var quotations = scope.ServiceProvider.GetRequiredService<BookingQuotationService>();
        var password = scope.ServiceProvider.GetRequiredService<IConfiguration>()["RegionalDemo:Password"];
        if (db.Database.IsSqlServer() && (await db.Database.GetPendingMigrationsAsync(ct)).Any()) throw new InvalidOperationException("Apply pending migrations before regional seeding.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var hasher = new PasswordHasher<User>();
        var now = new DateTime(2026, 11, 15, 5, 0, 0, DateTimeKind.Utc);
        var accounts = new List<Account>();
        var sequence = 0;
        async Task<User> Identity(string key, string name, UserRole role, Province? p = null, User? agency = null)
        {
            var email = $"{key}@{Domain}";
            var user = await db.Users.Include(u => u.BusinessProfile).Include(u => u.GuideProfile).SingleOrDefaultAsync(u => u.Email == email, ct);
            if (user is not null)
            {
                if (user.Role != role || user.Status != UserStatus.Active || user.AgencyId != agency?.Id ||
                    (role is UserRole.TravelAgency or UserRole.Provider && user.BusinessProfile?.Status != BusinessProfileStatus.Approved))
                    throw new InvalidOperationException($"Existing fixture identity has changed; refusing to overwrite {email}.");
            }
            else
            {
                if (string.IsNullOrWhiteSpace(password) || password.Length < 12)
                    throw new InvalidOperationException("Set RegionalDemo:Password (at least 12 characters) before creating demo accounts.");
                var number = ++sequence;
                user = new User { Id = Guid.NewGuid().ToString(), Name = name, Email = email, Role = role,
                    Status = UserStatus.Active, IsVerified = true, AgencyId = agency?.Id,
                    Phone = "000" + number.ToString("D7"), ProvinceCode = p?.AdministrativeCode, ProvinceName = p?.Name.Replace("TP. ", ""),
                    AddressLine = p is null ? "Tài khoản quản trị dữ liệu mẫu" : $"Địa chỉ giả lập tại {p.Name}",
                    CreatedAt = now.AddMonths(-9), Avatar = Logo(p?.Code ?? "ADMIN", number) };
                user.PasswordHash = hasher.HashPassword(user, password);
                if (role is UserRole.TravelAgency or UserRole.Provider)
                    user.BusinessProfile = new BusinessProfile { UserId = user.Id, BusinessName = name,
                        TaxCode = "DEMO-" + key, BusinessAddress = p!.Name, Status = BusinessProfileStatus.Approved,
                        ApprovedAt = now.AddMonths(-9), LogoUrl = user.Avatar, Description = Notice + $" Đơn vị mô phỏng tại {p.Name}." };
                if (role == UserRole.TourGuide)
                    user.GuideProfile = new GuideProfile { UserId = user.Id, ExperienceYears = (short)(2 + number % 9),
                        Languages = "[\"Tiếng Việt\",\"Tiếng Anh\"]", Routes = JsonSerializer.Serialize(new[] { p!.Name }, Json),
                        Specialties = "[\"Khách đoàn\",\"Văn hóa địa phương\"]", Bio = Notice };
                db.Users.Add(user); await db.SaveChangesAsync(ct);
            }
            accounts.Add(new(email, role.ToString(), name, p?.Name));
            return user;
        }
        var admin = await Identity("admin", "[Mẫu] Quản trị bộ dữ liệu vùng", UserRole.Admin);
        for (var regionIndex = 0; regionIndex < manifest.Provinces.Length; regionIndex++)
        {
            var p = manifest.Provinces[regionIndex]; var key = p.Code.ToLowerInvariant().Replace('_', '-');
            var agency = await Identity($"agency.{key}", $"[Mẫu] Du lịch {p.Name.Replace("TP. ", "")}", UserRole.TravelAgency, p);
            var lodging = await Identity($"provider.hotel.{key}", $"[Mẫu] Lưu trú {p.Name.Replace("TP. ", "")}", UserRole.Provider, p);
            var dining = await Identity($"provider.dining.{key}", $"[Mẫu] Ẩm thực {p.Name.Replace("TP. ", "")}", UserRole.Provider, p);
            var local = await Identity($"provider.local.{key}", $"[Mẫu] Trải nghiệm & xe {p.Name.Replace("TP. ", "")}", UserRole.Provider, p);
            var guides = new[] { await Identity($"guide.1.{key}", $"[Mẫu] HDV {p.Hub} 01", UserRole.TourGuide, p, agency),
                await Identity($"guide.2.{key}", $"[Mẫu] HDV {p.Hub} 02", UserRole.TourGuide, p, agency) };
            var customers = new[] { await Identity($"customer.1.{key}", $"[Mẫu] Nguyễn Minh An {regionIndex+1:00}", UserRole.Customer, p),
                await Identity($"customer.2.{key}", $"[Mẫu] Trần Ngọc Linh {regionIndex+1:00}", UserRole.Customer, p),
                await Identity($"customer.3.{key}", $"[Mẫu] Lê Hoàng Nam {regionIndex+1:00}", UserRole.Customer, p) };
            var hotel = p.Hotels[0]; var privateHotel = p.Hotels[1];
            var restaurant = Restaurant(hotel); var privateRestaurant = Restaurant(privateHotel);
            var image = Image(hotel.Source.Image, p.Source.Image);
            var platformHotel = await Service(lodging, hotel.Name, ServiceCategory.Hotel, 400000, "person_night", image, hotel.Stars, hotel.Source.Url);
            var platformMeal = await Service(dining, restaurant, ServiceCategory.Fnb, 160000, "meal", image, null, hotel.Source.Url);
            await Service(local, $"Trải nghiệm {p.Points[0]}", ServiceCategory.Attraction, 150000, "person", Image(p.Source.Image), null, p.Source.Url);
            await Service(local, $"Trải nghiệm {p.Points[3]}", ServiceCategory.Attraction, 180000, "person", Image(p.Source.Image), null, p.Source.Url);
            await Service(local, $"Xe đoàn 29 chỗ tại {p.Name}", ServiceCategory.Transportation, 2200000, "day", Image(p.Source.Image), null, p.Source.Url);
            var directoryHotel = await Supplier(privateHotel.Name, AgencySupplier.Hotel, 350000, privateHotel.Source.Url, privateHotel.Stars);
            var directoryMeal = await Supplier(privateRestaurant, AgencySupplier.Restaurant, 140000, privateHotel.Source.Url);
            // Additional private options illustrate negotiated group rates, without creating fake real-world businesses.
            await Supplier(hotel.Name + " – kênh hợp đồng riêng", AgencySupplier.Hotel, 400000, hotel.Source.Url, hotel.Stars);
            await Supplier(restaurant + " – thực đơn riêng", AgencySupplier.Restaurant, 150000, hotel.Source.Url);

            for (var variant = 0; variant < 2; variant++)
            {
                var code = $"{Prefix}{p.Code}-{variant+1}";
                var existing = await db.Tours.SingleOrDefaultAsync(t => t.Code == code, ct);
                Tour tour; TourConfiguration config;
                if (existing is null)
                {
                    var days = variant + 2; var isPrivate = variant == 1;
                    var chosenHotel = isPrivate ? privateHotel : hotel;
                    var chosenMeal = isPrivate ? privateRestaurant : restaurant;
                    var price = p.BasePrice + variant * 650000;
                    var supplierHotel = new SupplierSnapshotInput(Address: chosenHotel.Address, Area: p.Code, ReferencePrice: isPrivate ? 350000 : 400000, Conditions: Notice);
                    var supplierMeal = new SupplierSnapshotInput(Address: chosenHotel.Address, Area: p.Code, ReferencePrice: isPrivate ? 140000 : 160000, Conditions: Notice);
                    var points = p.Points.Skip(variant * 3).Take(3).ToArray();
                    config = new TourConfiguration($"[Mẫu] {p.Name}: {points[0]} – {points[1]} {days}N{days-1}Đ",
                        Notice + $" Hành trình tham khảo {string.Join(", ", points)}. Nguồn điểm đến: {p.Source.Url}. Lịch trình và giá do bộ mẫu xây dựng, không phải sản phẩm của cơ sở tham khảo.",
                        Destination: p.Name, DurationDays: days, DurationNights: days - 1, BasePrice: price, MinGuests: 2, MaxGuests: 30,
                        OperationPeriod: "Theo thỏa thuận; lịch chạy dữ liệu mẫu", Highlights: string.Join("\n", points),
                        Inclusions: "Lưu trú, các bữa ăn trong lịch trình, xe đoàn và hướng dẫn viên (giả lập).",
                        Exclusions: "Vé máy bay, chi tiêu cá nhân; không phát sinh giao dịch thật.", CancellationPolicy: "Chính sách thử nghiệm: miễn phí trước 14 ngày; 30% trước 7 ngày; 50% trong 7 ngày.",
                        Images: [Image(p.Source.Image, chosenHotel.Source.Image), Image(chosenHotel.Source.Image, p.Source.Image)],
                        PricingTiers: [new("Em bé", 0, 4, 0, 0), new("Trẻ em", 5, 11, decimal.Round(price * 0.7m), 1), new("Người lớn", 12, 150, price, 2)],
                        Timelines: Enumerable.Range(1, days).Select(day => new TimelineInput(day, $"Ngày {day}: {points[(day-1)%3]}",
                            "Đón đoàn, tham quan theo khung giờ và nghỉ ngơi phù hợp. " + Notice,
                            Activities: [new(points[(day-1)%3], "Điểm tham quan tham khảo; thời gian di chuyển cần xác nhận khi dùng thật.", new TimeSpan(9,0,0), 0, AgencyId: agency.Id),
                                new(day == days ? "Tự do khám phá & kết thúc hành trình" : points[day%3], EstimatedTime: new TimeSpan(15,0,0), OrderIndex: 1, AgencyId: agency.Id)],
                            Meals: new[] { "lunch", "dinner" }.Select((meal, i) => new MealInput(meal, chosenMeal, Notice, ServiceId: isPrivate ? null : platformMeal.Id,
                                Time: new TimeSpan(i == 0 ? 12 : 18,0,0), SupplierSource: isPrivate ? SupplierSources.AgencySupplier : SupplierSources.PlatformPartner,
                                AgencySupplierId: isPrivate ? directoryMeal.Id : null, Supplier: supplierMeal, AgencyId: agency.Id)).ToArray(),
                            Accommodations: day == 1 ? [new(chosenHotel.Name, p.Name, NightsCount: days-1, StarRating: chosenHotel.Stars,
                                ServiceId: isPrivate ? null : platformHotel.Id, SupplierSource: isPrivate ? SupplierSources.AgencySupplier : SupplierSources.PlatformPartner,
                                AgencySupplierId: isPrivate ? directoryHotel.Id : null, Supplier: supplierHotel, AgencyId: agency.Id)] : [], AgencyId: agency.Id)).ToArray(),
                        DepartureLocation: p.Hub, Code: code, ProvinceCodes: [p.Code]);
                    var draft = await tours.Create(agency.Id, config, ct);
                    var published = await tours.Command(agency.Id, draft.Id, "publish", new TourCommand(draft.Revision), ct);
                    config = published.Configuration;
                    tour = await db.Tours.SingleAsync(t => t.Id == draft.Id, ct);
                }
                else
                {
                    if (existing.AgencyId != agency.Id) throw new InvalidOperationException("Fixture tour code belongs to another agency.");
                    tour = existing;
                    config = (await tours.Get(agency.Id, tour.Id, false, ct)).Configuration;
                }
                for (var sample = 0; sample < 6; sample++)
                {
                    var bookingCode = $"{code}-B{sample+1:00}";
                    if (await db.Bookings.AnyAsync(b => b.BookingCode == bookingCode, ct)) continue;
                    var offset = sample + variant * 6;
                    var completed = offset < 6 + regionIndex % 4;
                    var status = completed ? BookingStatus.Completed : offset switch {
                        6 => BookingStatus.Cancelled, 7 => BookingStatus.Pending, 8 => BookingStatus.Confirmed,
                        9 => BookingStatus.Deposited, 10 => BookingStatus.InProgress, _ => BookingStatus.Paid };
                    var start = completed ? now.Date.AddDays(-210 + regionIndex*4 + offset*12)
                        : status == BookingStatus.InProgress ? now.Date : now.Date.AddDays(20 + (offset-6)*8 + regionIndex);
                    var count = 8 + (regionIndex*3 + offset*2) % 17;
                    var customer = customers[offset%3]; var guide = guides[offset%2];
                    var booking = BuildBooking(bookingCode, tour, config, agency, customer, guide, start, count, status, offset);
                    db.Bookings.Add(booking); await db.SaveChangesAsync(ct);
                    await quotations.Initialize(booking.Id, ct, tour);
                    await FinalizeFixture(db, booking, config, agency, customer, status, offset, now, ct);
                    if (completed && offset%4 != 3)
                    {
                        var rating = new[] { 5,4,5,3,4,5,4,5,5,4 }[(regionIndex+offset)%10];
                        db.Feedbacks.Add(new Feedback { BookingId = booking.Id, CustomerId = customer.Id, AgencyId = agency.Id,
                            Rating = rating, AgencyRating = rating, Status = FeedbackStatus.Visible,
                            Comment = $"[Đánh giá giả lập] {new[] { "Lịch trình rõ ràng, hướng dẫn viên hỗ trợ tốt.", "Khách sạn ổn, đoàn muốn thêm thời gian tự do.", "Dịch vụ phù hợp với gia đình; bữa ăn có thể đa dạng hơn." }[offset%3]}",
                            CreatedAt = start.AddDays(config.DurationDays + 1), AgencyReply = offset%2 == 0 ? "[Phản hồi giả lập] Cảm ơn đoàn đã góp ý cho hành trình mẫu." : null });
                    }
                    await db.SaveChangesAsync(ct);
                }
            }
            // Populate request management using fictitious customers. No messages are sent externally.
            foreach (var requestIndex in new[] { 0, 1 })
            {
                var business = $"{Prefix}{p.Code}-DESIGN-{requestIndex+1}";
                if (!await db.TourDesignRequests.AnyAsync(r => r.BusinessName == business && r.CustomerId == customers[requestIndex].Id, ct))
                    db.TourDesignRequests.Add(new TourDesignRequest { CustomerId = customers[requestIndex].Id, AgencyId = agency.Id,
                        BusinessName = business, ContactName = customers[requestIndex].Name, ContactEmail = customers[requestIndex].Email,
                        ContactPhone = customers[requestIndex].Phone!, Destination = p.Name, StartDate = now.Date.AddDays(40+requestIndex*10),
                        EndDate = now.Date.AddDays(42+requestIndex*10), NumberOfGuests = 12+requestIndex*6, BudgetPerPerson = p.BasePrice,
                        HotelRatingRequirement = "4", SpecialRequirements = Notice + " Cần lịch trình gia đình, có khách ăn chay.",
                        Status = requestIndex == 0 ? CustomRequestStatus.Pending : CustomRequestStatus.InProgress, CreatedAt = now.AddDays(-requestIndex-1) });
            }
            await db.SaveChangesAsync(ct);
            Console.WriteLine($"Prepared {p.Code}: one agency, two tours, twelve bookings.");

            async Task<TripOps.Data.Entities.Service> Service(User provider, string name, ServiceCategory category, decimal price, string unit, string photo, int? stars, string source)
            {
                name = "[Mẫu] " + name;
                var item = await db.Services.SingleOrDefaultAsync(s => s.ProviderId == provider.Id && s.Name == name && s.Category == category, ct);
                if (item is not null) return item;
                item = new() { ProviderId = provider.Id, Name = name, Category = category, Status = ServiceStatus.Approved,
                    Description = Notice + $" Thông tin tên/điểm đến tham khảo: {source}. Ảnh từ nguồn tham khảo, không chứng minh quan hệ cung cấp dịch vụ.",
                    Province = p.Name.Replace("TP. ", ""), FullAddress = $"Cơ sở tham khảo {name.Replace("[Mẫu] ", "")}, {p.Name}",
                    Price = price, PriceFrom = price, PriceTo = price * 1.3m, PriceUnit = unit, Capacity = 80, StarRating = stars,
                    ThumbnailUrl = photo, Images = JsonSerializer.Serialize(new[] { photo }, Json), Rating = null,
                    Amenities = "[\"Hỗ trợ khách đoàn\",\"Dữ liệu mô phỏng\"]", Policies = "[\"Giá giả lập; cần xác nhận khi sử dụng thực tế\"]",
                    CreatedAt = now.AddMonths(-8) };
                db.Services.Add(item); await db.SaveChangesAsync(ct); return item;
            }
            async Task<AgencySupplier> Supplier(string name, string type, decimal price, string source, int? stars = null)
            {
                name = "[Mẫu] " + name;
                var item = await db.AgencySuppliers.SingleOrDefaultAsync(s => s.AgencyId == agency.Id && s.SupplierType == type && s.Name == name, ct);
                if (item is not null) return item;
                item = new() { AgencyId = agency.Id, SupplierType = type, Name = name, Area = p.Code,
                    Address = $"Cơ sở tham khảo {name.Replace("[Mẫu] ", "")}, {p.Name}", ContactName = "Bộ phận điều phối giả lập",
                    StarRating = stars, ReferencePrice = price, Conditions = Notice + " Lưu trú theo người/đêm; bữa ăn theo người/bữa.",
                    Notes = $"Nguồn tên cơ sở: {source}. Địa bàn đã quy đổi theo sáp nhập 2025. Không có hợp đồng thật.", Status = AgencySupplier.Active, CreatedAt = now.AddMonths(-8) };
                db.AgencySuppliers.Add(item); await db.SaveChangesAsync(ct); return item;
            }
        }
        await transaction.CommitAsync(ct);
        var agencyIds = await db.Users.Where(u => u.Email.EndsWith("@" + Domain) && u.Role == UserRole.TravelAgency).Select(u => u.Id).ToArrayAsync(ct);
        return new(agencyIds.Length, accounts.Count,
            await db.Tours.CountAsync(t => t.Code.StartsWith(Prefix) && t.Visibility == TourVisibility.Public, ct),
            await db.Services.CountAsync(s => s.Provider.Email.EndsWith("@" + Domain), ct), await db.AgencySuppliers.CountAsync(s => agencyIds.Contains(s.AgencyId), ct),
            await db.Bookings.CountAsync(b => b.BookingCode.StartsWith(Prefix), ct),
            await db.Bookings.CountAsync(b => b.BookingCode.StartsWith(Prefix) && b.Status == BookingStatus.Completed, ct),
            await db.Feedbacks.CountAsync(f => agencyIds.Contains(f.AgencyId), ct), accounts.ToArray());
    }

    private static string Restaurant(Hotel hotel) => hotel.Source.Restaurants?.FirstOrDefault(n => !n.Contains("Cẩm lệ", StringComparison.OrdinalIgnoreCase)) ?? "Nhà hàng tại " + hotel.Name;
    private static string Image(params string?[] urls) => urls.FirstOrDefault(u => u?.StartsWith("https://") == true && !u.Contains("logo", StringComparison.OrdinalIgnoreCase))
        ?? "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1000";
    private static string Logo(string code, int index)
    {
        var color = new[] { "075985", "0f766e", "9a3412", "6d28d9", "166534" }[index%5];
        var letters = string.Concat(code.Split('_').Select(s => s[0])).ToUpperInvariant();
        return "data:image/svg+xml;base64," + Convert.ToBase64String(Encoding.UTF8.GetBytes($"<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='160' height='160' rx='80' fill='#{color}'/><text x='80' y='87' text-anchor='middle' fill='white' font-family='Arial' font-size='36' font-weight='bold'>{letters}</text><text x='80' y='120' text-anchor='middle' fill='white' font-family='Arial' font-size='16'>DEMO</text></svg>"));
    }

    private static Booking BuildBooking(string code, Tour tour, TourConfiguration c, User agency, User customer, User guide,
        DateTime start, int guests, BookingStatus status, int sample)
    {
        var completed = status == BookingStatus.Completed;
        var members = Enumerable.Range(0, guests).Select(i => {
            var child = i > 0 && i%7 == 0; var baby = i > 0 && i%13 == 0;
            var age = baby ? 2 : child ? 8 : 25 + i%35;
            var price = baby ? 0 : child ? decimal.Round(c.BasePrice * 0.7m) : c.BasePrice;
            return new BookingParticipant { AgencyId = agency.Id, ParticipantIndex = i, IsPrimary = i == 0,
                FullName = i == 0 ? customer.Name : $"[Mẫu] {new[] { "Nguyễn Minh", "Trần Ngọc", "Lê Hoàng", "Phạm Anh", "Võ Thanh" }[i%5]} {new[] { "An", "Linh", "Nam", "Hà", "Dũng", "Mai" }[(i+sample)%6]} {i+1:00}",
                DateOfBirth = start.AddYears(-age).Date, PhoneNumber = baby || child ? null : "000" + (sample*100+i).ToString("D7"),
                Gender = i%2 == 0 ? "Nam" : "Nữ", IdentityNumber = null, TierName = baby ? "Em bé" : child ? "Trẻ em" : "Người lớn", Price = price,
                Note = i == 0 ? "[Mẫu] Trưởng đoàn, không phải người thật" : "Dữ liệu hành khách giả lập", RestaurantNote = i%6 == 0 ? "Ăn chay" : "Không có",
                RoommateNote = i == 0 ? "Phòng riêng theo thỏa thuận mẫu" : $"Phòng ghép mẫu số {(i+1)/2}",
                AssignedGuideId = guide.Id, AttendanceStatus = completed ? AttendanceStatus.CheckedIn : AttendanceStatus.Pending,
                CheckedBy = completed ? guide.Id : null, CheckedAt = completed ? start.AddHours(8) : null };
        }).ToArray();
        var total = members.Sum(m => m.Price);
        var createdAt = start.AddDays(-30);
        var referenceNow = new DateTime(2026, 11, 15, 5, 0, 0, DateTimeKind.Utc);
        if (createdAt > referenceNow.AddDays(-14)) createdAt = referenceNow.AddDays(-14-sample);
        var booking = new Booking { BookingCode = code, TourId = tour.Id, TourVersion = tour.Version ?? 1, TourConfigurationData = JsonSerializer.Serialize(c, Json),
            CustomerId = customer.Id, StartDate = start, ContactName = customer.Name, ContactEmail = customer.Email, ContactPhone = customer.Phone!,
            SpecialRequests = Notice, Status = status, TotalAmount = total, OriginalTotalPrice = total,
            PaymentStatus = completed || status is BookingStatus.Paid or BookingStatus.InProgress ? PaymentStatus.Paid : status == BookingStatus.Deposited ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid,
            CancelReason = status == BookingStatus.Cancelled ? "[Mẫu] Đoàn đổi lịch trước khi thanh toán." : null,
            CancelledAt = status == BookingStatus.Cancelled ? createdAt.AddDays(3) : null, CreatedAt = createdAt, Participants = members,
            BookingAgencies = [new() { AgencyId = agency.Id, IsHost = true, OriginalAmount = total, FinalAmount = total,
                SettlementStatus = completed ? SettlementStatus.Paid : SettlementStatus.Unpaid, TourCompletedAt = completed ? start.AddDays(c.DurationDays).AddHours(10) : null,
                AutoPayoutAt = null, FeePercent = completed ? 5 : null, PlatformFee = completed ? decimal.Round(total*0.05m) : 0,
                NetPayout = completed ? total-decimal.Round(total*0.05m) : total,
                PayoutMethod = completed ? "MANUAL" : null, BankReferenceCode = completed ? "DEMO-NO-REAL-TRANSFER" : null,
                PayoutNote = Notice, PayoutTransferredAt = completed ? start.AddDays(c.DurationDays+3) : null }],
            AssignedGuides = [new() { AgencyId = agency.Id, GuideId = guide.Id, Role = "lead_guide", Notes = Notice }],
            Timelines = (c.Timelines ?? []).Select(d => new BookingTimeline { DayNumber = d.DayNumber, Title = d.Title, Description = d.Description,
                Attractions = (d.Activities ?? []).Select(a => new BookingTimelineAttraction { AgencyId = agency.Id, OriginalLocationName = a.Name, CurrentLocationName = a.Name,
                    Time = start.AddDays(d.DayNumber-1).Add(a.EstimatedTime ?? TimeSpan.FromHours(9)), Status = "approved", AttendanceStatus = completed ? "CheckedIn" : "Pending", GuideId = guide.Id }).ToList(),
                Meals = (d.Meals ?? []).Where(m => m.IsDefault).Select(m => new BookingTimelineMeal { AgencyId = agency.Id, ServiceId = m.ServiceId,
                    MealType = m.MealType, OriginalRestaurantName = m.RestaurantName, CurrentRestaurantName = m.RestaurantName,
                    DateService = start.AddDays(d.DayNumber-1), Time = start.AddDays(d.DayNumber-1).Add(m.Time ?? TimeSpan.FromHours(12)), Status = "approved" }).ToList() }).ToList(),
            Accommodations = (c.Timelines ?? []).SelectMany(d => (d.Accommodations ?? []).Where(h => h.IsDefault).Select(h => new BookingAccommodation {
                AgencyId = agency.Id, ServiceId = h.ServiceId, Destination = h.DestinationName, OriginalHotelName = h.HotelName, CurrentHotelName = h.HotelName,
                OriginalStars = h.StarRating, CurrentStars = h.StarRating, NightsCount = h.NightsCount, DateFrom = start.AddDays(d.DayNumber-1),
                DateTo = start.AddDays(d.DayNumber-1+h.NightsCount), Status = "approved" })).ToList() };
        return booking;
    }

    private static async Task FinalizeFixture(TripOpsDbContext db, Booking b, TourConfiguration c, User agency, User customer,
        BookingStatus status, int sample, DateTime now, CancellationToken ct)
    {
        var accepted = status != BookingStatus.Pending && status != BookingStatus.Cancelled;
        var quote = await db.BookingQuotations.SingleAsync(q => q.BookingId == b.Id, ct);
        var lines = (JsonSerializer.Deserialize<CostLine[]>(quote.LinesJson, Json) ?? []).Select(l => {
            if (l.Source != SupplierSources.AgencySupplier || !l.SlotKey.StartsWith("hotel:")) return l;
            var quantity = l.Quantity * b.Participants.Count;
            return l with { Quantity = quantity, Unit = "person_night", Total = decimal.Round(l.UnitCost * quantity) };
        }).ToArray();
        quote.LinesJson = JsonSerializer.Serialize(lines.Select(l => l with { Confirmed = accepted }).ToArray(), Json);
        quote.Status = accepted ? "Accepted" : status == BookingStatus.Cancelled ? "Cancelled" : "Draft";
        quote.TotalCost = lines.Sum(l => l.Total);
        quote.SaleTotal = b.TotalAmount; quote.AgencyProfit = b.TotalAmount - quote.TotalCost; quote.Reason = Notice;
        quote.CreatedAt = b.CreatedAt!.Value; quote.SentAt = accepted ? b.CreatedAt.Value.AddDays(1) : null;
        quote.AcceptedAt = accepted ? b.CreatedAt.Value.AddDays(2) : null;
        if (accepted) b.AcceptedQuotationId = quote.Id;
        foreach (var r in await db.BookingSupplierRequests.Where(r => r.BookingId == b.Id).ToListAsync(ct))
        {
            r.Status = status == BookingStatus.Cancelled ? "Cancelled" : accepted ? "Accepted" : "Pending";
            r.QuotedCost = accepted ? r.EstimatedCost : null; r.PriceConfirmed = accepted; r.AvailabilityConfirmed = accepted;
            r.AvailableQuantity = accepted ? r.Quantity : null; r.Note = Notice; r.CreatedAt = b.CreatedAt.Value;
            r.ReplyDeadline = accepted || status == BookingStatus.Cancelled ? null : now.AddDays(3);
            r.RespondedAt = accepted ? b.CreatedAt.Value.AddDays(1) : null;
        }
        if (accepted)
        {
            var deposit = decimal.Round(b.TotalAmount / 2);
            foreach (var stage in new[] { "deposit", "balance" })
            {
                var amount = stage == "deposit" ? deposit : b.TotalAmount - deposit;
                var paid = b.PaymentStatus == PaymentStatus.Paid || b.PaymentStatus == PaymentStatus.PartiallyPaid && stage == "deposit";
                var paidAt = b.CreatedAt.Value.AddDays(stage == "deposit" ? 2 : 10);
                var request = new PaymentRequest { BookingId = b.Id, QuotationId = quote.Id, Stage = stage, Amount = amount,
                    Description = $"[Mẫu] {(stage == "deposit" ? "Đặt cọc 50%" : "Thanh toán còn lại")}", CreatedBy = agency.Id,
                    CreatedAt = b.CreatedAt.Value.AddDays(2), DueDate = b.StartDate.AddDays(-10), Status = paid ? PaymentRequestStatus.Paid : PaymentRequestStatus.Pending,
                    PaidAt = paid ? paidAt : null };
                if (paid) request.Transactions.Add(new PaymentTransaction { BookingId = b.Id, TransactionCode = b.BookingCode + "-" + stage,
                    PaymentMethod = "DEMO", Amount = amount, Status = PaymentTransactionStatus.Success, PayerName = customer.Name,
                    ReviewNote = Notice, PaidAt = paidAt, CreatedAt = paidAt });
                db.PaymentRequests.Add(request);
            }
        }
    }
}
