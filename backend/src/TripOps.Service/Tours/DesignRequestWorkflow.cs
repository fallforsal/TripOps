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
    public sealed record RequestMessage(string Actor, string Message, DateTime At, string? SenderName = null, bool Mine = false);
    public sealed record SendRequestMessage(string Message);
    public async Task<IReadOnlyList<RequestMessage>> Messages(string actor, int id, CancellationToken ct)
    {
        _ = await db.TourDesignRequests.AsNoTracking().SingleOrDefaultAsync(r => r.Id == id && (r.CustomerId == actor || r.AgencyId == actor), ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu.");
        await db.ChatMessages.Where(m => m.DesignRequestId == id && m.SenderId != actor && m.IsRead != true)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true).SetProperty(m => m.ReadAt, DateTime.UtcNow), ct);
        var rows = await db.ChatMessages.AsNoTracking().Where(m => m.DesignRequestId == id && m.IsDeleted != true)
            .OrderByDescending(m => m.Id).Take(200).Select(m => new { m.Id, m.SenderId, m.Content, m.CreatedAt, m.Sender.Name }).ToListAsync(ct);
        return rows.OrderBy(m => m.Id).Select(m => new RequestMessage(m.SenderId, m.Content, m.CreatedAt ?? DateTime.UnixEpoch, m.Name, m.SenderId == actor)).ToArray();
    }
    public async Task SendMessage(string actor, int id, SendRequestMessage input, CancellationToken ct)
    {
        Require(!string.IsNullOrWhiteSpace(input.Message) && input.Message.Trim().Length <= 2000, "Nội dung trao đổi cần từ 1 đến 2000 ký tự.");
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.TourDesignRequests.Where(r => r.Id == id && (r.CustomerId == actor || r.AgencyId == actor))
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Revision, r => r.Revision + 1), ct);
        var r = await db.TourDesignRequests.SingleOrDefaultAsync(r => r.Id == id && (r.CustomerId == actor || r.AgencyId == actor), ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu.");
        Require(r.Status is not (CustomRequestStatus.Cancelled or CustomRequestStatus.Rejected or CustomRequestStatus.Closed), "Yêu cầu đã đóng.");
        Require(r.Status != CustomRequestStatus.Booked || await db.Bookings.AnyAsync(b=>b.DesignRequestId==id && b.Status!=BookingStatus.Cancelled && b.Status!=BookingStatus.Rejected,ct), "Yêu cầu đã đóng. Hãy liên hệ Agency để mở lại.");
        var pair = new[] { r.CustomerId!, r.AgencyId! }.OrderBy(x => x, StringComparer.Ordinal).ToArray();
        var conversation = await db.ChatConversations.SingleOrDefaultAsync(c => c.UserOneId == pair[0] && c.UserTwoId == pair[1], ct);
        if (conversation == null) {
            conversation = new ChatConversation { UserOneId = pair[0], UserTwoId = pair[1] };
            db.ChatConversations.Add(conversation);
        }
        var now = DateTime.UtcNow;
        conversation.LastMessageContent = input.Message.Trim(); conversation.LastMessageSenderId = actor;
        conversation.LastMessageAt = now; conversation.Status = "active";
        db.ChatMessages.Add(new ChatMessage { Conversation = conversation, SenderId = actor,
            DesignRequestId = id, Content = input.Message.Trim(), CreatedAt = now });
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = actor == r.CustomerId ? r.AgencyId! : r.CustomerId!, RequestId = id, Message = "Có trao đổi mới trong yêu cầu thiết kế tour." });
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
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
