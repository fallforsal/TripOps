using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Data;

internal static class DatabaseDesignConfiguration
{
    public static void Configure(ModelBuilder modelBuilder)
    {

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasColumnType("nvarchar(150)").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasColumnType("nvarchar(191)").HasMaxLength(191).IsRequired();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Phone).HasColumnName("phone").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.Role).HasColumnName("role").HasColumnType("nvarchar(50)").IsRequired();
            entity.Property(e => e.Role).HasConversion<string>();
            entity.Property(e => e.Avatar).HasColumnName("avatar").HasColumnType("nvarchar(500)").HasMaxLength(500);
            entity.Property(e => e.IsVerified).HasColumnName("is_verified").HasColumnType("bit").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2").IsRequired();
        });
        modelBuilder.Entity<GuideProfile>(entity =>
        {
            entity.ToTable("guide_profiles", table => table.HasCheckConstraint("CK_guide_profiles_experience", "experience_years BETWEEN 0 AND 50"));
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.ExperienceYears).HasColumnName("experience_years").HasColumnType("smallint");
            entity.Property(e => e.Languages).HasColumnName("languages").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.Routes).HasColumnName("routes").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.Specialties).HasColumnName("specialties").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.Bio).HasColumnName("bio").HasMaxLength(5000);
            entity.Property(e => e.SuspendedAt).HasColumnName("suspended_at").HasColumnType("datetime2");
            entity.Property(e => e.SuspendedReason).HasColumnName("suspended_reason").HasMaxLength(2000);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
            entity.HasOne(e => e.User).WithOne(e => e.GuideProfile).HasForeignKey<GuideProfile>(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<BusinessProfile>(entity =>
        {
            entity.ToTable("business_profiles");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.BusinessName).HasColumnName("business_name").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.TaxCode).HasColumnName("tax_code").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.BusinessAddress).HasColumnName("business_address").HasColumnType("nvarchar(max)");
            entity.Property(e => e.BusinessLicenseUrl).HasColumnName("business_license_url").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason").HasColumnType("nvarchar(max)");
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at").HasColumnType("datetime2");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<Service>(entity =>
        {
            entity.Property(e => e.IsPaused).HasColumnName("is_paused").HasColumnType("bit").HasDefaultValue(false).IsRequired();
            entity.Property(e => e.SubCategory).HasColumnName("sub_category").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.Property(e => e.HiddenReason).HasColumnName("hidden_reason").HasColumnType("nvarchar(max)");
            entity.Property(e => e.FullAddress).HasColumnName("full_address").HasColumnType("nvarchar(500)").HasMaxLength(500);
            entity.Property(e => e.OperatingHours).HasColumnName("operating_hours").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.ToTable("services");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.ProviderId).HasColumnName("provider_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.Category).HasColumnName("category").HasColumnType("nvarchar(50)").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Category).HasConversion<string>();
            entity.Property(e => e.Name).HasColumnName("name").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Price).HasColumnName("price").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.PriceFrom).HasColumnName("price_from").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.PriceTo).HasColumnName("price_to").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.Capacity).HasColumnName("capacity").HasColumnType("int");
            entity.Property(e => e.StarRating).HasColumnName("star_rating").HasColumnType("int");
            entity.Property(e => e.Amenities).HasColumnName("amenities").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Policies).HasColumnName("policies").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Province).HasColumnName("province").HasColumnType("nvarchar(100)").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Ward).HasColumnName("ward").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.Property(e => e.Street).HasColumnName("street").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.Latitude).HasColumnName("latitude").HasColumnType("decimal(10, 8)");
            entity.Property(e => e.Longitude).HasColumnName("longitude").HasColumnType("decimal(11, 8)");
            entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.Images).HasColumnName("images").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Rating).HasColumnName("rating").HasColumnType("decimal(3, 2)");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason").HasColumnType("nvarchar(max)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.Id, e.ProviderId }).IsUnique();
        });
        modelBuilder.Entity<Tour>(entity =>
        {
            entity.ToTable("tours");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.Code).HasColumnName("tour_code").HasColumnType("nvarchar(50)").HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Name).HasColumnName("name").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.Destination).HasColumnName("location").HasColumnType("nvarchar(max)");
            entity.Property(e => e.DepartureLocation).HasColumnName("departure_location").HasColumnType("nvarchar(max)");
            entity.Property(e => e.DurationTour).HasColumnName("duration_tour").HasColumnType("nvarchar(max)");
            entity.Property(e => e.OperationPeriod).HasColumnName("operation_period").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.DurationDays).HasColumnName("duration_days").HasColumnType("int");
            entity.Property(e => e.DurationNights).HasColumnName("duration_nights").HasColumnType("int");
            entity.Property(e => e.BasePrice).HasColumnName("baseprice").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.MinGuests).HasColumnName("min_participants").HasColumnType("int");
            entity.Property(e => e.MaxGuests).HasColumnName("max_participants").HasColumnType("int");
            entity.Property(e => e.Highlights).HasColumnName("highlights").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Inclusions).HasColumnName("inclusions").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Exclusions).HasColumnName("exclusions").HasColumnType("nvarchar(max)");
            entity.Property(e => e.CancellationPolicy).HasColumnName("policies").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Message).HasColumnName("message").HasColumnType("nvarchar(max)");
            entity.Property(e => e.ThumbnailUrls).HasColumnName("thumbnail_urls").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Images).HasColumnName("image_urls").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<TourStatus, string>(v => v.ToString().ToLowerInvariant(), v => Enum.Parse<TourStatus>(v, true)));
            entity.Property(e => e.Visibility).HasColumnName("visibility").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.Visibility).HasConversion(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<TourVisibility, string>(v => v.ToString().ToLowerInvariant(), v => Enum.Parse<TourVisibility>(v, true)));
            entity.Property(e => e.IsRequest).HasColumnName("is_request").HasColumnType("bit");
            entity.Property(e => e.Version).HasColumnName("version").HasColumnType("int");
            entity.Property(e => e.ChangeNote).HasColumnName("change_note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.DesignRequestId).HasColumnName("design_request_id").HasColumnType("int");
            entity.Property(e => e.IsSharedToCustomer).HasColumnName("is_shared_to_customer").HasColumnType("bit");
            entity.Property(e => e.IsAiGenerated).HasColumnName("is_ai_generated").HasColumnType("bit");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<TourPricingTier>(entity =>
        {
            entity.ToTable("tour_pricing_tiers");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.TourId).HasColumnName("tour_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.Name).HasColumnName("tier_name").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.Property(e => e.MinAge).HasColumnName("min_age").HasColumnType("int");
            entity.Property(e => e.MaxAge).HasColumnName("max_age").HasColumnType("int");
            entity.Property(e => e.PricePerGuest).HasColumnName("price").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.DisplayOrder).HasColumnName("display_order").HasColumnType("int");
        });
        modelBuilder.Entity<TourTimeline>(entity =>
        {
            entity.ToTable("tour_timeline");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.TourId).HasColumnName("tour_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.DayNumber).HasColumnName("day_number").HasColumnType("int").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("nvarchar(max)");
            entity.HasIndex(e => new { e.TourId, e.DayNumber }).IsUnique();
        });
        modelBuilder.Entity<TouristAttraction>(entity =>
        {
            entity.ToTable("tourist_locations");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.TourTimelineId).HasColumnName("tour_timeline_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.Time).HasColumnName("time").HasColumnType("datetime2");
            entity.Property(e => e.Name).HasColumnName("name_location").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
        });
        modelBuilder.Entity<TourMeal>(entity =>
        {
            entity.ToTable("tour_restaurants");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.ServiceId).HasColumnName("service_id").HasColumnType("int");
            entity.Property(e => e.TourTimelineId).HasColumnName("tour_timeline_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.Time).HasColumnName("time").HasColumnType("datetime2");
            entity.Property(e => e.SupplierSource).HasColumnName("supplier_source").HasColumnType("nvarchar(20)").HasMaxLength(20);
            entity.Property(e => e.AgencySupplierId).HasColumnName("agency_supplier_id").HasColumnType("int");
            entity.Property(e => e.SupplierSnapshot).HasColumnName("supplier_snapshot").HasColumnType("nvarchar(max)");
            entity.Property(e => e.MealType).HasColumnName("meal_type").HasColumnType("nvarchar(20)").HasMaxLength(20).IsRequired();
            entity.Property(e => e.RestaurantName).HasColumnName("restaurant_name").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("nvarchar(max)");
            entity.Property(e => e.IsDefault).HasColumnName("is_default").HasColumnType("bit").IsRequired();
            entity.Property(e => e.PriceDifference).HasColumnName("price_difference").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<TourAccommodation>(entity =>
        {
            entity.ToTable("tour_hotels");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.TourId).HasColumnName("tour_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.ServiceId).HasColumnName("service_id").HasColumnType("int");
            entity.Property(e => e.DestinationName).HasColumnName("destination_name").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.HotelName).HasColumnName("hotel_name").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.StarRating).HasColumnName("star_rating").HasColumnType("int");
            entity.Property(e => e.NightsCount).HasColumnName("nights_count").HasColumnType("int");
            entity.Property(e => e.IsDefault).HasColumnName("is_default").HasColumnType("bit");
            entity.Property(e => e.PriceDifference).HasColumnName("price_difference").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.SupplierSource).HasColumnName("supplier_source").HasColumnType("nvarchar(20)").HasMaxLength(20);
            entity.Property(e => e.AgencySupplierId).HasColumnName("agency_supplier_id").HasColumnType("int");
            entity.Property(e => e.SupplierSnapshot).HasColumnName("supplier_snapshot").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AddressNotes).HasColumnName("address").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<TourDesignRequest>(entity =>
        {
            entity.ToTable("tour_design_requests");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("user_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.BusinessName).HasColumnName("business_name").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.BusinessEmail).HasColumnName("business_email").HasColumnType("nvarchar(191)").HasMaxLength(191);
            entity.Property(e => e.BusinessPhone).HasColumnName("business_phone").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.ContactName).HasColumnName("contact_name").HasColumnType("nvarchar(150)").HasMaxLength(150).IsRequired();
            entity.Property(e => e.ContactEmail).HasColumnName("contact_email").HasColumnType("nvarchar(191)").HasMaxLength(191).IsRequired();
            entity.Property(e => e.ContactPhone).HasColumnName("contact_phone").HasColumnType("nvarchar(30)").HasMaxLength(30).IsRequired();
            entity.Property(e => e.Destination).HasColumnName("destination").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.StartDate).HasColumnName("departure_date").HasColumnType("date").IsRequired();
            entity.Property(e => e.EndDate).HasColumnName("return_date").HasColumnType("date");
            entity.Property(e => e.NumberOfGuests).HasColumnName("number_of_participants").HasColumnType("int");
            entity.Property(e => e.BudgetPerPerson).HasColumnName("budget_per_person").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.HotelRatingRequirement).HasColumnName("hotel_rating_requirement").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.SpecialRequirements).HasColumnName("special_requirements").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<Tour>().HasIndex(e => e.DesignRequestId);
        modelBuilder.Entity<TourVersion>(entity =>
        {
            entity.ToTable("tour_versions");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.TourId).HasColumnName("tour_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.VersionNumber).HasColumnName("version").HasColumnType("int").IsRequired();
            entity.Property(e => e.ChangeLog).HasColumnName("change_note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Price).HasColumnName("price").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.SnapshotData).HasColumnName("tour_snapshot").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.TourId, e.Id }).IsUnique();
            entity.HasIndex(e => new { e.TourId, e.VersionNumber }).IsUnique();
        });
        modelBuilder.Entity<AgencySupplier>(entity =>
        {
            entity.ToTable("agency_suppliers");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.SupplierType).HasColumnName("supplier_type").HasColumnType("nvarchar(20)").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Address).HasColumnName("address").HasColumnType("nvarchar(500)").HasMaxLength(500);
            entity.Property(e => e.Area).HasColumnName("area").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.ContactName).HasColumnName("contact_name").HasColumnType("nvarchar(150)").HasMaxLength(150);
            entity.Property(e => e.ContactPhone).HasColumnName("contact_phone").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.ContactEmail).HasColumnName("contact_email").HasColumnType("nvarchar(191)").HasMaxLength(191);
            entity.Property(e => e.StarRating).HasColumnName("star_rating").HasColumnType("int");
            entity.Property(e => e.ReferencePrice).HasColumnName("reference_price").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.Conditions).HasColumnName("conditions").HasColumnType("nvarchar(2000)").HasMaxLength(2000);
            entity.Property(e => e.Notes).HasColumnName("notes").HasColumnType("nvarchar(2000)").HasMaxLength(2000);
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(20)").HasMaxLength(20).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.AgencyId, e.SupplierType, e.Status });
            entity.HasIndex(e => new { e.AgencyId, e.SupplierType, e.Name });
        });
        modelBuilder.Entity<TourProvince>(entity =>
        {
            entity.ToTable("tour_provinces");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.TourId).HasColumnName("tour_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.ProvinceCode).HasColumnName("province_code").HasColumnType("nvarchar(32)").HasMaxLength(32).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.TourId, e.ProvinceCode }).IsUnique();
            entity.HasIndex(e => new { e.ProvinceCode, e.TourId });
        });
        modelBuilder.Entity<TourDesignRequestAgency>(entity =>
        {
            entity.ToTable("tour_design_request_agencies");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.TourDesignRequestId).HasColumnName("request_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.IsHost).HasColumnName("is_host").HasColumnType("bit");
            entity.Property(e => e.StageArea).HasColumnName("stage_area").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.SuggestedBudget).HasColumnName("suggested_budget").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.CommunicationNotes).HasColumnName("communication_notes").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.AssignedAt).HasColumnName("assigned_at").HasColumnType("datetime2");
            entity.Property(e => e.RespondedAt).HasColumnName("responded_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.TourDesignRequestId, e.AgencyId }).IsUnique();
        });
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.ToTable("bookings");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingCode).HasColumnName("booking_code").HasColumnType("nvarchar(50)").HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.BookingCode).IsUnique();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.TourId).HasColumnName("tour_id").HasColumnType("int");
            entity.Property(e => e.DesignRequestId).HasColumnName("design_request_id").HasColumnType("int");
            entity.Property(e => e.StartDate).HasColumnName("departure_date").HasColumnType("date").IsRequired();
            entity.Property(e => e.ContactName).HasColumnName("contact_full_name").HasColumnType("nvarchar(150)").HasMaxLength(150).IsRequired();
            entity.Property(e => e.ContactPhone).HasColumnName("contact_phone").HasColumnType("nvarchar(30)").HasMaxLength(30).IsRequired();
            entity.Property(e => e.ContactEmail).HasColumnName("contact_email").HasColumnType("nvarchar(191)").HasMaxLength(191).IsRequired();
            entity.Property(e => e.SpecialRequests).HasColumnName("contact_note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.PaymentStatus).HasColumnName("payment_status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.PaymentStatus).HasConversion<string>();
            entity.Property(e => e.HasCustomization).HasColumnName("has_customization").HasColumnType("bit");
            entity.Property(e => e.OriginalTotalPrice).HasColumnName("original_total_price").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.TotalAmount).HasColumnName("total_price").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(20)").HasMaxLength(20);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.CancelReason).HasColumnName("cancel_reason").HasColumnType("nvarchar(max)");
            entity.Property(e => e.CancelledAt).HasColumnName("cancelled_at").HasColumnType("datetime2");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });

        modelBuilder.Entity<BookingParticipant>(entity =>
        {
            entity.Property(e => e.CreationKey).HasColumnName("creation_key").HasColumnType("uniqueidentifier");
            entity.HasIndex(e => new { e.BookingId, e.CreationKey }).IsUnique().HasFilter("[creation_key] IS NOT NULL");
            entity.ToTable("booking_participants");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.ParticipantIndex).HasColumnName("participant_index").HasColumnType("int").IsRequired();
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary").HasColumnType("bit").IsRequired();
            entity.Property(e => e.FullName).HasColumnName("full_name").HasColumnType("nvarchar(150)").HasMaxLength(150).IsRequired();
            entity.Property(e => e.DateOfBirth).HasColumnName("date_of_birth").HasColumnType("date");
            entity.Property(e => e.Gender).HasColumnName("gender").HasColumnType("nvarchar(20)").HasMaxLength(20);
            entity.Property(e => e.IdentityNumber).HasColumnName("identity_card_number").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.Note).HasColumnName("note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.TierName).HasColumnName("tier_name").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.Property(e => e.Price).HasColumnName("price").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.AssignedGuideId).HasColumnName("assigned_guide_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.AttendanceStatus).HasColumnName("attendance_status").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.AttendanceStatus).HasConversion<string>();
            entity.Property(e => e.CheckedBy).HasColumnName("checked_by").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.CheckedAt).HasColumnName("checked_at").HasColumnType("datetime2");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(20)").HasMaxLength(20);
            entity.Property(e => e.StatusNote).HasColumnName("status_note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.RoommateNote).HasColumnName("roommate_note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.RestaurantNote).HasColumnName("restaurant_note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.BookingId, e.ParticipantIndex });
            entity.HasIndex(e => new { e.BookingId, e.AgencyId, e.ParticipantIndex }).IsUnique();
        });
        modelBuilder.Entity<BookingAssignedGuide>(entity =>
        {
            entity.ToTable("booking_assigned_guides");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.GuideId).HasColumnName("guide_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.Role).HasColumnName("role").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.Notes).HasColumnName("notes").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AssignedAt).HasColumnName("assigned_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.BookingId, e.AgencyId, e.GuideId }).IsUnique();
            entity.HasIndex(e => new { e.BookingId, e.GuideId }).IsUnique();
        });
        modelBuilder.Entity<BookingTimeline>(entity =>
        {
            entity.ToTable("booking_timelines");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.DayNumber).HasColumnName("day_number").HasColumnType("int").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("nvarchar(max)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.BookingId, e.DayNumber }).IsUnique();
        });
        modelBuilder.Entity<BookingTimelineAttraction>(entity =>
        {
            entity.ToTable("booking_locations");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingTimelineId).HasColumnName("booking_timeline_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.Time).HasColumnName("time").HasColumnType("datetime2");
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.OriginalLocationName).HasColumnName("original_location_name").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CurrentLocationName).HasColumnName("current_location_name").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.IsCustomized).HasColumnName("is_customized").HasColumnType("bit");
            entity.Property(e => e.CustomerNote).HasColumnName("customer_note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.PriceDifference).HasColumnName("price_difference").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.AttendanceStatus).HasColumnName("attendance_status").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.GuideId).HasColumnName("guide_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
        });
        modelBuilder.Entity<BookingTimelineMeal>(entity =>
        {
            entity.ToTable("booking_restaurants");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.ServiceId).HasColumnName("service_id").HasColumnType("int");
            entity.Property(e => e.BookingTimelineId).HasColumnName("booking_timeline_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.DateService).HasColumnName("date_service").HasColumnType("date");
            entity.Property(e => e.Time).HasColumnName("time").HasColumnType("datetime2");
            entity.Property(e => e.MealType).HasColumnName("meal_type").HasColumnType("nvarchar(20)").HasMaxLength(20).IsRequired();
            entity.Property(e => e.OriginalRestaurantName).HasColumnName("original_restaurant_name").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CurrentRestaurantName).HasColumnName("current_restaurant_name").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.PriceDifference).HasColumnName("price_difference").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.IsCustomized).HasColumnName("is_customized").HasColumnType("bit").IsRequired();
            entity.Property(e => e.TotalPrice).HasColumnName("total_price").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.ProviderResponse).HasColumnName("provider_response").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<BookingAccommodation>(entity =>
        {
            entity.ToTable("booking_hotels");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.ServiceId).HasColumnName("service_id").HasColumnType("int");
            entity.Property(e => e.Destination).HasColumnName("destination").HasColumnType("nvarchar(100)").HasMaxLength(100).IsRequired();
            entity.Property(e => e.DateFrom).HasColumnName("date_from").HasColumnType("datetime2");
            entity.Property(e => e.DateTo).HasColumnName("date_to").HasColumnType("datetime2");
            entity.Property(e => e.OriginalHotelName).HasColumnName("original_hotel_name").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.OriginalStars).HasColumnName("original_stars").HasColumnType("int");
            entity.Property(e => e.CurrentHotelName).HasColumnName("current_hotel_name").HasColumnType("nvarchar(255)").HasMaxLength(255);
            entity.Property(e => e.CurrentStars).HasColumnName("current_stars").HasColumnType("int");
            entity.Property(e => e.ProviderResponse).HasColumnName("provider_response").HasColumnType("nvarchar(max)");
            entity.Property(e => e.NightsCount).HasColumnName("nights_count").HasColumnType("int");
            entity.Property(e => e.PriceDifference).HasColumnName("price_difference").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.IsCustomized).HasColumnName("is_customized").HasColumnType("bit");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.TotalPrice).HasColumnName("total_price").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<BookingAttractionCheckin>(entity =>
        {
            entity.ToTable("booking_attraction_checkins");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingTimelineAttractionId).HasColumnName("booking_timeline_attraction_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.GuideId).HasColumnName("guide_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.AttendanceStatus).HasColumnName("attendance_status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.AttendanceStatus).HasConversion<string>();
            entity.Property(e => e.CheckinTime).HasColumnName("checked_at").HasColumnType("datetime2");
            entity.Property(e => e.PhotoUrl).HasColumnName("photo_proof_url").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Note).HasColumnName("notes").HasColumnType("nvarchar(max)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.BookingTimelineAttractionId, e.GuideId }).IsUnique();
        });
        modelBuilder.Entity<BookingIncident>(entity =>
        {
            entity.ToTable("booking_incidents");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.ReportedBy).HasColumnName("reported_by").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.IncidentType).HasColumnName("incident_type").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.Title).HasColumnName("title").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.EvidenceUrls).HasColumnName("evidence_urls").HasColumnType("nvarchar(max)");
            entity.Property(e => e.ResolvedAt).HasColumnName("resolved_at").HasColumnType("datetime2");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<PaymentRequest>(entity =>
        {
            entity.ToTable("payment_requests", t =>
                t.HasCheckConstraint("CK_payment_requests_stage", "[stage] IS NULL OR [stage] IN ('deposit', 'balance') OR [stage] LIKE 'fee:%'"));
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.Stage).HasColumnName("stage").HasColumnType("nvarchar(20)").HasMaxLength(20);
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.DueDate).HasColumnName("due_date").HasColumnType("date");
            entity.Property(e => e.DueAt).HasColumnName("due_at").HasColumnType("datetime2");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.PaidAt).HasColumnName("paid_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.BookingId, e.Id }).IsUnique();
            // Mỗi đơn chỉ có một khoản đang hiệu lực cho mỗi đợt (khoản đã hủy được giữ lại làm lịch sử).
            entity.HasIndex(e => new { e.BookingId, e.Stage }).IsUnique()
                .HasDatabaseName("UX_payment_requests_active_stage")
                .HasFilter("[stage] IS NOT NULL AND [status] IN ('Pending', 'Overdue', 'Paid')");
        });
        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.ToTable("payment_transactions");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.PaymentRequestId).HasColumnName("payment_request_id").HasColumnType("int");
            entity.Property(e => e.TransactionCode).HasColumnName("transaction_code").HasColumnType("nvarchar(100)").HasMaxLength(100).IsRequired();
            entity.HasIndex(e => e.TransactionCode).IsUnique();
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasColumnType("nvarchar(50)").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.PayerName).HasColumnName("payer_name").HasColumnType("nvarchar(150)").HasMaxLength(150);
            entity.Property(e => e.ProofImageUrl).HasColumnName("payment_proof_url").HasColumnType("nvarchar(max)");
            entity.Property(e => e.PaidAt).HasColumnName("paid_at").HasColumnType("datetime2");
            entity.Property(e => e.GatewayTransactionNo).HasColumnName("gateway_transaction_no").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.Property(e => e.GatewayResponseCode).HasColumnName("gateway_response_code").HasColumnType("nvarchar(10)").HasMaxLength(10);
            entity.Property(e => e.GatewayLinkId).HasColumnName("gateway_link_id").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.Property(e => e.CheckoutUrl).HasColumnName("checkout_url").HasColumnType("nvarchar(1000)").HasMaxLength(1000);
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").HasColumnType("datetime2");
            entity.Property(e => e.ReviewNote).HasColumnName("review_note").HasColumnType("nvarchar(500)").HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<BookingPriceAdjustment>(entity =>
        {
            entity.ToTable("booking_price_adjustments");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.AdjustedBy).HasColumnName("adjusted_by").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.PreviousTotalPrice).HasColumnName("previous_total_price").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.Amount).HasColumnName("adjustment_amount").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.NewTotalPrice).HasColumnName("new_total_price").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.Reason).HasColumnName("reason").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<BookingAgency>(entity =>
        {
            entity.ToTable("booking_agencies");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.IsHost).HasColumnName("is_host").HasColumnType("bit");
            entity.Property(e => e.OriginalAmount).HasColumnName("original_amount").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.FinalAmount).HasColumnName("final_amount").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.PlatformFee).HasColumnName("platform_fee").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.NetPayout).HasColumnName("net_payout").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.SettlementStatus).HasColumnName("settlement_status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.SettlementStatus).HasConversion<string>();
            entity.Property(e => e.PayoutTransferredAt).HasColumnName("payout_transferred_at").HasColumnType("datetime2");
            entity.Property(e => e.BankReferenceCode).HasColumnName("bank_reference_code").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.BookingId, e.AgencyId }).IsUnique();
        });
        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.ToTable("feedbacks");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.Rating).HasColumnName("overall_rating").HasColumnType("int").IsRequired();
            entity.Property(e => e.Comment).HasColumnName("overall_comment").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AgencyRating).HasColumnName("agency_rating").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyComment).HasColumnName("agency_comment").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Images).HasColumnName("images").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AgencyReply).HasColumnName("agency_reply").HasColumnType("nvarchar(max)");
            entity.Property(e => e.RepliedAt).HasColumnName("replied_at").HasColumnType("datetime2");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
            entity.HasIndex(e => e.BookingId).IsUnique();
        });
        modelBuilder.Entity<Complaint>(entity =>
        {
            entity.ToTable("complaints");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.ComplainantId).HasColumnName("customer_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.TargetId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.Title).HasColumnName("subject").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.EvidenceUrls).HasColumnName("evidence_urls").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AgencyResponse).HasColumnName("agency_response").HasColumnType("nvarchar(max)");
            entity.Property(e => e.AgencyRespondedAt).HasColumnName("agency_responded_at").HasColumnType("datetime2");
            entity.Property(e => e.AdminId).HasColumnName("admin_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.AdminNotes).HasColumnName("admin_notes").HasColumnType("nvarchar(max)");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.ResolvedAt).HasColumnName("resolved_at").HasColumnType("datetime2");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<ChatConversation>(entity =>
        {
            entity.ToTable("chat_conversations");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.UserOneId).HasColumnName("user_one_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.UserTwoId).HasColumnName("user_two_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.LastMessageContent).HasColumnName("last_message_content").HasColumnType("nvarchar(max)");
            entity.Property(e => e.LastMessageSenderId).HasColumnName("last_message_sender_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.LastMessageAt).HasColumnName("last_message_at").HasColumnType("datetime2");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(20)").HasMaxLength(20).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.UserOneId, e.UserTwoId }).IsUnique();
        });
        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.ToTable("chat_messages");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.ConversationId).HasColumnName("conversation_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.SenderId).HasColumnName("sender_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.Content).HasColumnName("content").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.ContentType).HasColumnName("content_type").HasColumnType("nvarchar(20)").HasMaxLength(20).IsRequired();
            entity.Property(e => e.IsRead).HasColumnName("is_read").HasColumnType("bit");
            entity.Property(e => e.ReadAt).HasColumnName("read_at").HasColumnType("datetime2");
            entity.Property(e => e.ReplyToMessageId).HasColumnName("reply_to_message_id").HasColumnType("int");
            entity.Property(e => e.IsEdited).HasColumnName("is_edited").HasColumnType("bit");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasColumnType("bit");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<ChatAttachment>(entity =>
        {
            entity.ToTable("chat_attachments");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.MessageId).HasColumnName("message_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.FileName).HasColumnName("file_name").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
            entity.Property(e => e.FileUrl).HasColumnName("file_url").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.ContentType).HasColumnName("file_type").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.FileSize).HasColumnName("file_size").HasColumnType("int");
            entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url").HasColumnType("nvarchar(max)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<SubscriptionPlan>(entity =>
        {
            entity.ToTable("subscription_plans");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasColumnType("nvarchar(100)").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Slug).HasColumnName("slug").HasColumnType("nvarchar(50)").HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("nvarchar(max)");
            entity.Property(e => e.PriceMonthly).HasColumnName("price_monthly").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.PriceYearly).HasColumnName("price_yearly").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.IsPopular).HasColumnName("is_popular").HasColumnType("bit");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order").HasColumnType("int");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(20)").HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<AgencySubscription>(entity =>
        {
            entity.ToTable("agency_subscriptions");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.SubscriptionPlanId).HasColumnName("plan_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BillingCycle).HasColumnName("billing_cycle").HasColumnType("nvarchar(20)").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Price).HasColumnName("price").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.StartDate).HasColumnName("start_date").HasColumnType("date").IsRequired();
            entity.Property(e => e.EndDate).HasColumnName("end_date").HasColumnType("date").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.AutoRenew).HasColumnName("auto_renew").HasColumnType("bit");
            entity.Property(e => e.CancelledAt).HasColumnName("cancelled_at").HasColumnType("datetime2");
            entity.Property(e => e.CancelReason).HasColumnName("cancel_reason").HasColumnType("nvarchar(max)");
            entity.Property(e => e.LastPaymentDate).HasColumnName("last_payment_date").HasColumnType("datetime2");
            entity.Property(e => e.NextPaymentDate).HasColumnName("next_payment_date").HasColumnType("datetime2");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<SubscriptionPaymentHistory>(entity =>
        {
            entity.ToTable("subscription_payment_history");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.AgencySubscriptionId).HasColumnName("subscription_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.CompanyId).HasColumnName("company_id").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.PlanId).HasColumnName("plan_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasColumnType("nvarchar(50)").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TransactionCode).HasColumnName("transaction_code").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30).IsRequired();
            entity.Property(e => e.BillingPeriodStart).HasColumnName("billing_period_start").HasColumnType("date").IsRequired();
            entity.Property(e => e.BillingPeriodEnd).HasColumnName("billing_period_end").HasColumnType("date").IsRequired();
            entity.Property(e => e.PaymentDate).HasColumnName("paid_at").HasColumnType("datetime2");
            entity.Property(e => e.AdminNote).HasColumnName("admin_note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<BookingContract>(entity =>
        {
            entity.ToTable("booking_contracts", t =>
                t.HasCheckConstraint("CK_booking_contracts_status", "[status] IN ('AwaitingSignature', 'Signed', 'Verified', 'ResignRequested', 'Superseded')"));
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.Version).HasColumnName("version").HasColumnType("int").IsRequired();
            entity.Property(e => e.ContractNo).HasColumnName("contract_no").HasColumnType("nvarchar(50)").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30).IsRequired();
            entity.Property(e => e.SignedFileName).HasColumnName("signed_file_name").HasColumnType("nvarchar(260)").HasMaxLength(260);
            entity.Property(e => e.SignedFileType).HasColumnName("signed_file_type").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.SignedFileSha256).HasColumnName("signed_file_sha256").HasColumnType("nvarchar(64)").HasMaxLength(64);
            entity.Property(e => e.SignedAt).HasColumnName("signed_at").HasColumnType("datetime2");
            entity.Property(e => e.SignMethod).HasColumnName("sign_method").HasColumnType("nvarchar(20)").HasMaxLength(20);
            entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at").HasColumnType("datetime2");
            entity.Property(e => e.ReviewNote).HasColumnName("review_note").HasColumnType("nvarchar(1000)").HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.HasIndex(e => new { e.BookingId, e.Version }).IsUnique();
            entity.HasOne(e => e.Booking).WithMany(b => b.Contracts).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.ReviewedBy).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<ContractSignSession>(entity =>
        {
            entity.ToTable("contract_sign_sessions");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.ContractId).HasColumnName("contract_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.TokenHash).HasColumnName("token_hash").HasColumnType("nvarchar(64)").HasMaxLength(64).IsRequired();
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").HasColumnType("datetime2").IsRequired();
            entity.Property(e => e.OtpHash).HasColumnName("otp_hash").HasColumnType("nvarchar(64)").HasMaxLength(64);
            entity.Property(e => e.OtpExpiresAt).HasColumnName("otp_expires_at").HasColumnType("datetime2");
            entity.Property(e => e.OtpSentAt).HasColumnName("otp_sent_at").HasColumnType("datetime2");
            entity.Property(e => e.OtpSendCount).HasColumnName("otp_send_count").HasColumnType("int").IsRequired();
            entity.Property(e => e.OtpAttempts).HasColumnName("otp_attempts").HasColumnType("int").IsRequired();
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at").HasColumnType("datetime2");
            entity.Property(e => e.SignerIp).HasColumnName("signer_ip").HasColumnType("nvarchar(45)").HasMaxLength(45);
            entity.Property(e => e.SignerUserAgent).HasColumnName("signer_user_agent").HasColumnType("nvarchar(300)").HasMaxLength(300);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.HasOne(e => e.Contract).WithMany(c => c.SignSessions).HasForeignKey(e => e.ContractId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<RefundRequest>(entity =>
        {
            entity.ToTable("refund_requests");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BookingId).HasColumnName("booking_id").HasColumnType("int").IsRequired();
            entity.Property(e => e.RequestedBy).HasColumnName("requested_by").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.Reason).HasColumnName("reason").HasColumnType("nvarchar(50)").HasMaxLength(50).IsRequired();
            entity.Property(e => e.ReasonDetail).HasColumnName("reason_detail").HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.EvidenceUrls).HasColumnName("evidence_urls").HasColumnType("nvarchar(max)");
            entity.Property(e => e.OriginalPaidAmount).HasColumnName("original_paid_amount").HasColumnType("decimal(12, 2)").IsRequired();
            entity.Property(e => e.ApprovedRefundAmount).HasColumnName("approved_refund_amount").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.RefundFee).HasColumnName("refund_fee").HasColumnType("decimal(12, 2)");
            entity.Property(e => e.RefundBankName).HasColumnName("refund_bank_name").HasColumnType("nvarchar(100)").HasMaxLength(100);
            entity.Property(e => e.RefundAccountNumber).HasColumnName("refund_account_number").HasColumnType("nvarchar(50)").HasMaxLength(50);
            entity.Property(e => e.RefundAccountHolder).HasColumnName("refund_account_holder").HasColumnType("nvarchar(150)").HasMaxLength(150);
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.AdminNote).HasColumnName("review_note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason").HasColumnType("nvarchar(max)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at").HasColumnType("datetime2");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<SystemBankAccount>(entity =>
        {
            entity.ToTable("system_bank_accounts");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.BankName).HasColumnName("bank_name").HasColumnType("nvarchar(150)").HasMaxLength(150).IsRequired();
            entity.Property(e => e.BankCode).HasColumnName("bank_code").HasColumnType("nvarchar(30)").HasMaxLength(30).IsRequired();
            entity.Property(e => e.AccountNumber).HasColumnName("account_number").HasColumnType("nvarchar(50)").HasMaxLength(50).IsRequired();
            entity.Property(e => e.AccountHolderName).HasColumnName("account_holder").HasColumnType("nvarchar(150)").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Branch).HasColumnName("branch").HasColumnType("nvarchar(150)").HasMaxLength(150);
            entity.Property(e => e.IsDefault).HasColumnName("is_default").HasColumnType("bit");
            entity.Property(e => e.Status).HasColumnName("status").HasColumnType("nvarchar(20)").HasMaxLength(20);
            entity.Property(e => e.Notes).HasColumnName("notes").HasColumnType("nvarchar(max)");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by").HasColumnType("nvarchar(36)").HasMaxLength(36);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<SystemCommissionConfig>(entity =>
        {
            entity.ToTable("system_commission_configs");
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("int").IsRequired();
            entity.Property(e => e.Percentage).HasColumnName("commission_rate").HasColumnType("decimal(5, 2)").IsRequired();
            entity.Property(e => e.Note).HasColumnName("note").HasColumnType("nvarchar(max)");
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasColumnType("bit");
            entity.Property(e => e.AppliedFrom).HasColumnName("applied_from").HasColumnType("datetime2");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").HasColumnType("nvarchar(36)").HasMaxLength(36).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
        });
        modelBuilder.Entity<AgencySubscription>().HasOne(e => e.Agency).WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<AgencySubscription>().HasOne(e => e.SubscriptionPlan).WithMany().HasForeignKey(e => e.SubscriptionPlanId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Booking>().HasOne(e => e.Customer).WithMany().HasForeignKey(e => e.CustomerId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Booking>().HasOne<TourDesignRequest>().WithMany().HasForeignKey(e => e.DesignRequestId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Booking>().HasOne(e => e.Tour).WithMany().HasForeignKey(e => e.TourId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAccommodation>().HasOne(e => e.Booking).WithMany(e => e.Accommodations).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAgency>().HasOne(e => e.Agency).WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAgency>().HasOne(e => e.Booking).WithMany(e => e.BookingAgencies).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAssignedGuide>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAssignedGuide>().HasOne(e => e.Booking).WithMany(e => e.AssignedGuides).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAssignedGuide>().HasOne(e => e.Guide).WithMany().HasForeignKey(e => e.GuideId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAttractionCheckin>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAttractionCheckin>().HasOne(e => e.BookingTimelineAttraction).WithMany(e => e.Checkins).HasForeignKey(e => e.BookingTimelineAttractionId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAttractionCheckin>().HasOne(e => e.Guide).WithMany().HasForeignKey(e => e.GuideId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingIncident>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingIncident>().HasOne(e => e.Booking).WithMany(e => e.Incidents).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingIncident>().HasOne(e => e.Reporter).WithMany().HasForeignKey(e => e.ReportedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingParticipant>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingParticipant>().HasOne(e => e.AssignedGuide).WithMany().HasForeignKey(e => e.AssignedGuideId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingParticipant>().HasOne(e => e.Booking).WithMany(e => e.Participants).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingParticipant>().HasOne<User>().WithMany().HasForeignKey(e => e.CheckedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingPriceAdjustment>().HasOne(e => e.Adjuster).WithMany().HasForeignKey(e => e.AdjustedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingPriceAdjustment>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingPriceAdjustment>().HasOne(e => e.Booking).WithMany(e => e.PriceAdjustments).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingTimeline>().HasOne(e => e.Booking).WithMany(e => e.Timelines).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingTimelineAttraction>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingTimelineAttraction>().HasOne(e => e.BookingTimeline).WithMany(e => e.Attractions).HasForeignKey(e => e.BookingTimelineId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingTimelineMeal>().HasOne(e => e.BookingTimeline).WithMany(e => e.Meals).HasForeignKey(e => e.BookingTimelineId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BusinessProfile>().HasOne(e => e.User).WithOne(e => e.BusinessProfile).HasForeignKey<BusinessProfile>(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ChatAttachment>().HasOne(e => e.Message).WithMany(e => e.Attachments).HasForeignKey(e => e.MessageId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ChatConversation>().HasOne<User>().WithMany().HasForeignKey(e => e.LastMessageSenderId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ChatConversation>().HasOne(e => e.UserOne).WithMany().HasForeignKey(e => e.UserOneId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ChatConversation>().HasOne(e => e.UserTwo).WithMany().HasForeignKey(e => e.UserTwoId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ChatMessage>().HasOne(e => e.Conversation).WithMany(e => e.Messages).HasForeignKey(e => e.ConversationId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ChatMessage>().HasOne<ChatMessage>().WithMany().HasForeignKey(e => e.ReplyToMessageId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ChatMessage>().HasOne(e => e.Sender).WithMany().HasForeignKey(e => e.SenderId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Complaint>().HasOne(e => e.Admin).WithMany().HasForeignKey(e => e.AdminId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Complaint>().HasOne(e => e.Booking).WithMany().HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Complaint>().HasOne(e => e.Complainant).WithMany().HasForeignKey(e => e.ComplainantId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Complaint>().HasOne(e => e.Target).WithMany().HasForeignKey(e => e.TargetId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Feedback>().HasOne(e => e.Agency).WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Feedback>().HasOne(e => e.Booking).WithMany().HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Feedback>().HasOne(e => e.Customer).WithMany().HasForeignKey(e => e.CustomerId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentRequest>().HasOne(e => e.Booking).WithMany(e => e.PaymentRequests).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentRequest>().HasOne<User>().WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentTransaction>().HasOne(e => e.Booking).WithMany(e => e.PaymentTransactions).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentTransaction>().HasOne(e => e.PaymentRequest).WithMany(e => e.Transactions).HasForeignKey(e => e.PaymentRequestId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<RefundRequest>().HasOne(e => e.Booking).WithMany(b => b.RefundRequests).HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<RefundRequest>().HasOne(e => e.Requester).WithMany().HasForeignKey(e => e.RequestedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<RefundRequest>().HasOne(e => e.Reviewer).WithMany().HasForeignKey(e => e.ReviewedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Service>().HasOne(e => e.Provider).WithMany().HasForeignKey(e => e.ProviderId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SubscriptionPaymentHistory>().HasOne(e => e.AgencySubscription).WithMany().HasForeignKey(e => e.AgencySubscriptionId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SubscriptionPaymentHistory>().HasOne<User>().WithMany().HasForeignKey(e => e.CompanyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SubscriptionPaymentHistory>().HasOne<SubscriptionPlan>().WithMany().HasForeignKey(e => e.PlanId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SystemBankAccount>().HasOne<User>().WithMany().HasForeignKey(e => e.UpdatedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SystemCommissionConfig>().HasOne<User>().WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Tour>().HasOne(e => e.Agency).WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourAccommodation>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourAccommodation>().HasOne(e => e.Tour).WithMany(e => e.Accommodations).HasForeignKey(e => e.TourId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourDesignRequest>().HasOne(e => e.Customer).WithMany().HasForeignKey(e => e.CustomerId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourDesignRequestAgency>().HasOne(e => e.Agency).WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourDesignRequestAgency>().HasOne(e => e.TourDesignRequest).WithMany(e => e.RequestAgencies).HasForeignKey(e => e.TourDesignRequestId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourMeal>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourMeal>().HasOne(e => e.TourTimeline).WithMany(e => e.Meals).HasForeignKey(e => e.TourTimelineId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourPricingTier>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourPricingTier>().HasOne(e => e.Tour).WithMany(e => e.PricingTiers).HasForeignKey(e => e.TourId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourTimeline>().HasOne(e => e.Tour).WithMany(e => e.Timelines).HasForeignKey(e => e.TourId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourVersion>().HasOne<User>().WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourVersion>().HasOne(e => e.Tour).WithMany(e => e.Versions).HasForeignKey(e => e.TourId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourProvince>().HasOne(e => e.Tour).WithMany(e => e.Provinces).HasForeignKey(e => e.TourId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<AgencySupplier>().HasOne(e => e.Agency).WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourMeal>().HasOne<AgencySupplier>().WithMany().HasForeignKey(e => e.AgencySupplierId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourAccommodation>().HasOne<AgencySupplier>().WithMany().HasForeignKey(e => e.AgencySupplierId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TouristAttraction>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TouristAttraction>().HasOne(e => e.TourTimeline).WithMany(e => e.Attractions).HasForeignKey(e => e.TourTimelineId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<User>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).HasPrincipalKey(e => e.Id).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentTransaction>().HasOne<PaymentRequest>().WithMany().HasForeignKey(e => new { e.BookingId, e.PaymentRequestId }).HasPrincipalKey(e => new { e.BookingId, e.Id }).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Tour>().HasOne<TourDesignRequest>().WithMany().HasForeignKey(e => e.DesignRequestId).HasPrincipalKey(e => e.Id).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourMeal>().HasOne<Service>().WithMany().HasForeignKey(e => e.ServiceId).HasPrincipalKey(e => e.Id).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourAccommodation>().HasOne<Service>().WithMany().HasForeignKey(e => e.ServiceId).HasPrincipalKey(e => e.Id).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TourDesignRequest>().HasOne<User>().WithMany().HasForeignKey(e => e.AgencyId).HasPrincipalKey(e => e.Id).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingTimelineMeal>().HasOne<Service>().WithMany().HasForeignKey(e => e.ServiceId).HasPrincipalKey(e => e.Id).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAccommodation>().HasOne<Service>().WithMany().HasForeignKey(e => e.ServiceId).HasPrincipalKey(e => e.Id).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingPriceAdjustment>().HasOne<BookingAgency>().WithMany().HasForeignKey(e => new { e.BookingId, e.AgencyId }).HasPrincipalKey(e => new { e.BookingId, e.AgencyId }).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingAssignedGuide>().HasOne<BookingAgency>().WithMany().HasForeignKey(e => new { e.BookingId, e.AgencyId }).HasPrincipalKey(e => new { e.BookingId, e.AgencyId }).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingIncident>().HasOne<BookingAgency>().WithMany().HasForeignKey(e => new { e.BookingId, e.AgencyId }).HasPrincipalKey(e => new { e.BookingId, e.AgencyId }).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingParticipant>().HasOne<BookingAgency>().WithMany().HasForeignKey(e => new { e.BookingId, e.AgencyId }).HasPrincipalKey(e => new { e.BookingId, e.AgencyId }).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingParticipant>().HasOne<BookingAssignedGuide>().WithMany().HasForeignKey(e => new { e.BookingId, e.AgencyId, e.AssignedGuideId }).HasPrincipalKey(e => new { e.BookingId, e.AgencyId, e.GuideId }).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingTimelineAttraction>().HasOne<User>().WithMany().HasForeignKey(e => e.GuideId).HasPrincipalKey(e => e.Id).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Tour>().Property(e => e.Version).IsConcurrencyToken();
        modelBuilder.Entity<Tour>().HasQueryFilter(e => e.Status != TourStatus.Deleted);
        modelBuilder.Entity<Complaint>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<TourAccommodation>().Property(e => e.NightsCount).HasSentinel(-1);
        modelBuilder.Entity<BookingParticipant>().HasIndex(e => new { e.BookingId, e.ParticipantIndex }).IsUnique().HasFilter("[is_primary] = 1");
        modelBuilder.Entity<BookingAgency>().HasIndex(e => e.BookingId).IsUnique().HasFilter("[is_host] = 1");
        modelBuilder.Entity<TourDesignRequestAgency>().HasIndex(e => e.TourDesignRequestId).IsUnique().HasFilter("[is_host] = 1");
    }
}
