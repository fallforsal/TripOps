namespace TripOps.Service.Tours;

public sealed record ProvinceCatalogItem(string Code, string Name, string Region);

/// <summary>34 tỉnh/thành sau sắp xếp 2025. Nhận mã cũ để đọc dữ liệu lịch sử; không sửa bản chốt booking.</summary>
public static class VietnamProvinceCatalog
{
    // Legacy payloads may still contain all 63 former codes.
    public const int MaxProvincesPerTour = 63;
    public const int MaxCount = MaxProvincesPerTour;
    public static IReadOnlyList<ProvinceCatalogItem> All { get; } =
    [
        new("HA_NOI", "TP. Hà Nội", "Miền Bắc"),
        new("QUANG_NINH", "Quảng Ninh", "Miền Bắc"),
        new("LAO_CAI", "Lào Cai", "Miền Bắc"),
        new("TUYEN_QUANG", "Tuyên Quang", "Miền Bắc"),
        new("NINH_BINH", "Ninh Bình", "Miền Bắc"),
        new("HAI_PHONG", "TP. Hải Phòng", "Miền Bắc"),
        new("CAO_BANG", "Cao Bằng", "Miền Bắc"),
        new("THAI_NGUYEN", "Thái Nguyên", "Miền Bắc"),
        new("SON_LA", "Sơn La", "Miền Bắc"),
        new("DIEN_BIEN", "Điện Biên", "Miền Bắc"),
        new("LAI_CHAU", "Lai Châu", "Miền Bắc"),
        new("PHU_THO", "Phú Thọ", "Miền Bắc"),
        new("LANG_SON", "Lạng Sơn", "Miền Bắc"),
        new("BAC_NINH", "Bắc Ninh", "Miền Bắc"),
        new("HUNG_YEN", "Hưng Yên", "Miền Bắc"),
        new("DA_NANG", "TP. Đà Nẵng", "Miền Trung"),
        new("HUE", "TP. Huế", "Miền Trung"),
        new("KHANH_HOA", "Khánh Hòa", "Miền Trung"),
        new("GIA_LAI", "Gia Lai", "Tây Nguyên"),
        new("DAK_LAK", "Đắk Lắk", "Tây Nguyên"),
        new("LAM_DONG", "Lâm Đồng", "Tây Nguyên"),
        new("QUANG_TRI", "Quảng Trị", "Miền Trung"),
        new("QUANG_NGAI", "Quảng Ngãi", "Miền Trung"),
        new("THANH_HOA", "Thanh Hóa", "Miền Trung"),
        new("NGHE_AN", "Nghệ An", "Miền Trung"),
        new("HA_TINH", "Hà Tĩnh", "Miền Trung"),
        new("TP_HCM", "TP. Hồ Chí Minh", "Miền Nam"),
        new("TAY_NINH", "Tây Ninh", "Miền Nam"),
        new("DONG_NAI", "TP. Đồng Nai", "Miền Nam"),
        new("AN_GIANG", "An Giang", "Miền Tây"),
        new("CAN_THO", "TP. Cần Thơ", "Miền Tây"),
        new("DONG_THAP", "Đồng Tháp", "Miền Tây"),
        new("VINH_LONG", "Vĩnh Long", "Miền Tây"),
        new("CA_MAU", "Cà Mau", "Miền Tây"),
    ];
    private static readonly Dictionary<string, string> Aliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["HA_GIANG"] = "TUYEN_QUANG",
        ["YEN_BAI"] = "LAO_CAI",
        ["BAC_KAN"] = "THAI_NGUYEN",
        ["VINH_PHUC"] = "PHU_THO",
        ["HOA_BINH"] = "PHU_THO",
        ["BAC_GIANG"] = "BAC_NINH",
        ["HAI_DUONG"] = "HAI_PHONG",
        ["THAI_BINH"] = "HUNG_YEN",
        ["HA_NAM"] = "NINH_BINH",
        ["NAM_DINH"] = "NINH_BINH",
        ["QUANG_BINH"] = "QUANG_TRI",
        ["THUA_THIEN_HUE"] = "HUE",
        ["QUANG_NAM"] = "DA_NANG",
        ["KON_TUM"] = "QUANG_NGAI",
        ["BINH_DINH"] = "GIA_LAI",
        ["NINH_THUAN"] = "KHANH_HOA",
        ["PHU_YEN"] = "DAK_LAK",
        ["DAK_NONG"] = "LAM_DONG",
        ["BINH_THUAN"] = "LAM_DONG",
        ["BINH_PHUOC"] = "DONG_NAI",
        ["BINH_DUONG"] = "TP_HCM",
        ["BA_RIA_VUNG_TAU"] = "TP_HCM",
        ["LONG_AN"] = "TAY_NINH",
        ["TIEN_GIANG"] = "DONG_THAP",
        ["BEN_TRE"] = "VINH_LONG",
        ["TRA_VINH"] = "VINH_LONG",
        ["KIEN_GIANG"] = "AN_GIANG",
        ["SOC_TRANG"] = "CAN_THO",
        ["HAU_GIANG"] = "CAN_THO",
        ["BAC_LIEU"] = "CA_MAU",
    };
    private static readonly Dictionary<string, string> HistoricNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["TP. Hà Nội"] = "HA_NOI",
        ["Quảng Ninh"] = "QUANG_NINH",
        ["Lào Cai"] = "LAO_CAI",
        ["Hà Giang"] = "HA_GIANG",
        ["Ninh Bình"] = "NINH_BINH",
        ["TP. Hải Phòng"] = "HAI_PHONG",
        ["Cao Bằng"] = "CAO_BANG",
        ["Bắc Kạn"] = "BAC_KAN",
        ["Sơn La"] = "SON_LA",
        ["Điện Biên"] = "DIEN_BIEN",
        ["Lai Châu"] = "LAI_CHAU",
        ["Yên Bái"] = "YEN_BAI",
        ["Hòa Bình"] = "HOA_BINH",
        ["Tuyên Quang"] = "TUYEN_QUANG",
        ["Lạng Sơn"] = "LANG_SON",
        ["Thái Nguyên"] = "THAI_NGUYEN",
        ["Phú Thọ"] = "PHU_THO",
        ["Vĩnh Phúc"] = "VINH_PHUC",
        ["Bắc Giang"] = "BAC_GIANG",
        ["Bắc Ninh"] = "BAC_NINH",
        ["Hải Dương"] = "HAI_DUONG",
        ["Hưng Yên"] = "HUNG_YEN",
        ["Hà Nam"] = "HA_NAM",
        ["Nam Định"] = "NAM_DINH",
        ["Thái Bình"] = "THAI_BINH",
        ["TP. Đà Nẵng"] = "DA_NANG",
        ["Quảng Nam"] = "QUANG_NAM",
        ["Thừa Thiên Huế"] = "THUA_THIEN_HUE",
        ["Khánh Hòa"] = "KHANH_HOA",
        ["Bình Định"] = "BINH_DINH",
        ["Phú Yên"] = "PHU_YEN",
        ["Bình Thuận"] = "BINH_THUAN",
        ["Ninh Thuận"] = "NINH_THUAN",
        ["Quảng Bình"] = "QUANG_BINH",
        ["Quảng Trị"] = "QUANG_TRI",
        ["Quảng Ngãi"] = "QUANG_NGAI",
        ["Thanh Hóa"] = "THANH_HOA",
        ["Nghệ An"] = "NGHE_AN",
        ["Hà Tĩnh"] = "HA_TINH",
        ["Lâm Đồng"] = "LAM_DONG",
        ["Đắk Lắk"] = "DAK_LAK",
        ["Đắk Nông"] = "DAK_NONG",
        ["Gia Lai"] = "GIA_LAI",
        ["Kon Tum"] = "KON_TUM",
        ["TP. Hồ Chí Minh"] = "TP_HCM",
        ["Bà Rịa - Vũng Tàu"] = "BA_RIA_VUNG_TAU",
        ["Tây Ninh"] = "TAY_NINH",
        ["Đồng Nai"] = "DONG_NAI",
        ["Bình Dương"] = "BINH_DUONG",
        ["Bình Phước"] = "BINH_PHUOC",
        ["Kiên Giang"] = "KIEN_GIANG",
        ["TP. Cần Thơ"] = "CAN_THO",
        ["An Giang"] = "AN_GIANG",
        ["Tiền Giang"] = "TIEN_GIANG",
        ["Bến Tre"] = "BEN_TRE",
        ["Vĩnh Long"] = "VINH_LONG",
        ["Đồng Tháp"] = "DONG_THAP",
        ["Cà Mau"] = "CA_MAU",
        ["Bạc Liêu"] = "BAC_LIEU",
        ["Sóc Trăng"] = "SOC_TRANG",
        ["Trà Vinh"] = "TRA_VINH",
        ["Hậu Giang"] = "HAU_GIANG",
        ["Long An"] = "LONG_AN",
    };
    public static string NormalizeCode(string? code) => (code ?? "").Trim().ToUpperInvariant();
    public static string CurrentCode(string? code) { var c = NormalizeCode(code); return Aliases.GetValueOrDefault(c, c); }
    public static bool IsValidCode(string? code) => All.Any(p => p.Code == CurrentCode(code));
    public static ProvinceCatalogItem? Find(string? code) => All.FirstOrDefault(p => p.Code == CurrentCode(code));
    public static string[] NormalizeDistinct(IEnumerable<string>? codes) => (codes ?? []).Select(NormalizeCode).Where(c => c.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    public static string[] CurrentCodes(IEnumerable<string>? codes) => NormalizeDistinct(codes).Select(CurrentCode).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    public static string[] ExpandFilter(IEnumerable<string> codes) {
        var current = CurrentCodes(codes);
        return current.Concat(Aliases.Where(a => current.Contains(a.Value)).Select(a => a.Key)).Distinct().ToArray();
    }
    public static bool MatchesName(string? value, string code) {
        var name = value?.Trim();
        if (string.IsNullOrEmpty(name)) return false;
        if (CurrentCode(name) == CurrentCode(code)) return true;
        static string Plain(string s) => System.Text.RegularExpressions.Regex.Replace(s.Trim(), @"^(tỉnh|thành phố|TP\.)\s*", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return All.Any(p => p.Code == CurrentCode(code) && string.Equals(Plain(p.Name), Plain(name), StringComparison.OrdinalIgnoreCase)) ||
            HistoricNames.Any(p => CurrentCode(p.Value) == CurrentCode(code) && string.Equals(Plain(p.Key), Plain(name), StringComparison.OrdinalIgnoreCase));
    }
}
