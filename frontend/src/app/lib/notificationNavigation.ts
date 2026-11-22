export type NotificationRole = "agency" | "provider" | "admin" | "user";

export interface NotificationReference {
  message: string;
  bookingId: number | null;
  requestId: number | null;
}

export type ItineraryFocus = "incidents" | "live_checkin";

export interface NotificationDestination {
  section: string;
  href: string;
  bookingId?: number;
  requestId?: number;
  tab?: ItineraryFocus;
}

/** Resolve the real entity, not just the sidebar section.
 * Legacy notification rows have no event type, so recognize incident notices
 * by their existing backend message prefix. Newer rows still use bookingId. */
export function notificationDestination(
  notice: NotificationReference, role: NotificationRole,
): NotificationDestination | null {
  const message = notice.message.toLocaleLowerCase("vi-VN");
  const incident = /^sự cố\s*\[/.test(message) ||
    message.includes("incident report") || message.includes("báo cáo sự cố");
  if (notice.requestId != null && Number.isSafeInteger(notice.requestId) && notice.requestId > 0) {
    const id = notice.requestId;
    if (role === "agency")
      return { section: "custom-requests", href: `#/agency/custom-requests?requestId=${id}`, requestId: id };
    if (role === "user")
      return { section: "my-requests", href: `#/my-requests?requestId=${id}`, requestId: id };
  }
  if (notice.bookingId != null && Number.isSafeInteger(notice.bookingId) && notice.bookingId > 0) {
    const id = notice.bookingId;
    if (role === "agency") return {
      section: "bookings",
      href: `#/agency/bookings/${id}${incident ? "?tab=incidents" : ""}`,
      bookingId: id,
      ...(incident ? { tab: "incidents" as const } : {}),
    };
    if (role === "user")
      return { section: "my-bookings", href: `#/my-bookings/${id}`, bookingId: id };
    if (role === "provider")
      return { section: "room-requests", href: `#/provider/room-requests?bookingId=${id}`, bookingId: id };
  }
  if (role === "admin") {
    const section = message.includes("khiếu nại") ? "complaints" :
      message.includes("hoàn tiền") ? "refund-requests" :
      message.includes("dịch vụ") ? "approve-posts" :
      message.includes("hồ sơ doanh nghiệp") ? "partner-approvals" : "dashboard";
    return { section, href: `#/admin/${section}` };
  }
  if (role === "agency")
    return { section: "overview", href: "#/agency/overview" };
  if (role === "provider")
    return { section: "profile", href: "#/provider/profile" };
  return { section: "my-requests", href: "#/my-requests" };
}
