import { test } from "node:test";
import assert from "node:assert/strict";
import { fromApiBooking } from "../src/app/services/bookingAdapter.ts";
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
