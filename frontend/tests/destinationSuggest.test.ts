import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestDestinations } from "../src/app/data/vietnamProvinces.ts";

const names = (q: string) => suggestDestinations(q).map((p) => p.name);

test("no suggestions until the user types", () => {
  assert.deepEqual(names(""), []);
  assert.deepEqual(names("   "), []);
});

test("one letter lists provinces whose name starts with it", () => {
  const h = names("H");
  assert.ok(h.length > 0);
  for (const name of h) assert.match(name.replace(/^TP\.\s*/, ""), /^H/);
  assert.ok(h.includes("TP. Hà Nội") && h.includes("Hà Giang"));
});

test("typing with accents narrows to that spelling", () => {
  const ha = names("Hà");
  assert.deepEqual(ha.slice(0, 4), ["TP. Hà Nội", "Hà Giang", "Hà Nam", "Hà Tĩnh"]);
  assert.ok(!ha.includes("TP. Hải Phòng"));
  assert.ok(names("ha").includes("TP. Hải Phòng")); // không dấu thì khớp rộng hơn
});

test("famous places point to their province", () => {
  assert.ok(names("Sa").includes("Lào Cai"));
  assert.equal(names("Đà")[0], "TP. Đà Nẵng");
});
