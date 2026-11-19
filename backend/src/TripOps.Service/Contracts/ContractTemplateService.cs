using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;

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
        var terms = ContractTerms.Validate(request.Tiers, request.CancellationNote, request.AdditionalTerms);
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
        row.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        return Dto(terms, false, now);
    }

    private static ContractTerms Of(AgencyContractTemplate row) =>
        new(ContractTerms.ParseTiers(row.CancellationTiers), row.CancellationNote, row.AdditionalTerms);

    private static ContractTemplateDto Dto(ContractTerms terms, bool isDefault, DateTime? updatedAt) =>
        new(terms.Tiers, terms.CancellationNote, terms.AdditionalTerms, isDefault, updatedAt,
            terms.TableRows().Select(r => new ContractPolicyRow(r.Range, r.Fee)).ToList());
}
