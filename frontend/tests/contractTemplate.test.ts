import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TIERS, feeFor, previewRows, validateTiers } from "../src/app/lib/contractTemplate.ts";

const custom = [{ minDays: 5, feePercent: 80 }, { minDays: 30, feePercent: 10 }, { minDays: 14, feePercent: 40 }];

test("preview rows match the contract table of the backend", () => {
  assert.deepEqual(previewRows(custom).map((r) => `${r.range}: ${r.fee}`), [
    "Từ 30 ngày trở lên: 10%", "Từ 14 đến 29 ngày: 40%", "Từ 5 đến 13 ngày: 80%",
    "Từ 1 đến 4 ngày: 100%", "Ngày khởi hành hoặc không tham gia: 100%",
  ]);
  assert.equal(previewRows(DEFAULT_TIERS)[4].range, "Từ 1 đến 2 ngày");
});

test("fee follows the nearest tier and departure day is 100%", () => {
  assert.equal(feeFor(custom, 45), 10);
  assert.equal(feeFor(custom, 14), 40);
  assert.equal(feeFor(custom, 4), 100);
  assert.equal(feeFor(custom, 0), 100);
  assert.equal(feeFor(DEFAULT_TIERS, 2), 90);
});

test("invalid tiers are rejected", () => {
  assert.equal(validateTiers(custom), null);
  assert.match(validateTiers([]) ?? "", /ít nhất/);
  assert.match(validateTiers([{ minDays: 10, feePercent: 20 }, { minDays: 10, feePercent: 30 }]) ?? "", /trùng/);
  assert.match(validateTiers([{ minDays: 30, feePercent: 50 }, { minDays: 7, feePercent: 20 }]) ?? "", /không được thấp hơn/);
  assert.match(validateTiers([{ minDays: 0, feePercent: 10 }]) ?? "", /từ 1 đến/);
  assert.match(validateTiers([{ minDays: 3, feePercent: 101 }]) ?? "", /0% đến 100%/);
});

test("clause payload keeps only real edits", async () => {
  const { clausePayload } = await import("../src/app/lib/contractTemplate.ts");
  assert.equal(clausePayload("  1. A\r\n2. B  \n", "1. A\n2. B"), null);
  assert.equal(clausePayload("   ", "1. A"), null);
  assert.equal(clausePayload("1. A đã sửa \r\n", "1. A"), "1. A đã sửa");
});
