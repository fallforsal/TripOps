using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
namespace TripOps.Data;

public static class BookingAllianceConfiguration
{
    public static void ConfigureBookingAlliance(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BookingAccommodation>().Property(e=>e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
        modelBuilder.Entity<BookingTimelineMeal>().Property(e=>e.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
        modelBuilder.Entity<PaymentRequest>().Property(e=>e.BeneficiaryAgencyId).HasColumnName("beneficiary_agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
        modelBuilder.Entity<BookingAccommodation>().HasOne<BookingAgency>().WithMany().HasForeignKey(e=>new {e.BookingId,e.AgencyId}).HasPrincipalKey(e=>new {e.BookingId,e.AgencyId}).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BookingTimelineMeal>().HasOne<User>().WithMany().HasForeignKey(e=>e.AgencyId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentRequest>().HasOne<BookingAgency>().WithMany().HasForeignKey(e=>new {e.BookingId,e.BeneficiaryAgencyId}).HasPrincipalKey(e=>new {e.BookingId,e.AgencyId}).OnDelete(DeleteBehavior.Restrict);
    }
}
