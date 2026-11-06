import { test } from "node:test";
import assert from "node:assert/strict";
import { servicePostState, servicePostCounts, matchesServicePostFilter } from "../src/app/lib/servicePostStatus.ts";

const posts = [
  { status: "pending" as const }, { status: "rejected" as const }, { status: "approved" as const },
  { status: "approved" as const, isPaused: true }, { status: "hidden" as const, isPaused: true },
];

test("the merged list includes every moderation and availability state", () => {
  assert.equal(posts.filter((post) => matchesServicePostFilter(post, "all")).length, 5);
  assert.deepEqual(servicePostCounts(posts), { all: 5, pending: 1, rejected: 1, approved: 1, paused: 1, hidden: 1 });
});

test("Provider-paused posts are excluded from the public-display filter", () => {
  assert.deepEqual(posts.filter((post) => matchesServicePostFilter(post, "approved")), [{ status: "approved" }]);
  assert.deepEqual(posts.filter((post) => matchesServicePostFilter(post, "paused")), [{ status: "approved", isPaused: true }]);
});

test("Admin moderation takes precedence over Provider availability", () => {
  assert.equal(servicePostState({ status: "hidden", isPaused: true }), "hidden");
  assert.equal(servicePostState({ status: "pending", isPaused: true }), "pending");
  assert.equal(servicePostState({ status: "rejected", isPaused: true }), "rejected");
});

test("an empty list has zero counts in every tab", () => {
  assert.deepEqual(servicePostCounts([]), { all: 0, pending: 0, approved: 0, paused: 0, hidden: 0, rejected: 0 });
});
