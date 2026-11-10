using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;

namespace TripOps.Data;

internal static class BookingQuotationConfiguration
{
    internal static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BookingSupplierRequest>(e => {
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.ServiceId).HasColumnName("service_id");
            e.Property(x => x.ProviderId).HasColumnName("provider_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            e.Property(x => x.SlotKey).HasColumnName("slot_key").HasColumnType("nvarchar(100)").HasMaxLength(100);
            e.Property(x => x.ServiceName).HasColumnName("service_name").HasColumnType("nvarchar(255)").HasMaxLength(255);
            e.Property(x => x.ServiceDateFrom).HasColumnName("service_date_from").HasColumnType("datetime2");
            e.Property(x => x.ServiceDateTo).HasColumnName("service_date_to").HasColumnType("datetime2");
            e.Property(x => x.Quantity).HasColumnName("quantity").HasColumnType("decimal(12,2)");
            e.Property(x => x.Unit).HasColumnName("unit").HasColumnType("nvarchar(30)").HasMaxLength(30);
            e.Property(x => x.EstimatedCost).HasColumnName("estimated_cost").HasColumnType("decimal(12,2)");
            e.Property(x => x.QuotedCost).HasColumnName("quoted_cost").HasColumnType("decimal(12,2)");
            e.Property(x => x.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            e.Property(x => x.Note).HasColumnName("note").HasColumnType("nvarchar(1000)").HasMaxLength(1000);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            e.Property(x => x.RespondedAt).HasColumnName("responded_at").HasColumnType("datetime2");
            e.HasOne(x => x.Booking).WithMany().HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Service>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.ProviderId, x.Status });
            e.HasIndex(x => new { x.BookingId, x.SlotKey });
        });
        modelBuilder.Entity<BookingQuotation>(e => {
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.TourId).HasColumnName("tour_id");
            e.Property(x => x.TourVersion).HasColumnName("tour_version");
            e.Property(x => x.Status).HasColumnName("status").HasColumnType("nvarchar(30)").HasMaxLength(30);
            e.Property(x => x.EstimatedSale).HasColumnName("estimated_sale").HasColumnType("decimal(12,2)");
            e.Property(x => x.TotalCost).HasColumnName("total_cost").HasColumnType("decimal(12,2)");
            e.Property(x => x.AgencyProfit).HasColumnName("agency_profit").HasColumnType("decimal(12,2)");
            e.Property(x => x.SaleTotal).HasColumnName("sale_total").HasColumnType("decimal(12,2)");
            e.Property(x => x.LinesJson).HasColumnName("lines_json").HasColumnType("nvarchar(max)");
            e.Property(x => x.Reason).HasColumnName("reason").HasColumnType("nvarchar(1000)").HasMaxLength(1000);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("datetime2");
            e.Property(x => x.SentAt).HasColumnName("sent_at").HasColumnType("datetime2");
            e.Property(x => x.AcceptedAt).HasColumnName("accepted_at").HasColumnType("datetime2");
            e.HasOne(x => x.Booking).WithMany().HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Tour>().WithMany().HasForeignKey(x => x.TourId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.BookingId, x.Version }).IsUnique();
        });
    }
}
