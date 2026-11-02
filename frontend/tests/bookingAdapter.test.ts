import { test } from "node:test";
import assert from "node:assert/strict";
import { fromApiBooking } from "../src/app/services/bookingAdapter.ts";
import { formatVietnamDateTime, formatVietnamDeadline, isPayOsUrl } from "../src/app/services/payos.ts";
import type { BookingDto } from "../src/app/services/wf05Bookings.ts";

const dto: BookingDto = {
  id: 101, bookingCode: "BK-TEST", customerId: "customer", customerName: "Customer",
  tourId: 5, tourName: "Tour", agencyId: "agency", agencyName: "Agency",
  startDate: "2026-11-01T00:00:00", endDate: "2026-11-03T00:00:00",
  totalGuests: 1, totalAmount: 10000000, depositAmount: 3000000, paidAmount: 0,
  status: "Pending", paymentStatus: "Unpaid", createdAt: "2026-10-25T10:00:00",
  participants: [{ id: 1, fullName: "Passenger", attendanceStatus: "Pending", status: "ACTIVE" }],
  assignedGuides: [],
};

test("partial deposit requests only the missing deposit and remains partially paid", () => {
  const booking = fromApiBooking({ ...dto, paidAmount: 1000000, paymentStatus: "PartiallyPaid" });
  assert.equal(booking.paymentStatus, "partially_paid");
  assert.equal(booking.paymentRequests?.[0].amount, 2000000);
  assert.equal(booking.paidAmount, 1000000);
  assert.equal(booking.depositPaid, false);
});

test("a deposited booking is not described as fully paid", () => {
  const booking = fromApiBooking({ ...dto, status: "Deposited", paidAmount: 3000000, paymentStatus: "PartiallyPaid" });
  assert.equal(booking.status, "deposited");
  assert.equal(booking.paymentStatus, "partially_paid");
  assert.equal(booking.remainingAmount, 7000000);
  assert.equal(booking.paymentRequests?.[1].dueDate, "2026-11-03");
});

test("all eight API booking states are represented without collapsing InProgress", () => {
  for (const [status, expected] of Object.entries({ Pending: "pending", Deposited: "deposited", Confirmed: "confirmed", Paid: "paid", InProgress: "in_progress", Completed: "completed", Cancelled: "cancelled", Rejected: "rejected" })) {
    assert.equal(fromApiBooking({ ...dto, status: status as BookingDto["status"] }).status, expected);
  }
});

test("attendance survives reloading; an unknown date of birth remains empty", () => {
  const booking = fromApiBooking({ ...dto, participants: [{ ...dto.participants[0], attendanceStatus: "CheckedIn" }] });
  assert.equal(booking.passengers?.[0].attendanceStatus, "CHECKED_IN");
  assert.equal(booking.passengers?.[0].departureAttendance, "present");
  assert.equal(booking.passengers?.[0].dateOfBirth, "");
  assert.equal(fromApiBooking(dto).passengers?.[0].departureAttendance, undefined);
});

test("guide schedule data retains persisted incidents and actual trip duration", () => {
  const booking = fromApiBooking({ ...dto, incidents: [{ id: 3, bookingId: dto.id, title: "Traffic", description: "Late", resolutionNotes: "Critical", status: "Reported", createdAt: dto.createdAt }] });
  assert.equal(booking.guideIncidents?.[0].id, "3");
  assert.equal(booking.guideIncidents?.[0].severity, "critical");
  assert.equal(booking.tour.duration, "3 ngày");
  assert.equal(booking.tour.images?.length, 0);
});

test("guide roles survive reloading and the lead guide is selected independently of row order", () => {
  const roles = ["support_guide", "lead_guide", "stage_guide", "logistics", "Lead"];
  const booking = fromApiBooking({ ...dto, assignedGuides: roles.map((role, id) => ({
    id, guideId: `guide-${id}`, guideName: `Guide ${id}`, role, status: "ASSIGNED",
  })) });
  assert.deepEqual(booking.assignedGuides?.map(g => g.role), ["support_guide", "lead_guide", "stage_guide", "logistics", "lead_guide"]);
  assert.equal(booking.guideId, "guide-1");
});

test("passenger snapshot prices retain different age prices and a free infant", () => {
  const booking = fromApiBooking({ ...dto, totalGuests: 3, totalAmount: 5000000,
    participants: [
      { ...dto.participants[0], id: 1, price: 3000000, tierName: "Adult" },
      { ...dto.participants[0], id: 2, price: 2000000, tierName: "Child" },
      { ...dto.participants[0], id: 3, price: 0, tierName: "Infant" },
    ] });
  assert.deepEqual(booking.passengers?.map(p => p.price), [3000000, 2000000, 0]);
});

test("pending booking has no payment schedule from the server, so nothing can be paid yet", () => {
  const booking = fromApiBooking({ ...dto, paymentSchedule: [], paymentTransactions: [] });
  assert.deepEqual(booking.paymentRequests, []);
  assert.equal(booking.depositPaid, false);
});

test("approved booking maps the server schedule: deposit outstanding and a scheduled balance", () => {
  const booking = fromApiBooking({
    ...dto, status: "Confirmed", paidAmount: 1000000, paymentStatus: "PartiallyPaid",
    paymentSchedule: [
      { id: 7, stage: "deposit", description: "Đặt cọc 30%", amount: 3000000, outstanding: 2000000, dueDate: "2026-10-28T00:00:00", status: "Overdue" },
      { id: null, stage: "balance", description: "Thanh toán phần còn lại sau khi tour kết thúc", amount: 7000000, outstanding: 7000000, dueDate: null, status: "Scheduled" },
    ],
    paymentTransactions: [
      { id: 1, paymentRequestId: 7, transactionCode: "PAYOS-1", paymentMethod: "PAYOS", amount: 1000000, status: "Success", paidAt: "2026-10-26T03:00:00Z", gatewayTransactionNo: "14000000" },
      { id: 2, paymentRequestId: 7, transactionCode: "PAYOS-2", paymentMethod: "PAYOS", amount: 2000000, status: "Expired", createdAt: "2026-10-27T03:00:00Z" },
    ],
  });
  const [deposit, balance] = booking.paymentRequests!;
  assert.equal(deposit.id, "7");
  assert.equal(deposit.stage, "deposit");
  assert.equal(deposit.status, "overdue");
  assert.equal(deposit.amount, 2000000);
  assert.equal(deposit.totalAmount, 3000000);
  assert.equal(deposit.dueDate, "2026-10-28");
  assert.equal(balance.status, "scheduled");
  assert.equal(balance.dueDate, "");
  assert.equal(booking.depositPaid, false);
  assert.deepEqual(booking.paymentTransactions?.map((t) => t.status), ["success", "expired"]);
  assert.equal(booking.paymentTransactions?.[0].gatewayTransactionNo, "14000000");
});

test("a paid deposit shows the full stage amount and counts as deposit paid", () => {
  const booking = fromApiBooking({
    ...dto, status: "Confirmed", paidAmount: 3000000, paymentStatus: "PartiallyPaid",
    paymentSchedule: [{ id: 7, stage: "deposit", description: "Đặt cọc 30%", amount: 3000000, outstanding: 0, dueDate: "2026-10-28T00:00:00", status: "Paid", paidAt: "2026-10-26T03:00:00Z" }],
  });
  assert.equal(booking.paymentRequests?.[0].amount, 3000000);
  assert.equal(booking.paymentRequests?.[0].paidAt, "2026-10-26");
  assert.equal(booking.depositPaid, true);
});

test("only official payOS checkout hosts over https are accepted as redirect targets", () => {
  assert.equal(isPayOsUrl("https://pay.payos.vn/web/abc123"), true);
  assert.equal(isPayOsUrl("http://pay.payos.vn/web/abc123"), false);
  assert.equal(isPayOsUrl("https://pay.payos.vn.evil.test/web"), false);
  assert.equal(isPayOsUrl("https://evilpayos.vn/web"), false);
  assert.equal(isPayOsUrl("javascript:alert(1)"), false);
});

test("deadlines from the server are shown in Vietnam time with date and time", () => {
  // Duyệt 14:30 02/11 (giờ VN) => hạn backend trả về 07:30Z 03/11 => hiển thị 14:30 03/11/2026.
  assert.equal(formatVietnamDateTime("2026-11-03T07:30:00Z"), "14:30 03/11/2026");
  assert.equal(formatVietnamDateTime("2026-11-02T17:05:00Z"), "00:05 03/11/2026");
  assert.equal(formatVietnamDateTime(null), "");
  assert.equal(formatVietnamDateTime("not-a-date"), "");
});

test("server deadline, overdue and not-issued deposit states are mapped without recomputing", () => {
  const booking = fromApiBooking({
    ...dto, status: "Confirmed",
    paymentSchedule: [
      { id: 9, stage: "deposit", description: "Đặt cọc 50%", amount: 5000000, outstanding: 5000000, dueDate: "2026-11-03T00:00:00", dueAt: "2026-11-03T07:30:00Z", status: "Overdue", warning: "Hạn cọc rơi sau thời điểm khởi hành." },
      { id: null, stage: "balance", description: "Phần còn lại", amount: 5000000, outstanding: 5000000, status: "Scheduled" },
    ],
    paymentTransactions: [
      { id: 3, transactionCode: "PAYOS-261102143000123", paymentMethod: "PAYOS", amount: 5000000, status: "NeedsReview", reviewNote: "Trả thiếu", expiresAt: "2026-11-02T07:45:00Z" },
    ],
  });
  const [deposit] = booking.paymentRequests!;
  assert.equal(deposit.status, "overdue");
  assert.equal(deposit.dueAt, "2026-11-03T07:30:00Z");
  assert.equal(deposit.warning, "Hạn cọc rơi sau thời điểm khởi hành.");
  assert.equal(booking.paymentTransactions?.[0].status, "needsreview");
  assert.equal(booking.paymentTransactions?.[0].reviewNote, "Trả thiếu");
  const legacy = fromApiBooking({ ...dto, status: "Confirmed", paymentSchedule: [
    { id: null, stage: "deposit", description: "Đặt cọc 50%", amount: 5000000, outstanding: 5000000, status: "NotIssued" },
  ] });
  assert.equal(legacy.paymentRequests?.[0].status, "not_issued");
});

test("balance deadline at 00:00 is shown as the end of the previous day", () => {
  // Khởi hành 30/11 → backend trả hạn 17:00Z 22/11 (= 00:00 23/11 giờ VN) → hiển thị "23:59 22/11/2026".
  assert.equal(formatVietnamDeadline("2026-11-22T17:00:00Z"), "23:59 22/11/2026");
  assert.equal(formatVietnamDeadline("2026-11-03T07:30:00Z"), "14:30 03/11/2026");
});
