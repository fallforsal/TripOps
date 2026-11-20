using System.Data;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;

namespace TripOps.Service.Chat;

public sealed partial class ChatService(TripOpsDbContext db, IChatEvents events)
{
    private TripOpsDbContext Db => db;
    private ChatContactPolicy Policy => new(db);
    static MessageDto Dto(ChatMessage m) => new(m.Id, m.ConversationId, m.SenderId, m.Content, m.CreatedAt, m.ReadAt, m.ClientMessageId, ReadContext(m.ContextData));
    public async Task Active(string actor, CancellationToken ct) {
        if (!await db.Users.AnyAsync(u => u.Id == actor && u.Status == UserStatus.Active, ct))
            throw new AccountException(403, "Tài khoản không được phép chat.");
    }
    public async Task<ChatConversation> Access(string actor, int id, CancellationToken ct) {
        await Active(actor, ct);
        var c = await db.ChatConversations.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id && (c.UserOneId == actor || c.UserTwoId == actor), ct)
            ?? throw new AccountException(404, "Không tìm thấy cuộc hội thoại.");
        var other = c.UserOneId == actor ? c.UserTwoId : c.UserOneId;
        if (!await (await Policy.Allowed(actor, ct)).AnyAsync(u => u.Id == other, ct)) throw new AccountException(403, "Không có quyền liên hệ tài khoản này.");
        return c;
    }
    public async Task<List<ConversationDto>> List(string actor, CancellationToken ct) {
        var allowed = (await Policy.Allowed(actor, ct)).Select(u => u.Id);
        var rows = await db.ChatConversations.AsNoTracking()
            .Where(c => c.UserOneId == actor && allowed.Contains(c.UserTwoId) || c.UserTwoId == actor && allowed.Contains(c.UserOneId))
            .Where(c => c.Messages.Any(m => m.IsDeleted != true))
            .OrderByDescending(c => c.LastMessageAt).ThenByDescending(c => c.Id)
            .Select(c => new { c.Id,
                Contact = new ChatContact(c.UserOneId == actor ? c.UserTwoId : c.UserOneId,
                    c.UserOneId == actor ? c.UserTwo.Name : c.UserOne.Name,
                    c.UserOneId == actor ? c.UserTwo.BusinessProfile!.BusinessName : c.UserOne.BusinessProfile!.BusinessName,
                    c.UserOneId == actor ? c.UserTwo.Role.ToString() : c.UserOne.Role.ToString(),
                    c.UserOneId == actor ? c.UserTwo.BusinessProfile!.LogoUrl ?? c.UserTwo.Avatar : c.UserOne.BusinessProfile!.LogoUrl ?? c.UserOne.Avatar),
                Last = c.Messages.Where(m => m.IsDeleted != true).OrderByDescending(m => m.Id).FirstOrDefault(),
                Unread = c.Messages.Count(m => m.SenderId != actor && m.IsRead != true && m.IsDeleted != true) }).ToListAsync(ct);
        return rows.Select(c => new ConversationDto(c.Id, c.Contact, c.Last == null ? null : Dto(c.Last), c.Unread)).ToList();
    }
    public async Task<ChatContact> Contact(string actor, int id, CancellationToken ct) {
        var conversation = await Access(actor, id, ct);
        var other = conversation.UserOneId == actor ? conversation.UserTwoId : conversation.UserOneId;
        return await db.Users.AsNoTracking().Where(u => u.Id == other).Select(u => new ChatContact(u.Id, u.Name,
            u.BusinessProfile != null ? u.BusinessProfile.BusinessName : null, u.Role.ToString(),
            u.BusinessProfile != null ? u.BusinessProfile.LogoUrl ?? u.Avatar : u.Avatar)).SingleAsync(ct);
    }
    public async Task<int> Create(string actor, string userId, CancellationToken ct) {
        await Active(actor, ct);
        // Use the actual stored ID, not client casing, to form the canonical pair.
        var target = await (await Policy.Allowed(actor, ct)).Where(u => u.Id == userId).Select(u => u.Id).SingleOrDefaultAsync(ct)
            ?? throw new AccountException(403, "Không có quyền liên hệ tài khoản này.");
        var one = string.CompareOrdinal(actor, target) < 0 ? actor : target;
        var two = one == actor ? target : actor;
        var existing = await db.ChatConversations.SingleOrDefaultAsync(c => c.UserOneId == one && c.UserTwoId == two || c.UserOneId == two && c.UserTwoId == one, ct);
        if (existing != null) return existing.Id;
        var conversation = new ChatConversation { UserOneId = one, UserTwoId = two };
        db.ChatConversations.Add(conversation);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) {
            db.Entry(conversation).State = EntityState.Detached;
            existing = await db.ChatConversations.SingleOrDefaultAsync(c => c.UserOneId == one && c.UserTwoId == two || c.UserOneId == two && c.UserTwoId == one, ct);
            if (existing == null) throw;
            return existing.Id;
        }
        await events.Updated([one, two], conversation.Id);
        return conversation.Id;
    }
    public async Task<MessagePage> History(string actor, int id, int? cursor, int limit, CancellationToken ct) {
        await Access(actor, id, ct);
        limit = Math.Clamp(limit, 1, 100);
        var rows = await db.ChatMessages.AsNoTracking().Where(m => m.ConversationId == id && m.IsDeleted != true && (!cursor.HasValue || m.Id < cursor.Value))
            .OrderByDescending(m => m.Id).Take(limit + 1).ToListAsync(ct);
        var more = rows.Count > limit;
        var items = rows.Take(limit).Reverse().Select(Dto).ToList();
        return new(items, more ? items[0].Id : null);
    }
    public async Task<MessageDto> Send(string actor, int id, string? content, Guid clientMessageId, CancellationToken ct, ChatContextInput? context = null) {
        var c = await Access(actor, id, ct);
        content = content?.Trim();
        if ((string.IsNullOrEmpty(content) && context == null) || content?.Length > 2000 || clientMessageId == Guid.Empty)
            throw new AccountException(400, "Tin nhắn cần 1–2000 ký tự và clientMessageId hợp lệ.");
        // Lock the conversation before testing the idempotency key and inserting. This also serializes preview updates.
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await db.ChatConversations.Where(x => x.Id == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.UpdatedAt, x => x.UpdatedAt), ct);
        var message = await db.ChatMessages.AsNoTracking().SingleOrDefaultAsync(m => m.ConversationId == id && m.SenderId == actor && m.ClientMessageId == clientMessageId, ct);
        if (message == null) {
            var other = c.UserOneId == actor ? c.UserTwoId : c.UserOneId;
            var card = context == null ? null : await ResolveContext(actor, other, context, ct);
            message = new ChatMessage { ConversationId = id, SenderId = actor, Content = content ?? "",
                ClientMessageId = clientMessageId, ContentType = card == null ? "text" : "context",
                ContextData = card == null ? null : System.Text.Json.JsonSerializer.Serialize(card) };
            db.ChatMessages.Add(message);
            await db.SaveChangesAsync(ct);
            await db.ChatConversations.Where(x => x.Id == id).ExecuteUpdateAsync(s => s
                .SetProperty(x => x.LastMessageContent, string.IsNullOrEmpty(content) ? card!.Title : content).SetProperty(x => x.LastMessageSenderId, actor)
                .SetProperty(x => x.LastMessageAt, message.CreatedAt), ct);
        } else if (message.Content != (content ?? "") || ReadContext(message.ContextData)?.Kind != context?.Kind || ReadContext(message.ContextData)?.Id != context?.Id || context?.Version != null && ReadContext(message.ContextData)?.Version != context.Version) throw new AccountException(409, "Mã tin nhắn đã được dùng cho nội dung khác.");
        await tx.CommitAsync(ct);
        var dto = Dto(message);
        await events.Message([c.UserOneId, c.UserTwoId], dto);
        return dto;
    }
    public async Task<ReadDto> MarkRead(string actor, int id, int? throughMessageId, CancellationToken ct) {
        var c = await Access(actor, id, ct);
        var through = throughMessageId ?? await db.ChatMessages.Where(m => m.ConversationId == id).MaxAsync(m => (int?)m.Id, ct) ?? 0;
        var now = DateTime.UtcNow;
        await db.ChatMessages.Where(m => m.ConversationId == id && m.Id <= through && m.SenderId != actor && m.IsRead != true)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true).SetProperty(m => m.ReadAt, now), ct);
        var receipt = new ReadDto(id, actor, through, now);
        await events.Read([c.UserOneId, c.UserTwoId], receipt);
        return receipt;
    }
}
