import type { ProviderGroupReservationRequest } from "../types/index.ts";
import { bookingRefusalReason } from "../lib/bookingRefusal.ts";

/** Số lượng tính phí có thể là khách × đêm; chỉ ngày nhận/trả phòng xác định số đêm. */
export function hotelStayNights(r: Pick<ProviderInboxRow, "serviceDateFrom" | "serviceDateTo" | "quantity" | "unit">): number {
  const start = r.serviceDateFrom ? Date.parse(r.serviceDateFrom.slice(0, 10) + "T00:00:00Z") : NaN;
  const end = r.serviceDateTo ? Date.parse(r.serviceDateTo.slice(0, 10) + "T00:00:00Z") : NaN;
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) return Math.round((end - start) / 86400000);
  // Dữ liệu cũ thiếu ngày: chỉ dùng quantity nếu đơn vị chính là đêm, không dùng số khách/phòng.
  return r.unit === "night" && r.quantity > 0 ? Number(r.quantity) : 0;
}

/** Một dòng từ GET /provider/booking-requests. */
export type ProviderInboxRow = {
  id: number; bookingId: number; serviceId: number; slotKey: string; serviceName: string;
  serviceDateFrom: string | null; serviceDateTo: string | null; quantity: number; unit: string;
  estimatedCost: number; quotedCost: number | null; status: string; note: string | null;
  createdAt: string; respondedAt: string | null; bookingCode: string; tourName: string;
  agencyId: string; agencyLogo?: string | null; agencyName: string; agencyPhone: string | null; agencyEmail: string | null; mealType: string | null;
  specialRequests: string | null; cancelReason: string | null; cancelledAt: string | null;
  serviceTime?: string | null; parentRequestId?: number | null; isSupplement?: boolean;
  guests: Array<{ age?: number | null; phoneNumber?: string | null; fullName: string; gender: string | null; tierName: string | null; roommateNote: string | null; restaurantNote: string | null }>;
};

const STATUS_MAP: Record<string, ProviderGroupReservationRequest["status"]> = {
  Pending: "pending", Confirmed: "confirmed", Rejected: "rejected", Cancelled: "cancelled", Superseded: "cancelled",
};

/** Chuyển dữ liệu máy chủ sang mẫu giao diện yêu cầu dịch vụ (chia khách sạn / nhà hàng). */
export function toGroupRequest(r: ProviderInboxRow, providerId: string): ProviderGroupReservationRequest {
  const isHotel = r.slotKey.startsWith("hotel:");
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  const isChild = (tier: string | null) => /tr[eẻ]|em b[eé]|child|infant/i.test(tier || "");
  const guests = r.guests ?? []; // máy chủ bản cũ chưa trả danh sách đoàn
  const children = guests.filter((g) => isChild(g.tierName)).length;
  const meal = r.mealType === "breakfast" || r.mealType === "lunch" || r.mealType === "dinner" ? r.mealType : undefined;
  const status = STATUS_MAP[r.status] ?? "pending";
  return {
    id: String(r.id),
    bookingId: String(r.bookingId),
    bookingCode: r.bookingCode || `#${r.bookingId}`,
    tourName: r.tourName || `Booking #${r.bookingId}`,
    serviceId: String(r.serviceId),
    serviceName: r.serviceName,
    providerId,
    agencyId: r.agencyId || "",
    agencyLogo: r.agencyLogo || undefined,
    agencyName: r.agencyName || "Công ty lữ hành",
    agencyContactName: r.agencyName || "Công ty lữ hành",
    agencyPhone: r.agencyPhone || "",
    agencyEmail: r.agencyEmail || "",
    checkInDate: day(r.serviceDateFrom),
    checkOutDate: day(r.serviceDateTo || r.serviceDateFrom),
    numberOfNights: isHotel ? hotelStayNights(r) : 0,
    isSupplement: r.isSupplement ?? !!r.parentRequestId,
    numberOfGuests: guests.length || Number(r.quantity) || 0,
    adultGuests: guests.length - children,
    childGuests: children,
    passengers: guests.map((g, i) => ({
      id: i + 1,
      participantIndex: i + 1,
      fullName: g.fullName,
      phone: g.phoneNumber || undefined,
      gender: g.gender === "Nữ" || /^f/i.test(g.gender || "") ? "female" : "male",
      tierName: g.tierName || undefined,
      age: g.age ?? undefined,
      roommateNote: g.roommateNote || undefined,
      dietaryNote: g.restaurantNote || undefined,
    })),
    specialRequests: [r.specialRequests, `Giá tham khảo: ${r.estimatedCost.toLocaleString("vi-VN")} ₫ cho ${r.quantity} ${r.unit}`]
      .filter(Boolean).join(" · "),
    status,
    serviceType: isHotel ? "hotel" : "restaurant",
    mealType: isHotel ? undefined : meal,
    servingDate: isHotel ? undefined : day(r.serviceDateFrom),
    serviceTime: isHotel ? undefined : r.serviceTime?.slice(0,5) || undefined,
    quotedTotalPrice: r.quotedCost ?? undefined,
    providerNote: status === "confirmed" ? r.note || undefined : undefined,
    rejectionReason: status === "rejected" ? r.note || undefined : undefined,
    cancellationReason: status === "cancelled" ? bookingRefusalReason(r.specialRequests || undefined, r.cancelReason || undefined) : undefined,
    cancelledAt: r.cancelledAt || undefined,
    cancelledByName: status === "cancelled" ? (r.status === "Superseded" ? "Agency thay đổi dịch vụ" : "Booking đã hủy") : undefined,
    createdAt: r.createdAt || new Date().toISOString(),
    respondedAt: r.respondedAt || undefined,
  };
}

