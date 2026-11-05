import { test } from "node:test";
import assert from "node:assert/strict";
import { findProvince, validServiceAddress } from "../src/app/lib/administrativeLocations.ts";

const provinces = [{ code: "68", name: "Lâm Đồng", fullName: "Tỉnh Lâm Đồng" },
  { code: "01", name: "Hà Nội", fullName: "Thành phố Hà Nội" }];
const wards = [{ code: "24778", name: "Phường Xuân Hương - Đà Lạt", provinceCode: "68" }];

test("existing short province names and API full names resolve to the same official code", () => {
  assert.equal(findProvince(provinces, " Lâm Đồng ")?.code, "68");
  assert.equal(findProvince(provinces, "tỉnh lâm đồng")?.code, "68");
  assert.equal(findProvince(provinces, "Thành phố Hà Nội")?.code, "01");
});

test("old merged province names are not automatically mapped to an unrelated current province", () => {
  assert.equal(findProvince(provinces, "Bình Thuận"), undefined);
  assert.equal(findProvince(provinces, ""), undefined);
});

test("a new service address requires an actual ward in the selected province", () => {
  assert.equal(validServiceAddress(provinces, "Lâm Đồng", wards, wards[0].name), true);
  assert.equal(validServiceAddress(provinces, "Hà Nội", wards, wards[0].name), false);
  assert.equal(validServiceAddress(provinces, "Lâm Đồng", wards, "Phường 3"), false);
  assert.equal(validServiceAddress(provinces, "Lâm Đồng", wards, ""), false);
  assert.equal(validServiceAddress(provinces, "Lâm Đồng", [], wards[0].name), false);
});
