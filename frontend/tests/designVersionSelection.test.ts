import { test } from "node:test";
import assert from "node:assert/strict";
import { selectCustomerDesignVersion } from "../src/app/lib/designVersionSelection.ts";

test("selecting an older plan immediately publishes exactly that version using the current revision", async () => {
  const calls: unknown[] = [];
  const saved = await selectCustomerDesignVersion(2,
    async version => { calls.push(["load", version]); return { revision: 14, version }; },
    async (revision, version) => { calls.push(["publish", revision, version]); return { revision: 15, version }; });
  assert.deepEqual(calls, [["load", 2], ["publish", 14, 2]]);
  assert.deepEqual(saved, { revision: 15, version: 2 });
});

test("an unavailable version is not published", async () => {
  let published = false;
  await assert.rejects(selectCustomerDesignVersion(99,
    async () => { throw new Error("Không tìm thấy phiên bản tour."); },
    async () => { published = true; return { revision: 1 }; }));
  assert.equal(published, false);
});

test("validation failure keeps the previous customer plan intact", async () => {
  let customerVersion = 3;
  await assert.rejects(selectCustomerDesignVersion(4,
    async () => ({ revision: 8 }),
    async () => { throw new Error("Phiên bản chưa đủ thông tin."); }));
  assert.equal(customerVersion, 3);
  await selectCustomerDesignVersion(2, async () => ({ revision: 8 }), async (revision, version) => {
    customerVersion = version; return { revision: revision + 1 };
  });
  assert.equal(customerVersion, 2);
});

test("invalid version numbers never call the API", async () => {
  let requests = 0;
  for (const version of [0, -1, 1.5, NaN]) {
    await assert.rejects(selectCustomerDesignVersion(version,
      async () => { requests++; return { revision: 1 }; }, async () => { requests++; return { revision: 1 }; }));
  }
  assert.equal(requests, 0);
});
