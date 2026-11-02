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

/**
 * Hiển thị hạn thanh toán theo giờ Việt Nam. Hạn đúng 00:00 (ví dụ Đợt 2: trước 00:00 ngày 23/11)
 * được hiển thị là "23:59 22/11/2026" để khách hiểu là phải trả xong trong ngày 22/11.
 */
export function formatVietnamDeadline(iso?: string | null): string {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const text = formatVietnamDateTime(iso);
  return text.startsWith("00:00 ") ? formatVietnamDateTime(new Date(time - 60_000).toISOString()) : text;
}

/** Kết quả tra cứu payOS do backend trả về. */
export type PaymentOutcome = "paid" | "pending" | "cancelled" | "expired" | "review" | "failed" | "none";
