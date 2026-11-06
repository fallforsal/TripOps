using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Client.Extensions.Msal;
using System.Text.Json;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;

namespace TripOps.Service.Tours;

public sealed class DesignRequestService(TripOpsDbContext db, AccountService accounts, TourService tours, CloudinaryStorage storage)
{
    public sealed record PlanProposalInput(int TourId, int BaseTourVersion, JsonElement Proposal, string Message);
    public sealed record PlanProposalReply(string Decision, string Message);
    public sealed record PlanProposalDto(int Id, int RequestId, int TourId, int BaseTourVersion,
        JsonElement Proposal, string Message, string Status, string? AgencyReply, DateTime CreatedAt, DateTime? RespondedAt);
    private static PlanProposalDto ProposalDto(TourPlanProposal p) => new(p.Id, p.RequestId, p.TourId,
        p.BaseTourVersion, JsonSerializer.Deserialize<JsonElement>(p.ProposalJson), p.Message,
        p.Status, p.AgencyReply, p.CreatedAt, p.RespondedAt);
    public async Task<IReadOnlyList<PlanProposalDto>> Proposals(string actor, int requestId, bool agencyView, CancellationToken ct)
    {
        var request = await db.TourDesignRequests.AsNoTracking().SingleOrDefaultAsync(r => r.Id == requestId &&
            (agencyView ? r.AgencyId == actor : r.CustomerId == actor), ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu thiết kế.");
        return (await db.TourPlanProposals.AsNoTracking().Where(p => p.RequestId == request.Id)
            .OrderByDescending(p => p.CreatedAt).ToListAsync(ct)).Select(ProposalDto).ToArray();
    }
    public async Task<PlanProposalDto> SubmitProposal(string actor, int requestId, PlanProposalInput input, CancellationToken ct)
    {
        await Customer(actor, ct);
        var request = await db.TourDesignRequests.SingleOrDefaultAsync(r => r.Id == requestId && r.CustomerId == actor, ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu thiết kế.");
        Require(request.Status is not (CustomRequestStatus.Cancelled or CustomRequestStatus.Rejected),
            "Yêu cầu đã đóng.");
        Require(!await db.Bookings.AnyAsync(b => b.DesignRequestId == requestId &&
            b.CustomerId == actor && b.PaymentStatus != PaymentStatus.Unpaid, ct),
            "Yêu cầu đã có booking thanh toán; không thể gửi bản tùy biến mới.");
        var tour = await db.Tours.AsNoTracking().SingleOrDefaultAsync(t => t.Id == input.TourId &&
            t.DesignRequestId == requestId && t.Status == TourStatus.Completed && t.IsSharedToCustomer == true, ct)
            ?? throw new TourException(422, "Tour plan chưa được chia sẻ cho bạn.");
        Require(tour.Version == input.BaseTourVersion, "Tour plan đã có phiên bản mới; vui lòng tải lại trước khi sửa.");
        Require(!string.IsNullOrWhiteSpace(input.Message) && input.Message.Length <= 2000, "Hãy ghi rõ yêu cầu gửi Agency.");
        Require(input.Proposal.ValueKind == JsonValueKind.Object && input.Proposal.GetRawText().Length <= 100000,
            "Bản tùy biến không hợp lệ hoặc quá lớn.");
        var proposal = new TourPlanProposal { RequestId = requestId, TourId = tour.Id,
            CustomerId = actor, AgencyId = request.AgencyId!, BaseTourVersion = tour.Version ?? 1,
            ProposalJson = input.Proposal.GetRawText(), Message = input.Message!.Trim() };
        db.TourPlanProposals.Add(proposal);
        request.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ProposalDto(proposal);
    }
    public async Task<PlanProposalDto> ReplyProposal(string actor, int requestId, int proposalId,
        PlanProposalReply input, CancellationToken ct)
    {
        await tours.Agency(actor, ct);
        var proposal = await db.TourPlanProposals.SingleOrDefaultAsync(p => p.Id == proposalId &&
            p.RequestId == requestId && p.AgencyId == actor, ct)
            ?? throw new TourException(404, "Không tìm thấy bản tùy biến.");
        Require(input.Decision is "reviewed" or "needs_changes", "Phản hồi không hợp lệ.");
        Require(!string.IsNullOrWhiteSpace(input.Message) && input.Message.Length <= 2000, "Cần ghi phản hồi cho khách.");
        proposal.Status = input.Decision == "reviewed" ? "Reviewed" : "NeedsChanges";
        proposal.AgencyReply = input.Message!.Trim(); proposal.RespondedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ProposalDto(proposal);
    }
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
            Status = CustomRequestStatus.Pending,
            RequestAgencies = [new TourDesignRequestAgency { AgencyId = agency.Id, IsHost = true, Status = "PENDING" }]
        };
        db.TourDesignRequests.Add(request); await db.SaveChangesAsync(ct);
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
                .OrderByDescending(t => t.Status == TourStatus.Completed && t.IsSharedToCustomer == true)
                .ThenByDescending(t => t.CreatedAt).FirstOrDefault())).ToArray();
    }
    public async Task<DesignRequestDto> Cancel(string actor, int id, CancellationToken ct)
    {
        await Customer(actor, ct);
        var request = await db.TourDesignRequests.SingleOrDefaultAsync(r => r.Id == id && r.CustomerId == actor, ct)
            ?? throw new TourException(404, "Yêu cầu không tồn tại.");
        Require(request.Status is CustomRequestStatus.Pending or CustomRequestStatus.Contacted, "Yêu cầu không thể hủy lúc này.");
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
        Require(request.Status is CustomRequestStatus.Pending or CustomRequestStatus.Contacted, "Yêu cầu không thể thay đổi trạng thái.");
        Require(action.Action is "review" or "reject", "Thao tác không hợp lệ.");
        if (action.Action == "reject")
            Require(!await db.Tours.AnyAsync(t => t.DesignRequestId == id && t.Status != TourStatus.Deleted, ct),
                "Yêu cầu đã có tour thiết kế.");
        request.Status = action.Action == "review" ? CustomRequestStatus.Contacted : CustomRequestStatus.Rejected;
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
            CustomRequestStatus.Accepted => "accepted",
            CustomRequestStatus.Quoted => "quoted",
            _ when tour?.Status == TourStatus.Completed && tour.IsSharedToCustomer == true => "designed",
            CustomRequestStatus.Contacted => "reviewing",
            _ => "pending"
        };
        var visibleTour = tour?.Status == TourStatus.Completed && tour.IsSharedToCustomer == true;
        return new DesignRequestDto(r.Id, r.CustomerId ?? "", r.AgencyId ?? "",
            agency?.BusinessProfile?.BusinessName ?? agency?.Name ?? "Agency",
            r.ContactName, r.ContactEmail, r.ContactPhone, r.Destination,
            r.StartDate, r.EndDate, r.NumberOfGuests ?? 0, r.BudgetPerPerson,
            r.HotelRatingRequirement, r.SpecialRequirements, r.BusinessName, r.BusinessEmail,
            r.BusinessPhone, status, r.CreatedAt ?? DateTime.UnixEpoch,
            visibleTour ? tour!.Id : null, visibleTour ? tour!.Version : null,
            visibleTour ? tour!.BasePrice : null);
    }
}
