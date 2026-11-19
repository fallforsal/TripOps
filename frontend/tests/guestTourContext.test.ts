import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTourIds, nextTourContext } from "../src/app/lib/guestTourContext.ts";

test("keeps the server's list of the latest suggested tours, even when follow-up shows one card", () => {
  const first = nextTourContext([], { tours: [{ id: 101 }, { id: 102 }, { id: 103 }], contextTourIds: [101, 102, 103] });
  assert.deepEqual(first, [101, 102, 103]);
  // "Tour nào rẻ nhất?": chỉ hiện 1 thẻ nhưng danh sách cần giữ vẫn là 3 tour cũ.
  assert.deepEqual(nextTourContext(first, { tours: [{ id: 102 }], contextTourIds: [101, 102, 103] }), [101, 102, 103]);
});

test("a new search replaces the list and an empty server list clears it", () => {
  assert.deepEqual(nextTourContext([101, 102], { tours: [{ id: 201 }], contextTourIds: [201] }), [201]);
  assert.deepEqual(nextTourContext([101, 102], { tours: [], contextTourIds: [] }), []);
});

test("older servers without contextTourIds fall back to the shown cards, otherwise keep the list", () => {
  assert.deepEqual(nextTourContext([1, 2], { tours: [{ id: 5 }] }), [5]);
  assert.deepEqual(nextTourContext([1, 2], { tours: [] }), [1, 2]);
});

test("ids are positive integers, unique and capped at 8", () => {
  assert.deepEqual(cleanTourIds([3, 3, -1, 0, 1.5, NaN, 4, 5, 6, 7, 8, 9, 10, 11]), [3, 4, 5, 6, 7, 8, 9, 10]);
});
