/** Chỉ cho phép chuyển trình duyệt tới trang thanh toán payOS chính thức qua HTTPS. */
export function isPayOsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "pay.payos.vn" || parsed.hostname.endsWith(".payos.vn"))
    );
  } catch {
    return false;
  }
}

/**
 * Hiển thị một thời điểm (ISO, UTC từ backend) theo giờ Việt Nam, gồm giờ và ngày: "14:30 03/11/2026".
 * Không tự tính hạn: chỉ định dạng giá trị backend trả về.
 */
export function formatVietnamDateTime(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")} ${part("day")}/${part("month")}/${part("year")}`;
}

/** Kết quả tra cứu payOS do backend trả về. */
export type PaymentOutcome = "paid" | "pending" | "cancelled" | "expired" | "review" | "failed" | "none";
