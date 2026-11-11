import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createNotificationDialogQueue, confirmationTone } from "../src/app/lib/notificationDialogs.ts";
import { toast } from "../src/app/lib/notifications.ts";

test("confirmation blocks an action until accepted and cancellation does not run it", async () => {
  const queue = createNotificationDialogQueue();
  let mutations = 0;
  const first = queue.enqueue({ kind: "confirm", message: "Xóa bài đăng?" }).then(result => { if (result) mutations++; });
  assert.equal(mutations, 0);
  queue.respond(queue.snapshot()!.id, false);
  await first;
  assert.equal(mutations, 0);
  const second = queue.enqueue({ kind: "confirm", message: "Xóa bài đăng?" }).then(result => { if (result) mutations++; });
  queue.respond(queue.snapshot()!.id, true);
  await second;
  assert.equal(mutations, 1);
});

test("concurrent dialogs stay queued and stale close events cannot accept the next action", async () => {
  const queue = createNotificationDialogQueue();
  const first = queue.enqueue({ kind: "confirm", message: "Thao tác A" });
  const firstId = queue.snapshot()!.id;
  const second = queue.enqueue({ kind: "confirm", message: "Thao tác B" });
  assert.equal(queue.snapshot()!.message, "Thao tác A");
  queue.respond(firstId, true);
  const secondId = queue.snapshot()!.id;
  queue.respond(firstId, false);
  assert.equal(queue.snapshot()!.id, secondId);
  queue.respond(secondId, false);
  assert.deepEqual(await Promise.all([first, second]), [true, false]);
});

test("leaving a page cancels pending dialogs and input cancellation returns null", async () => {
  const queue = createNotificationDialogQueue();
  const confirm = queue.enqueue({ kind: "confirm", message: "Xác nhận" });
  const input = queue.enqueue({ kind: "input", message: "Nhập lý do" });
  queue.cancelAll();
  assert.deepEqual(await Promise.all([confirm, input]), [false, null]);
  assert.equal(queue.snapshot(), null);
});

test("destructive actions use error colors and routine decisions use warning colors", () => {
  for (const message of ["Xóa bài đăng?", "Hủy yêu cầu?", "Thu hồi hợp tác?", "Rút hướng dẫn viên?"])
    assert.equal(confirmationTone(message), "error");
  assert.equal(confirmationTone("Đặt thẻ mặc định?"), "warning");
});

test("repeated identical errors share one Sonner toast and different outcomes remain separate", () => {
  const message = `notification-test-${Date.now()}`;
  assert.equal(toast.error(message), toast.error(message));
  assert.notEqual(toast.error(message), toast.success(message));
  assert.equal(toast.getHistory().filter(item => item.id === `error:${message}`).length, 1);
});

test("frontend contains no native alert, confirm, or prompt calls", () => {
  const walk = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(join(directory, entry.name)) : /\.[jt]sx?$/.test(entry.name) ? [join(directory, entry.name)] : []);
  for (const file of walk(fileURLToPath(new URL("../src", import.meta.url))))
    assert.doesNotMatch(readFileSync(file, "utf8"), /\b(?:alert|confirm|prompt)\s*\(/, file);
});
