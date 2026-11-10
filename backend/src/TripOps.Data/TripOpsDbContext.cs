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
    public DbSet<GuideProfile> GuideProfiles => Set<GuideProfile>();
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
    public DbSet<TourProvince> TourProvinces => Set<TourProvince>();
    public DbSet<AgencySupplier> AgencySuppliers => Set<AgencySupplier>();
    public DbSet<TourDesignRequest> TourDesignRequests => Set<TourDesignRequest>();
    public DbSet<TourDesignRequestAgency> TourDesignRequestAgencies => Set<TourDesignRequestAgency>();

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
    public DbSet<BookingSupplierRequest> BookingSupplierRequests => Set<BookingSupplierRequest>();
    public DbSet<BookingQuotation> BookingQuotations => Set<BookingQuotation>();

    // 5. Finance
    public DbSet<PaymentRequest> PaymentRequests => Set<PaymentRequest>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    public DbSet<RefundRequest> RefundRequests => Set<RefundRequest>();
    public DbSet<BookingContract> BookingContracts => Set<BookingContract>();
    public DbSet<ContractSignSession> ContractSignSessions => Set<ContractSignSession>();
    public DbSet<SystemBankAccount> SystemBankAccounts => Set<SystemBankAccount>();
    public DbSet<SystemCommissionConfig> SystemCommissionConfigs => Set<SystemCommissionConfig>();

    // 6. Interaction
    public DbSet<WorkflowNotification> WorkflowNotifications => Set<WorkflowNotification>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();
    public DbSet<Complaint> Complaints => Set<Complaint>();

    // 7. Chat & Subscription Extensions
    public DbSet<ChatConversation> ChatConversations => Set<ChatConversation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ChatAttachment> ChatAttachments => Set<ChatAttachment>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<AgencySubscription> AgencySubscriptions => Set<AgencySubscription>();
    public DbSet<SubscriptionPaymentHistory> SubscriptionPaymentHistories => Set<SubscriptionPaymentHistory>();

    private void PrepareForSave()
    {
        if (ChangeTracker.Entries<TourVersion>().Any(e => e.State == EntityState.Deleted || (e.State == EntityState.Modified && e.Properties.Any(p => p.IsModified && p.Metadata.Name is not (nameof(TourVersion.SharedAt) or nameof(TourVersion.SharedBy))))))
            throw new InvalidOperationException("Tour history is immutable.");
        if (ChangeTracker.Entries<BookingQuotation>().Any(e => e.State == EntityState.Deleted && e.Entity.SentAt.HasValue))
            throw new InvalidOperationException("Sent quotations cannot be deleted.");
        foreach (var entry in ChangeTracker.Entries<BookingQuotation>().Where(e => e.State == EntityState.Modified && e.OriginalValues.GetValue<DateTime?>(nameof(BookingQuotation.SentAt)).HasValue))
            if (entry.Properties.Any(p => p.IsModified && p.Metadata.Name is not (nameof(BookingQuotation.Status) or nameof(BookingQuotation.AcceptedAt))))
                throw new InvalidOperationException("Sent quotations are immutable.");
        foreach (var entry in ChangeTracker.Entries<Tour>().Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted))
        {
            var tour = entry.Entity;
            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                tour.Status = TourStatus.Deleted;
            }
            if (tour.Status == TourStatus.Deleted || tour.Status == TourStatus.Draft || tour.IsRequest == true)
                tour.Visibility = TourVisibility.Hidden;
        }
        foreach (var entry in ChangeTracker.Entries<TourPricingTier>().Where(e => e.State == EntityState.Added))
            if (string.IsNullOrEmpty(entry.Entity.AgencyId) && entry.Entity.Tour is not null)
                entry.Entity.AgencyId = entry.Entity.Tour.AgencyId ?? throw new InvalidOperationException("The tour requires an Agency.");
        foreach (var entry in ChangeTracker.Entries().Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            var now = DateTime.UtcNow;
            if (entry.Metadata.FindProperty("CreatedAt") is not null && entry.State == EntityState.Added && entry.Property("CreatedAt").CurrentValue is null)
                entry.Property("CreatedAt").CurrentValue = now;
            if (entry.Metadata.FindProperty("UpdatedAt") is not null)
                entry.Property("UpdatedAt").CurrentValue = now;
        }
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        PrepareForSave();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        PrepareForSave();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => SaveChangesAsync(true, cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<AgencySubscription>().ToTable("agency_subscriptions");
        modelBuilder.Entity<Booking>().ToTable("bookings");
        modelBuilder.Entity<BookingAccommodation>().ToTable("booking_hotels");
        modelBuilder.Entity<BookingAgency>().ToTable("booking_agencies");
        modelBuilder.Entity<BookingAssignedGuide>().ToTable("booking_assigned_guides");
        modelBuilder.Entity<BookingAttractionCheckin>().ToTable("booking_attraction_checkins");
        modelBuilder.Entity<BookingIncident>().ToTable("booking_incidents");
        modelBuilder.Entity<BookingParticipant>().ToTable("booking_participants");
        modelBuilder.Entity<BookingPriceAdjustment>().ToTable("booking_price_adjustments");
        modelBuilder.Entity<BookingSupplierRequest>().ToTable("booking_supplier_requests");
        modelBuilder.Entity<BookingQuotation>().ToTable("booking_quotations");
        modelBuilder.Entity<BookingTimeline>().ToTable("booking_timelines");
        modelBuilder.Entity<BookingTimelineAttraction>().ToTable("booking_locations");
        modelBuilder.Entity<BookingTimelineMeal>().ToTable("booking_restaurants");
        modelBuilder.Entity<BusinessProfile>().ToTable("business_profiles");
        modelBuilder.Entity<ChatAttachment>().ToTable("chat_attachments");
        modelBuilder.Entity<ChatConversation>().ToTable("chat_conversations");
        modelBuilder.Entity<ChatMessage>().ToTable("chat_messages");
        modelBuilder.Entity<Complaint>().ToTable("complaints");
        modelBuilder.Entity<Feedback>().ToTable("feedbacks");
        modelBuilder.Entity<PaymentRequest>().ToTable("payment_requests");
        modelBuilder.Entity<PaymentTransaction>().ToTable("payment_transactions");
        modelBuilder.Entity<RefundRequest>().ToTable("refund_requests");
        modelBuilder.Entity<BookingContract>().ToTable("booking_contracts");
        modelBuilder.Entity<ContractSignSession>().ToTable("contract_sign_sessions");
        modelBuilder.Entity<Service>().ToTable("services");
        modelBuilder.Entity<SubscriptionPaymentHistory>().ToTable("subscription_payment_history");
        modelBuilder.Entity<SubscriptionPlan>().ToTable("subscription_plans");
        modelBuilder.Entity<SystemBankAccount>().ToTable("system_bank_accounts");
        modelBuilder.Entity<SystemCommissionConfig>().ToTable("system_commission_configs");
        modelBuilder.Entity<Tour>().ToTable("tours");
        modelBuilder.Entity<TourAccommodation>().ToTable("tour_hotels");
        modelBuilder.Entity<TourDesignRequest>().ToTable("tour_design_requests");
        modelBuilder.Entity<TourTimeline>().ToTable("tour_timeline");
        modelBuilder.Entity<TourVersion>().ToTable("tour_versions");
        modelBuilder.Entity<TouristAttraction>().ToTable("tourist_locations");
        modelBuilder.Entity<User>().ToTable("users");
        DatabaseDesignConfiguration.Configure(modelBuilder);
        BookingQuotationConfiguration.Configure(modelBuilder);
        DesignCoHostConfiguration.Configure(modelBuilder);
        modelBuilder.Entity<TourDesignRequest>().Property(x => x.Revision).IsConcurrencyToken();
        modelBuilder.Entity<BookingSupplierRequest>().Property(x => x.Status).IsConcurrencyToken();
        modelBuilder.Entity<BookingSupplierRequest>().Property(x => x.AvailableQuantity).HasPrecision(19, 2);
        modelBuilder.Entity<BookingQuotation>().Property(x => x.Status).IsConcurrencyToken();
        modelBuilder.Entity<WorkflowNotification>(e => {
            e.ToTable("workflow_notifications");
            e.Property(x => x.UserId).HasMaxLength(36);
            e.Property(x => x.Message).HasMaxLength(1000);
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
        });
        modelBuilder.Entity<Tour>().Property(t => t.Id).UseIdentityColumn();
        DatabaseDesignDefaults.Configure(modelBuilder, Database.IsSqlServer());
        if (!Database.IsSqlServer())
            foreach (var property in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetProperties()))
                property.SetColumnType(null);
        if (!Database.IsSqlServer())
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
                foreach (var check in entity.GetCheckConstraints().Where(c => c.Sql.Contains("ISJSON", StringComparison.OrdinalIgnoreCase)).ToList())
                    entity.RemoveCheckConstraint(check.ModelName);
    }
}
