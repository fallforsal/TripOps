using System.Data;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;

namespace TripOps.Service.Chat;

public sealed class ChatService(TripOpsDbContext db, IChatEvents events)
{
    static MessageDto Dto(ChatMessage m) => new(m.Id, m.ConversationId, m.SenderId, m.Content, m.CreatedAt, m.ReadAt, m.ClientMessageId);
    public async Task Active(string actor, CancellationToken ct) {
        if (!await db.Users.AnyAsync(u => u.Id == actor && u.Status == UserStatus.Active, ct))
            throw new AccountException(403, "Tài khoản không được phép chat.");
    }
    private IQueryable<User> AvailableContacts(string actor) =>
        db.Users.Where(user => user.Id != actor && user.Status == UserStatus.Active);

    public async Task<List<ChatContact>> Contacts(string actor, CancellationToken ct) {
        await Active(actor, ct);
        return await AvailableContacts(actor).OrderBy(u => u.Name).Select(u => new ChatContact(u.Id, u.Name)).ToListAsync(ct);
    }
    public async Task<ChatConversation> Access(string actor, int id, CancellationToken ct) {
        await Active(actor, ct);
        var c = await db.ChatConversations.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id && (c.UserOneId == actor || c.UserTwoId == actor), ct)
            ?? throw new AccountException(404, "Không tìm thấy cuộc hội thoại.");
        var other = c.UserOneId == actor ? c.UserTwoId : c.UserOneId;
        if (!await AvailableContacts(actor).AnyAsync(u => u.Id == other, ct)) throw new AccountException(403, "Không có quyền liên hệ tài khoản này.");
        return c;
    }
    public async Task<List<ConversationDto>> List(string actor, CancellationToken ct) {
        await Active(actor, ct);
        var allowed = AvailableContacts(actor).Select(u => u.Id);
        return await db.ChatConversations.AsNoTracking()
            .Where(c => c.UserOneId == actor && allowed.Contains(c.UserTwoId) || c.UserTwoId == actor && allowed.Contains(c.UserOneId))
            .OrderByDescending(c => c.LastMessageAt).ThenByDescending(c => c.Id)
            .Select(c => new ConversationDto(c.Id,
                new ChatContact(c.UserOneId == actor ? c.UserTwoId : c.UserOneId, c.UserOneId == actor ? c.UserTwo.Name : c.UserOne.Name),
                c.Messages.OrderByDescending(m => m.Id).Select(m => new MessageDto(m.Id, m.ConversationId, m.SenderId, m.Content, m.CreatedAt, m.ReadAt, m.ClientMessageId)).FirstOrDefault(),
                c.Messages.Count(m => m.SenderId != actor && m.IsRead != true))).ToListAsync(ct);
    }
    public async Task<int> Create(string actor, string userId, CancellationToken ct) {
        await Active(actor, ct);
        // Use the actual stored ID, not client casing, to form the canonical pair.
        var target = await AvailableContacts(actor).Where(u => u.Id == userId).Select(u => u.Id).SingleOrDefaultAsync(ct)
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
        var rows = await db.ChatMessages.AsNoTracking().Where(m => m.ConversationId == id && (!cursor.HasValue || m.Id < cursor.Value))
            .OrderByDescending(m => m.Id).Take(limit + 1).ToListAsync(ct);
        var more = rows.Count > limit;
        var items = rows.Take(limit).Reverse().Select(Dto).ToList();
        return new(items, more ? items[0].Id : null);
    }
    public async Task<MessageDto> Send(string actor, int id, string? content, Guid clientMessageId, CancellationToken ct) {
        var c = await Access(actor, id, ct);
        content = content?.Trim();
        if (string.IsNullOrEmpty(content) || content.Length > 2000 || clientMessageId == Guid.Empty)
            throw new AccountException(400, "Tin nhắn cần 1–2000 ký tự và clientMessageId hợp lệ.");
        // Lock the conversation before testing the idempotency key and inserting. This also serializes preview updates.
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await db.ChatConversations.Where(x => x.Id == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.UpdatedAt, x => x.UpdatedAt), ct);
        var message = await db.ChatMessages.AsNoTracking().SingleOrDefaultAsync(m => m.ConversationId == id && m.SenderId == actor && m.ClientMessageId == clientMessageId, ct);
        if (message == null) {
            message = new ChatMessage { ConversationId = id, SenderId = actor, Content = content, ClientMessageId = clientMessageId };
            db.ChatMessages.Add(message);
            await db.SaveChangesAsync(ct);
            await db.ChatConversations.Where(x => x.Id == id).ExecuteUpdateAsync(s => s
                .SetProperty(x => x.LastMessageContent, content).SetProperty(x => x.LastMessageSenderId, actor)
                .SetProperty(x => x.LastMessageAt, message.CreatedAt), ct);
        } else if (message.Content != content) throw new AccountException(409, "Mã tin nhắn đã được dùng cho nội dung khác.");
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
