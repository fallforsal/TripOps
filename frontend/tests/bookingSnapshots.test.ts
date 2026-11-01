import { test } from "node:test";
import assert from "node:assert/strict";
import { fromApiBooking } from "../src/app/services/bookingAdapter.ts";
import { acceptedSnapshotFromBooking, selectSnapshotVersions } from "../src/app/services/bookingSnapshots.ts";
import type { BookingDto, BookingSnapshotDto, BookingSnapshotSummaryDto } from "../src/app/services/wf05Bookings.ts";

const initial: BookingSnapshotDto = {
  id: 21, bookingId: 101, version: 1, snapshotType: "initial_request",
  createdAt: "2026-11-01T10:00:00Z", createdBy: "customer", sourceTourVersion: 7,
  snapshotData: {
    schemaVersion: 1, tourId: 5, tourCode: "TOUR-ORIGINAL", tourName: "Tour ban đầu", sourceTourVersion: 7,
    destination: "Đà Lạt", durationDays: 3, durationNights: 2,
    startDate: "2026-12-15T00:00:00", endDate: "2026-12-17T00:00:00",
    agencyId: "agency", agencyName: "Agency", basePrice: 2500000, totalAmount: 4250000, depositAmount: 1275000,
    minGuests: 1, maxGuests: 40,
    pricingTiers: [
      { id: 13, name: "Người lớn", minAge: 12, maxAge: 150, pricePerGuest: 2500000 },
      { id: 14, name: "Trẻ em", minAge: 5, maxAge: 11, pricePerGuest: 1750000 },
      { id: 15, name: "Em bé", minAge: 0, maxAge: 4, pricePerGuest: 0 },
    ],
    passengers: [
      { index: 1, fullName: "An", tierName: "Người lớn", price: 2500000 },
      { index: 2, fullName: "Bình", tierName: "Trẻ em", price: 1750000 },
      { index: 3, fullName: "Ngọc", tierName: "Em bé", price: 0 },
    ],
    itinerary: [{ dayNumber: 1, title: "Ngày 1", locations: [], meals: [
      { dayNumber: 1, mealType: "lunch", name: "Nhà hàng ban đầu", priceDifference: 0 },
    ] }],
    hotels: [{ destination: "Đà Lạt", name: "Khách sạn ban đầu", stars: 4, nights: 2, priceDifference: 0 }],
    inclusions: "", exclusions: "", cancellationPolicy: "Chính sách ban đầu",
    paymentConditions: [{ conditionType: "deposit", amount: 1275000, description: "Đặt cọc 30%" }],
    generatedAt: "2026-11-01T10:00:00Z",
  },
};
const agreed: BookingSnapshotDto = {
  ...initial, id: 23, version: 3, snapshotType: "agreed", acceptedBy: "customer", acceptedAt: "2026-11-01T12:00:00Z",
};
const dto: BookingDto = {
  id: 101, bookingCode: "BK-TEST", customerId: "customer", customerName: "Customer", tourId: 5,
  tourName: "Tour ban đầu", agencyId: "agency", startDate: "2026-12-15T00:00:00", endDate: "2026-12-17T00:00:00",
  totalGuests: 3, totalAmount: 4250000, depositAmount: 1275000, paidAmount: 0, status: "Confirmed", paymentStatus: "Unpaid",
  createdAt: initial.createdAt, participants: [], assignedGuides: [], agreedSnapshot: agreed, initialRequestSnapshot: initial,
  snapshotStatus: "agreed", effectiveSnapshotVersion: 3,
};

test("the newest pending proposal is selected independently of list order", () => {
  const v2: BookingSnapshotSummaryDto = { ...initial, id: 22, version: 2, snapshotType: "proposal" };
  const v3: BookingSnapshotSummaryDto = { ...v2, id: 23, version: 3 };
  for (const rows of [[v3, v2, initial], [initial, v2, v3]]) {
    const versions = selectSnapshotVersions(rows);
    assert.equal(versions.effective?.id, 23);
    assert.equal(versions.proposal?.id, 23);
    assert.deepEqual(versions.sorted.map(s => s.version), [3, 2, 1]);
  }
});

test("an unaccepted newer proposal never replaces the accepted agreement", () => {
  const pending: BookingSnapshotDto = { ...initial, id: 24, version: 4, snapshotType: "proposal",
    snapshotData: { ...initial.snapshotData, tourName: "Chưa chốt", basePrice: 9999999 } };
  assert.equal(selectSnapshotVersions([pending, initial, agreed]).effective?.id, agreed.id);
  const liveTour = { ...fromApiBooking(dto).tour, name: "Catalogue mới", tourCode: "NEW", inclusions: ["Thêm mới"], exclusions: ["Mới"], price: 9999999 };
  const result = fromApiBooking({ ...dto, latestProposal: pending }, [liveTour]);
  assert.equal(result.tour.name, "Tour ban đầu");
  assert.equal(result.tour.tourCode, "TOUR-ORIGINAL");
  assert.equal(result.tour.price, 2500000);
  assert.equal(result.totalPrice, 4250000);
  assert.deepEqual(result.tour.inclusions, []);
  assert.deepEqual(result.tour.exclusions, []);
  assert.equal(result.cancellationPolicy, "Chính sách ban đầu");
  assert.equal(result.tour.hotels?.[0].name, "Khách sạn ban đầu");
  assert.equal(result.tour.itinerary[0].meals?.[0].serviceName, "Nhà hàng ban đầu");
});

test("acceptance uses the agreed snapshot id and version from BookingDto", () => {
  const result = acceptedSnapshotFromBooking(dto);
  assert.equal(result.id, 23);
  assert.equal(result.version, 3);
  assert.notEqual(result.id, dto.id);
  assert.throws(() => acceptedSnapshotFromBooking({ ...dto, agreedSnapshot: null }));
});
