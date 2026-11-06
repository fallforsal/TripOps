import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingApprovalEligibility, findBookingSupplierRequest, providerResponseInstant,
  type BookingQuotation, type BookingSupplierRequest, type BookingQuotationState } from "../src/app/lib/bookingSupplierStatus.ts";

const request = (overrides: Partial<BookingSupplierRequest> = {}): BookingSupplierRequest => ({
  id: 1, bookingId: 5, serviceId: 4, slotKey: "hotel:10", serviceName: "Hotel", status: "Confirmed",
  estimatedCost: 100, quotedCost: 0, note: null, providerId: "same-provider", ...overrides,
});
const quote = (overrides: Partial<BookingQuotation> = {}): BookingQuotation => ({
  id: 1, bookingId: 5, version: 1, tourId: 1, status: "Accepted", estimatedSale: 100,
  totalCost: 0, agencyProfit: 100, saleTotal: 100, costs: [], reason: "", createdAt: "",
  requiresCustomerAcceptance: true, ...overrides,
});
const state = (overrides: Partial<BookingQuotationState> = {}): BookingQuotationState => ({
  bookingId: "5", loading: false, quotes: [quote()], requests: [request()], ...overrides,
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
  assert.equal(bookingApprovalEligibility(state({ requests: rows }), [slot]).canApprove, true);
});

test("loading, API errors and missing slot confirmations block approval", () => {
  for (const current of [state({ loading: true }), state({ error: "Network error" }), state({ requests: [] })])
    assert.equal(bookingApprovalEligibility(current, [slot]).canApprove, false);
});

test("pending and rejected Provider responses block approval despite an accepted quotation", () => {
  for (const status of ["Pending", "Rejected"])
    assert.equal(bookingApprovalEligibility(state({ requests: [request({ status })] }), [slot]).canApprove, false);
});

test("confirmed services still require acceptance of the latest quotation", () => {
  for (const status of ["Draft", "Sent", "Superseded"])
    assert.equal(bookingApprovalEligibility(state({ quotes: [quote({ status, version: 2 }), quote()] }), [slot]).canApprove, false);
  assert.equal(bookingApprovalEligibility(state(), [slot]).canApprove, true);
});

test("private suppliers follow the API acceptance requirement without inventing Provider confirmations", () => {
  assert.equal(bookingApprovalEligibility(state({ requests: [], quotes: [quote({ status: "Draft" })] }), []).canApprove, false);
  assert.equal(bookingApprovalEligibility(state({ requests: [] }), []).canApprove, true);
  assert.equal(bookingApprovalEligibility(state({ requests: [], quotes: [quote({ status: "Draft", requiresCustomerAcceptance: false })] }), []).canApprove, true);
});
