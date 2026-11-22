import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanServiceName, groupByProvince, matchProvince, normalizeProvince } from "../src/app/lib/partnerServicePicker.ts";

test("matches destination to province ignoring administrative prefix", () => {
  assert.equal(normalizeProvince("TP. Đồng Nai"), "đồng nai");
  assert.equal(matchProvince("Đồng Nai", ["Lâm Đồng", "TP. Đồng Nai"]), "TP. Đồng Nai");
  assert.equal(matchProvince("Lâm Đồng", ["Lâm Đồng", "TP. Đồng Nai"]), "Lâm Đồng");
  assert.equal(matchProvince("", ["Lâm Đồng"]), undefined);
});

test("cleans sample prefix and groups preferred province first", () => {
  assert.equal(cleanServiceName("[Mẫu] The Mira Central Park Hotel"), "The Mira Central Park Hotel");
  const groups = groupByProvince([{ p: "Huế" }, { p: "Đồng Nai" }, { p: "Cà Mau" }], (x) => x.p, "Huế");
  assert.deepEqual(groups.map((g) => g.province), ["Huế", "Cà Mau", "Đồng Nai"]);
});
