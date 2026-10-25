using Microsoft.EntityFrameworkCore;
using TripOps.Data.Common;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Data;

public class TripOpsDbContext : DbContext
{
    public TripOpsDbContext(DbContextOptions<TripOpsDbContext> options) : base(options)
    {
    }

    // 1. Identity & Profile
    public DbSet<User> Users => Set<User>();
    public DbSet<BusinessProfile> BusinessProfiles => Set<BusinessProfile>();

    // 2. Services
    public DbSet<Service> Services => Set<Service>();

    // 3. Tours
    public DbSet<Tour> Tours => Set<Tour>();
    public DbSet<TourPricingTier> TourPricingTiers => Set<TourPricingTier>();
    public DbSet<TourTimeline> TourTimelines => Set<TourTimeline>();
    public DbSet<TouristAttraction> TouristAttractions => Set<TouristAttraction>();
    public DbSet<TourMeal> TourMeals => Set<TourMeal>();
    public DbSet<TourAccommodation> TourAccommodations => Set<TourAccommodation>();
    public DbSet<TourVersion> TourVersions => Set<TourVersion>();
    public DbSet<TourCustomRequest> TourCustomRequests => Set<TourCustomRequest>();
    public DbSet<TourCustomRequestAgency> TourCustomRequestAgencies => Set<TourCustomRequestAgency>();

    // 4. Bookings & Operations
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingParticipant> BookingParticipants => Set<BookingParticipant>();
    public DbSet<BookingAssignedGuide> BookingAssignedGuides => Set<BookingAssignedGuide>();
    public DbSet<BookingTimeline> BookingTimelines => Set<BookingTimeline>();
    public DbSet<BookingTimelineAttraction> BookingTimelineAttractions => Set<BookingTimelineAttraction>();
    public DbSet<BookingTimelineMeal> BookingTimelineMeals => Set<BookingTimelineMeal>();
    public DbSet<BookingAccommodation> BookingAccommodations => Set<BookingAccommodation>();
    public DbSet<BookingAttractionCheckin> BookingAttractionCheckins => Set<BookingAttractionCheckin>();
    public DbSet<BookingIncident> BookingIncidents => Set<BookingIncident>();
    public DbSet<BookingPriceAdjustment> BookingPriceAdjustments => Set<BookingPriceAdjustment>();
    public DbSet<BookingAgency> BookingAgencies => Set<BookingAgency>();

    // 5. Finance
    public DbSet<PaymentRequest> PaymentRequests => Set<PaymentRequest>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    public DbSet<RefundRequest> RefundRequests => Set<RefundRequest>();
    public DbSet<SystemBankAccount> SystemBankAccounts => Set<SystemBankAccount>();
    public DbSet<SystemCommissionConfig> SystemCommissionConfigs => Set<SystemCommissionConfig>();

    // 6. Interaction
    public DbSet<Feedback> Feedbacks => Set<Feedback>();
    public DbSet<Complaint> Complaints => Set<Complaint>();

    // 7. Chat & Subscription Extensions
    public DbSet<ChatConversation> ChatConversations => Set<ChatConversation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ChatAttachment> ChatAttachments => Set<ChatAttachment>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<AgencySubscription> AgencySubscriptions => Set<AgencySubscription>();
    public DbSet<SubscriptionPaymentHistory> SubscriptionPaymentHistories => Set<SubscriptionPaymentHistory>();

    private void NormalizeTourStates()
    {
        if (ChangeTracker.Entries<TourVersion>().Any(e => e.State is EntityState.Modified or EntityState.Deleted))
            throw new InvalidOperationException("Tour history is immutable.");
        foreach (var entry in ChangeTracker.Entries<Tour>()
                     .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted))
        {
            var tour = entry.Entity;
            if (entry.State == EntityState.Deleted)
                entry.State = EntityState.Modified;
            else if (!tour.IsDeleted && tour.Status != TourStatus.Deleted)
            {
                if (!Enum.IsDefined(tour.Status) || !Enum.IsDefined(tour.Visibility))
                    throw new InvalidOperationException("Invalid tour status or visibility.");
                if (tour.Status == TourStatus.Draft || tour.IsRequest)
                    tour.Visibility = TourVisibility.Hidden;
                continue;
            }

            tour.Status = TourStatus.Deleted;
            tour.Visibility = TourVisibility.Hidden;
            tour.IsDeleted = true;
            tour.DeletedAt ??= DateTime.UtcNow;
        }
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        NormalizeTourStates();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        NormalizeTourStates();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is IBaseEntity<string> || e.Entity is IBaseEntity<int>);

        foreach (var entry in entries)
        {
            var now = DateTime.UtcNow;
            if (entry.State == EntityState.Added)
            {
                entry.Property("CreatedAt").CurrentValue = now;
                entry.Property("UpdatedAt").CurrentValue = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Property("UpdatedAt").CurrentValue = now;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. User
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(36);
            entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(191).IsRequired();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Phone).HasMaxLength(30);
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.Role).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(e => e.Avatar).HasMaxLength(500);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // 2. BusinessProfile
        modelBuilder.Entity<BusinessProfile>(entity =>
        {
            entity.ToTable("business_profiles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(36).IsRequired();
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.BusinessName).HasMaxLength(255);
            entity.Property(e => e.TaxCode).HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(e => e.User)
                .WithOne(u => u.BusinessProfile)
                .HasForeignKey<BusinessProfile>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // 3. Service
        modelBuilder.Entity<Service>(entity =>
        {
            entity.ToTable("services");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProviderId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(e => e.SubCategory).HasMaxLength(100);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Price).HasPrecision(12, 2);
            entity.Property(e => e.PriceFrom).HasPrecision(12, 2);
            entity.Property(e => e.PriceTo).HasPrecision(12, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.Provider)
                .WithMany()
                .HasForeignKey(e => e.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // 4. Tour
        modelBuilder.Entity<Tour>(entity =>
        {
            entity.ToTable("tours");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AgencyId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.Destination).HasMaxLength(255);
            entity.Property(e => e.OperationPeriod).HasMaxLength(255);
            entity.Property(e => e.Version).IsConcurrencyToken();
            entity.Property(e => e.ApprovalStatus).HasConversion<string>().HasMaxLength(30)
                .HasDefaultValue(TourApprovalStatus.NotSubmitted);
            entity.Property(e => e.ReviewedBy).HasMaxLength(36);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.ReviewedBy).OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.RejectionReason).HasMaxLength(2000);
            entity.Property(e => e.BasePrice).HasPrecision(12, 2);
            entity.Property(e => e.Status).HasConversion(
                value => value.ToString().ToLowerInvariant(),
                value => Enum.Parse<TourStatus>(value, true)).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Visibility).HasConversion(
                value => value.ToString().ToLowerInvariant(),
                value => Enum.Parse<TourVisibility>(value, true)).HasMaxLength(20).IsRequired();
            entity.Property(e => e.IsRequest).HasColumnName("is_request").HasDefaultValue(false);
            entity.HasOne(e => e.Agency)
                .WithMany()
                .HasForeignKey(e => e.AgencyId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<TourPricingTier>(entity =>
        {
            entity.ToTable("tour_pricing_tiers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.PricePerGuest).HasPrecision(12, 2);
            entity.HasOne(e => e.Tour)
                .WithMany(t => t.PricingTiers)
                .HasForeignKey(e => e.TourId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TourTimeline>(entity =>
        {
            entity.HasOne(e => e.TransportationService).WithMany().HasForeignKey(e => e.TransportationServiceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.ToTable("tour_timeline");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255);
            entity.HasOne(e => e.Tour)
                .WithMany(t => t.Timelines)
                .HasForeignKey(e => e.TourId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TouristAttraction>(entity =>
        {
            entity.ToTable("tourist_attractions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.HasOne(e => e.TourTimeline)
                .WithMany(t => t.Attractions)
                .HasForeignKey(e => e.TourTimelineId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Service)
                .WithMany()
                .HasForeignKey(e => e.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TourMeal>(entity =>
        {
            entity.Property(e => e.PriceDifference).HasPrecision(19, 2);
            entity.Property(e => e.RestaurantName).HasMaxLength(255);
            entity.ToTable("tour_meals");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MealType).HasMaxLength(50).IsRequired();
            entity.HasOne(e => e.TourTimeline)
                .WithMany(t => t.Meals)
                .HasForeignKey(e => e.TourTimelineId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Service)
                .WithMany()
                .HasForeignKey(e => e.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TourAccommodation>(entity =>
        {
            // Zero is a valid allocation; it must not be mistaken for an unset
            // value and replaced with the database's default of one night.
            entity.Property(e => e.NightsCount).HasDefaultValue(1).HasSentinel(-1);
            entity.Property(e => e.StarRating).HasDefaultValue(3);
            entity.Property(e => e.PriceDifference).HasPrecision(19, 2);
            entity.Property(e => e.DestinationName).HasMaxLength(255);
            entity.ToTable("tour_accommodations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.HotelName).HasMaxLength(255);
            entity.Property(e => e.RoomType).HasMaxLength(100);
            entity.HasOne(e => e.TourTimeline)
                .WithMany(t => t.Accommodations)
                .HasForeignKey(e => e.TourTimelineId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Service)
                .WithMany()
                .HasForeignKey(e => e.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TourVersion>(entity =>
        {
            entity.HasIndex(e => new { e.TourId, e.VersionNumber }).IsUnique();
            entity.Property(e => e.CreatedBy).HasMaxLength(36);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.Price).HasPrecision(19, 2);
            entity.ToTable("tour_versions");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Tour)
                .WithMany(t => t.Versions)
                .HasForeignKey(e => e.TourId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TourCustomRequest>(entity =>
        {
            entity.ToTable("tour_custom_requests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CustomerId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.ExpectedBudget).HasPrecision(12, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(e => e.Customer)
                .WithMany()
                .HasForeignKey(e => e.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<TourCustomRequestAgency>(entity =>
        {
            entity.ToTable("tour_custom_request_agencies");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AgencyId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.QuotedPrice).HasPrecision(12, 2);
            entity.HasOne(e => e.TourCustomRequest)
                .WithMany(r => r.RequestAgencies)
                .HasForeignKey(e => e.TourCustomRequestId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Agency)
                .WithMany()
                .HasForeignKey(e => e.AgencyId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 5. Booking
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.ToTable("bookings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CustomerId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.BookingCode).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.BookingCode).IsUnique();
            entity.Property(e => e.TotalAmount).HasPrecision(12, 2);
            entity.Property(e => e.DepositAmount).HasPrecision(12, 2);
            entity.Property(e => e.PaidAmount).HasPrecision(12, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(e => e.PaymentStatus).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.Customer)
                .WithMany()
                .HasForeignKey(e => e.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Tour)
                .WithMany()
                .HasForeignKey(e => e.TourId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<BookingParticipant>(entity =>
        {
            entity.ToTable("booking_participants");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).HasMaxLength(150).IsRequired();
            entity.Property(e => e.AttendanceStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(e => e.Booking)
                .WithMany(b => b.Participants)
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.AssignedGuide)
                .WithMany(g => g.Participants)
                .HasForeignKey(e => e.AssignedGuideId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<BookingAssignedGuide>(entity =>
        {
            entity.ToTable("booking_assigned_guides");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.GuideId).HasMaxLength(36).IsRequired();
            entity.HasOne(e => e.Booking)
                .WithMany(b => b.AssignedGuides)
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Guide)
                .WithMany()
                .HasForeignKey(e => e.GuideId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BookingTimeline>(entity =>
        {
            entity.ToTable("booking_timelines");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Booking)
                .WithMany(b => b.Timelines)
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BookingTimelineAttraction>(entity =>
        {
            entity.ToTable("booking_timeline_attractions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.HasOne(e => e.BookingTimeline)
                .WithMany(t => t.Attractions)
                .HasForeignKey(e => e.BookingTimelineId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Service)
                .WithMany()
                .HasForeignKey(e => e.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BookingTimelineMeal>(entity =>
        {
            entity.ToTable("booking_timeline_meals");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MealType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Cost).HasPrecision(12, 2);
            entity.HasOne(e => e.BookingTimeline)
                .WithMany(t => t.Meals)
                .HasForeignKey(e => e.BookingTimelineId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Service)
                .WithMany()
                .HasForeignKey(e => e.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BookingAccommodation>(entity =>
        {
            entity.ToTable("booking_accommodations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.HotelName).HasMaxLength(255);
            entity.HasOne(e => e.Booking)
                .WithMany(b => b.Accommodations)
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Service)
                .WithMany()
                .HasForeignKey(e => e.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BookingAttractionCheckin>(entity =>
        {
            entity.ToTable("booking_attraction_checkins");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.GuideId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.Latitude).HasPrecision(10, 7);
            entity.Property(e => e.Longitude).HasPrecision(10, 7);
            entity.Property(e => e.AttendanceStatus).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.BookingTimelineAttraction)
                .WithMany(a => a.Checkins)
                .HasForeignKey(e => e.BookingTimelineAttractionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Guide)
                .WithMany()
                .HasForeignKey(e => e.GuideId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BookingIncident>(entity =>
        {
            entity.ToTable("booking_incidents");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ReportedBy).HasMaxLength(36).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.Booking)
                .WithMany(b => b.Incidents)
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Reporter)
                .WithMany()
                .HasForeignKey(e => e.ReportedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BookingPriceAdjustment>(entity =>
        {
            entity.ToTable("booking_price_adjustments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AdjustedBy).HasMaxLength(36).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.HasOne(e => e.Booking)
                .WithMany(b => b.PriceAdjustments)
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Adjuster)
                .WithMany()
                .HasForeignKey(e => e.AdjustedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BookingAgency>(entity =>
        {
            entity.ToTable("booking_agencies");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AgencyId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.AgreedAmount).HasPrecision(12, 2);
            entity.Property(e => e.PlatformFee).HasPrecision(12, 2);
            entity.Property(e => e.NetPayout).HasPrecision(12, 2);
            entity.Property(e => e.SettlementStatus).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.Booking)
                .WithMany(b => b.BookingAgencies)
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Agency)
                .WithMany()
                .HasForeignKey(e => e.AgencyId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 6. Finance
        modelBuilder.Entity<PaymentRequest>(entity =>
        {
            entity.ToTable("payment_requests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.Booking)
                .WithMany()
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.ToTable("payment_transactions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TransactionCode).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(e => e.ConfirmedBy).HasMaxLength(36);
            entity.HasOne(e => e.Booking)
                .WithMany()
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.PaymentRequest)
                .WithMany(p => p.Transactions)
                .HasForeignKey(e => e.PaymentRequestId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.Confirmer)
                .WithMany()
                .HasForeignKey(e => e.ConfirmedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RefundRequest>(entity =>
        {
            entity.ToTable("refund_requests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RequestedBy).HasMaxLength(36).IsRequired();
            entity.Property(e => e.ReviewedBy).HasMaxLength(36);
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.Booking)
                .WithMany()
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Requester)
                .WithMany()
                .HasForeignKey(e => e.RequestedBy)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Reviewer)
                .WithMany()
                .HasForeignKey(e => e.ReviewedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SystemBankAccount>(entity =>
        {
            entity.ToTable("system_bank_accounts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BankName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.AccountNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.AccountHolderName).HasMaxLength(150).IsRequired();
        });

        modelBuilder.Entity<SystemCommissionConfig>(entity =>
        {
            entity.ToTable("system_commission_configs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Percentage).HasPrecision(5, 2);
        });

        // 7. Interaction
        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.ToTable("feedbacks");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CustomerId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.AgencyId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.Booking)
                .WithMany()
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Customer)
                .WithMany()
                .HasForeignKey(e => e.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Agency)
                .WithMany()
                .HasForeignKey(e => e.AgencyId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Complaint>(entity =>
        {
            entity.ToTable("complaints");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ComplainantId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.TargetId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.AdminId).HasMaxLength(36);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.Booking)
                .WithMany()
                .HasForeignKey(e => e.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Complainant)
                .WithMany()
                .HasForeignKey(e => e.ComplainantId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Target)
                .WithMany()
                .HasForeignKey(e => e.TargetId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Admin)
                .WithMany()
                .HasForeignKey(e => e.AdminId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // 8. Chat
        modelBuilder.Entity<ChatConversation>(entity =>
        {
            entity.ToTable("chat_conversations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserOneId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.UserTwoId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.HasOne(e => e.UserOne)
                .WithMany()
                .HasForeignKey(e => e.UserOneId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.UserTwo)
                .WithMany()
                .HasForeignKey(e => e.UserTwoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.ToTable("chat_messages");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SenderId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.ContentType).HasMaxLength(20).IsRequired();
            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Sender)
                .WithMany()
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ChatAttachment>(entity =>
        {
            entity.ToTable("chat_attachments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileUrl).HasMaxLength(500).IsRequired();
            entity.HasOne(e => e.Message)
                .WithMany(m => m.Attachments)
                .HasForeignKey(e => e.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // 9. Subscription
        modelBuilder.Entity<SubscriptionPlan>(entity =>
        {
            entity.ToTable("subscription_plans");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Price).HasPrecision(12, 2);
        });

        modelBuilder.Entity<AgencySubscription>(entity =>
        {
            entity.ToTable("agency_subscriptions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AgencyId).HasMaxLength(36).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasOne(e => e.Agency)
                .WithMany()
                .HasForeignKey(e => e.AgencyId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.SubscriptionPlan)
                .WithMany()
                .HasForeignKey(e => e.SubscriptionPlanId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SubscriptionPaymentHistory>(entity =>
        {
            entity.ToTable("subscription_payment_history");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.HasOne(e => e.AgencySubscription)
                .WithMany()
                .HasForeignKey(e => e.AgencySubscriptionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
