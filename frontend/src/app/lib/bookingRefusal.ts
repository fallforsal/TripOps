export function bookingRefusalReason(notes?: string, reason?: string): string {
  if (reason?.trim()) return reason.trim();
  const matches = [...(notes || "").matchAll(/\[Lý do từ chối:\s*([\s\S]*?)\]/gi)];
  return matches.at(-1)?.[1]?.trim() || "Agency không thể tiếp nhận đoàn theo yêu cầu này. Vui lòng liên hệ Agency để biết thêm chi tiết.";
}

export function bookingCancellationReason(notes?: string, reason?: string): string {
  if (reason?.trim()) return reason.trim();
  const matches = [...(notes || "").matchAll(/\[(?:Khách hủy|Agency hủy|Lý do hủy):\s*([\s\S]*?)\]/gi)];
  return matches.at(-1)?.[1]?.trim() || "Đơn đặt tour đã được hủy. Vui lòng liên hệ Agency nếu cần hỗ trợ.";
}
