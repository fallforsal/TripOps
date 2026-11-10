import { test } from "node:test";
import assert from "node:assert/strict";
import { findBookingSupplierRequest, providerResponseInstant,
  type BookingSupplierRequest } from "../src/app/lib/bookingSupplierStatus.ts";

const request = (overrides: Partial<BookingSupplierRequest> = {}): BookingSupplierRequest => ({
  id: 1, bookingId: 5, serviceId: 4, slotKey: "hotel:10", serviceName: "Hotel", status: "Confirmed",
  estimatedCost: 100, quotedCost: 0, note: null, providerId: "same-provider", ...overrides,
});
const slot = { kind: "hotel" as const, itemId: "10", serviceId: "4" };

test("Provider reply timestamps preserve explicit offsets and treat SQL zone-less timestamps as UTC", () => {
  assert.equal(providerResponseInstant("2026-11-05T09:06:12"), "2026-11-05T09:06:12Z");
  assert.equal(providerResponseInstant("2026-11-05T09:06:12Z"), "2026-11-05T09:06:12Z");
  assert.equal(providerResponseInstant("2026-11-05T16:06:12+07:00"), "2026-11-05T16:06:12+07:00");
});

test("confirmations match the booking slot and service, even for the same Provider", () => {
  const rows = [request(), request({ id: 2, slotKey: "hotel:11", status: "Rejected" }),
    request({ id: 3, slotKey: "meal:10", status: "Pending" })];
  assert.equal(findBookingSupplierRequest(rows, slot)?.id, 1);
  assert.equal(findBookingSupplierRequest(rows, { ...slot, kind: "meal" })?.id, 3);
  assert.equal(findBookingSupplierRequest(rows, { ...slot, serviceId: "99" }), undefined);
  assert.equal(findBookingSupplierRequest(rows, { ...slot, itemId: undefined }), undefined);
});

test("superseded responses never override the current response", () => {
  const rows = [request({ id: 2 }), request({ id: 3, status: "Superseded" })];
  assert.equal(findBookingSupplierRequest(rows, slot)?.id, 2);
});
