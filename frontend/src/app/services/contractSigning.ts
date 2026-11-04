// Hàm thuần cho ký hợp đồng trực tuyến (không phụ thuộc trình duyệt để test được bằng node).

/** Đường dẫn trang ký đặt trong QR. configured = VITE_PUBLIC_APP_URL (tên miền chính thức khi triển khai). */
export function buildSignPageUrl(token: string, origin: string, pathname = "/", configured?: string): string {
  const base = (configured || "").trim() || `${origin}${pathname}`;
  return `${base.replace(/\/+$/, "")}/#/sign/${encodeURIComponent(token)}`;
}

/** Lấy mã phiên ký từ hash "#/sign/{token}"; trả null nếu không phải trang ký. */
export function parseSignRoute(hash: string): string | null {
  const match = /^#\/sign\/([A-Za-z0-9_-]{20,200})\/?(?:\?.*)?$/.exec(hash.trim());
  return match ? match[1] : null;
}

/** Số giây còn phải chờ trước khi được gửi lại OTP (máy chủ cho gửi lại sau 60 giây). */
export function otpResendWait(otpSentAt: string | null | undefined, nowMs: number, cooldownSeconds = 60): number {
  if (!otpSentAt) return 0;
  const sent = Date.parse(/[zZ]|[+-]\d{2}:\d{2}$/.test(otpSentAt) ? otpSentAt : `${otpSentAt}Z`);
  if (Number.isNaN(sent)) return 0;
  return Math.min(cooldownSeconds, Math.max(0, Math.ceil(cooldownSeconds - (nowMs - sent) / 1000)));
}

/** OTP hợp lệ để gửi: đúng 6 chữ số. */
export function normalizeOtp(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}
