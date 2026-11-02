import type { BookingDto, BookingSnapshotDto, BookingSnapshotSummaryDto } from "./wf05Bookings.ts";

export function selectSnapshotVersions(snapshots: BookingSnapshotSummaryDto[]) {
  const sorted = [...snapshots].sort((a, b) => b.version - a.version);
  const agreed = sorted.find(s => s.snapshotType === "agreed" && s.acceptedAt && s.acceptedBy);
  const proposal = sorted.find(s => s.snapshotType === "proposal");
  return { sorted, agreed, proposal, effective: agreed ?? proposal ?? sorted[0] };
}

export function acceptedSnapshotFromBooking(booking: BookingDto) {
  const agreed = booking.agreedSnapshot;
  if (!agreed || agreed.snapshotType !== "agreed" || !agreed.acceptedAt || !agreed.acceptedBy)
    throw new Error("Máy chủ chưa trả về phương án đã chấp nhận. Vui lòng tải lại đơn đặt tour.");
  return agreed;
}

const LEGACY_AGENCY_NOTE = /\n?\[Ghi chú đề xuất: ([\s\S]*)\]\s*$/;

/**
 * Tách "yêu cầu của khách" và "ghi chú của công ty lữ hành" để hiển thị.
 * - Schema >= 2: đọc trực tiếp customerNotes / agencyNote.
 * - Schema 1 (bản cũ): ghi chú Agency từng bị ghép vào customerNotes dạng
 *   "...\n[Ghi chú đề xuất: ...]"; chỉ tách khi hiển thị, không sửa dữ liệu đã lưu.
 */
export function snapshotNotes(detail: Pick<BookingSnapshotDto, "snapshotType" | "proposalNote" | "snapshotData">) {
  const data = detail.snapshotData;
  const clean = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
  if (detail.snapshotType === "initial_request")
    return { customerNote: clean(data.customerNotes), agencyNote: undefined };
  if ((data.schemaVersion ?? 1) >= 2)
    return { customerNote: clean(data.customerNotes), agencyNote: clean(data.agencyNote) ?? clean(detail.proposalNote) };
  const legacy = data.customerNotes?.match(LEGACY_AGENCY_NOTE);
  return {
    customerNote: clean(legacy ? data.customerNotes!.slice(0, legacy.index) : data.customerNotes),
    agencyNote: clean(detail.proposalNote) ?? clean(legacy?.[1]),
  };
}

/** Bản chụp schema 1 không lưu ghi chú hành khách. */
export function snapshotHasPassengerNotes(data: Pick<BookingSnapshotDto["snapshotData"], "schemaVersion">) {
  return (data.schemaVersion ?? 1) >= 2;
}

/**
 * Nội dung hợp đồng lấy từ phương án đã chốt (agreed), không lấy dữ liệu booking hiện tại.
 * Chưa có bản agreed hợp lệ thì trả về null (chưa có hợp đồng).
 */
export function contractFromAgreedSnapshot(bookingCode: string, agreed?: BookingSnapshotDto | null) {
  if (!agreed || agreed.snapshotType !== "agreed" || !agreed.acceptedAt || !agreed.acceptedBy) return null;
  const data = agreed.snapshotData;
  const notes = snapshotNotes(agreed);
  return {
    contractNo: `${bookingCode}-v${agreed.version}`,
    version: agreed.version,
    acceptedAt: agreed.acceptedAt,
    agencyName: data.agencyName,
    tourName: data.tourName,
    tourCode: data.tourCode,
    destination: data.destination,
    departureLocation: data.departureLocation,
    startDate: data.startDate?.slice(0, 10),
    endDate: data.endDate?.slice(0, 10),
    durationDays: data.durationDays,
    durationNights: data.durationNights,
    passengers: data.passengers ?? [],
    hotels: data.hotels ?? [],
    totalAmount: data.totalAmount,
    inclusions: data.inclusions,
    exclusions: data.exclusions,
    cancellationPolicy: data.cancellationPolicy,
    customerNote: notes.customerNote,
    agencyNote: notes.agencyNote,
    hasPassengerNotes: snapshotHasPassengerNotes(data),
  };
}

export function canChangeBookingProposal(status: string) {
  return ["pending", "deposited", "confirmed", "paid"].includes(status.toLowerCase());
}

export function proposalVersionStyle(type: BookingSnapshotSummaryDto["snapshotType"], selected: boolean) {
  if (type === "agreed") return selected
    ? "bg-emerald-600 text-white border-emerald-600"
    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
  if (type === "proposal") return selected
    ? "bg-amber-200 text-amber-950 border-amber-500"
    : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100";
  return selected ? "bg-slate-700 text-white border-slate-700"
    : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100";
}
