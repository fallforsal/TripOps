using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Service.Tours;

public sealed partial class DesignRequestService
{
    public sealed record PlanHistory(int TourId, int Version, string? ChangeNote, string? CreatedBy,
        DateTime? CreatedAt, int? NumberOfGuests, TourConfiguration Configuration, DateTime? SharedAt = null, int? RestoredFromVersion = null);
    internal static TourConfiguration CustomerConfiguration(TourConfiguration c) => c with {
        AgencyPricing = null,
        CoHosts = c.CoHosts?.Where(h => h.Status == "accepted").Select(h => h with {
            EstimatedBudgetPerGuest=null, QuoteAdult=null, QuoteChild=null, QuoteInfant=null, QuoteNote=null, Notes=null, RejectionReason=null
        }).ToArray(),
        Timelines = c.Timelines?.Select(d => d with {
            Meals = d.Meals?.Select(m => m with { Supplier = m.Supplier == null ? null : new SupplierSnapshotInput(Address: m.Supplier.Address, Area: m.Supplier.Area), AgencySupplierId = null }).ToArray(),
            Accommodations = d.Accommodations?.Select(h => h with { Supplier = h.Supplier == null ? null : new SupplierSnapshotInput(Address: h.Supplier.Address, Area: h.Supplier.Area), AgencySupplierId = null }).ToArray()
        }).ToArray()
    };
    public async Task<IReadOnlyList<PlanHistory>> History(string actor, int id, bool agency, CancellationToken ct)
    {
        if (!agency) throw new TourException(403,"Chỉ Agency được xem các phiên bản tour.");
        _ = await db.TourDesignRequests.AsNoTracking().SingleOrDefaultAsync(r => r.Id == id &&
            r.AgencyId == actor, ct) ?? throw new TourException(404, "Không tìm thấy yêu cầu.");
        var rows = await db.TourVersions.AsNoTracking().Where(v => v.Tour.DesignRequestId == id && (agency || v.SharedAt != null))
            .OrderByDescending(v => v.VersionNumber).ToListAsync(ct);
        return rows.Select(v => {
            var snapshot = JsonSerializer.Deserialize<TourSnapshot>(v.SnapshotData, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            return new PlanHistory(v.TourId, v.VersionNumber, v.ChangeLog, v.CreatedBy, v.CreatedAt,
                v.NumberOfGuests, agency ? snapshot.Configuration : CustomerConfiguration(snapshot.Configuration), v.SharedAt, v.RestoredFromVersion);
        }).ToArray();
    }
    public async Task<JsonElement?> InitialChanges(string actor, int id, CancellationToken ct)
    {
        var r = await db.TourDesignRequests.AsNoTracking().SingleOrDefaultAsync(r => r.Id == id && (r.CustomerId == actor || r.AgencyId == actor), ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu.");
        return r.InitialChangesJson == null ? null : JsonSerializer.Deserialize<JsonElement>(r.InitialChangesJson);
    }
    public async Task<JsonElement?> Source(string actor, int id, CancellationToken ct)
    {
        var r = await db.TourDesignRequests.AsNoTracking().SingleOrDefaultAsync(r => r.Id == id && (r.CustomerId == actor || r.AgencyId == actor), ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu.");
        return r.SourceSnapshotJson == null ? null : JsonSerializer.SerializeToElement(CustomerConfiguration(
            JsonSerializer.Deserialize<TourConfiguration>(r.SourceSnapshotJson, new JsonSerializerOptions(JsonSerializerDefaults.Web))!));
    }
}
