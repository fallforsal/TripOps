/** Một mốc phí hủy: còn từ minDays ngày trở lên trước khởi hành thì phí feePercent% tổng giá trị tour. */
export interface CancellationTier {
  minDays: number;
  feePercent: number;
}

export interface PolicyRow {
  range: string;
  fee: string;
}

export interface PolicyPreviewRow extends PolicyRow {
  refundIfFullyPaid: string;
}

export const MAX_TIERS = 10;
export const MAX_MIN_DAYS = 365;

/** Chính sách mặc định của TripOps (giống backend ContractTerms.Default). */
export const DEFAULT_TIERS: CancellationTier[] = [
  { minDays: 30, feePercent: 0 },
  { minDays: 15, feePercent: 25 },
  { minDays: 8, feePercent: 50 },
  { minDays: 3, feePercent: 75 },
  { minDays: 1, feePercent: 90 },
];

const percent = (value: number) => `${Number(value.toFixed(2)).toLocaleString("vi-VN")}%`;

/** Kiểm tra giống backend; trả về câu lỗi đầu tiên hoặc null. */
export function validateTiers(tiers: CancellationTier[]): string | null {
  if (tiers.length === 0) return "Cần ít nhất một mốc phí hủy.";
  if (tiers.length > MAX_TIERS) return `Tối đa ${MAX_TIERS} mốc phí hủy.`;
  if (tiers.some((t) => !Number.isInteger(t.minDays) || t.minDays < 1 || t.minDays > MAX_MIN_DAYS))
    return `Số ngày trước khởi hành phải là số nguyên từ 1 đến ${MAX_MIN_DAYS}.`;
  if (tiers.some((t) => !Number.isFinite(t.feePercent) || t.feePercent < 0 || t.feePercent > 100))
    return "Phí hủy phải từ 0% đến 100%.";
  if (new Set(tiers.map((t) => t.minDays)).size !== tiers.length) return "Hai mốc phí hủy không được trùng số ngày.";
  const ordered = sortTiers(tiers);
  for (let i = 1; i < ordered.length; i++)
    if (ordered[i].feePercent < ordered[i - 1].feePercent)
      return "Hủy càng sát ngày khởi hành thì phí không được thấp hơn mốc xa hơn.";
  return null;
}

export const sortTiers = (tiers: CancellationTier[]) => [...tiers].sort((a, b) => b.minDays - a.minDays);

/** Bảng hiển thị trong hợp đồng (giống backend ContractTerms.TableRows). */
export function previewRows(tiers: CancellationTier[]): PolicyPreviewRow[] {
  const ordered = sortTiers(tiers);
  const rows: PolicyPreviewRow[] = ordered.map((t, i) => ({
    range: i === 0 ? `Từ ${t.minDays} ngày trở lên`
      : ordered[i - 1].minDays - 1 === t.minDays ? `${t.minDays} ngày`
      : `Từ ${t.minDays} đến ${ordered[i - 1].minDays - 1} ngày`,
    fee: percent(t.feePercent),
    refundIfFullyPaid: percent(100 - t.feePercent),
  }));
  const lowest = ordered.length ? ordered[ordered.length - 1].minDays : 1;
  if (lowest > 1) rows.push({ range: lowest - 1 === 1 ? "1 ngày" : `Từ 1 đến ${lowest - 1} ngày`, fee: "100%", refundIfFullyPaid: "0%" });
  rows.push({ range: "Ngày khởi hành hoặc không tham gia", fee: "100%", refundIfFullyPaid: "0%" });
  return rows;
}

/** Phí hủy theo bảng mốc (không tính luật 72 giờ của nền tảng). */
export function feeFor(tiers: CancellationTier[], daysBeforeDeparture: number): number {
  if (daysBeforeDeparture <= 0) return 100;
  const tier = sortTiers(tiers).find((t) => t.minDays <= daysBeforeDeparture);
  return tier ? tier.feePercent : 100;
}

export const MAX_CLAUSE_LENGTH = 8000;

/** Chuẩn hóa nội dung một điều giống backend (bỏ khoảng trắng cuối dòng, xuống dòng kiểu \n). */
export const normalizeClause = (text: string) =>
  text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").trim();

/** Nội dung gửi lên: null khi để trống hoặc trùng bản mặc định (dùng bản mặc định của TripOps). */
export const clausePayload = (text: string, defaultText: string): string | null => {
  const value = normalizeClause(text);
  return value === "" || value === normalizeClause(defaultText) ? null : value;
};
