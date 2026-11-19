using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Service.Contracts;

/// <summary>Mẫu hợp đồng riêng của từng Agency (một mẫu cho cả công ty, áp dụng cho mọi tour của Agency đó).</summary>
public sealed class ContractTemplateService(TripOpsDbContext db)
{
    /// <summary>Chính sách áp dụng cho tour của Agency; Agency chưa soạn mẫu thì dùng mặc định của TripOps.</summary>
    public async Task<ContractTerms> TermsFor(string? agencyId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(agencyId)) return ContractTerms.Default;
        var row = await db.AgencyContractTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.AgencyId == agencyId, ct);
        return row is null ? ContractTerms.Default : Of(row);
    }

    public async Task<ContractTemplateDto> Get(string agencyId, CancellationToken ct)
    {
        var row = await db.AgencyContractTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.AgencyId == agencyId, ct);
        return Dto(row is null ? ContractTerms.Default : Of(row), row is null, row?.UpdatedAt);
    }

    public async Task<ContractTemplateDto> Save(string agencyId, ContractTemplateRequest request, CancellationToken ct)
    {
        var terms = ContractTerms.Validate(request.Tiers, request.CancellationNote, request.AdditionalTerms, request.Clauses);
        var row = await db.AgencyContractTemplates.FirstOrDefaultAsync(t => t.AgencyId == agencyId, ct);
        var now = DateTime.UtcNow;
        if (row is null)
        {
            row = new AgencyContractTemplate { AgencyId = agencyId, CreatedAt = now };
            db.AgencyContractTemplates.Add(row);
        }
        row.CancellationTiers = terms.TiersJson();
        row.CancellationNote = terms.CancellationNote;
        row.AdditionalTerms = terms.AdditionalTerms;
        row.Clauses = terms.ClausesJson();
        row.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        return Dto(terms, false, now);
    }

    /// <summary>PDF hợp đồng mẫu theo nội dung Agency đang soạn (chưa cần lưu), cùng cách trình bày với hợp đồng thật.</summary>
    public async Task<byte[]> Preview(string agencyId, ContractTemplateRequest request, CancellationToken ct) =>
        await SamplePdf(agencyId, ContractTerms.Validate(request.Tiers, request.CancellationNote, request.AdditionalTerms, request.Clauses), null, ct);

    /// <summary>PDF hợp đồng mẫu: thông tin Agency thật, chính sách và điều khoản theo <paramref name="terms"/>, khách/giá/lịch là dữ liệu mẫu.</summary>
    public async Task<byte[]> SamplePdf(string agencyId, ContractTerms terms, string? tourName, CancellationToken ct)
    {
        var agency = await db.Users.AsNoTracking().Include(u => u.BusinessProfile).FirstOrDefaultAsync(u => u.Id == agencyId, ct);
        var profile = agency?.BusinessProfile;
        var vietnamNow = DateTime.UtcNow.Add(PaymentRules.VietnamOffset);
        var start = vietnamNow.Date.AddDays(30);
        const decimal adult = 3_000_000m, child = 1_500_000m, total = adult * 2 + child;
        var data = new ContractData("HD-MAU", 1, vietnamNow, vietnamNow,
            profile?.BusinessName ?? agency?.Name ?? "Công ty lữ hành", profile?.TaxCode, profile?.BusinessAddress, agency?.Email, agency?.Phone,
            [],
            "Nguyễn Văn A (khách mẫu)", "09xx xxx xxx", "khachmau@example.com", null,
            "MAU-0001", tourName ?? "Tour mẫu 3 ngày 2 đêm", start, start.AddDays(2), 3,
            [("Nguyễn Văn A", "Người lớn", adult), ("Trần Thị B", "Người lớn", adult), ("Nguyễn Văn C", "Trẻ em", child)],
            [
                new ContractDay(1, start, "Khởi hành – tham quan điểm thứ nhất", "Trưa, Tối", "Khách sạn theo chương trình"),
                new ContractDay(2, start.AddDays(1), "Tham quan theo lịch trình", "Sáng, Trưa, Tối", "Khách sạn theo chương trình"),
                new ContractDay(3, start.AddDays(2), "Tự do mua sắm – về điểm đón", "Sáng, Trưa", null),
            ],
            total,
            [("Đợt 1 – đặt cọc", total / 2, "24 giờ sau khi Bên A duyệt đơn"), ("Đợt 2 – phần còn lại", total / 2, "hết ngày " + start.AddDays(-8).ToString("dd/MM/yyyy", System.Globalization.CultureInfo.InvariantCulture))],
            terms);
        return ContractPdf.Generate(data, sample: true);
    }

    private static ContractTerms Of(AgencyContractTemplate row) =>
        new(ContractTerms.ParseTiers(row.CancellationTiers), row.CancellationNote, row.AdditionalTerms, ContractTerms.ParseClauses(row.Clauses));

    private static ContractTemplateDto Dto(ContractTerms terms, bool isDefault, DateTime? updatedAt) =>
        new(terms.Tiers, terms.CancellationNote, terms.AdditionalTerms, isDefault, updatedAt,
            terms.TableRows().Select(r => new ContractPolicyRow(r.Range, r.Fee)).ToList(),
            ContractClauses.All.Select(c => new ContractClauseDto(c.Key, c.Title, c.AutoContent, terms.ClauseText(c.Key), c.DefaultText,
                terms.IsCustomClause(c.Key))).ToList());
}
