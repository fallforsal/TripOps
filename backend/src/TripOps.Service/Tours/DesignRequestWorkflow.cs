using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Service.Tours;

public sealed partial class DesignRequestService
{
    public sealed record PlanAgreement(int TourId, int Version);
    public sealed record PlanHistory(int TourId, int Version, string? ChangeNote, string? CreatedBy,
        DateTime? CreatedAt, int? NumberOfGuests, TourConfiguration Configuration);
    internal static TourConfiguration CustomerConfiguration(TourConfiguration c) => c with {
        Timelines = c.Timelines?.Select(d => d with {
            Meals = d.Meals?.Select(m => m with { Supplier = null, AgencySupplierId = null }).ToArray(),
            Accommodations = d.Accommodations?.Select(h => h with { Supplier = null, AgencySupplierId = null }).ToArray()
        }).ToArray()
    };
    public async Task<IReadOnlyList<PlanHistory>> History(string actor, int id, bool agency, CancellationToken ct)
    {
        var request = await db.TourDesignRequests.AsNoTracking().SingleOrDefaultAsync(r => r.Id == id &&
            (agency ? r.AgencyId == actor : r.CustomerId == actor), ct) ?? throw new TourException(404, "Không tìm thấy yêu cầu.");
        var rows = await db.TourVersions.AsNoTracking().Where(v => v.Tour.DesignRequestId == id && v.SharedToCustomer)
            .OrderByDescending(v => v.CreatedAt).ToListAsync(ct);
        return rows.Select(v => {
            var snapshot = JsonSerializer.Deserialize<TourSnapshot>(v.SnapshotData, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            return new PlanHistory(v.TourId, v.VersionNumber, v.ChangeLog, v.CreatedBy, v.CreatedAt,
                v.NumberOfGuests, agency ? snapshot.Configuration : CustomerConfiguration(snapshot.Configuration));
        }).ToArray();
    }
    public async Task Agree(string actor, int id, PlanAgreement input, CancellationToken ct)
    {
        await Customer(actor, ct);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.TourDesignRequests.Where(r => r.Id == id).ExecuteUpdateAsync(s => s.SetProperty(r => r.Revision, r => r.Revision + 1), ct);
        var request = await db.TourDesignRequests.SingleOrDefaultAsync(r => r.Id == id && r.CustomerId == actor, ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu.");
        Require(request.Status is not (CustomRequestStatus.Cancelled or CustomRequestStatus.Rejected), "Yêu cầu đã đóng.");
        Require(await db.Tours.AnyAsync(t => t.Id == input.TourId && t.DesignRequestId == id &&
            t.Version == input.Version && t.IsSharedToCustomer == true && t.Status == TourStatus.Completed, ct), "Plan đã thay đổi; vui lòng tải lại.");
        Require(!await db.TourPlanProposals.AnyAsync(p => p.RequestId == id && p.Status == "Pending", ct), "Agency cần xử lý các yêu cầu chỉnh sửa trước.");
        if (request.AgreedTourId == input.TourId && request.AgreedTourVersion == input.Version)
        { await tx.CommitAsync(ct); return; }
        request.AgreedTourId = input.TourId; request.AgreedTourVersion = input.Version; request.AgreedAt = DateTime.UtcNow;
        // Only accommodation and meal providers participate in this workflow.
        var hotelIds = await db.TourAccommodations.Where(h => h.TourId == input.TourId && h.IsDefault == true && h.ServiceId.HasValue)
            .Select(h => h.ServiceId!.Value).ToArrayAsync(ct);
        var mealIds = await db.TourMeals.Where(m => m.TourTimeline.TourId == input.TourId && m.IsDefault && m.ServiceId.HasValue)
            .Select(m => m.ServiceId!.Value).ToArrayAsync(ct);
        var selectedIds = hotelIds.Concat(mealIds).Distinct().ToArray();
        var selectedServices = await db.Services.AsNoTracking().Where(service => selectedIds.Contains(service.Id))
            .Select(service => new { service.ProviderId, service.Name }).ToListAsync(ct);
        foreach (var provider in selectedServices.GroupBy(service => service.ProviderId))
        {
            var names = string.Join(", ", provider.Select(service => service.Name).Distinct());
            var message = $"Khách đã chốt phương án yêu cầu #{id}: {request.NumberOfGuests} khách, ngày {request.StartDate:dd/MM/yyyy}. Dịch vụ: {names}. Agency sẽ liên hệ xác nhận và báo giá.";
            db.WorkflowNotifications.Add(new WorkflowNotification { UserId = provider.Key, RequestId = id, Message = message.Length > 1000 ? message[..1000] : message });
        }
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = request.AgencyId!, RequestId = id, Message = "Khách đồng ý phương án sơ bộ, yêu cầu báo giá chính thức." });
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
    public sealed record RequestMessage(string Actor, string Message, DateTime At);
    public sealed record SendRequestMessage(string Message);
    public async Task<IReadOnlyList<RequestMessage>> Messages(string actor, int id, CancellationToken ct)
    {
        var r = await db.TourDesignRequests.AsNoTracking().Include(r => r.RequestAgencies).SingleOrDefaultAsync(r => r.Id == id && (r.CustomerId == actor || r.AgencyId == actor), ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu.");
        var text = r.RequestAgencies.FirstOrDefault(a => a.IsHost == true)?.CommunicationNotes;
        if (string.IsNullOrWhiteSpace(text)) return [];
        try { return JsonSerializer.Deserialize<List<RequestMessage>>(text) ?? []; }
        catch (JsonException) { return [new(r.AgencyId!, text, r.CreatedAt ?? DateTime.UnixEpoch)]; }
    }
    public async Task SendMessage(string actor, int id, SendRequestMessage input, CancellationToken ct)
    {
        Require(!string.IsNullOrWhiteSpace(input.Message) && input.Message.Length <= 2000, "Nội dung trao đổi cần từ 1 đến 2000 ký tự.");
        var r = await db.TourDesignRequests.Include(r => r.RequestAgencies).SingleOrDefaultAsync(r => r.Id == id && (r.CustomerId == actor || r.AgencyId == actor), ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu.");
        Require(r.Status is not (CustomRequestStatus.Cancelled or CustomRequestStatus.Rejected), "Yêu cầu đã đóng.");
        var messages = (await Messages(actor, id, ct)).ToList();
        messages.Add(new(actor, input.Message.Trim(), DateTime.UtcNow));
        var host = r.RequestAgencies.First(a => a.IsHost == true);
        host.CommunicationNotes = JsonSerializer.Serialize(messages); r.Revision++;
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = actor == r.CustomerId ? r.AgencyId! : r.CustomerId!, RequestId = id, Message = "Có trao đổi mới trong yêu cầu thiết kế Tour." });
        await db.SaveChangesAsync(ct);
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
