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

test("supplier labels tell directory, AI suggestion and manual entries apart", async () => {
  const { supplierLabel, draftSourceMessage } = await import("../src/app/lib/supplierLabel.ts");
  assert.equal(supplierLabel({ agencySupplierId: 5 }), "Nhà cung cấp trong danh bạ");
  assert.equal(supplierLabel({ description: "Gợi ý ngoài TripOps: cần xác minh…" }), "AI gợi ý · chưa có trong danh bạ");
  assert.equal(supplierLabel({ description: "Quán quen" }), "Agency tự nhập ngoài sàn");
  const msg = draftSourceMessage({ timelines: [{ meals: [{ serviceId: 3 }, {}], accommodations: [{ agencySupplierId: 1 }] }] });
  assert.match(msg, /1 mục từ danh bạ/);
  assert.match(msg, /1 mục là dịch vụ trên TripOps/);
  assert.match(msg, /1 mục là gợi ý bên ngoài/);
  assert.match(draftSourceMessage({ timelines: [{ meals: [{}] }] }), /Danh bạ của bạn chưa có/);
});

test("tour code is suggested from destination and duration", async () => {
  const { suggestTourCode } = await import("../src/app/lib/tourCode.ts");
  assert.equal(suggestTourCode("Đà Lạt", 4), "DL4N3D");
  assert.equal(suggestTourCode("Nha Trang, Khánh Hòa", 3), "NT3N2D");
  assert.equal(suggestTourCode("TP. Hồ Chí Minh", 2), "HCM2N1D");
  assert.equal(suggestTourCode("", 1), "TOUR1N");
});

test("settlement note explains cancellation fee shares", async () => {
  const { settlementAmountNote } = await import("../src/app/lib/settlementNote.ts");
  const f = (n: number) => `${n}đ`;
  const base = { grossAmount: 250000, customerPaid: 1500000, fromCancellation: true, cancellationFeeRetained: 750000 } as any;
  assert.equal(settlementAmountNote(base, f), "Phần chia 33% · phí hủy giữ lại 750000đ");
  assert.equal(settlementAmountNote({ ...base, grossAmount: 750000 }, f), "Phí hủy giữ lại 750000đ");
  assert.equal(settlementAmountNote({ grossAmount: 10, customerPaid: 10 } as any, f), "Khách đã trả 10đ");
});
