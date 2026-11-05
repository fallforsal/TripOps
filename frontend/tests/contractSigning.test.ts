import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSignPageUrl, normalizeOtp, otpResendWait, parseSignRoute } from "../src/app/services/contractSigning.ts";

const token = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd";

test("QR points to the configured domain when deployed, otherwise to the current address", () => {
  assert.equal(buildSignPageUrl(token, "http://192.168.1.5:5174", "/", "https://tripops.vn/"), `https://tripops.vn/#/sign/${token}`);
  assert.equal(buildSignPageUrl(token, "http://192.168.1.5:5174", "/"), `http://192.168.1.5:5174/#/sign/${token}`);
  assert.equal(buildSignPageUrl(token, "https://host", "/app/"), `https://host/app/#/sign/${token}`);
});

test("sign route is recognised only for a well-formed token", () => {
  assert.equal(parseSignRoute(`#/sign/${token}`), token);
  assert.equal(parseSignRoute(`#/sign/${token}/`), token);
  assert.equal(parseSignRoute("#/sign/short"), null);
  assert.equal(parseSignRoute("#/booking/12"), null);
  assert.equal(parseSignRoute(`#/sign/${token}<script>`), null);
});

test("OTP resend waits 60 seconds and treats server times without zone as UTC", () => {
  const sent = "2026-11-04T03:00:00";
  const at = Date.parse("2026-11-04T03:00:20Z");
  assert.equal(otpResendWait(sent, at), 40);
  assert.equal(otpResendWait("2026-11-04T03:00:00Z", at + 60_000), 0);
  assert.equal(otpResendWait(null, at), 0);
});

test("OTP input keeps only six digits", () => {
  assert.equal(normalizeOtp(" 12-34 567 "), "123456");
});
