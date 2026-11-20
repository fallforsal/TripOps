import { test } from "node:test";
import assert from "node:assert/strict";
import { customerTourPreview } from "../src/app/lib/tourEditorPreview.ts";
import type { Tour } from "../src/app/types/index.ts";

const draft: Tour = {
  id: "12", tourCode: "TC-12", name: "Tour đang sửa", destination: "Đà Lạt", duration: "2 ngày 1 đêm",
  image: "blob:chosen-cover", images: ["blob:chosen-cover", "https://example.test/saved.jpg"],
  price: 1000000, rating: 0, minGuests: 2, maxGuests: 20, highlights: [], itinerary: [],
  priceTable: [
    { tierKey: "adult", ageGroup: "adult", ageGroupLabel: "Người lớn", minAge: 12, price: 1200000 },
    { tierKey: "child", ageGroup: "child_2_11", ageGroupLabel: "Trẻ em", minAge: 2, maxAge: 11, price: 500000 },
  ],
  coHosts: [
    { companyId: "lead", companyName: "Chủ trì", role: "lead", status: "accepted" },
    { companyId: "partner", companyName: "Đối tác", role: "partner", status: "accepted" },
    { companyId: "pending", companyName: "Chưa nhận lời", role: "partner", status: "pending" },
  ],
  agencyPricing: [
    { agencyId: "partner", tiers: [
      { key: "adult", name: "Người lớn", minAge: 12, maxAge: null, pricePerGuest: 800000, displayOrder: 0 },
      { key: "child", name: "Trẻ em", minAge: 2, maxAge: 11, pricePerGuest: 300000, displayOrder: 1 },
    ] },
    { agencyId: "pending", tiers: [{ key: "adult", name: "Người lớn", minAge: 12, maxAge: null, pricePerGuest: 9000000, displayOrder: 0 }] },
  ],
};

test("preview totals unsaved own prices with accepted partners and excludes pending invitations", () => {
  const preview = customerTourPreview(draft, "lead");
  assert.equal(preview.price, 2000000);
  assert.deepEqual(preview.priceTable?.map(row => row.price), [2000000, 800000]);
  assert.deepEqual(preview.coHosts?.map(host => host.companyId), ["lead", "partner"]);
  assert.equal(preview.agencyPricing, undefined);
  assert.equal(draft.priceTable![0].price, 1200000);
});

test("partner preview replaces its saved quote with the current inputs without double counting", () => {
  const preview = customerTourPreview({ ...draft, agencyPricing: [
    ...draft.agencyPricing!,
    { agencyId: "lead", tiers: [{ name: "Người lớn", minAge: 12, maxAge: null, pricePerGuest: 400000, displayOrder: 0 }] },
  ] }, "partner");
  assert.equal(preview.price, 1600000);
});

test("public preview uses the edited selling price and keeps local image previews", () => {
  const preview = customerTourPreview({ ...draft, coHosts: [] });
  assert.equal(preview.priceTable![0].price, 1000000);
  assert.equal(preview.priceTable![1].price, 500000);
  assert.equal(preview.image, "blob:chosen-cover");
  assert.deepEqual(preview.images, draft.images);
  assert.equal(preview.isCoHosted, false);
});
