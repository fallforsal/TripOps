/**
 * Ngân hàng hỗ trợ hoàn tiền tự động (chi hộ payOS) — tên khớp danh sách mã BIN ở backend (VietnamBanks).
 * Nguồn mã BIN: Ngân hàng Nhà nước Việt Nam. Ngân hàng ngoài danh sách: Admin chuyển khoản tay.
 */
export interface VietnamBank {
  /** Tên ngắn, khớp backend (VietnamBanks) — giá trị gửi lên API. */
  name: string;
  bin: string;
  /** Tên đầy đủ để tìm và hiển thị. */
  fullName: string;
  /** Tên gọi khác / viết tắt để tìm. */
  aliases: string[];
}

export const VIETNAM_BANKS: VietnamBank[] = [
  { name: "Vietcombank", bin: "970436", fullName: "Ngân hàng TMCP Ngoại thương Việt Nam", aliases: ["VCB"] },
  { name: "VietinBank", bin: "970415", fullName: "Ngân hàng TMCP Công Thương Việt Nam", aliases: ["CTG", "Vietin"] },
  { name: "BIDV", bin: "970418", fullName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", aliases: [] },
  { name: "Agribank", bin: "970405", fullName: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", aliases: ["VBA"] },
  { name: "Techcombank", bin: "970407", fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam", aliases: ["TCB"] },
  { name: "MB Bank", bin: "970422", fullName: "Ngân hàng TMCP Quân đội", aliases: ["MB", "MBBank"] },
  { name: "ACB", bin: "970416", fullName: "Ngân hàng TMCP Á Châu", aliases: [] },
  { name: "VPBank", bin: "970432", fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng", aliases: ["VPB"] },
  { name: "TPBank", bin: "970423", fullName: "Ngân hàng TMCP Tiên Phong", aliases: ["TPB", "TP Bank"] },
  { name: "Sacombank", bin: "970403", fullName: "Ngân hàng TMCP Sài Gòn Thương Tín", aliases: ["STB"] },
  { name: "HDBank", bin: "970437", fullName: "Ngân hàng TMCP Phát triển TP.HCM", aliases: ["HDB", "HD Bank"] },
  { name: "VIB", bin: "970441", fullName: "Ngân hàng TMCP Quốc tế Việt Nam", aliases: [] },
  { name: "SHB", bin: "970443", fullName: "Ngân hàng TMCP Sài Gòn – Hà Nội", aliases: [] },
  { name: "Eximbank", bin: "970431", fullName: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam", aliases: ["EIB"] },
  { name: "MSB", bin: "970426", fullName: "Ngân hàng TMCP Hàng Hải Việt Nam", aliases: ["Maritime Bank"] },
  { name: "OCB", bin: "970448", fullName: "Ngân hàng TMCP Phương Đông", aliases: [] },
  { name: "SeABank", bin: "970440", fullName: "Ngân hàng TMCP Đông Nam Á", aliases: ["SeAB"] },
  { name: "LPBank", bin: "970449", fullName: "Ngân hàng TMCP Lộc Phát Việt Nam", aliases: ["LienVietPostBank", "LPB"] },
  { name: "Nam A Bank", bin: "970428", fullName: "Ngân hàng TMCP Nam Á", aliases: ["NamABank"] },
  { name: "Bac A Bank", bin: "970409", fullName: "Ngân hàng TMCP Bắc Á", aliases: ["BacABank"] },
  { name: "ABBANK", bin: "970425", fullName: "Ngân hàng TMCP An Bình", aliases: ["AB Bank"] },
  { name: "BVBank", bin: "970454", fullName: "Ngân hàng TMCP Bản Việt", aliases: ["Viet Capital Bank"] },
  { name: "KienlongBank", bin: "970452", fullName: "Ngân hàng TMCP Kiên Long", aliases: ["Kien Long"] },
  { name: "PVcomBank", bin: "970412", fullName: "Ngân hàng TMCP Đại Chúng Việt Nam", aliases: ["PVcom"] },
  { name: "Saigonbank", bin: "970400", fullName: "Ngân hàng TMCP Sài Gòn Công Thương", aliases: [] },
  { name: "SCB", bin: "970429", fullName: "Ngân hàng TMCP Sài Gòn", aliases: [] },
  { name: "NCB", bin: "970419", fullName: "Ngân hàng TMCP Quốc Dân", aliases: [] },
  { name: "Viet A Bank", bin: "970427", fullName: "Ngân hàng TMCP Việt Á", aliases: ["VietABank"] },
  { name: "BaoViet Bank", bin: "970438", fullName: "Ngân hàng TMCP Bảo Việt", aliases: ["BaoVietBank"] },
  { name: "PGBank", bin: "970430", fullName: "Ngân hàng TMCP Thịnh vượng và Phát triển", aliases: ["PG Bank"] },
  { name: "DongA Bank", bin: "970406", fullName: "Ngân hàng TMCP Đông Á", aliases: ["DongABank"] },
  { name: "VietBank", bin: "970433", fullName: "Ngân hàng TMCP Việt Nam Thương Tín", aliases: [] },
];

/** Bỏ dấu, chữ thường, bỏ khoảng trắng/ký tự đặc biệt để so khớp ("Tiên Phong" ~ "tienphong"). */
export const foldBankText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Ngân hàng khớp chữ đang gõ: tên ngắn, tên đầy đủ, tên khác hoặc mã BIN. Khớp ở đầu tên được xếp trước. */
export function searchBanks(query: string): VietnamBank[] {
  const q = foldBankText(query);
  if (!q) return VIETNAM_BANKS;
  const keys = (b: VietnamBank) => [b.name, ...b.aliases, b.fullName.replace(/^Ngân hàng (TMCP )?/i, "")].map(foldBankText);
  const score = (b: VietnamBank) => {
    const k = keys(b);
    if (k.some((x) => x.startsWith(q))) return 0;
    if (k.some((x) => x.includes(q)) || foldBankText(b.fullName).includes(q) || b.bin.startsWith(q)) return 1;
    return -1;
  };
  return VIETNAM_BANKS.map((b) => ({ b, s: score(b) }))
    .filter((x) => x.s >= 0)
    .sort((a, c) => a.s - c.s)
    .map((x) => x.b);
}

/** Tìm đúng một ngân hàng theo chữ đã gõ đủ (tên ngắn / tên khác / tên đầy đủ / BIN). */
export function findBank(value: string): VietnamBank | undefined {
  const q = foldBankText(value);
  if (!q) return undefined;
  return VIETNAM_BANKS.find((b) => [b.name, b.bin, b.fullName, ...b.aliases].some((x) => foldBankText(x) === q));
}
