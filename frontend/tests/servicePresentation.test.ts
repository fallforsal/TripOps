import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceAddress, serviceGallery, serviceThumbnail } from "../src/app/lib/servicePresentation.ts";

test("service cards and detail galleries use the selected cover before additional images", () => {
  const service = { thumbnailUrl: "pool.jpg", image: "legacy.jpg", images: ["bedroom.jpg", "pool.jpg", "bedroom.jpg", " "] };
  assert.equal(serviceThumbnail(service), "pool.jpg");
  assert.deepEqual(serviceGallery(service), ["pool.jpg", "bedroom.jpg"]);
});

test("legacy services retain image fallback without duplicate or fabricated gallery images", () => {
  assert.deepEqual(serviceGallery({ image: "cover.jpg", images: ["extra.jpg"] }), ["cover.jpg", "extra.jpg"]);
  assert.deepEqual(serviceGallery({ images: ["extra.jpg"] }), ["extra.jpg"]);
  assert.deepEqual(serviceGallery({}), []);
  assert.equal(serviceThumbnail(undefined), "");
});

test("service details preserve full address and legacy location instead of showing province alone", () => {
  assert.equal(serviceAddress({ fullAddress: "10 Lê Lai, Đà Lạt, Lâm Đồng", province: "Lâm Đồng" }), "10 Lê Lai, Đà Lạt, Lâm Đồng");
  assert.equal(serviceAddress({ street: "12 Trần Phú", ward: "Xuân Hương", province: "Lâm Đồng" }), "12 Trần Phú, Xuân Hương, Lâm Đồng");
  assert.equal(serviceAddress({ location: "10 Lê Lai, Đà Lạt, Lâm Đồng", province: "Lâm Đồng" }), "10 Lê Lai, Đà Lạt, Lâm Đồng");
});
