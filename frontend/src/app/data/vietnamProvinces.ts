export interface VietnamProvinceItem {
  /** Mã tỉnh/thành ổn định dùng làm khóa lưu trữ và truy vấn (không phụ thuộc dấu tiếng Việt) */
  code: string;
  /** Tên hiển thị chuẩn của Tỉnh / Thành phố trực thuộc Trung ương */
  name: string;
  /** Vùng địa lý du lịch */
  region:
    | "Miền Bắc"
    | "Miền Trung"
    | "Tây Nguyên"
    | "Miền Nam"
    | "Miền Tây";
  /** Các địa danh / điểm du lịch nổi tiếng trực thuộc tỉnh/thành (dùng để hỗ trợ tìm kiếm nhanh & gợi ý có xác nhận) */
  popularDestinations: string[];
}

/**
 * Danh mục chuẩn 63 Tỉnh / Thành phố Việt Nam với mã ổn định (canonical code).
 * Dùng thống nhất giữa Frontend và Backend cho trường `provinceCodes` của Tour.
 */
export const VIETNAM_PROVINCES: readonly VietnamProvinceItem[] = [
  // MIỀN BẮC
  {
    code: "HA_NOI",
    name: "TP. Hà Nội",
    region: "Miền Bắc",
    popularDestinations: ["Hà Nội", "Phố cổ Hà Nội", "Ba Vì", "Sóc Sơn", "Làng cổ Đường Lâm"],
  },
  {
    code: "QUANG_NINH",
    name: "Quảng Ninh",
    region: "Miền Bắc",
    popularDestinations: ["Hạ Long", "Vịnh Hạ Long", "Bãi Cháy", "Tuần Châu", "Yên Tử", "Cô Tô", "Bình Liêu", "Móng Cái"],
  },
  {
    code: "LAO_CAI",
    name: "Lào Cai",
    region: "Miền Bắc",
    popularDestinations: ["Sapa", "Sa Pa", "Fansipan", "Bắc Hà", "Y Tý"],
  },
  {
    code: "HA_GIANG",
    name: "Hà Giang",
    region: "Miền Bắc",
    popularDestinations: ["Hà Giang", "Đồng Văn", "Mèo Vạc", "Lũng Cú", "Sông Nho Quế", "Hoàng Su Phì"],
  },
  {
    code: "NINH_BINH",
    name: "Ninh Bình",
    region: "Miền Bắc",
    popularDestinations: ["Ninh Bình", "Tràng An", "Tam Cốc", "Bái Đính", "Hang Múa", "Cúc Phương"],
  },
  {
    code: "HAI_PHONG",
    name: "TP. Hải Phòng",
    region: "Miền Bắc",
    popularDestinations: ["Hải Phòng", "Cát Bà", "Đồ Sơn", "Vịnh Lan Hạ"],
  },
  {
    code: "CAO_BANG",
    name: "Cao Bằng",
    region: "Miền Bắc",
    popularDestinations: ["Cao Bằng", "Thác Bản Giốc", "Pác Bó", "Hồ Thang Hen"],
  },
  {
    code: "BAC_KAN",
    name: "Bắc Kạn",
    region: "Miền Bắc",
    popularDestinations: ["Bắc Kạn", "Hồ Ba Bể"],
  },
  {
    code: "SON_LA",
    name: "Sơn La",
    region: "Miền Bắc",
    popularDestinations: ["Sơn La", "Mộc Châu", "Tà Xùa", "Bắc Yên"],
  },
  {
    code: "DIEN_BIEN",
    name: "Điện Biên",
    region: "Miền Bắc",
    popularDestinations: ["Điện Biên", "Điện Biên Phủ", "Pha Đin", "A Pa Chải"],
  },
  {
    code: "LAI_CHAU",
    name: "Lai Châu",
    region: "Miền Bắc",
    popularDestinations: ["Lai Châu", "Ô Quy Hồ", "Sìn Hồ"],
  },
  {
    code: "YEN_BAI",
    name: "Yên Bái",
    region: "Miền Bắc",
    popularDestinations: ["Yên Bái", "Mù Cang Chải", "Tú Lệ", "Trạm Tấu", "Hồ Thác Bà"],
  },
  {
    code: "HOA_BINH",
    name: "Hòa Bình",
    region: "Miền Bắc",
    popularDestinations: ["Hòa Bình", "Mai Châu", "Thung Nai", "Kim Bôi"],
  },
  {
    code: "TUYEN_QUANG",
    name: "Tuyên Quang",
    region: "Miền Bắc",
    popularDestinations: ["Tuyên Quang", "Na Hang", "Tân Trào"],
  },
  {
    code: "LANG_SON",
    name: "Lạng Sơn",
    region: "Miền Bắc",
    popularDestinations: ["Lạng Sơn", "Mẫu Sơn", "Bắc Sơn", "Đồng Đăng"],
  },
  {
    code: "THAI_NGUYEN",
    name: "Thái Nguyên",
    region: "Miền Bắc",
    popularDestinations: ["Thái Nguyên", "Hồ Núi Cốc", "Đồi chè Tân Cương"],
  },
  {
    code: "PHU_THO",
    name: "Phú Thọ",
    region: "Miền Bắc",
    popularDestinations: ["Phú Thọ", "Đền Hùng", "Việt Trì", "Thanh Thủy", "Xuân Sơn"],
  },
  {
    code: "VINH_PHUC",
    name: "Vĩnh Phúc",
    region: "Miền Bắc",
    popularDestinations: ["Vĩnh Phúc", "Tam Đảo", "Đại Lải", "Tây Thiên"],
  },
  {
    code: "BAC_GIANG",
    name: "Bắc Giang",
    region: "Miền Bắc",
    popularDestinations: ["Bắc Giang", "Tây Yên Tử", "Khuôn Thần"],
  },
  {
    code: "BAC_NINH",
    name: "Bắc Ninh",
    region: "Miền Bắc",
    popularDestinations: ["Bắc Ninh", "Chùa Dâu", "Chùa Phật Tích", "Đền Đô"],
  },
  {
    code: "HAI_DUONG",
    name: "Hải Dương",
    region: "Miền Bắc",
    popularDestinations: ["Hải Dương", "Côn Sơn", "Kiếp Bạc"],
  },
  {
    code: "HUNG_YEN",
    name: "Hưng Yên",
    region: "Miền Bắc",
    popularDestinations: ["Hưng Yên", "Phố Hiến", "Làng Nôm"],
  },
  {
    code: "HA_NAM",
    name: "Hà Nam",
    region: "Miền Bắc",
    popularDestinations: ["Hà Nam", "Chùa Tam Chúc", "Địa Tạng Phi Lai Tự"],
  },
  {
    code: "NAM_DINH",
    name: "Nam Định",
    region: "Miền Bắc",
    popularDestinations: ["Nam Định", "Đền Trần", "Phủ Dầy", "Vườn quốc gia Xuân Thủy"],
  },
  {
    code: "THAI_BINH",
    name: "Thái Bình",
    region: "Miền Bắc",
    popularDestinations: ["Thái Bình", "Chùa Keo", "Biển Cồn Vành", "Biển Đồng Châu"],
  },

  // MIỀN TRUNG
  {
    code: "DA_NANG",
    name: "TP. Đà Nẵng",
    region: "Miền Trung",
    popularDestinations: ["Đà Nẵng", "Bà Nà Hills", "Sơn Trà", "Biển Mỹ Khê", "Ngũ Hành Sơn", "Cầu Rồng"],
  },
  {
    code: "QUANG_NAM",
    name: "Quảng Nam",
    region: "Miền Trung",
    popularDestinations: ["Hội An", "Phố cổ Hội An", "Cù Lao Chàm", "Thánh địa Mỹ Sơn", "Tam Kỳ", "Rừng dừa Bảy Mẫu"],
  },
  {
    code: "THUA_THIEN_HUE",
    name: "Thừa Thiên Huế",
    region: "Miền Trung",
    popularDestinations: ["Huế", "Cố đô Huế", "Đại Nội Huế", "Lăng Cô", "Phá Tam Giang", "Bạch Mã"],
  },
  {
    code: "KHANH_HOA",
    name: "Khánh Hòa",
    region: "Miền Trung",
    popularDestinations: ["Nha Trang", "Cam Ranh", "Vịnh Ninh Vân", "Đảo Hòn Mun", "Đảo Bình Ba", "VinWonders Nha Trang", "Dốc Lết"],
  },
  {
    code: "BINH_DINH",
    name: "Bình Định",
    region: "Miền Trung",
    popularDestinations: ["Quy Nhơn", "Kỳ Co", "Eo Gió", "Ghềnh Ráng", "Hầm Hô", "Cù Lao Xanh"],
  },
  {
    code: "PHU_YEN",
    name: "Phú Yên",
    region: "Miền Trung",
    popularDestinations: ["Phú Yên", "Tuy Hòa", "Ghềnh Đá Đĩa", "Bãi Xép", "Mũi Điện", "Vịnh Vũng Rô"],
  },
  {
    code: "BINH_THUAN",
    name: "Bình Thuận",
    region: "Miền Trung",
    popularDestinations: ["Mũi Né", "Phan Thiết", "Mũi Né - Phan Thiết", "Đồi Cát Bay", "Bàu Trắng", "Đảo Phú Quý", "Kê Gà"],
  },
  {
    code: "NINH_THUAN",
    name: "Ninh Thuận",
    region: "Miền Trung",
    popularDestinations: ["Ninh Thuận", "Phan Rang", "Vịnh Vĩnh Hy", "Hang Rái", "Đồi cát Nam Cương"],
  },
  {
    code: "QUANG_BINH",
    name: "Quảng Bình",
    region: "Miền Trung",
    popularDestinations: ["Quảng Bình", "Phong Nha", "Kẻ Bàng", "Động Thiên Đường", "Đồng Hới", "Biển Nhật Lệ"],
  },
  {
    code: "QUANG_TRI",
    name: "Quảng Trị",
    region: "Miền Trung",
    popularDestinations: ["Quảng Trị", "Thành cổ Quảng Trị", "Địa đạo Vịnh Mốc", "Cầu Hiền Lương", "Đảo Cồn Cỏ"],
  },
  {
    code: "QUANG_NGAI",
    name: "Quảng Ngãi",
    region: "Miền Trung",
    popularDestinations: ["Quảng Ngãi", "Đảo Lý Sơn", "Biển Mỹ Khê Quảng Ngãi", "Sa Huỳnh"],
  },
  {
    code: "THANH_HOA",
    name: "Thanh Hóa",
    region: "Miền Trung",
    popularDestinations: ["Thanh Hóa", "Sầm Sơn", "Pù Luông", "Hải Tiến", "Thành Nhà Hồ", "Lam Kinh"],
  },
  {
    code: "NGHE_AN",
    name: "Nghệ An",
    region: "Miền Trung",
    popularDestinations: ["Nghệ An", "Cửa Lò", "Vinh", "Làng Sen", "Kim Liên", "Pù Mát"],
  },
  {
    code: "HA_TINH",
    name: "Hà Tĩnh",
    region: "Miền Trung",
    popularDestinations: ["Hà Tĩnh", "Biển Thiên Cầm", "Ngã ba Đồng Lộc", "Chùa Hương Tích"],
  },

  // TÂY NGUYÊN
  {
    code: "LAM_DONG",
    name: "Lâm Đồng",
    region: "Tây Nguyên",
    popularDestinations: ["Đà Lạt", "Bảo Lộc", "Langbiang", "Hồ Tuyền Lâm", "Hồ Xuân Hương", "Thác Datanla", "Đồi chè Cầu Đất"],
  },
  {
    code: "DAK_LAK",
    name: "Đắk Lắk",
    region: "Tây Nguyên",
    popularDestinations: ["Đắk Lắk", "Buôn Ma Thuột", "Buôn Đôn", "Hồ Lắk", "Thác Dray Nur"],
  },
  {
    code: "DAK_NONG",
    name: "Đắk Nông",
    region: "Tây Nguyên",
    popularDestinations: ["Đắk Nông", "Gia Nghĩa", "Hồ Tà Đùng", "Công viên địa chất Đắk Nông"],
  },
  {
    code: "GIA_LAI",
    name: "Gia Lai",
    region: "Tây Nguyên",
    popularDestinations: ["Gia Lai", "Pleiku", "Biển Hồ", "Chư Đăng Ya", "Thác Phú Cường"],
  },
  {
    code: "KON_TUM",
    name: "Kon Tum",
    region: "Tây Nguyên",
    popularDestinations: ["Kon Tum", "Măng Đen", "Nhà thờ gỗ Kon Tum", "Ngã ba Đông Dương"],
  },

  // MIỀN NAM (ĐÔNG NAM BỘ)
  {
    code: "TP_HCM",
    name: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    popularDestinations: ["TP. Hồ Chí Minh", "TP.HCM", "Sài Gòn", "Củ Chi", "Cần Giờ", "Bến Nhà Rồng"],
  },
  {
    code: "BA_RIA_VUNG_TAU",
    name: "Bà Rịa - Vũng Tàu",
    region: "Miền Nam",
    popularDestinations: ["Vũng Tàu", "Hồ Tràm", "Côn Đảo", "Long Hải", "Bình Châu"],
  },
  {
    code: "TAY_NINH",
    name: "Tây Ninh",
    region: "Miền Nam",
    popularDestinations: ["Tây Ninh", "Núi Bà Đen", "Tòa Thánh Tây Ninh", "Hồ Dầu Tiếng"],
  },
  {
    code: "DONG_NAI",
    name: "Đồng Nai",
    region: "Miền Nam",
    popularDestinations: ["Đồng Nai", "Biên Hòa", "Vườn quốc gia Cát Tiên", "Hồ Trị An", "Thác Giang Điền"],
  },
  {
    code: "BINH_DUONG",
    name: "Bình Dương",
    region: "Miền Nam",
    popularDestinations: ["Bình Dương", "Thủ Dầu Một", "Đại Nam", "Hồ Dầu Tiếng"],
  },
  {
    code: "BINH_PHUOC",
    name: "Bình Phước",
    region: "Miền Nam",
    popularDestinations: ["Bình Phước", "Bù Gia Mập", "Núi Bà Rá", "Trảng cỏ Bù Lạch"],
  },

  // MIỀN TÂY (ĐỒNG BẰNG SÔNG CỬU LONG)
  {
    code: "KIEN_GIANG",
    name: "Kiên Giang",
    region: "Miền Tây",
    popularDestinations: ["Phú Quốc", "Đảo Phú Quốc", "Hà Tiên", "Quần đảo Nam Du", "Rạch Giá", "Hòn Sơn", "Bắc Đảo Phú Quốc", "Nam Đảo Phú Quốc"],
  },
  {
    code: "CAN_THO",
    name: "TP. Cần Thơ",
    region: "Miền Tây",
    popularDestinations: ["Cần Thơ", "Cần Thơ - Miền Tây", "Bến Ninh Kiều", "Chợ nổi Cái Răng", "Nhà cổ Bình Thủy", "Cồn Sơn"],
  },
  {
    code: "AN_GIANG",
    name: "An Giang",
    region: "Miền Tây",
    popularDestinations: ["An Giang", "Châu Đốc", "Rừng tràm Trà Sư", "Núi Cấm", "Miếu Bà Chúa Xứ", "Long Xuyên"],
  },
  {
    code: "TIEN_GIANG",
    name: "Tiền Giang",
    region: "Miền Tây",
    popularDestinations: ["Tiền Giang", "Mỹ Tho", "Cù lao Thới Sơn", "Cái Bè", "Chùa Vĩnh Tràng"],
  },
  {
    code: "BEN_TRE",
    name: "Bến Tre",
    region: "Miền Tây",
    popularDestinations: ["Bến Tre", "Cồn Phụng", "Cồn Quy", "Châu Thành Bến Tre"],
  },
  {
    code: "VINH_LONG",
    name: "Vĩnh Long",
    region: "Miền Tây",
    popularDestinations: ["Vĩnh Long", "Cù lao An Bình", "Vương quốc gạch gốm Mang Thít"],
  },
  {
    code: "DONG_THAP",
    name: "Đồng Tháp",
    region: "Miền Tây",
    popularDestinations: ["Đồng Tháp", "Sa Đéc", "Làng hoa Sa Đéc", "Tràm Chim", "Xẻo Quýt", "Cao Lãnh"],
  },
  {
    code: "CA_MAU",
    name: "Cà Mau",
    region: "Miền Tây",
    popularDestinations: ["Cà Mau", "Đất Mũi Cà Mau", "Rừng U Minh Hạ", "Hòn Khoai"],
  },
  {
    code: "BAC_LIEU",
    name: "Bạc Liêu",
    region: "Miền Tây",
    popularDestinations: ["Bạc Liêu", "Nhà công tử Bạc Liêu", "Cánh đồng điện gió Bạc Liêu"],
  },
  {
    code: "SOC_TRANG",
    name: "Sóc Trăng",
    region: "Miền Tây",
    popularDestinations: ["Sóc Trăng", "Chùa Dơi", "Chùa Som Rong", "Chợ nổi Ngã Năm"],
  },
  {
    code: "TRA_VINH",
    name: "Trà Vinh",
    region: "Miền Tây",
    popularDestinations: ["Trà Vinh", "Ao Bà Om", "Chùa Âng", "Cồn Chim"],
  },
  {
    code: "HAU_GIANG",
    name: "Hậu Giang",
    region: "Miền Tây",
    popularDestinations: ["Hậu Giang", "Vị Thanh", "Khu bảo tồn thiên nhiên Lung Ngọc Hoàng"],
  },
  {
    code: "LONG_AN",
    name: "Long An",
    region: "Miền Tây",
    popularDestinations: ["Long An", "Làng nổi Tân Lập", "Tân An"],
  },
];

const PROVINCE_BY_CODE = new Map<string, VietnamProvinceItem>(
  VIETNAM_PROVINCES.map((p) => [p.code, p]),
);

function normalizeSearchToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function getProvinceByCode(code: string): VietnamProvinceItem | undefined {
  if (!code) return undefined;
  return PROVINCE_BY_CODE.get(code.trim().toUpperCase());
}

export function getProvinceName(code: string): string {
  const found = getProvinceByCode(code);
  return found ? found.name : code;
}

export function formatProvinceLabels(codes?: readonly string[] | null): string[] {
  if (!codes || codes.length === 0) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const raw of codes) {
    const normalized = raw.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    labels.push(getProvinceName(normalized));
  }
  return labels;
}

/**
 * Tìm kiếm tỉnh/thành trong danh mục theo tên tỉnh, mã tỉnh hoặc địa danh nổi tiếng (VD: gõ "Đà Lạt" gợi ý "Lâm Đồng").
 */
export function searchVietnamProvinces(query: string): VietnamProvinceItem[] {
  const q = normalizeSearchToken(query);
  if (!q) return [...VIETNAM_PROVINCES];
  return VIETNAM_PROVINCES.filter((item) => {
    if (normalizeSearchToken(item.name).includes(q)) return true;
    if (normalizeSearchToken(item.code).includes(q)) return true;
    return item.popularDestinations.some((dest) =>
      normalizeSearchToken(dest).includes(q),
    );
  });
}

/** Chữ thường, bỏ khoảng trắng thừa, giữ dấu (để "hà" chỉ khớp "Hà", không khớp "Hạ"/"Hải"). */
function normalizeKeepAccents(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
}

/**
 * Gợi ý điểm đến khi người dùng đang gõ (ô "Bạn muốn đi đâu?" ở trang chủ).
 * - Chưa gõ gì: không gợi ý.
 * - Tên tỉnh/thành bắt đầu bằng chữ đã gõ được xếp trước ("H" → Hà Nội, Hà Giang, Hải Phòng, Huế...).
 * - Từ 2 ký tự: thêm tỉnh có một từ trong tên hoặc một địa danh nổi tiếng bắt đầu bằng chữ đã gõ ("Sa" → Lào Cai vì có Sa Pa).
 * - Gõ không dấu thì so không dấu ("ha" khớp Hà, Hạ, Hải); gõ có dấu thì so có dấu ("hà" chỉ khớp Hà).
 */
export function suggestDestinations(query: string, limit = 12): VietnamProvinceItem[] {
  const raw = normalizeKeepAccents(query);
  if (!raw) return [];
  const accented = normalizeSearchToken(raw) !== raw;
  const fold = (value: string) => (accented ? normalizeKeepAccents(value) : normalizeSearchToken(value));
  const q = accented ? raw : normalizeSearchToken(raw);
  const startsWord = (text: string) => text.split(/[\s,.\-–()]+/).some((word, index) => index > 0 && word.startsWith(q));

  const first: VietnamProvinceItem[] = [];
  const second: VietnamProvinceItem[] = [];
  for (const province of VIETNAM_PROVINCES) {
    const name = fold(province.name.replace(/^TP\.\s*/i, ""));
    if (name.startsWith(q)) first.push(province);
    else if (q.length >= 2 && (startsWord(name) || province.popularDestinations.some((place) => {
      const p = fold(place);
      return p.startsWith(q) || startsWord(p);
    }))) second.push(province);
  }
  return [...first, ...second].slice(0, limit);
}

/**
 * Gợi ý danh sách tỉnh/thành từ chuỗi "Điểm đến chính" (VD: "Đà Lạt - Nha Trang" -> [Lâm Đồng, Khánh Hòa]).
 * LƯU Ý NGHIỆP VỤ: Hàm này CHỈ dùng để hiển thị chip gợi ý cho người dùng bấm xác nhận,
 * TUYỆT ĐỐI KHÔNG tự động gán vào dữ liệu tour khi người dùng chưa xác nhận.
 */
export function suggestProvincesFromDestinationText(
  destinationText: string,
  alreadySelectedCodes: readonly string[] = [],
): VietnamProvinceItem[] {
  const norm = normalizeSearchToken(destinationText);
  if (!norm || norm.length < 2) return [];
  const selectedSet = new Set(alreadySelectedCodes.map((c) => c.trim().toUpperCase()));
  const suggestions: VietnamProvinceItem[] = [];

  for (const province of VIETNAM_PROVINCES) {
    if (selectedSet.has(province.code)) continue;
    const cleanProvinceName = normalizeSearchToken(
      province.name.replace(/^TP\.\s*/i, ""),
    );
    const matchedProvince =
      cleanProvinceName.length >= 3 && norm.includes(cleanProvinceName);
    const matchedPlace = province.popularDestinations.some((place) => {
      const cleanPlace = normalizeSearchToken(place);
      return cleanPlace.length >= 3 && norm.includes(cleanPlace);
    });
    if (matchedProvince || matchedPlace) {
      suggestions.push(province);
    }
  }
  return suggestions;
}
