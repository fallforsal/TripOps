import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VIETNAM_PROVINCES,
  getProvinceByCode,
  getProvinceName,
  searchVietnamProvinces,
  suggestProvincesFromDestinationText,
} from "../src/app/data/vietnamProvinces.ts";

test("VIETNAM_PROVINCES contains 34 current provinces and resolves historic codes", () => {
  assert.equal(VIETNAM_PROVINCES.length, 34);
  const uniqueCodes = new Set(VIETNAM_PROVINCES.map((p) => p.code));
  assert.equal(uniqueCodes.size, 34);
  assert.equal(getProvinceByCode("THUA_THIEN_HUE")?.code, "HUE");
  assert.equal(getProvinceByCode("QUANG_NAM")?.code, "DA_NANG");
  assert.equal(getProvinceByCode("KIEN_GIANG")?.code, "AN_GIANG");
  assert.equal(getProvinceByCode("LAM_DONG")?.name, "Lâm Đồng");
  assert.equal(getProvinceName("KHANH_HOA"), "Khánh Hòa");
});

test("searchVietnamProvinces matches by province name, code, and popular destinations", () => {
  const dalatMatches = searchVietnamProvinces("Đà Lạt");
  assert.ok(dalatMatches.some((p) => p.code === "LAM_DONG"));

  const nhatrangMatches = searchVietnamProvinces("Nha Trang");
  assert.ok(nhatrangMatches.some((p) => p.code === "KHANH_HOA"));

  const codeMatches = searchVietnamProvinces("QUANG_NAM");
  assert.equal(codeMatches[0]?.code, "DA_NANG");
});

test("suggestProvincesFromDestinationText suggests unselected provinces without auto-mutating", () => {
  const suggestions = suggestProvincesFromDestinationText(
    "Đà Lạt - Nha Trang",
    ["LAM_DONG"],
  );
  assert.deepEqual(
    suggestions.map((p) => p.code),
    ["KHANH_HOA"],
  );
});
