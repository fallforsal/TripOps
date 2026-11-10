using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Service.Bookings;

public sealed record AgencyParticipantInput(
    [Required, StringLength(150)] string FullName, DateTime DateOfBirth,
    [AllowedValues("Nam", "Nữ", "Khác")] string Gender,
    [StringLength(50)] string? IdentityNumber,
    [StringLength(2000)] string? RoommateNote,
    [StringLength(2000)] string? RestaurantNote,
    [StringLength(2000)] string? Note,
    [Range(typeof(decimal), "0", "9999999999")] decimal TicketPrice,
    [Required, StringLength(240, MinimumLength = 3)] string Reason,
    decimal ExpectedTotal, Guid RequestId);

public sealed partial class BookingQuotationService
{
    public async Task AddParticipant(string actor, int id, AgencyParticipantInput input, CancellationToken ct)
    {
        await using var tx = await Repository.BeginPaymentChange(id, ct);
        Require(input.RequestId != Guid.Empty, "Thiếu mã yêu cầu thêm hành khách.");
        var previous = await Db.BookingParticipants.AsNoTracking().SingleOrDefaultAsync(p => p.BookingId == id && p.CreationKey == input.RequestId, ct);
        if (previous != null) {
            await Owned(actor, id, true, ct);
            Require(previous.FullName == input.FullName.Trim() && previous.DateOfBirth == input.DateOfBirth.Date && previous.Price == input.TicketPrice,
                "Mã yêu cầu thêm hành khách đã được sử dụng.");
            await tx.CommitAsync(ct); return;
        }
        var b = await Amendable(actor, id, input.ExpectedTotal, ct);
        Require(!string.IsNullOrWhiteSpace(input.FullName) && input.FullName.Trim().Length <= 150, "Cần nhập họ tên hành khách.");
        Require(input.DateOfBirth.Date <= DateTime.UtcNow.Date && input.DateOfBirth.Year >= 1900, "Ngày sinh không hợp lệ.");
        Require(input.TicketPrice >= 0 && input.TicketPrice == Money(input.TicketPrice), "Giá vé phải là số nguyên không âm.");
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Trim().Length is >= 3 and <= 240, "Cần nhập lý do bổ sung hành khách.");
        var oldCount = b.Participants.Count(p => p.Status != "INACTIVE");
        Require(!b.Tour!.MaxGuests.HasValue || oldCount + 1 <= b.Tour.MaxGuests, "Số khách đã vượt sức chứa tối đa của tour.");
        var identity = input.IdentityNumber?.Trim();
        Require(string.IsNullOrEmpty(identity) || !b.Participants.Any(p => p.Status != "INACTIVE" && p.IdentityNumber == identity), "CCCD/hộ chiếu đã có trong đoàn.");
        var tiers = await Db.TourPricingTiers.AsNoTracking().Where(t => t.TourId == b.TourId).OrderBy(t => t.DisplayOrder).ToListAsync(ct);
        var age = b.StartDate.Year - input.DateOfBirth.Year;
        if (input.DateOfBirth.Date.AddYears(age) > b.StartDate.Date) age--;
        var tier = tiers.FirstOrDefault(t => (!t.MinAge.HasValue || age >= t.MinAge) && (!t.MaxAge.HasValue || age <= t.MaxAge));
        b.Participants.Add(new BookingParticipant { CreationKey = input.RequestId, AgencyId = actor,
            ParticipantIndex = b.Participants.Select(p => p.ParticipantIndex).DefaultIfEmpty(0).Max() + 1,
            FullName = input.FullName.Trim(), DateOfBirth = input.DateOfBirth.Date, Gender = input.Gender,
            IdentityNumber = identity, RoommateNote = input.RoommateNote?.Trim(), RestaurantNote = input.RestaurantNote?.Trim(),
            Note = input.Note?.Trim(), TierName = tier?.Name ?? (age < 12 ? "Trẻ em" : "Người lớn"), Price = input.TicketPrice,
            IsPrimary = true, Status = "ACTIVE" });
        var reason = $"Bổ sung {input.FullName.Trim()}: {input.Reason.Trim()}";
        if (BookingBilling.HasBeenApproved(b) && input.TicketPrice > 0)
            await AddSurchargeCore(b, actor, new BookingSurchargeInput(input.TicketPrice, reason[..Math.Min(reason.Length, 240)], input.ExpectedTotal, input.RequestId), ct);
        else
            await ApplyPrice(b, actor, b.TotalAmount + input.TicketPrice, reason, ct);
        MarkAmended(b);
        // Send the updated roster to Providers; their operational replies never reset Agency approval.
        var requests = await Db.BookingSupplierRequests.Where(r => r.BookingId == id && r.Status != "Superseded").ToListAsync(ct);
        foreach (var r in requests) {
            if (r.Unit is "person" or "meal" or "person_night") {
                r.Quantity = oldCount > 0 ? r.Quantity * (oldCount + 1) / oldCount : oldCount + 1;
                r.EstimatedCost = r.EstimatedCost * (oldCount + 1) / Math.Max(1, oldCount);
            }
            if (r.Status != "Rejected") r.Status = "Pending";
            r.QuotedCost = null; r.PriceConfirmed = false; r.AvailabilityConfirmed = false;
            r.AvailableQuantity = null; r.HoldUntil = null; r.RespondedAt = null; r.ReplyDeadline = DateTime.UtcNow.AddHours(48);
            Db.WorkflowNotifications.Add(new WorkflowNotification { UserId = r.ProviderId, BookingId = id,
                Message = $"Đoàn có thêm hành khách. Vui lòng xem danh sách và kiểm tra lại dịch vụ {r.ServiceName}." });
        }
        await Db.SaveChangesAsync(ct);
        var latest = await Db.BookingQuotations.Where(q => q.BookingId == id).OrderByDescending(q => q.Version).FirstAsync(ct);
        var lines = Lines(latest).Select(line => {
            var request = requests.FirstOrDefault(r => r.SlotKey == line.SlotKey);
            return request == null ? line : line with { Quantity = request.Quantity, Total = request.EstimatedCost,
                UnitCost = request.EstimatedCost / Math.Max(1, request.Quantity), Confirmed = false };
        }).ToList();
        latest.Status = "Superseded";
        Db.BookingQuotations.Add(new BookingQuotation { BookingId = id, Version = latest.Version + 1, TourId = latest.TourId,
            TourVersion = latest.TourVersion, EstimatedSale = b.TotalAmount, NumberOfGuests = oldCount + 1,
            PlanSnapshotJson = PlanSnapshot(b), LinesJson = JsonSerializer.Serialize(lines, Json), TotalCost = lines.Sum(l => l.Total), Reason = reason });
        Db.WorkflowNotifications.Add(new WorkflowNotification { UserId = b.CustomerId!, BookingId = id, Message = reason });
        await Db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
}
