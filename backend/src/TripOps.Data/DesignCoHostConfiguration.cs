using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
namespace TripOps.Data;

internal static class DesignCoHostConfiguration
{
    internal static void Configure(ModelBuilder model)
    {
        model.Entity<TourDesignRequest>().Property(x=>x.ClosedAt).HasColumnName("closed_at");
        model.Entity<TourDesignRequest>().Property(x=>x.CloseReason).HasColumnName("close_reason").HasMaxLength(2000);
        model.Entity<TourDesignRequestAgency>().Property(x=>x.ArchivedAt).HasColumnName("archived_at");
        model.Entity<TourVersionAgency>(e => {
            e.ToTable("tour_version_agencies"); e.HasKey(x=>x.Id);
            e.Property(x=>x.Id).HasColumnName("id").UseIdentityColumn();
            e.Property(x=>x.TourVersionId).HasColumnName("tour_version_id");
            e.Property(x=>x.AgencyId).HasColumnName("agency_id").HasMaxLength(36);
            e.Property(x=>x.IsHost).HasColumnName("is_host");
            e.Property(x=>x.Status).HasColumnName("status").HasColumnType("varchar(20)").IsConcurrencyToken();
            e.Property(x=>x.StageArea).HasColumnName("stage_area").HasMaxLength(255);
            e.Property(x=>x.SuggestedBudget).HasColumnName("suggested_budget").HasPrecision(12,2);
            e.Property(x=>x.CommunicationNotes).HasColumnName("communication_notes").HasColumnType("nvarchar(max)");
            e.Property(x=>x.AssignedAt).HasColumnName("assigned_at");
            e.Property(x=>x.RespondedAt).HasColumnName("responded_at");
            e.HasIndex(x=>new{x.TourVersionId,x.AgencyId}).IsUnique();
            e.HasOne(x=>x.TourVersion).WithMany().HasForeignKey(x=>x.TourVersionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x=>x.Agency).WithMany().HasForeignKey(x=>x.AgencyId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<TourDesignRequestAgency>(e => {
            e.ToTable("tour_design_request_agencies");
            e.HasKey(x => x.Id); e.Property(x => x.Id).HasColumnName("id").UseIdentityColumn();
            e.Property(x => x.TourDesignRequestId).HasColumnName("request_id");
            e.Property(x => x.AgencyId).HasColumnName("agency_id").HasColumnType("nvarchar(36)").HasMaxLength(36);
            e.Property(x => x.StageArea).HasColumnName("stage_area").HasMaxLength(255);
            e.Property(x => x.IsHost).HasColumnName("is_host");
            e.Property(x => x.SuggestedBudget).HasColumnName("suggested_budget").HasPrecision(12,2);
            e.Property(x => x.CommunicationNotes).HasColumnName("communication_notes").HasColumnType("nvarchar(max)");
            e.Property(x => x.Status).HasColumnName("status").HasColumnType("varchar(20)").IsConcurrencyToken();
            e.Property(x => x.AssignedAt).HasColumnName("assigned_at");
            e.Property(x => x.RespondedAt).HasColumnName("responded_at");
            e.HasIndex(x => new {x.TourDesignRequestId,x.AgencyId}).IsUnique();
            e.HasOne(x => x.TourDesignRequest).WithMany().HasForeignKey(x => x.TourDesignRequestId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Agency).WithMany().HasForeignKey(x => x.AgencyId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
