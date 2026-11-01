namespace TripOps.Service.Tours;

public sealed record ProvinceCatalogItem(string Code, string Name, string Region);

/// <summary>
/// Danh mục chuẩn 63 Tỉnh / Thành phố Việt Nam với mã định danh ổn định (canonical code).
/// Dùng để chuẩn hóa và kiểm tra hợp lệ trường ProvinceCodes của Tour, phục vụ lọc tour theo địa bàn
/// và tìm kiếm Travel Agency ứng viên đồng tổ chức mà không phụ thuộc chuỗi văn bản tự do.
/// </summary>
public static class VietnamProvinceCatalog
{
    public const int MaxProvincesPerTour = 63;

    public static IReadOnlyList<ProvinceCatalogItem> All { get; } =
    [
        // Miền Bắc (25 tỉnh/thành)
        new("HA_NOI", "TP. Hà Nội", "Miền Bắc"),
        new("QUANG_NINH", "Quảng Ninh", "Miền Bắc"),
        new("LAO_CAI", "Lào Cai", "Miền Bắc"),
        new("HA_GIANG", "Hà Giang", "Miền Bắc"),
        new("NINH_BINH", "Ninh Bình", "Miền Bắc"),
        new("HAI_PHONG", "TP. Hải Phòng", "Miền Bắc"),
        new("CAO_BANG", "Cao Bằng", "Miền Bắc"),
        new("BAC_KAN", "Bắc Kạn", "Miền Bắc"),
        new("SON_LA", "Sơn La", "Miền Bắc"),
        new("DIEN_BIEN", "Điện Biên", "Miền Bắc"),
        new("LAI_CHAU", "Lai Châu", "Miền Bắc"),
        new("YEN_BAI", "Yên Bái", "Miền Bắc"),
        new("HOA_BINH", "Hòa Bình", "Miền Bắc"),
        new("TUYEN_QUANG", "Tuyên Quang", "Miền Bắc"),
        new("LANG_SON", "Lạng Sơn", "Miền Bắc"),
        new("THAI_NGUYEN", "Thái Nguyên", "Miền Bắc"),
        new("PHU_THO", "Phú Thọ", "Miền Bắc"),
        new("VINH_PHUC", "Vĩnh Phúc", "Miền Bắc"),
        new("BAC_GIANG", "Bắc Giang", "Miền Bắc"),
        new("BAC_NINH", "Bắc Ninh", "Miền Bắc"),
        new("HAI_DUONG", "Hải Dương", "Miền Bắc"),
        new("HUNG_YEN", "Hưng Yên", "Miền Bắc"),
        new("HA_NAM", "Hà Nam", "Miền Bắc"),
        new("NAM_DINH", "Nam Định", "Miền Bắc"),
        new("THAI_BINH", "Thái Bình", "Miền Bắc"),

        // Miền Trung (14 tỉnh/thành)
        new("DA_NANG", "TP. Đà Nẵng", "Miền Trung"),
        new("QUANG_NAM", "Quảng Nam", "Miền Trung"),
        new("THUA_THIEN_HUE", "Thừa Thiên Huế", "Miền Trung"),
        new("KHANH_HOA", "Khánh Hòa", "Miền Trung"),
        new("BINH_DINH", "Bình Định", "Miền Trung"),
        new("PHU_YEN", "Phú Yên", "Miền Trung"),
        new("BINH_THUAN", "Bình Thuận", "Miền Trung"),
        new("NINH_THUAN", "Ninh Thuận", "Miền Trung"),
        new("QUANG_BINH", "Quảng Bình", "Miền Trung"),
        new("QUANG_TRI", "Quảng Trị", "Miền Trung"),
        new("QUANG_NGAI", "Quảng Ngãi", "Miền Trung"),
        new("THANH_HOA", "Thanh Hóa", "Miền Trung"),
        new("NGHE_AN", "Nghệ An", "Miền Trung"),
        new("HA_TINH", "Hà Tĩnh", "Miền Trung"),

        // Tây Nguyên (5 tỉnh)
        new("LAM_DONG", "Lâm Đồng", "Tây Nguyên"),
        new("DAK_LAK", "Đắk Lắk", "Tây Nguyên"),
        new("DAK_NONG", "Đắk Nông", "Tây Nguyên"),
        new("GIA_LAI", "Gia Lai", "Tây Nguyên"),
        new("KON_TUM", "Kon Tum", "Tây Nguyên"),

        // Miền Nam - Đông Nam Bộ (6 tỉnh/thành)
        new("TP_HCM", "TP. Hồ Chí Minh", "Miền Nam"),
        new("BA_RIA_VUNG_TAU", "Bà Rịa - Vũng Tàu", "Miền Nam"),
        new("TAY_NINH", "Tây Ninh", "Miền Nam"),
        new("DONG_NAI", "Đồng Nai", "Miền Nam"),
        new("BINH_DUONG", "Bình Dương", "Miền Nam"),
        new("BINH_PHUOC", "Bình Phước", "Miền Nam"),

        // Miền Tây - Đồng bằng sông Cửu Long (13 tỉnh/thành)
        new("KIEN_GIANG", "Kiên Giang", "Miền Tây"),
        new("CAN_THO", "TP. Cần Thơ", "Miền Tây"),
        new("AN_GIANG", "An Giang", "Miền Tây"),
        new("TIEN_GIANG", "Tiền Giang", "Miền Tây"),
        new("BEN_TRE", "Bến Tre", "Miền Tây"),
        new("VINH_LONG", "Vĩnh Long", "Miền Tây"),
        new("DONG_THAP", "Đồng Tháp", "Miền Tây"),
        new("CA_MAU", "Cà Mau", "Miền Tây"),
        new("BAC_LIEU", "Bạc Liêu", "Miền Tây"),
        new("SOC_TRANG", "Sóc Trăng", "Miền Tây"),
        new("TRA_VINH", "Trà Vinh", "Miền Tây"),
        new("HAU_GIANG", "Hậu Giang", "Miền Tây"),
        new("LONG_AN", "Long An", "Miền Tây")
    ];

    private static readonly Dictionary<string, ProvinceCatalogItem> ByCode =
        All.ToDictionary(x => x.Code, StringComparer.OrdinalIgnoreCase);

    public static bool IsValidCode(string? code) =>
        !string.IsNullOrWhiteSpace(code) && ByCode.ContainsKey(code.Trim());

    public static string NormalizeCode(string? code) => (code ?? string.Empty).Trim().ToUpperInvariant();

    public const int MaxCount = MaxProvincesPerTour;

    public static string[] NormalizeDistinct(IEnumerable<string>? codes) =>
        (codes ?? [])
            .Select(NormalizeCode)
            .Where(c => !string.IsNullOrEmpty(c))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

    public static ProvinceCatalogItem? Find(string? code) =>
        !string.IsNullOrWhiteSpace(code) && ByCode.TryGetValue(code.Trim(), out var item) ? item : null;
}
