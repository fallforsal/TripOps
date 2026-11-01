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
