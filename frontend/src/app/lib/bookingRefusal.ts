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

/** Thông báo hủy cho chính Agency: nói ai hủy và lý do, không bảo "liên hệ Agency". */
export function agencyCancellationNotice(
  cancellation?: { requestedByRole?: string; reasonDetail?: string } | null,
  notes?: string,
  reason?: string,
): string {
  const detail = cancellation?.reasonDetail?.trim() || reason?.trim()
    || [...(notes || "").matchAll(/\[(?:Khách hủy|Agency hủy|Lý do hủy):\s*([\s\S]*?)\]/gi)].at(-1)?.[1]?.trim();
  const who = cancellation?.requestedByRole === "customer" ? "Khách hàng đã hủy đơn đặt tour này."
    : cancellation?.requestedByRole === "agency" ? "Agency đã hủy đơn đặt tour này."
    : "Đơn đặt tour này đã bị hủy.";
  return detail ? `${who}\nLý do: ${detail}` : who;
}
