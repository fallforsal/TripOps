using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
namespace TripOps.Data;

public static class BookingFinancialChangeConfiguration
{
    public static void ConfigureBookingFinancialChanges(this ModelBuilder model)
    {
        model.Entity<PaymentRequest>().Property(p=>p.CreditAmount).HasColumnName("credit_amount").HasColumnType("decimal(19,2)").HasDefaultValue(0m);
        model.Entity<BookingFinancialChange>(e=>{
            e.ToTable("booking_financial_changes");e.HasKey(x=>x.Id);
            e.Property(x=>x.Id).HasColumnName("id");e.Property(x=>x.BookingId).HasColumnName("booking_id");
            e.Property(x=>x.AgencyId).HasColumnName("agency_id").HasMaxLength(36);
            e.Property(x=>x.RequestedBy).HasColumnName("requested_by").HasMaxLength(36);
            e.Property(x=>x.RequestKey).HasColumnName("request_key");
            e.Property(x=>x.Amount).HasColumnName("amount").HasColumnType("decimal(19,2)");
            e.Property(x=>x.Reason).HasColumnName("reason").HasMaxLength(240);
            e.Property(x=>x.Status).HasColumnName("status").HasMaxLength(20).IsConcurrencyToken();
            e.Property(x=>x.CreatedAt).HasColumnName("created_at");e.Property(x=>x.ReviewedAt).HasColumnName("reviewed_at");
            e.Property(x=>x.ReviewedBy).HasColumnName("reviewed_by").HasMaxLength(36);
            e.Property(x=>x.ReviewNote).HasColumnName("review_note").HasMaxLength(240);
            e.Property(x=>x.RefundRequestId).HasColumnName("refund_request_id");
            e.HasIndex(x=>new{x.BookingId,x.RequestKey}).IsUnique();
            e.HasOne<BookingAgency>().WithMany().HasForeignKey(x=>new{x.BookingId,x.AgencyId}).HasPrincipalKey(x=>new{x.BookingId,x.AgencyId}).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x=>x.RequestedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x=>x.RefundRequest).WithMany().HasForeignKey(x=>x.RefundRequestId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
