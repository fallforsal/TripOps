import test from "node:test";
import assert from "node:assert/strict";
import { WorkflowPopupTracker } from "../src/app/lib/workflowPopupTracker.ts";

const item = (id: number, readAt: string | null = null) =>
  ({ id, readAt, message: `Thông báo ${id}` });

test("initial inbox baseline does not pop up historical unread notifications", () => {
  const tracker = new WorkflowPopupTracker();
  assert.deepEqual(tracker.collect([item(89), item(88), item(87)]), []);
  assert.deepEqual(tracker.collect([item(89), item(88)]), []);
});

test("provider slot confirmation is toasted once when its new ID arrives", () => {
  const tracker = new WorkflowPopupTracker();
  tracker.collect([item(89), item(88)]);
  assert.deepEqual(tracker.collect([item(90), item(89)]), [item(90)]);
  tracker.signal(90);
  assert.deepEqual(tracker.collect([item(90), item(89)]), []);
  assert.deepEqual(tracker.collect([item(90), item(89)]), []);
});

test("SignalR hint covers a race against initial fetch without old-notice flood", () => {
  const tracker = new WorkflowPopupTracker();
  tracker.signal(91);
  assert.deepEqual(tracker.collect([item(91), item(90), item(89)]), [item(91)]);
  assert.deepEqual(tracker.collect([item(91), item(90)]), []);
});

test("SignalR hint after baseline fetch can still toast an item it contained", () => {
  const tracker = new WorkflowPopupTracker();
  tracker.collect([item(91), item(90)]);
  tracker.signal(91);
  assert.deepEqual(tracker.collect([item(91), item(90)]), [item(91)]);
  assert.deepEqual(tracker.collect([item(91), item(90)]), []);
});

test("read notices, stale pages and bad events do not produce alerts", () => {
  const tracker = new WorkflowPopupTracker();
  tracker.collect([item(50), item(49)]);
  tracker.signal("51");
  tracker.signal(-1);
  assert.deepEqual(tracker.collect([item(51, "2026-11-20T09:00:00Z"), item(48)]), []);
  assert.deepEqual(tracker.collect([item(52), item(51)]), [item(52)]);
  assert.deepEqual(tracker.collect([item(48)]), []);
});

test("multiple new IDs are emitted once even with same-flight refreshes", () => {
  const tracker = new WorkflowPopupTracker();
  tracker.collect([]);
  assert.deepEqual(tracker.collect([item(3), item(2), item(1)]), [item(3), item(2), item(1)]);
  assert.deepEqual(tracker.collect([item(3), item(2), item(1)]), []);
});
