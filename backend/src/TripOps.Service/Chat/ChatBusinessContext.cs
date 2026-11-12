using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;
using TripOps.Service.Tours;

namespace TripOps.Service.Chat;

public sealed partial class ChatService
{
    public async Task<TourDto> TourFromMessage(string actor, int conversationId, int messageId, TourService tours, CancellationToken ct)
    {
        await Access(actor, conversationId, ct);
        var data = await Db.ChatMessages.AsNoTracking().Where(m => m.Id == messageId && m.ConversationId == conversationId && m.IsDeleted != true)
            .Select(m => m.ContextData).SingleOrDefaultAsync(ct);
        var card = ReadContext(data);
        if (card?.Kind != "tour") throw new AccountException(404, "Tin nhắn không có thông tin tour.");
        var tour = await Db.Tours.AsNoTracking().SingleOrDefaultAsync(t => t.Id == card.Id, ct)
            ?? throw new AccountException(404, "Tour không còn khả dụng.");
        if (!tour.DesignRequestId.HasValue) {
            var detail = await tours.PublicGet(tour.Id, ct);
            return new(tour.Id, tour.AgencyId, tour.Code, "completed", "public", false, tour.IsAiGenerated == true,
                detail.Version, detail.Configuration, tour.CreatedAt ?? DateTime.UnixEpoch, tour.UpdatedAt ?? DateTime.UnixEpoch, Agency: detail.Agency);
        }
        var request = await Db.TourDesignRequests.AsNoTracking().SingleAsync(r => r.Id == tour.DesignRequestId, ct);
        var version = card.Version ?? tour.SharedVersion;
        var admin = await Db.Users.AnyAsync(u => u.Id == actor && u.Role == UserRole.Admin, ct);
        if (request.CustomerId == actor) {
            if (!version.HasValue || version != tour.SharedVersion)
                throw new AccountException(403, "Phiên bản này không còn được Agency chia sẻ. Vui lòng xem phương án hiện tại trong yêu cầu thiết kế.");
        } else if (!admin && tour.AgencyId != actor && !await Db.TourVersionAgencies.AnyAsync(a => a.AgencyId == actor && a.Status == "accepted" &&
            a.TourVersion.TourId == tour.Id && a.TourVersion.VersionNumber == version, ct))
            throw new AccountException(403, "Bạn không có quyền xem phiên bản tour này.");
        var saved = await Db.TourVersions.AsNoTracking().SingleOrDefaultAsync(v => v.TourId == tour.Id && v.VersionNumber == version, ct)
            ?? throw new AccountException(404, "Phiên bản tour không còn khả dụng.");
        var snapshot = JsonSerializer.Deserialize<TourSnapshot>(saved.SnapshotData, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new AccountException(404, "Không đọc được thông tin tour.");
        var agency = await Db.Users.Where(u => u.Id == tour.AgencyId).Select(u => new TourAgencyContact(u.Id,
            u.BusinessProfile != null ? u.BusinessProfile.BusinessName ?? u.Name : u.Name,
            u.BusinessProfile != null ? u.BusinessProfile.LogoUrl ?? u.Avatar : u.Avatar, u.Phone, u.Email)).SingleAsync(ct);
        return new(tour.Id, tour.AgencyId, tour.Code, "completed", "hidden", true, tour.IsAiGenerated == true,
            saved.VersionNumber, DesignRequestService.CustomerConfiguration(snapshot.Configuration), tour.CreatedAt ?? DateTime.UnixEpoch,
            saved.CreatedAt ?? DateTime.UnixEpoch, tour.DesignRequestId, tour.SharedVersion, tour.Revision, Agency: agency);
    }
    static ChatContextDto? ReadContext(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<ChatContextDto>(json); }
        catch (JsonException) { return null; }
    }

    static string? FirstImage(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<string[]>(json)?.FirstOrDefault(); }
        catch (JsonException) { return null; }
    }

    async Task<bool> BookingContextAccess(string userId, int id, CancellationToken ct) =>
        await Db.Users.AnyAsync(u => u.Id == userId && u.Role == UserRole.Admin, ct) ||
        await Db.Bookings.AnyAsync(b => b.Id == id && (b.CustomerId == userId || b.Tour!.AgencyId == userId ||
            b.BookingAgencies.Any(a => a.AgencyId == userId) || b.AssignedGuides.Any(g => g.GuideId == userId)), ct) ||
        await Db.BookingSupplierRequests.AnyAsync(r => r.BookingId == id && r.ProviderId == userId, ct);

    async Task<bool> DesignContextAccess(string userId, int id, CancellationToken ct) =>
        await Db.Users.AnyAsync(u => u.Id == userId && u.Role == UserRole.Admin, ct) ||
        await Db.TourDesignRequests.AnyAsync(r => r.Id == id && (r.CustomerId == userId || r.AgencyId == userId), ct) ||
        await Db.TourDesignRequestAgencies.AnyAsync(a => a.TourDesignRequestId == id && a.AgencyId == userId &&
            (a.Status == "accepted" || a.Status == "pending"), ct);

    async Task<ChatContextDto> ResolveContext(string actor, string recipient, ChatContextInput context, CancellationToken ct)
    {
        if (context.Id <= 0 || context.Version is <= 0) throw new AccountException(400, "Thông tin đính kèm không hợp lệ.");
        if (context.Kind == "booking")
        {
            if (!await BookingContextAccess(actor, context.Id, ct) || !await BookingContextAccess(recipient, context.Id, ct))
                throw new AccountException(403, "Chỉ chia sẻ booking với người tham gia booking đó.");
            var booking = await Db.Bookings.AsNoTracking().Include(b => b.Tour).SingleAsync(b => b.Id == context.Id, ct);
            return new("booking", booking.Id, $"Booking {booking.BookingCode}", FirstImage(booking.Tour?.ThumbnailUrls) ?? FirstImage(booking.Tour?.Images), booking.Tour?.Name);
        }
        if (context.Kind == "design-request")
        {
            if (!await DesignContextAccess(actor, context.Id, ct) || !await DesignContextAccess(recipient, context.Id, ct))
                throw new AccountException(403, "Người nhận không thuộc yêu cầu thiết kế này.");
            var request = await Db.TourDesignRequests.AsNoTracking().SingleAsync(r => r.Id == context.Id, ct);
            return new("design-request", request.Id, $"Yêu cầu thiết kế #{request.Id}", Subtitle: request.Destination);
        }
        if (context.Kind == "service")
        {
            var service = await Db.Services.AsNoTracking().SingleOrDefaultAsync(s => s.Id == context.Id, ct)
                ?? throw new AccountException(404, "Không tìm thấy bài đăng dịch vụ.");
            var admin = await Db.Users.AnyAsync(u => (u.Id == actor || u.Id == recipient) && u.Role == UserRole.Admin, ct);
            if (!admin && service.ProviderId != actor && service.ProviderId != recipient)
                throw new AccountException(403, "Hãy trao đổi về dịch vụ với đúng nhà cung cấp.");
            return new("service", service.Id, service.Name, service.ThumbnailUrl ?? FirstImage(service.Images), service.Province);
        }
        if (context.Kind == "tour")
        {
            var tour = await Db.Tours.AsNoTracking().SingleOrDefaultAsync(t => t.Id == context.Id && t.Status != TourStatus.Deleted, ct)
                ?? throw new AccountException(404, "Không tìm thấy tour.");
            if (tour.DesignRequestId.HasValue)
            {
                var requestId = tour.DesignRequestId.Value;
                if (!await DesignContextAccess(actor, requestId, ct) || !await DesignContextAccess(recipient, requestId, ct))
                    throw new AccountException(403, "Người nhận không thuộc yêu cầu thiết kế của tour.");
                var version = context.Version ?? tour.SharedVersion ?? tour.Version;
                var customerInConversation = await Db.TourDesignRequests.AnyAsync(r => r.Id == requestId && (r.CustomerId == actor || r.CustomerId == recipient), ct);
                if (customerInConversation && version != tour.SharedVersion)
                    throw new AccountException(403, "Chỉ chia sẻ phiên bản tour đang hiển thị cho khách.");
                var snapshot = await Db.TourVersions.Where(v => v.TourId == tour.Id && v.VersionNumber == version).Select(v => v.SnapshotData).SingleOrDefaultAsync(ct)
                    ?? throw new AccountException(404, "Không tìm thấy phiên bản tour.");
                using var doc = JsonDocument.Parse(snapshot);
                var config = doc.RootElement.GetProperty("configuration");
                var title = (config.TryGetProperty("name", out var name) ? name.GetString() : null) ?? tour.Name ?? "Tour riêng";
                var image = config.TryGetProperty("images", out var images) ? FirstImage(images.GetRawText()) : null;
                return new("tour", tour.Id, title, image, tour.Destination, version);
            }
            if (tour.Visibility != TourVisibility.Public || tour.Status != TourStatus.Completed)
                throw new AccountException(403, "Tour chưa mở bán công khai.");
            return new("tour", tour.Id, tour.Name ?? "Tour du lịch", FirstImage(tour.ThumbnailUrls) ?? FirstImage(tour.Images), tour.Destination);
        }
        throw new AccountException(400, "Chỉ đính kèm tour, dịch vụ, booking hoặc yêu cầu thiết kế.");
    }
}
