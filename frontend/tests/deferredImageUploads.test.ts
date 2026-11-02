import { test } from "node:test";
import assert from "node:assert/strict";
import { DeferredImageUploads } from "../src/app/lib/deferredImageUploads.ts";

test("choosing an image creates only a local preview; saving resolves URLs in the selected order", async () => {
  const drafts = new DeferredImageUploads();
  try {
    const [first, second] = drafts.stage([new File(["a"], "first.png", { type: "image/png" }), new File(["b"], "second.jpg", { type: "image/jpeg" })]);
    assert.ok(first.startsWith("blob:")); assert.ok(second.startsWith("blob:"));
    const uploaded: string[] = [];
    const result = await drafts.resolve([second, "https://existing.test/image.jpg", first], async file => {
      uploaded.push(file.name); return `https://res.cloudinary.com/test/${file.name}`;
    });
    assert.deepEqual(uploaded, ["second.jpg", "first.png"]);
    assert.deepEqual(result, ["https://res.cloudinary.com/test/second.jpg", "https://existing.test/image.jpg", "https://res.cloudinary.com/test/first.png"]);
    assert.ok(result.every(url => !url.startsWith("blob:")));
  } finally { drafts.dispose(); }
});

test("retrying a failed save reuses successful Cloudinary uploads", async () => {
  const drafts = new DeferredImageUploads();
  try {
    const previews = drafts.stage([new File(["a"], "first.png", { type: "image/png" }), new File(["b"], "second.png", { type: "image/png" })]);
    const calls: string[] = []; let fail = true;
    const upload = async (file: File) => {
      calls.push(file.name);
      if (file.name === "second.png" && fail) throw new Error("Upload failed");
      return `https://res.cloudinary.com/test/${file.name}`;
    };
    await assert.rejects(drafts.resolve(previews, upload));
    fail = false;
    await drafts.resolve(previews, upload);
    assert.deepEqual(calls, ["first.png", "second.png", "second.png"]);
  } finally { drafts.dispose(); }
});

test("invalid files and expired previews are rejected before a record can be saved", async () => {
  const drafts = new DeferredImageUploads();
  assert.throws(() => drafts.stage([new File(["x"], "bad.txt", { type: "text/plain" })]));
  const previews = drafts.stage([new File(["a"], "image.png", { type: "image/png" })]);
  drafts.dispose();
  await assert.rejects(drafts.resolve(previews, async () => "https://res.cloudinary.com/test/image.png"));
});
