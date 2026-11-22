using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Service.Contracts;

/// <summary>
/// Mẫu hợp đồng riêng của từng Agency. Agency lưu được nhiều mẫu có tên (VD "Mùa thường", "Lễ Tết") và chọn một mẫu
/// đang áp dụng cho mọi tour của mình; không chọn mẫu nào thì dùng mẫu mặc định của TripOps. Đơn đặt chụp lại mẫu đang
/// áp dụng lúc khách đặt nên đổi mẫu sau đó không ảnh hưởng đơn cũ.
/// </summary>
public sealed class ContractTemplateService(TripOpsDbContext db)
{
    public const int MaxTemplates = 20;

    /// <summary>Chính sách áp dụng cho tour của Agency: mẫu đang áp dụng, không có thì mặc định của TripOps.</summary>
    public async Task<ContractTerms> TermsFor(string? agencyId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(agencyId)) return ContractTerms.Default;
        var row = await Active(agencyId, tracked: false, ct);
        return row is null ? ContractTerms.Default : Of(row);
    }

    // ------------------------------------------------------------ mẫu đang áp dụng (API cũ một mẫu)

    public async Task<ContractTemplateDto> Get(string agencyId, CancellationToken ct)
    {
        var row = await Active(agencyId, tracked: false, ct);
        return row is null ? Dto(ContractTerms.Default, null) : Dto(Of(row), row);
    }

    /// <summary>Lưu vào mẫu đang áp dụng; chưa có mẫu nào áp dụng thì tạo mẫu mới và áp dụng luôn.</summary>
    public async Task<ContractTemplateDto> Save(string agencyId, ContractTemplateRequest request, CancellationToken ct)
    {
        var row = await Active(agencyId, tracked: true, ct);
        if (row is null) return await Create(agencyId, request with { Activate = true }, ct);
        return await Update(agencyId, row.Id, request, ct);
    }

    // ------------------------------------------------------------ nhiều mẫu có tên

    public async Task<IReadOnlyList<ContractTemplateSummaryDto>> List(string agencyId, CancellationToken ct)
    {
        var rows = await db.AgencyContractTemplates.AsNoTracking().Where(t => t.AgencyId == agencyId).ToListAsync(ct);
        return rows.OrderByDescending(r => r.IsActive).ThenByDescending(r => r.UpdatedAt).ThenByDescending(r => r.Id)
            .Select(Summary).ToList();
    }

    public async Task<ContractTemplateDto> Get(string agencyId, int id, CancellationToken ct)
    {
        var row = await Find(agencyId, id, tracked: false, ct);
        return Dto(Of(row), row);
    }

    public async Task<ContractTemplateDto> Create(string agencyId, ContractTemplateRequest request, CancellationToken ct)
    {
        var terms = Validate(request);
        var rows = await db.AgencyContractTemplates.Where(t => t.AgencyId == agencyId).ToListAsync(ct);
        if (rows.Count >= MaxTemplates)
            throw new BookingException(409, $"Mỗi công ty lưu tối đa {MaxTemplates} mẫu hợp đồng. Hãy xóa bớt mẫu không dùng.");
        var name = UniqueName(Name(request.Name, rows.Count == 0 ? "Mẫu hợp đồng" : "Mẫu mới"), rows, null, rename: request.Name is null);
        var now = DateTime.UtcNow;
        var row = new AgencyContractTemplate { AgencyId = agencyId, Name = name, CreatedAt = now, UpdatedAt = now };
        Apply(row, terms);
        db.AgencyContractTemplates.Add(row);
        if (request.Activate) Activate(rows, row);
        await db.SaveChangesAsync(ct);
        return Dto(terms, row);
    }

    public async Task<ContractTemplateDto> Update(string agencyId, int id, ContractTemplateRequest request, CancellationToken ct)
    {
        var terms = Validate(request);
        var rows = await db.AgencyContractTemplates.Where(t => t.AgencyId == agencyId).ToListAsync(ct);
        var row = rows.SingleOrDefault(t => t.Id == id) ?? throw NotFound();
        if (request.Name is not null) row.Name = UniqueName(Name(request.Name, row.Name), rows, row, rename: false);
        Apply(row, terms);
        row.UpdatedAt = DateTime.UtcNow;
        if (request.Activate) Activate(rows, row);
        await db.SaveChangesAsync(ct);
        return Dto(terms, row);
    }

    /// <summary>Chọn mẫu áp dụng cho các đơn đặt từ bây giờ (mẫu khác thôi áp dụng).</summary>
    public async Task<ContractTemplateDto> Activate(string agencyId, int id, CancellationToken ct)
    {
        var rows = await db.AgencyContractTemplates.Where(t => t.AgencyId == agencyId).ToListAsync(ct);
        var row = rows.SingleOrDefault(t => t.Id == id) ?? throw NotFound();
        Activate(rows, row);
        await db.SaveChangesAsync(ct);
        return Dto(Of(row), row);
    }

    /// <summary>Thôi áp dụng mọi mẫu của công ty: đơn đặt mới dùng mẫu mặc định của TripOps. Các mẫu đã lưu vẫn giữ nguyên.</summary>
    public async Task<ContractTemplateDto> UseDefault(string agencyId, CancellationToken ct)
    {
        foreach (var row in await db.AgencyContractTemplates.Where(t => t.AgencyId == agencyId && t.IsActive).ToListAsync(ct))
        {
            row.IsActive = false;
            row.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        return Dto(ContractTerms.Default, null);
    }

    /// <summary>Nhân bản một mẫu để sửa thành mẫu khác (bản sao chưa áp dụng).</summary>
    public async Task<ContractTemplateDto> Duplicate(string agencyId, int id, CancellationToken ct)
    {
        var source = await Find(agencyId, id, tracked: false, ct);
        var terms = Of(source);
        return await Create(agencyId, new ContractTemplateRequest(terms.Tiers, terms.CancellationNote, terms.AdditionalTerms,
            terms.Clauses?.ToDictionary(c => c.Key, c => (string?)c.Value), Name: Truncate($"{source.Name} (bản sao)", MaxNameLength)), ct);
    }

    /// <summary>Xóa mẫu đã lưu. Mẫu đang áp dụng phải chọn mẫu khác trước; đơn đã đặt vẫn giữ bản chụp của mình.</summary>
    public async Task Delete(string agencyId, int id, CancellationToken ct)
    {
        var row = await Find(agencyId, id, tracked: true, ct);
        if (row.IsActive)
            throw new BookingException(409, "Mẫu này đang được áp dụng. Hãy chọn mẫu khác (hoặc mẫu mặc định TripOps) trước khi xóa.");
        db.AgencyContractTemplates.Remove(row);
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------ hỗ trợ

    private const int MaxNameLength = 120;

    private Task<AgencyContractTemplate?> Active(string agencyId, bool tracked, CancellationToken ct)
    {
        var query = db.AgencyContractTemplates.Where(t => t.AgencyId == agencyId && t.IsActive);
        if (!tracked) query = query.AsNoTracking();
        return query.OrderByDescending(t => t.UpdatedAt).ThenByDescending(t => t.Id).FirstOrDefaultAsync(ct);
    }

    private async Task<AgencyContractTemplate> Find(string agencyId, int id, bool tracked, CancellationToken ct)
    {
        var query = db.AgencyContractTemplates.Where(t => t.AgencyId == agencyId && t.Id == id);
        if (!tracked) query = query.AsNoTracking();
        return await query.SingleOrDefaultAsync(ct) ?? throw NotFound();
    }

    private static BookingException NotFound() => new(404, "Không tìm thấy mẫu hợp đồng.");

    private static ContractTerms Validate(ContractTemplateRequest request) =>
        ContractTerms.Validate(request.Tiers, request.CancellationNote, request.AdditionalTerms, request.Clauses);

    private static void Apply(AgencyContractTemplate row, ContractTerms terms)
    {
        row.CancellationTiers = terms.TiersJson();
        row.CancellationNote = terms.CancellationNote;
        row.AdditionalTerms = terms.AdditionalTerms;
        row.Clauses = terms.ClausesJson();
    }

    private static void Activate(IEnumerable<AgencyContractTemplate> rows, AgencyContractTemplate chosen)
    {
        var now = DateTime.UtcNow;
        foreach (var row in rows.Where(r => r.IsActive && !ReferenceEquals(r, chosen))) { row.IsActive = false; row.UpdatedAt = now; }
        if (!chosen.IsActive) { chosen.IsActive = true; chosen.UpdatedAt = now; }
    }

    private static string Name(string? requested, string fallback)
    {
        var name = string.Join(' ', (requested ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (name.Length == 0) name = fallback;
        if (name.Length > MaxNameLength) throw new BookingException(422, $"Tên mẫu tối đa {MaxNameLength} ký tự.");
        return name;
    }

    /// <summary>Tên mẫu không trùng trong công ty: tên tự đặt thì thêm số (2), (3)...; tên Agency nhập mà trùng thì báo lỗi.</summary>
    private static string UniqueName(string name, IEnumerable<AgencyContractTemplate> rows, AgencyContractTemplate? self, bool rename)
    {
        var taken = rows.Where(r => !ReferenceEquals(r, self)).Select(r => r.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (!taken.Contains(name)) return name;
        if (!rename) throw new BookingException(409, $"Đã có mẫu tên \"{name}\". Hãy đặt tên khác.");
        for (var i = 2; ; i++)
        {
            var candidate = Truncate($"{name} ({i})", MaxNameLength);
            if (!taken.Contains(candidate)) return candidate;
        }
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];

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

    /// <param name="row">null = mẫu mặc định TripOps (chưa chọn mẫu nào).</param>
    private static ContractTemplateDto Dto(ContractTerms terms, AgencyContractTemplate? row) =>
        new(terms.Tiers, terms.CancellationNote, terms.AdditionalTerms, row is null, row?.UpdatedAt,
            terms.TableRows().Select(r => new ContractPolicyRow(r.Range, r.Fee)).ToList(),
            ContractClauses.All.Select(c => new ContractClauseDto(c.Key, c.Title, c.AutoContent, terms.ClauseText(c.Key), c.DefaultText,
                terms.IsCustomClause(c.Key))).ToList(),
            row?.Id, row?.Name, row?.IsActive ?? false);

    private static ContractTemplateSummaryDto Summary(AgencyContractTemplate row)
    {
        var terms = Of(row);
        var tiers = string.Join(" · ", terms.Tiers.OrderByDescending(t => t.MinDays).Select(t => $"từ {t.MinDays} ngày {ContractTerms.Percent(t.FeePercent)}"));
        return new ContractTemplateSummaryDto(row.Id, row.Name, row.IsActive, row.CreatedAt, row.UpdatedAt, tiers,
            terms.Clauses?.Count ?? 0, terms.AdditionalTerms is not null);
    }
}
