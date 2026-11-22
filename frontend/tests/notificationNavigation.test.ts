import test from "node:test";
import assert from "node:assert/strict";
import { notificationDestination } from "../src/app/lib/notificationNavigation.ts";

test("Agency incident notification opens the actual booking and incident tab", () => {
  assert.deepEqual(
    notificationDestination({ message: "Sự cố [HEALTH] trong booking BK26: demo. Vui lòng xem Incident Reports.", bookingId: 218, requestId: null }, "agency"),
    { section: "bookings", href: "#/agency/bookings/218?tab=incidents", bookingId: 218, tab: "incidents" },
  );
});

test("Existing payment notices open booking detail, not the booking list", () => {
  assert.deepEqual(
    notificationDestination({ message: "Booking đã nhận thanh toán; tiếp tục đặt dịch vụ chính thức.", bookingId: 218, requestId: null }, "agency"),
    { section: "bookings", href: "#/agency/bookings/218", bookingId: 218 },
  );
});

test("Customer and Provider notices deep link to their respective entity views", () => {
  const n = { message: "Booking mới", bookingId: 218, requestId: null };
  assert.equal(notificationDestination(n, "user")?.href, "#/my-bookings/218");
  assert.equal(notificationDestination(n, "provider")?.href, "#/provider/room-requests?bookingId=218");
});

test("Agency design request deep link keeps the requestId", () => {
  assert.equal(notificationDestination({ message: "Yêu cầu thiết kế", bookingId: null, requestId: 21 }, "agency")?.href,
    "#/agency/custom-requests?requestId=21");
});

test("A notice without a valid booking id falls back to a safe section", () => {
  assert.equal(notificationDestination({ message: "Thông tin khác", bookingId: 0, requestId: null }, "agency")?.href,
    "#/agency/overview");
});
