/**
 * Chuẩn hóa thông tin tài khoản ngân hàng ngay khi gõ (dùng cho khách, Agency, Admin).
 * Backend cũng chuẩn hóa lại y hệt (BankAccountText.Holder) nên dữ liệu lưu luôn thống nhất.
 */

/** "hoàng tùng lâm" → "HOANG TUNG LAM": in hoa, bỏ dấu, đ → D, gộp khoảng trắng thừa (giữ 1 dấu cách cuối khi đang gõ). */
export function toHolderName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/^ /, "");
}

/** Bản cuối để gửi API: thêm bỏ khoảng trắng đầu/cuối. */
export function finalHolderName(value: string): string {
  return toHolderName(value).trim();
}

/** Số tài khoản: chỉ giữ chữ số. */
export function toAccountNumber(value: string): string {
  return value.replace(/\D/g, "");
}
