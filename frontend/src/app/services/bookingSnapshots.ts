import type { BookingDto, BookingSnapshotSummaryDto } from "./wf05Bookings.ts";

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
