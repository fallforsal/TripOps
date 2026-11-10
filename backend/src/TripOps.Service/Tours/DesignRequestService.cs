using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Client.Extensions.Msal;
using System.Text.Json;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;

namespace TripOps.Service.Tours;

public sealed partial class DesignRequestService(TripOpsDbContext db, AccountService accounts, TourService tours, CloudinaryStorage storage)
{
    private static void Require(bool ok, string message) { if (!ok) throw new TourException(422, message); }
    private async Task Customer(string actor, CancellationToken ct)
    {
        if ((await accounts.Current(actor, ct)).Role != UserRole.Customer)
            throw new TourException(403, "Cần tài khoản khách hàng.");
    }
    //public async Task<IReadOnlyList<AgencyChoiceDto>> Agencies(CancellationToken ct) =>
    //    await db.Users.AsNoTracking().Where(u => u.Role == UserRole.TravelAgency && u.Status == UserStatus.Active &&
    //        u.BusinessProfile != null && u.BusinessProfile.Status == BusinessProfileStatus.Approved)
    //        .OrderBy(u => u.BusinessProfile!.BusinessName).Select(u => new AgencyChoiceDto(u.Id,
    //            u.BusinessProfile!.BusinessName ?? u.Name ?? "Agency", u.BusinessProfile.BusinessAddress ?? "", u.Phone ?? "", u.Email))
    //        .ToListAsync(ct);

    public async Task<IReadOnlyList<AgencyChoiceDto>> Agencies(CancellationToken ct)
    {
        var rows = await db.Users.AsNoTracking()
            .Where(u => u.Role == UserRole.TravelAgency && u.Status == UserStatus.Active &&
                u.BusinessProfile != null && u.BusinessProfile.Status == BusinessProfileStatus.Approved)
            .OrderBy(u => u.BusinessProfile!.BusinessName)
            .Select(u => new {
                u.Id,
                Name = u.BusinessProfile!.BusinessName ?? u.Name ?? "Agency",
                Address = u.BusinessProfile!.BusinessAddress ?? "",
                Phone = u.Phone ?? "",
                u.Email,
                u.BusinessProfile!.LogoUrl
            })
            .ToListAsync(ct);
        return rows.Select(r => new AgencyChoiceDto(r.Id, r.Name, r.Address, r.Phone, r.Email,
            r.LogoUrl is null ? null : storage.DeliveryUrl(r.LogoUrl))).ToArray();
    }

    public async Task<DesignRequestDto> Create(string actor, CreateDesignRequestInput input, CancellationToken ct)
    {
        await Customer(actor, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        Require(input.DepartureDate.Date >= DateTime.UtcNow.Date && input.ReturnDate.Date >= input.DepartureDate.Date,
            "Ngày đi/về không hợp lệ.");
        Require(!string.IsNullOrWhiteSpace(input.Destination) && !string.IsNullOrWhiteSpace(input.ContactName),
            "Vui lòng nhập điểm đến và người liên hệ.");
        var agency = await db.Users.Include(u => u.BusinessProfile).SingleOrDefaultAsync(u => u.Id == input.AgencyId &&
            u.Role == UserRole.TravelAgency && u.Status == UserStatus.Active && u.BusinessProfile != null &&
            u.BusinessProfile.Status == BusinessProfileStatus.Approved, ct)
            ?? throw new TourException(422, "Agency đã chọn không khả dụng.");
        var request = new TourDesignRequest {
            CustomerId = actor, AgencyId = agency.Id, ContactName = input.ContactName.Trim(),
            ContactEmail = input.ContactEmail.Trim(), ContactPhone = input.ContactPhone.Trim(),
            Destination = input.Destination.Trim(), StartDate = input.DepartureDate.Date,
            EndDate = input.ReturnDate.Date, NumberOfGuests = input.NumberOfPeople,
            BudgetPerPerson = input.BudgetPerPerson, HotelRatingRequirement = input.HotelStars,
            SpecialRequirements = input.AdditionalInfo, BusinessName = input.BusinessName,
            BusinessEmail = input.BusinessEmail, BusinessPhone = input.BusinessPhone,
            Status = CustomRequestStatus.Pending
        };
        if (input.SourceTourId.HasValue)
        {
            var source = await tours.PublicGet(input.SourceTourId.Value, ct);
            Require(source.Configuration != null, "Tour mẫu không khả dụng.");
            Require(await db.Tours.AnyAsync(t => t.Id == source.Id && t.AgencyId == agency.Id && t.IsRequest != true, ct), "Hãy gửi tới Agency sở hữu Tour mẫu.");
            request.SourceTourId = source.Id;
            request.SourceSnapshotJson = JsonSerializer.Serialize(source.Configuration, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        }
        if (input.InitialChanges.HasValue)
        {
            Require(input.SourceTourId.HasValue && input.InitialChanges.Value.ValueKind == JsonValueKind.Object && input.InitialChanges.Value.GetRawText().Length <= 100000, "Đề xuất tùy chỉnh không hợp lệ.");
            request.InitialChangesJson = input.InitialChanges.Value.GetRawText();
        }
        db.TourDesignRequests.Add(request);
        await db.SaveChangesAsync(ct);
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = agency.Id, RequestId = request.Id, Message = "Có yêu cầu thiết kế Tour mới." });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Map(request, agency, null);
    }
    public async Task<IReadOnlyList<DesignRequestDto>> List(string actor, bool agencyView, CancellationToken ct)
    {
        if (agencyView) await tours.Agency(actor, ct); else await Customer(actor, ct);
        var requests = await db.TourDesignRequests.AsNoTracking()
            .Where(r => agencyView ? r.AgencyId == actor : r.CustomerId == actor)
            .OrderByDescending(r => r.CreatedAt).Take(200).ToListAsync(ct);
        var agencyIds = requests.Select(r => r.AgencyId).Where(id => id != null).Distinct().ToArray();
        var agencies = await db.Users.AsNoTracking().Include(u => u.BusinessProfile)
            .Where(u => agencyIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, ct);
        var ids = requests.Select(r => r.Id).ToArray();
        var designedTours = await db.Tours.AsNoTracking().Where(t => t.DesignRequestId.HasValue && ids.Contains(t.DesignRequestId.Value) &&
            t.Status != TourStatus.Deleted).ToListAsync(ct);
        return requests.Select(r => Map(r, agencies.GetValueOrDefault(r.AgencyId ?? ""),
            designedTours.Where(t => t.DesignRequestId == r.Id)
                .OrderByDescending(t => t.SharedVersion.HasValue)
                .ThenByDescending(t => t.CreatedAt).FirstOrDefault())).ToArray();
    }
    public async Task<DesignRequestDto> Cancel(string actor, int id, CancellationToken ct)
    {
        await Customer(actor, ct);
        var request = await db.TourDesignRequests.SingleOrDefaultAsync(r => r.Id == id && r.CustomerId == actor, ct)
            ?? throw new TourException(404, "Yêu cầu không tồn tại.");
        Require(request.Status is CustomRequestStatus.Pending or CustomRequestStatus.InProgress, "Yêu cầu không thể hủy lúc này.");
        Require(!await db.Tours.AnyAsync(t => t.DesignRequestId == id && t.Status != TourStatus.Deleted, ct),
            "Agency đã bắt đầu thiết kế tour; hãy liên hệ agency.");
        request.Status = CustomRequestStatus.Cancelled; request.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        var agency = await db.Users.Include(u => u.BusinessProfile).SingleAsync(u => u.Id == request.AgencyId, ct);
        return Map(request, agency, null);
    }
    public async Task<DesignRequestDto> Act(string actor, int id, DesignRequestAction action, CancellationToken ct)
    {
        await tours.Agency(actor, ct);
        var request = await db.TourDesignRequests.SingleOrDefaultAsync(r => r.Id == id && r.AgencyId == actor, ct)
            ?? throw new TourException(404, "Yêu cầu không tồn tại.");
        Require(request.Status is CustomRequestStatus.Pending or CustomRequestStatus.InProgress, "Yêu cầu không thể thay đổi trạng thái.");
        Require(action.Action is "review" or "reject", "Thao tác không hợp lệ.");
        if (action.Action == "reject")
            Require(!await db.Tours.AnyAsync(t => t.DesignRequestId == id && t.Status != TourStatus.Deleted, ct),
                "Yêu cầu đã có tour thiết kế.");
        Require(action.Action != "reject" || !string.IsNullOrWhiteSpace(action.Reason), "Vui lòng nhập lý do từ chối.");
        request.Status = action.Action == "review" ? CustomRequestStatus.InProgress : CustomRequestStatus.Rejected;
        request.RejectionReason = action.Action == "reject" ? action.Reason!.Trim() : null;
        request.RespondedAt = DateTime.UtcNow;
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = request.CustomerId!, RequestId = id,
            Message = action.Action == "reject" ? "Agency đã từ chối yêu cầu thiết kế: " + request.RejectionReason![..Math.Min(900, request.RejectionReason!.Length)] : "Agency đã tiếp nhận yêu cầu thiết kế tour." });
        request.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        var agency = await db.Users.Include(u => u.BusinessProfile).SingleAsync(u => u.Id == actor, ct);
        return Map(request, agency, null);
    }
    private static DesignRequestDto Map(TourDesignRequest r, User? agency, Tour? tour)
    {
        var status = r.Status switch {
            CustomRequestStatus.Cancelled => "cancelled",
            CustomRequestStatus.Rejected => "rejected",
            _ when tour?.SharedVersion.HasValue == true => "designed",
            CustomRequestStatus.InProgress => "reviewing",
            _ => "pending"
        };
        var visibleTour = tour?.SharedVersion.HasValue == true;
        return new DesignRequestDto(r.Id, r.CustomerId ?? "", r.AgencyId ?? "",
            agency?.BusinessProfile?.BusinessName ?? agency?.Name ?? "Agency",
            r.ContactName, r.ContactEmail, r.ContactPhone, r.Destination,
            r.StartDate, r.EndDate, r.NumberOfGuests ?? 0, r.BudgetPerPerson,
            r.HotelRatingRequirement, r.SpecialRequirements, r.BusinessName, r.BusinessEmail,
            r.BusinessPhone, status, r.CreatedAt ?? DateTime.UnixEpoch,
            tour?.Id, tour?.Version, null, r.RejectionReason, r.RespondedAt, tour?.SharedVersion);
    }
}
