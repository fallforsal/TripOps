import { test } from "node:test";
import assert from "node:assert/strict";
import { toGroupRequest, hotelStayNights, type ProviderInboxRow } from "../src/app/services/providerRequests.ts";

const row: ProviderInboxRow = {
  id: 4, bookingId: 1, serviceId: 26, slotKey: "hotel:2", serviceName: "Sammy",
  serviceDateFrom: "2026-11-29T00:00:00", serviceDateTo: "2026-11-30T00:00:00",
  quantity: 20, unit: "person_night", estimatedCost: 1000000, quotedCost: null,
  status: "Pending", note: null, createdAt: "2026-11-11T15:11:00", respondedAt: null,
  bookingCode: "BK1", tourName: "Da Lat", agencyId: "agency-2", agencyName: "Agency 2", agencyPhone: null,
  agencyEmail: null, mealType: null, specialRequests: null, cancelReason: null, cancelledAt: null,
  guests: Array.from({ length: 20 }, (_, i) => ({ fullName: `Guest ${i}`, gender: null, tierName: null, roommateNote: null, restaurantNote: null })),
};

test("hotel stay uses check-in/out dates, independently of guest-night billing quantity", () => {
  const request = toGroupRequest(row, "provider");
  assert.equal(request.numberOfNights, 1);
  assert.equal(request.numberOfGuests, 20);
  assert.equal(request.id, "4");
  assert.equal(request.status, "pending");
  assert.equal(request.agencyId, "agency-2");
  assert.equal(hotelStayNights({ ...row, serviceDateTo: "2026-12-02T12:00:00", quantity: 60 }), 3);
  assert.equal(hotelStayNights({ ...row, serviceDateFrom: "2026-12-31", serviceDateTo: "2027-01-02" }), 2);
});

test("missing or invalid stay dates never turn guest quantity into nights", () => {
  assert.equal(hotelStayNights({ ...row, serviceDateTo: null }), 0);
  assert.equal(hotelStayNights({ ...row, serviceDateTo: "2026-11-28" }), 0);
  assert.equal(hotelStayNights({ ...row, serviceDateTo: null, unit: "night", quantity: 2 }), 2);
  assert.equal(toGroupRequest({ ...row, slotKey: "meal:3" }, "provider").numberOfNights, 0);
});

test("superseded request remains a separate, non-actionable history entry with replacement reason", () => {
  const old = toGroupRequest({ ...row, id: 2, status: "Superseded", cancelReason: "Agency đã thay dịch vụ." }, "provider");
  assert.equal(old.status, "cancelled");
  assert.equal(old.cancellationReason, "Agency đã thay dịch vụ.");
  assert.equal(old.cancelledByName, "Agency thay đổi dịch vụ");
  assert.notEqual(old.id, toGroupRequest(row, "provider").id);
});


test("a new service request is independent even when internally linked to an extra-guest request", () => {
  const request = toGroupRequest({...row, id:16, parentRequestId:15, isSupplement:false, guests:[row.guests[0]]}, "provider");
  assert.equal(request.isSupplement, false);
  assert.equal(request.status, "pending");
  assert.equal(request.numberOfGuests, 1);
  assert.equal(request.id, "16");
});

test("a declined request keeps its rejection reason after Agency requests another service", () => {
  const rejected = toGroupRequest({...row, id:15, status:"Rejected", note:"Không đủ phòng", parentRequestId:10, isSupplement:true}, "provider");
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.rejectionReason, "Không đủ phòng");
  assert.equal(rejected.cancellationReason, undefined);
});
