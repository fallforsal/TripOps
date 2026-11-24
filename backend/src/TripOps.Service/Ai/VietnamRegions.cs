namespace TripOps.Service.Ai;

/// <summary>
/// Vùng miền du lịch để chatbot hiểu câu hỏi kiểu "tour miền Tây", "tour Tây Bắc".
/// Dữ liệu tỉnh/vùng/địa danh lấy theo danh mục frontend (frontend/src/app/data/vietnamProvinces.ts, LEGACY_PROVINCES và PROVINCE_ALIASES);
/// sửa danh mục ở đó thì cập nhật ở đây.
/// </summary>
public static class VietnamRegions
{
    public sealed record Province(string Code, string Region, string[] Places);

    /// <summary>Tỉnh theo địa giới cũ (trước sáp nhập 2025) để giữ đúng vùng của từng địa danh.</summary>
    public static readonly IReadOnlyList<Province> Provinces =
    [
        new("HA_NOI", "Miền Bắc", ["Hà Nội", "Phố cổ Hà Nội", "Ba Vì", "Sóc Sơn", "Làng cổ Đường Lâm"]),
        new("QUANG_NINH", "Miền Bắc", ["Quảng Ninh", "Hạ Long", "Vịnh Hạ Long", "Bãi Cháy", "Tuần Châu", "Yên Tử", "Cô Tô", "Bình Liêu", "Móng Cái"]),
        new("LAO_CAI", "Miền Bắc", ["Lào Cai", "Sapa", "Sa Pa", "Fansipan", "Bắc Hà", "Y Tý"]),
        new("HA_GIANG", "Miền Bắc", ["Hà Giang", "Đồng Văn", "Mèo Vạc", "Lũng Cú", "Sông Nho Quế", "Hoàng Su Phì"]),
        new("NINH_BINH", "Miền Bắc", ["Ninh Bình", "Tràng An", "Tam Cốc", "Bái Đính", "Hang Múa", "Cúc Phương"]),
        new("HAI_PHONG", "Miền Bắc", ["Hải Phòng", "Cát Bà", "Đồ Sơn", "Vịnh Lan Hạ"]),
        new("CAO_BANG", "Miền Bắc", ["Cao Bằng", "Thác Bản Giốc", "Pác Bó", "Hồ Thang Hen"]),
        new("BAC_KAN", "Miền Bắc", ["Bắc Kạn", "Hồ Ba Bể"]),
        new("SON_LA", "Miền Bắc", ["Sơn La", "Mộc Châu", "Tà Xùa", "Bắc Yên"]),
        new("DIEN_BIEN", "Miền Bắc", ["Điện Biên", "Điện Biên Phủ", "Pha Đin", "A Pa Chải"]),
        new("LAI_CHAU", "Miền Bắc", ["Lai Châu", "Ô Quy Hồ", "Sìn Hồ"]),
        new("YEN_BAI", "Miền Bắc", ["Yên Bái", "Mù Cang Chải", "Tú Lệ", "Trạm Tấu", "Hồ Thác Bà"]),
        new("HOA_BINH", "Miền Bắc", ["Hòa Bình", "Mai Châu", "Thung Nai", "Kim Bôi"]),
        new("TUYEN_QUANG", "Miền Bắc", ["Tuyên Quang", "Na Hang", "Tân Trào"]),
        new("LANG_SON", "Miền Bắc", ["Lạng Sơn", "Mẫu Sơn", "Bắc Sơn", "Đồng Đăng"]),
        new("THAI_NGUYEN", "Miền Bắc", ["Thái Nguyên", "Hồ Núi Cốc", "Đồi chè Tân Cương"]),
        new("PHU_THO", "Miền Bắc", ["Phú Thọ", "Đền Hùng", "Việt Trì", "Thanh Thủy", "Xuân Sơn"]),
        new("VINH_PHUC", "Miền Bắc", ["Vĩnh Phúc", "Tam Đảo", "Đại Lải", "Tây Thiên"]),
        new("BAC_GIANG", "Miền Bắc", ["Bắc Giang", "Tây Yên Tử", "Khuôn Thần"]),
        new("BAC_NINH", "Miền Bắc", ["Bắc Ninh", "Chùa Dâu", "Chùa Phật Tích", "Đền Đô"]),
        new("HAI_DUONG", "Miền Bắc", ["Hải Dương", "Côn Sơn", "Kiếp Bạc"]),
        new("HUNG_YEN", "Miền Bắc", ["Hưng Yên", "Phố Hiến", "Làng Nôm"]),
        new("HA_NAM", "Miền Bắc", ["Hà Nam", "Chùa Tam Chúc", "Địa Tạng Phi Lai Tự"]),
        new("NAM_DINH", "Miền Bắc", ["Nam Định", "Đền Trần", "Phủ Dầy", "Vườn quốc gia Xuân Thủy"]),
        new("THAI_BINH", "Miền Bắc", ["Thái Bình", "Chùa Keo", "Biển Cồn Vành", "Biển Đồng Châu"]),
        new("DA_NANG", "Miền Trung", ["Đà Nẵng", "Bà Nà Hills", "Sơn Trà", "Biển Mỹ Khê", "Ngũ Hành Sơn", "Cầu Rồng"]),
        new("QUANG_NAM", "Miền Trung", ["Quảng Nam", "Hội An", "Phố cổ Hội An", "Cù Lao Chàm", "Thánh địa Mỹ Sơn", "Tam Kỳ", "Rừng dừa Bảy Mẫu"]),
        new("THUA_THIEN_HUE", "Miền Trung", ["Thừa Thiên Huế", "Huế", "Cố đô Huế", "Đại Nội Huế", "Lăng Cô", "Phá Tam Giang", "Bạch Mã"]),
        new("KHANH_HOA", "Miền Trung", ["Khánh Hòa", "Nha Trang", "Cam Ranh", "Vịnh Ninh Vân", "Đảo Hòn Mun", "Đảo Bình Ba", "VinWonders Nha Trang", "Dốc Lết"]),
        new("BINH_DINH", "Miền Trung", ["Bình Định", "Quy Nhơn", "Kỳ Co", "Eo Gió", "Ghềnh Ráng", "Hầm Hô", "Cù Lao Xanh"]),
        new("PHU_YEN", "Miền Trung", ["Phú Yên", "Tuy Hòa", "Ghềnh Đá Đĩa", "Bãi Xép", "Mũi Điện", "Vịnh Vũng Rô"]),
        new("BINH_THUAN", "Miền Trung", ["Bình Thuận", "Mũi Né", "Phan Thiết", "Mũi Né - Phan Thiết", "Đồi Cát Bay", "Bàu Trắng", "Đảo Phú Quý", "Kê Gà"]),
        new("NINH_THUAN", "Miền Trung", ["Ninh Thuận", "Phan Rang", "Vịnh Vĩnh Hy", "Hang Rái", "Đồi cát Nam Cương"]),
        new("QUANG_BINH", "Miền Trung", ["Quảng Bình", "Phong Nha", "Kẻ Bàng", "Động Thiên Đường", "Đồng Hới", "Biển Nhật Lệ"]),
        new("QUANG_TRI", "Miền Trung", ["Quảng Trị", "Thành cổ Quảng Trị", "Địa đạo Vịnh Mốc", "Cầu Hiền Lương", "Đảo Cồn Cỏ"]),
        new("QUANG_NGAI", "Miền Trung", ["Quảng Ngãi", "Đảo Lý Sơn", "Biển Mỹ Khê Quảng Ngãi", "Sa Huỳnh"]),
        new("THANH_HOA", "Miền Trung", ["Thanh Hóa", "Sầm Sơn", "Pù Luông", "Hải Tiến", "Thành Nhà Hồ", "Lam Kinh"]),
        new("NGHE_AN", "Miền Trung", ["Nghệ An", "Cửa Lò", "Vinh", "Làng Sen", "Kim Liên", "Pù Mát"]),
        new("HA_TINH", "Miền Trung", ["Hà Tĩnh", "Biển Thiên Cầm", "Ngã ba Đồng Lộc", "Chùa Hương Tích"]),
        new("LAM_DONG", "Tây Nguyên", ["Lâm Đồng", "Đà Lạt", "Bảo Lộc", "Langbiang", "Hồ Tuyền Lâm", "Hồ Xuân Hương", "Thác Datanla", "Đồi chè Cầu Đất"]),
        new("DAK_LAK", "Tây Nguyên", ["Đắk Lắk", "Buôn Ma Thuột", "Buôn Đôn", "Hồ Lắk", "Thác Dray Nur"]),
        new("DAK_NONG", "Tây Nguyên", ["Đắk Nông", "Gia Nghĩa", "Hồ Tà Đùng", "Công viên địa chất Đắk Nông"]),
        new("GIA_LAI", "Tây Nguyên", ["Gia Lai", "Pleiku", "Biển Hồ", "Chư Đăng Ya", "Thác Phú Cường"]),
        new("KON_TUM", "Tây Nguyên", ["Kon Tum", "Măng Đen", "Nhà thờ gỗ Kon Tum", "Ngã ba Đông Dương"]),
        new("TP_HCM", "Miền Nam", ["Hồ Chí Minh", "TP. Hồ Chí Minh", "TP.HCM", "Sài Gòn", "Củ Chi", "Cần Giờ", "Bến Nhà Rồng"]),
        new("BA_RIA_VUNG_TAU", "Miền Nam", ["Bà Rịa - Vũng Tàu", "Vũng Tàu", "Hồ Tràm", "Côn Đảo", "Long Hải", "Bình Châu"]),
        new("TAY_NINH", "Miền Nam", ["Tây Ninh", "Núi Bà Đen", "Tòa Thánh Tây Ninh", "Hồ Dầu Tiếng"]),
        new("DONG_NAI", "Miền Nam", ["Đồng Nai", "Biên Hòa", "Vườn quốc gia Cát Tiên", "Hồ Trị An", "Thác Giang Điền"]),
        new("BINH_DUONG", "Miền Nam", ["Bình Dương", "Thủ Dầu Một", "Đại Nam", "Hồ Dầu Tiếng"]),
        new("BINH_PHUOC", "Miền Nam", ["Bình Phước", "Bù Gia Mập", "Núi Bà Rá", "Trảng cỏ Bù Lạch"]),
        new("KIEN_GIANG", "Miền Tây", ["Kiên Giang", "Phú Quốc", "Đảo Phú Quốc", "Hà Tiên", "Quần đảo Nam Du", "Rạch Giá", "Hòn Sơn", "Bắc Đảo Phú Quốc", "Nam Đảo Phú Quốc"]),
        new("CAN_THO", "Miền Tây", ["Cần Thơ", "Cần Thơ - Miền Tây", "Bến Ninh Kiều", "Chợ nổi Cái Răng", "Nhà cổ Bình Thủy", "Cồn Sơn"]),
        new("AN_GIANG", "Miền Tây", ["An Giang", "Châu Đốc", "Rừng tràm Trà Sư", "Núi Cấm", "Miếu Bà Chúa Xứ", "Long Xuyên"]),
        new("TIEN_GIANG", "Miền Tây", ["Tiền Giang", "Mỹ Tho", "Cù lao Thới Sơn", "Cái Bè", "Chùa Vĩnh Tràng"]),
        new("BEN_TRE", "Miền Tây", ["Bến Tre", "Cồn Phụng", "Cồn Quy", "Châu Thành Bến Tre"]),
        new("VINH_LONG", "Miền Tây", ["Vĩnh Long", "Cù lao An Bình", "Vương quốc gạch gốm Mang Thít"]),
        new("DONG_THAP", "Miền Tây", ["Đồng Tháp", "Sa Đéc", "Làng hoa Sa Đéc", "Tràm Chim", "Xẻo Quýt", "Cao Lãnh"]),
        new("CA_MAU", "Miền Tây", ["Cà Mau", "Đất Mũi Cà Mau", "Rừng U Minh Hạ", "Hòn Khoai"]),
        new("BAC_LIEU", "Miền Tây", ["Bạc Liêu", "Nhà công tử Bạc Liêu", "Cánh đồng điện gió Bạc Liêu"]),
        new("SOC_TRANG", "Miền Tây", ["Sóc Trăng", "Chùa Dơi", "Chùa Som Rong", "Chợ nổi Ngã Năm"]),
        new("TRA_VINH", "Miền Tây", ["Trà Vinh", "Ao Bà Om", "Chùa Âng", "Cồn Chim"]),
        new("HAU_GIANG", "Miền Tây", ["Hậu Giang", "Vị Thanh", "Khu bảo tồn thiên nhiên Lung Ngọc Hoàng"]),
        new("LONG_AN", "Miền Tây", ["Long An", "Làng nổi Tân Lập", "Tân An"]),
    ];

    /// <summary>Mã tỉnh cũ → mã tỉnh sau sáp nhập 2025 (mã tour đang lưu).</summary>
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

    private static readonly string[] North = Codes("Miền Bắc");
    private static readonly string[] Central = Codes("Miền Trung");
    private static readonly string[] Highlands = Codes("Tây Nguyên");
    private static readonly string[] Southeast = Codes("Miền Nam");
    private static readonly string[] Mekong = Codes("Miền Tây");

    /// <summary>Cụm từ (đã bỏ dấu) → các tỉnh thuộc vùng. Cụm dài được xét trước ("dong nam bo" trước "nam bo").</summary>
    private static readonly (string Phrase, string Label, string[] Codes)[] Phrases =
    [
        ("dong bang song cuu long", "miền Tây", Mekong), ("song cuu long", "miền Tây", Mekong), ("mien song nuoc", "miền Tây", Mekong),
        ("tay nam bo", "miền Tây", Mekong), ("mien tay", "miền Tây", Mekong),
        ("dong bang song hong", "đồng bằng sông Hồng", ["HA_NOI", "HAI_PHONG", "NINH_BINH", "VINH_PHUC", "BAC_NINH", "HAI_DUONG", "HUNG_YEN", "HA_NAM", "NAM_DINH", "THAI_BINH"]),
        ("vung nui phia bac", "vùng núi phía Bắc", ["LAO_CAI", "YEN_BAI", "DIEN_BIEN", "LAI_CHAU", "SON_LA", "HOA_BINH", "HA_GIANG", "CAO_BANG", "BAC_KAN", "LANG_SON", "TUYEN_QUANG", "THAI_NGUYEN", "PHU_THO", "BAC_GIANG", "QUANG_NINH"]),
        ("tay bac", "Tây Bắc", ["LAO_CAI", "YEN_BAI", "DIEN_BIEN", "LAI_CHAU", "SON_LA", "HOA_BINH"]),
        ("dong bac", "Đông Bắc", ["HA_GIANG", "CAO_BANG", "BAC_KAN", "LANG_SON", "TUYEN_QUANG", "THAI_NGUYEN", "PHU_THO", "BAC_GIANG", "QUANG_NINH"]),
        ("bac trung bo", "Bắc Trung Bộ", ["THANH_HOA", "NGHE_AN", "HA_TINH", "QUANG_BINH", "QUANG_TRI", "THUA_THIEN_HUE"]),
        ("nam trung bo", "Nam Trung Bộ", ["DA_NANG", "QUANG_NAM", "QUANG_NGAI", "BINH_DINH", "PHU_YEN", "KHANH_HOA", "NINH_THUAN", "BINH_THUAN"]),
        ("dong nam bo", "Đông Nam Bộ", Southeast),
        ("tay nguyen", "Tây Nguyên", Highlands), ("cao nguyen", "Tây Nguyên", Highlands),
        ("mien bac", "miền Bắc", North), ("bac bo", "miền Bắc", North), ("phia bac", "miền Bắc", North), ("ngoai bac", "miền Bắc", North),
        ("mien trung", "miền Trung", Central), ("trung bo", "miền Trung", Central),
        ("mien nam", "miền Nam", [.. Southeast, .. Mekong]), ("nam bo", "miền Nam", [.. Southeast, .. Mekong]),
        ("phia nam", "miền Nam", [.. Southeast, .. Mekong]), ("trong nam", "miền Nam", [.. Southeast, .. Mekong]),
    ];

    /// <summary>Vùng miền khách nhắc trong câu hỏi.</summary>
    /// <param name="folded">Câu hỏi đã bỏ dấu, chữ thường (<see cref="GuestAssistantKnowledge.Fold"/>).</param>
    /// <returns>Các tỉnh (mã cũ) thuộc vùng, tên vùng và phần câu hỏi còn lại (Remainder) sau khi bỏ cụm vùng miền; null nếu không nhắc vùng nào.</returns>
    public static (HashSet<string> Codes, IReadOnlyList<string> Labels, string Remainder)? Detect(string folded)
    {
        var text = $" {folded} ";
        var codes = new HashSet<string>(StringComparer.Ordinal);
        var labels = new List<string>();
        foreach (var (phrase, label, members) in Phrases)
        {
            if (!text.Contains($" {phrase} ", StringComparison.Ordinal)) continue;
            text = text.Replace($" {phrase} ", " ", StringComparison.Ordinal);
            codes.UnionWith(members);
            if (!labels.Contains(label)) labels.Add(label);
        }
        return codes.Count == 0 ? null : (codes, labels, string.Join(' ', text.Split(' ', StringSplitOptions.RemoveEmptyEntries)));
    }

    /// <summary>
    /// Tour thuộc vùng: mã tỉnh của tour chỉ gồm các tỉnh trong vùng (mã sau sáp nhập gộp nhiều vùng thì không tính),
    /// hoặc tên/điểm đến của tour nhắc tới tỉnh, địa danh trong vùng.
    /// </summary>
    public static bool Matches(IEnumerable<string> tourProvinceCodes, string foldedTourText, HashSet<string> region)
    {
        foreach (var raw in tourProvinceCodes)
        {
            var current = Current(raw);
            var members = Provinces.Where(p => Current(p.Code) == current).Select(p => p.Code).ToList();
            if (members.Count == 0 && region.Contains(current)) return true;
            if (members.Count > 0 && members.All(region.Contains)) return true;
        }
        var text = $" {foldedTourText} ";
        return Provinces.Where(p => region.Contains(p.Code))
            .SelectMany(p => FoldedPlaces[p.Code])
            .Any(place => text.Contains($" {place} ", StringComparison.Ordinal));
    }

    /// <summary>
    /// Tỉnh (địa giới cũ) giáp ranh, dùng để gợi ý "tour gần" khi chưa có tour đúng điểm đến.
    /// Chỉ ghi tỉnh có chung đường biên; bảng được làm đối xứng khi nạp.
    /// </summary>
    private static readonly Dictionary<string, string[]> Borders = new(StringComparer.Ordinal)
    {
        ["HA_GIANG"] = ["LAO_CAI", "YEN_BAI", "TUYEN_QUANG", "CAO_BANG"],
        ["LAO_CAI"] = ["HA_GIANG", "YEN_BAI", "LAI_CHAU"],
        ["YEN_BAI"] = ["LAO_CAI", "HA_GIANG", "TUYEN_QUANG", "PHU_THO", "SON_LA", "LAI_CHAU"],
        ["LAI_CHAU"] = ["LAO_CAI", "YEN_BAI", "SON_LA", "DIEN_BIEN"],
        ["DIEN_BIEN"] = ["LAI_CHAU", "SON_LA"],
        ["SON_LA"] = ["DIEN_BIEN", "LAI_CHAU", "YEN_BAI", "PHU_THO", "HOA_BINH", "THANH_HOA"],
        ["HOA_BINH"] = ["SON_LA", "PHU_THO", "HA_NOI", "HA_NAM", "NINH_BINH", "THANH_HOA"],
        ["CAO_BANG"] = ["HA_GIANG", "BAC_KAN", "LANG_SON", "TUYEN_QUANG"],
        ["BAC_KAN"] = ["CAO_BANG", "LANG_SON", "THAI_NGUYEN", "TUYEN_QUANG"],
        ["TUYEN_QUANG"] = ["HA_GIANG", "CAO_BANG", "BAC_KAN", "THAI_NGUYEN", "VINH_PHUC", "PHU_THO", "YEN_BAI"],
        ["LANG_SON"] = ["CAO_BANG", "BAC_KAN", "THAI_NGUYEN", "BAC_GIANG", "QUANG_NINH"],
        ["THAI_NGUYEN"] = ["BAC_KAN", "TUYEN_QUANG", "LANG_SON", "BAC_GIANG", "VINH_PHUC", "HA_NOI"],
        ["PHU_THO"] = ["YEN_BAI", "TUYEN_QUANG", "VINH_PHUC", "HA_NOI", "HOA_BINH", "SON_LA"],
        ["VINH_PHUC"] = ["TUYEN_QUANG", "THAI_NGUYEN", "PHU_THO", "HA_NOI"],
        ["BAC_GIANG"] = ["LANG_SON", "THAI_NGUYEN", "QUANG_NINH", "HAI_DUONG", "BAC_NINH", "HA_NOI"],
        ["BAC_NINH"] = ["BAC_GIANG", "HA_NOI", "HUNG_YEN", "HAI_DUONG"],
        ["QUANG_NINH"] = ["LANG_SON", "BAC_GIANG", "HAI_DUONG", "HAI_PHONG"],
        ["HA_NOI"] = ["VINH_PHUC", "THAI_NGUYEN", "BAC_GIANG", "BAC_NINH", "HUNG_YEN", "HA_NAM", "HOA_BINH", "PHU_THO"],
        ["HAI_PHONG"] = ["QUANG_NINH", "HAI_DUONG", "THAI_BINH"],
        ["HAI_DUONG"] = ["BAC_GIANG", "QUANG_NINH", "HAI_PHONG", "THAI_BINH", "HUNG_YEN", "BAC_NINH"],
        ["HUNG_YEN"] = ["HA_NOI", "BAC_NINH", "HAI_DUONG", "THAI_BINH", "HA_NAM"],
        ["THAI_BINH"] = ["HAI_PHONG", "HAI_DUONG", "HUNG_YEN", "HA_NAM", "NAM_DINH"],
        ["HA_NAM"] = ["HA_NOI", "HUNG_YEN", "THAI_BINH", "NAM_DINH", "NINH_BINH", "HOA_BINH"],
        ["NAM_DINH"] = ["THAI_BINH", "HA_NAM", "NINH_BINH"],
        ["NINH_BINH"] = ["HA_NAM", "NAM_DINH", "HOA_BINH", "THANH_HOA"],
        ["THANH_HOA"] = ["NINH_BINH", "HOA_BINH", "SON_LA", "NGHE_AN"],
        ["NGHE_AN"] = ["THANH_HOA", "HA_TINH"],
        ["HA_TINH"] = ["NGHE_AN", "QUANG_BINH"],
        ["QUANG_BINH"] = ["HA_TINH", "QUANG_TRI"],
        ["QUANG_TRI"] = ["QUANG_BINH", "THUA_THIEN_HUE"],
        ["THUA_THIEN_HUE"] = ["QUANG_TRI", "DA_NANG", "QUANG_NAM"],
        ["DA_NANG"] = ["THUA_THIEN_HUE", "QUANG_NAM"],
        ["QUANG_NAM"] = ["DA_NANG", "THUA_THIEN_HUE", "QUANG_NGAI", "KON_TUM"],
        ["QUANG_NGAI"] = ["QUANG_NAM", "KON_TUM", "BINH_DINH"],
        ["BINH_DINH"] = ["QUANG_NGAI", "GIA_LAI", "PHU_YEN"],
        ["PHU_YEN"] = ["BINH_DINH", "GIA_LAI", "DAK_LAK", "KHANH_HOA"],
        ["KHANH_HOA"] = ["PHU_YEN", "DAK_LAK", "LAM_DONG", "NINH_THUAN"],
        ["NINH_THUAN"] = ["KHANH_HOA", "LAM_DONG", "BINH_THUAN"],
        ["BINH_THUAN"] = ["NINH_THUAN", "LAM_DONG", "DONG_NAI", "BA_RIA_VUNG_TAU"],
        ["KON_TUM"] = ["QUANG_NAM", "QUANG_NGAI", "GIA_LAI"],
        ["GIA_LAI"] = ["KON_TUM", "QUANG_NGAI", "BINH_DINH", "PHU_YEN", "DAK_LAK"],
        ["DAK_LAK"] = ["GIA_LAI", "PHU_YEN", "KHANH_HOA", "LAM_DONG", "DAK_NONG"],
        ["DAK_NONG"] = ["DAK_LAK", "LAM_DONG", "BINH_PHUOC"],
        ["LAM_DONG"] = ["DAK_LAK", "DAK_NONG", "KHANH_HOA", "NINH_THUAN", "BINH_THUAN", "DONG_NAI"],
        ["TP_HCM"] = ["BINH_DUONG", "DONG_NAI", "BA_RIA_VUNG_TAU", "LONG_AN", "TAY_NINH", "TIEN_GIANG"],
        ["BA_RIA_VUNG_TAU"] = ["TP_HCM", "DONG_NAI", "BINH_THUAN"],
        ["DONG_NAI"] = ["TP_HCM", "BINH_DUONG", "BINH_PHUOC", "LAM_DONG", "BINH_THUAN", "BA_RIA_VUNG_TAU"],
        ["BINH_DUONG"] = ["TP_HCM", "DONG_NAI", "BINH_PHUOC", "TAY_NINH"],
        ["BINH_PHUOC"] = ["BINH_DUONG", "DONG_NAI", "DAK_NONG", "TAY_NINH"],
        ["TAY_NINH"] = ["TP_HCM", "BINH_DUONG", "BINH_PHUOC", "LONG_AN"],
        ["LONG_AN"] = ["TP_HCM", "TAY_NINH", "TIEN_GIANG", "DONG_THAP"],
        ["TIEN_GIANG"] = ["LONG_AN", "TP_HCM", "BEN_TRE", "VINH_LONG", "DONG_THAP"],
        ["BEN_TRE"] = ["TIEN_GIANG", "VINH_LONG", "TRA_VINH"],
        ["VINH_LONG"] = ["TIEN_GIANG", "BEN_TRE", "TRA_VINH", "CAN_THO", "DONG_THAP", "SOC_TRANG"],
        ["TRA_VINH"] = ["BEN_TRE", "VINH_LONG", "SOC_TRANG"],
        ["DONG_THAP"] = ["LONG_AN", "TIEN_GIANG", "VINH_LONG", "CAN_THO", "AN_GIANG"],
        ["AN_GIANG"] = ["DONG_THAP", "CAN_THO", "KIEN_GIANG"],
        ["KIEN_GIANG"] = ["AN_GIANG", "CAN_THO", "HAU_GIANG", "CA_MAU", "BAC_LIEU"],
        ["CAN_THO"] = ["AN_GIANG", "DONG_THAP", "VINH_LONG", "HAU_GIANG", "KIEN_GIANG"],
        ["HAU_GIANG"] = ["CAN_THO", "SOC_TRANG", "BAC_LIEU", "KIEN_GIANG", "VINH_LONG"],
        ["SOC_TRANG"] = ["HAU_GIANG", "BAC_LIEU", "TRA_VINH", "VINH_LONG", "CAN_THO"],
        ["BAC_LIEU"] = ["SOC_TRANG", "HAU_GIANG", "KIEN_GIANG", "CA_MAU"],
        ["CA_MAU"] = ["BAC_LIEU", "KIEN_GIANG"],
    };

    private static readonly Dictionary<string, HashSet<string>> Neighbours = BuildNeighbours();

    private static Dictionary<string, HashSet<string>> BuildNeighbours()
    {
        var map = Provinces.ToDictionary(p => p.Code, _ => new HashSet<string>(StringComparer.Ordinal), StringComparer.Ordinal);
        foreach (var (code, list) in Borders)
            foreach (var other in list)
            {
                if (!map.ContainsKey(code) || !map.ContainsKey(other) || code == other) continue;
                map[code].Add(other); map[other].Add(code);
            }
        return map;
    }

    // Tên địa danh quá chung, dễ khớp nhầm trong câu ("vinh" trong "vịnh"), không dùng để nhận tỉnh.
    private static readonly HashSet<string> AmbiguousPlaces = new(StringComparer.Ordinal) { "vinh" };

    /// <summary>Địa danh/tỉnh khách nhắc trong câu hỏi (cụm dài được xét trước, mỗi cụm chỉ tính một lần).</summary>
    /// <param name="folded">Câu hỏi đã bỏ dấu, chữ thường.</param>
    /// <returns>Mã tỉnh (địa giới cũ), tên địa danh như khách nhắc và phần câu còn lại; null nếu không nhắc địa danh nào.</returns>
    public static (HashSet<string> Codes, IReadOnlyList<string> Names, string Remainder)? DetectPlaces(string folded)
    {
        var text = $" {folded} ";
        var codes = new HashSet<string>(StringComparer.Ordinal);
        var names = new List<string>();
        foreach (var (code, place, original) in PlaceIndex)
        {
            if (!text.Contains($" {place} ", StringComparison.Ordinal)) continue;
            text = text.Replace($" {place} ", " ", StringComparison.Ordinal);
            codes.Add(code);
            if (!names.Contains(original)) names.Add(original);
        }
        return codes.Count == 0 ? null : (codes, names, string.Join(' ', text.Split(' ', StringSplitOptions.RemoveEmptyEntries)));
    }

    /// <summary>Tỉnh giáp ranh của các tỉnh khách hỏi (không gồm chính các tỉnh đó).</summary>
    public static HashSet<string> NearbyOf(IEnumerable<string> codes)
    {
        var asked = codes.ToHashSet(StringComparer.Ordinal);
        var result = new HashSet<string>(StringComparer.Ordinal);
        foreach (var code in asked)
            if (Neighbours.TryGetValue(code, out var list)) result.UnionWith(list);
        result.ExceptWith(asked);
        return result;
    }

    /// <summary>Mã tỉnh chỉ một vùng địa lý: mã cũ trước sáp nhập, hoặc mã mới không gộp tỉnh nào ("LAM_DONG" mới gồm cả Bình Thuận nên không tính).</summary>
    public static bool IsSpecific(string code)
    {
        var key = code.Trim().ToUpperInvariant();
        return Aliases.ContainsKey(key) || Provinces.Count(p => Current(p.Code) == key) <= 1;
    }

    /// <summary>Tên hiển thị của tỉnh (địa giới cũ), ví dụ "LAO_CAI" → "Lào Cai".</summary>
    public static string Name(string code) => Provinces.FirstOrDefault(p => p.Code == code)?.Places[0] ?? code;

    /// <summary>
    /// Tour ở vùng lân cận: mã tỉnh trên tour là mã cũ thuộc <paramref name="codes"/>, hoặc mã mới mà mọi tỉnh cũ gộp vào
    /// đều nằm trong vùng lân cận hay chính nơi khách hỏi (<paramref name="asked"/>) — mã mới gộp cả tỉnh xa thì không đoán theo mã;
    /// hoặc tên/điểm đến của tour nhắc tới tỉnh, địa danh lân cận.
    /// </summary>
    public static bool Touches(IEnumerable<string> tourProvinceCodes, string foldedTourText, HashSet<string> codes, HashSet<string> asked)
    {
        foreach (var raw in tourProvinceCodes)
        {
            var key = raw.Trim().ToUpperInvariant();
            if (Aliases.ContainsKey(key)) { if (codes.Contains(key)) return true; continue; }
            var members = Provinces.Where(p => Current(p.Code) == key).Select(p => p.Code).ToList();
            if (members.Count > 0 && members.Any(codes.Contains) && members.All(m => codes.Contains(m) || asked.Contains(m))) return true;
        }
        var text = $" {foldedTourText} ";
        return codes.Where(FoldedPlaces.ContainsKey).SelectMany(c => FoldedPlaces[c])
            .Any(place => text.Contains($" {place} ", StringComparison.Ordinal));
    }

    private static readonly (string Code, string Place, string Original)[] PlaceIndex = Provinces
        .SelectMany(p => p.Places.Select(original => (p.Code, Place: GuestAssistantKnowledge.Fold(original), Original: original)))
        .Where(x => x.Place.Length >= 3 && !AmbiguousPlaces.Contains(x.Place))
        .DistinctBy(x => x.Place)
        .OrderByDescending(x => x.Place.Length)
        .ToArray();

    private static readonly Dictionary<string, string[]> FoldedPlaces = Provinces.ToDictionary(p => p.Code,
        p => p.Places.Select(GuestAssistantKnowledge.Fold).Where(f => f.Length >= 3).Distinct().ToArray());

    private static string Current(string code)
    {
        var key = code.Trim().ToUpperInvariant();
        return Aliases.TryGetValue(key, out var current) ? current : key;
    }

    private static string[] Codes(string region) => Provinces.Where(p => p.Region == region).Select(p => p.Code).ToArray();
}
