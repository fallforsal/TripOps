using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Service.Reviews;

/// <summary>Booking khách có thể đánh giá (đã hoàn thành, chưa đánh giá, còn trong hạn 7 ngày).</summary>
public sealed record ReviewableBookingDto(int BookingId, string BookingCode, int? TourId, string? TourName, string? AgencyName,
    DateTime StartDate, DateTime CompletedAt, DateTime Deadline);

public sealed record MyFeedbackDto(int Id, int BookingId, string BookingCode, int? TourId, string? TourName, string? AgencyName,
    int Rating, string? Comment, string? AgencyReply, DateTime? RepliedAt, DateTime CreatedAt);

public sealed record CreateFeedbackRequest(
    [Range(1, int.MaxValue)] int BookingId,
    [Range(1, 5)] int Rating,
    [StringLength(2000)] string? Comment);

public sealed record FeedbackReplyRequest([Required, StringLength(1000, MinimumLength = 2)] string Reply);

public sealed record PublicReviewDto(int Id, string CustomerName, int Rating, string? Comment, string? TourName,
    string? AgencyReply, DateTime? RepliedAt, DateTime CreatedAt);

/// <summary>Distribution[0] = số đánh giá 1★ … Distribution[4] = số đánh giá 5★.</summary>
public sealed record TourReviewsDto(int TourId, decimal Average, int Count, int[] Distribution, IReadOnlyList<PublicReviewDto> Reviews);

/// <summary>Score = điểm Agency đã điều chỉnh (dùng xếp hạng); Average = trung bình thật hiển thị cho khách.</summary>
public sealed record AgencyRatingDto(string AgencyId, decimal Score, decimal Average, int Count, int[] Distribution);

public sealed record AgencyFeedbackDto(int Id, int BookingId, string BookingCode, int? TourId, string? TourName, string CustomerName,
    int Rating, string? Comment, string? AgencyReply, DateTime? RepliedAt, DateTime CreatedAt);

public sealed record AgencyFeedbackOverviewDto(AgencyRatingDto Rating, IReadOnlyList<AgencyFeedbackDto> Items);

/// <summary>
/// Đánh giá chuyến đi: khách chấm sao cho TOUR (1–5) trong 7 ngày sau khi tour hoàn thành, mỗi booking một lần.
/// Sao của Agency không do khách chấm mà tính từ mọi đánh giá của mọi tour thuộc Agency (xem ReviewRules.BayesianScore).
/// Agency chủ trì được trả lời công khai dưới đánh giá.
/// </summary>
public sealed class FeedbackService(TripOpsDbContext db, PaymentClock clock)
{
    private static DateTime Utc(DateTime? value) => DateTime.SpecifyKind(value ?? DateTime.UnixEpoch, DateTimeKind.Utc);
    private static DateTime? UtcOrNull(DateTime? value) => value is null ? null : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);

    // ------------------------------------------------------------ Khách

    public async Task<IReadOnlyList<ReviewableBookingDto>> ReviewableBookings(string customerId, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var reviewed = await db.Feedbacks.AsNoTracking().Where(f => f.CustomerId == customerId).Select(f => f.BookingId).ToListAsync(ct);
        var bookings = await CompletedBookings(customerId, ct);
        return bookings
            .Where(b => !reviewed.Contains(b.Id))
            .Select(b => (Booking: b, Done: ReviewRules.CompletedAt(b)))
            .Where(x => x.Done is { } done && now <= done + ReviewRules.FeedbackWindow)
            .OrderByDescending(x => x.Done)
            .Select(x => new ReviewableBookingDto(x.Booking.Id, x.Booking.BookingCode, x.Booking.TourId, x.Booking.Tour?.Name,
                AgencyName(x.Booking), x.Booking.StartDate, x.Done!.Value, x.Done.Value + ReviewRules.FeedbackWindow))
            .ToList();
    }

    public async Task<IReadOnlyList<MyFeedbackDto>> Mine(string customerId, CancellationToken ct)
    {
        var rows = await db.Feedbacks.AsNoTracking()
            .Include(f => f.Booking).ThenInclude(b => b.Tour)
            .Include(f => f.Agency).ThenInclude(a => a.BusinessProfile)
            .Where(f => f.CustomerId == customerId)
            .OrderByDescending(f => f.CreatedAt).ToListAsync(ct);
        return rows.Select(Mine).ToList();
    }

    public async Task<MyFeedbackDto> Create(string customerId, CreateFeedbackRequest request, CancellationToken ct)
    {
        var booking = await db.Bookings
            .Include(b => b.BookingAgencies).Include(b => b.Tour)
            .SingleOrDefaultAsync(b => b.Id == request.BookingId && b.CustomerId == customerId, ct)
            ?? throw new BookingException(404, "Không tìm thấy booking.");
        var completedAt = ReviewRules.CompletedAt(booking)
            ?? throw new BookingException(409, "Chỉ đánh giá được chuyến đi đã hoàn thành.");
        if (clock.UtcNow > completedAt + ReviewRules.FeedbackWindow)
            throw new BookingException(409, "Đã quá hạn đánh giá (7 ngày sau khi tour kết thúc).");
        if (await db.Feedbacks.AnyAsync(f => f.BookingId == booking.Id, ct))
            throw new BookingException(409, "Booking này đã được đánh giá.");
        var agencyId = ReviewRules.HostAgencyId(booking) ?? throw new BookingException(409, "Booking không có Agency chủ trì.");

        var now = clock.UtcNow;
        var feedback = new Feedback
        {
            BookingId = booking.Id,
            CustomerId = customerId,
            AgencyId = agencyId,
            Rating = request.Rating,
            // Khách chỉ chấm sao cho tour; cột agency_rating (bắt buộc trong DB) lưu cùng giá trị, điểm Agency tính bằng công thức.
            AgencyRating = request.Rating,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
            Status = FeedbackStatus.Visible,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Feedbacks.Add(feedback);
        db.WorkflowNotifications.Add(new WorkflowNotification
        {
            UserId = agencyId,
            BookingId = booking.Id,
            Message = $"Khách vừa đánh giá {request.Rating}★ cho booking {booking.BookingCode}. Bạn có thể trả lời công khai trong mục Đánh giá."
        });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new BookingException(409, "Booking này đã được đánh giá."); }

        return (await Mine(customerId, ct)).Single(f => f.Id == feedback.Id);
    }

    // ------------------------------------------------------------ Agency

    public async Task<AgencyFeedbackOverviewDto> ForAgency(string agencyId, CancellationToken ct)
    {
        var rows = await db.Feedbacks.AsNoTracking()
            .Include(f => f.Booking).ThenInclude(b => b.Tour)
            .Include(f => f.Customer)
            .Where(f => f.AgencyId == agencyId && f.Status != FeedbackStatus.Hidden)
            .OrderByDescending(f => f.CreatedAt).ToListAsync(ct);
        var items = rows.Select(f => new AgencyFeedbackDto(f.Id, f.BookingId, f.Booking.BookingCode, f.Booking.TourId, f.Booking.Tour?.Name,
            f.Customer?.Name ?? f.Booking.ContactName, f.Rating, f.Comment, f.AgencyReply, UtcOrNull(f.RepliedAt), Utc(f.CreatedAt))).ToList();
        return new AgencyFeedbackOverviewDto(await AgencyRating(agencyId, ct), items);
    }

    public async Task<AgencyFeedbackDto> Reply(string agencyId, int id, FeedbackReplyRequest request, CancellationToken ct)
    {
        var feedback = await db.Feedbacks.Include(f => f.Booking).ThenInclude(b => b.Tour).Include(f => f.Customer)
            .SingleOrDefaultAsync(f => f.Id == id && f.AgencyId == agencyId, ct)
            ?? throw new BookingException(404, "Không tìm thấy đánh giá.");
        var first = feedback.AgencyReply is null;
        feedback.AgencyReply = request.Reply.Trim();
        feedback.RepliedAt = clock.UtcNow;
        feedback.UpdatedAt = clock.UtcNow;
        if (first)
            db.WorkflowNotifications.Add(new WorkflowNotification
            {
                UserId = feedback.CustomerId,
                BookingId = feedback.BookingId,
                Message = $"Agency đã trả lời đánh giá của bạn cho booking {feedback.Booking.BookingCode}."
            });
        await db.SaveChangesAsync(ct);
        return new AgencyFeedbackDto(feedback.Id, feedback.BookingId, feedback.Booking.BookingCode, feedback.Booking.TourId, feedback.Booking.Tour?.Name,
            feedback.Customer?.Name ?? feedback.Booking.ContactName, feedback.Rating, feedback.Comment, feedback.AgencyReply,
            UtcOrNull(feedback.RepliedAt), Utc(feedback.CreatedAt));
    }

    // ------------------------------------------------------------ Công khai

    public async Task<TourReviewsDto> ForTour(int tourId, CancellationToken ct)
    {
        var rows = await db.Feedbacks.AsNoTracking()
            .Include(f => f.Booking).ThenInclude(b => b.Tour)
            .Include(f => f.Customer)
            .Where(f => f.Booking.TourId == tourId && f.Status == FeedbackStatus.Visible)
            .OrderByDescending(f => f.CreatedAt).ToListAsync(ct);
        var ratings = rows.Select(f => f.Rating).ToList();
        return new TourReviewsDto(tourId, Average(ratings), ratings.Count, Distribution(ratings),
            rows.Take(50).Select(Public).ToList());
    }

    public async Task<AgencyRatingDto> AgencyRating(string agencyId, CancellationToken ct)
    {
        var visible = db.Feedbacks.AsNoTracking().Where(f => f.Status == FeedbackStatus.Visible);
        var platformCount = await visible.CountAsync(ct);
        var platformAverage = platformCount == 0 ? ReviewRules.DefaultPlatformAverage
            : (decimal)await visible.SumAsync(f => f.Rating, ct) / platformCount;
        var ratings = await visible.Where(f => f.AgencyId == agencyId).Select(f => f.Rating).ToListAsync(ct);
        return new AgencyRatingDto(agencyId, ReviewRules.BayesianScore(ratings.Count, ratings.Sum(), platformAverage),
            Average(ratings), ratings.Count, Distribution(ratings));
    }

    // ------------------------------------------------------------ helpers

    private Task<List<Booking>> CompletedBookings(string customerId, CancellationToken ct) => db.Bookings.AsNoTracking()
        .Include(b => b.Tour).Include(b => b.BookingAgencies).ThenInclude(a => a.Agency).ThenInclude(u => u.BusinessProfile)
        .Where(b => b.CustomerId == customerId && b.Status == BookingStatus.Completed)
        .AsSplitQuery().ToListAsync(ct);

    internal static string? AgencyName(Booking booking)
    {
        var host = booking.BookingAgencies.FirstOrDefault(a => a.IsHost == true)?.Agency;
        return host?.BusinessProfile?.BusinessName ?? host?.Name;
    }

    private static MyFeedbackDto Mine(Feedback f) => new(f.Id, f.BookingId, f.Booking.BookingCode, f.Booking.TourId, f.Booking.Tour?.Name,
        f.Agency?.BusinessProfile?.BusinessName ?? f.Agency?.Name, f.Rating, f.Comment, f.AgencyReply, UtcOrNull(f.RepliedAt), Utc(f.CreatedAt));

    private static PublicReviewDto Public(Feedback f) => new(f.Id, ReviewRules.PublicName(f.Customer?.Name ?? f.Booking.ContactName),
        f.Rating, f.Comment, f.Booking.Tour?.Name, f.AgencyReply, UtcOrNull(f.RepliedAt), Utc(f.CreatedAt));

    private static decimal Average(IReadOnlyCollection<int> ratings) =>
        ratings.Count == 0 ? 0m : decimal.Round((decimal)ratings.Sum() / ratings.Count, 1);

    private static int[] Distribution(IEnumerable<int> ratings)
    {
        var result = new int[5];
        foreach (var r in ratings) if (r is >= 1 and <= 5) result[r - 1]++;
        return result;
    }
}
