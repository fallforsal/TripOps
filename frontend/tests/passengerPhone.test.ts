import test from "node:test";
import assert from "node:assert/strict";
import { isValidPassengerPhone, phoneFromSpreadsheet } from "../src/app/lib/passengerPhone.ts";
import { passengerExportRows } from "../src/app/lib/passengerExport.ts";

test("optional phone accepts local/international numbers and rejects invalid or oversized text", () => {
  for (const phone of [undefined, null, "", "  ", "0901234567", "+84 901 234 567", "(0263) 3822-222", "1".repeat(30)]) assert.equal(isValidPassengerPhone(phone), true);
  for (const phone of ["090ABC123", "1".repeat(31), "+++", "1e9", "0901<script>"]) assert.equal(isValidPassengerPhone(phone), false);
});
test("Excel supports old templates, aliases, blank phones and numeric cells without losing zero", () => {
  assert.equal(phoneFromSpreadsheet({"Số điện thoại": "0901234567"}), "0901234567");
  assert.equal(phoneFromSpreadsheet({"SĐT": 901234567}), "0901234567");
  assert.equal(phoneFromSpreadsheet({"Phone number": "+84901234567"}), "+84901234567");
  assert.equal(phoneFromSpreadsheet({"Họ tên": "A"}), "");
  assert.equal(phoneFromSpreadsheet({"Số điện thoại": null}), "");
});
test("passenger export preserves phone and identity as text and only exports supplied stage rows", () => {
  const rows = passengerExportRows([{id:"1", fullName:"A", phone:"0901234567", idNumber:"001090012345", price:100, agencyId:"a", ageGroup:"adult"}], () => "Agency A");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]["Số điện thoại"], "0901234567");
  assert.equal(rows[0]["CCCD / Hộ chiếu"], "001090012345");
  assert.equal(rows[0]["Chặng tham gia"], "Agency A");
});
