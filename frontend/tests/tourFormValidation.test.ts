import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTourForm, tourSaveErrorMessage } from "../src/app/lib/tourFormValidation.ts";

const draft = { name: "Tour Đà Lạt", numberOfDays: 3, numberOfNights: 2, price: 3500000,
  minGuests: 2, maxGuests: 20, itinerary: [], hotels: [], priceTable: [] };

test("draft saving requires a name but permits unfinished publication fields", () => {
  assert.deepEqual(validateTourForm(draft, false), []);
  const errors = validateTourForm({ ...draft, name: "  " }, false);
  assert.deepEqual(errors, [{ tab: "general", message: "Vui lòng nhập tên tour." }]);
});

test("validation collects errors across tabs instead of stopping at the first missing field", () => {
  const errors = validateTourForm({ ...draft, name: "", minGuests: 25, maxGuests: 20,
    itinerary: [{ id: "day-1", day: 1, title: "", description: "", locations: [{ id: "a", name: "", time: "5153" }] }] }, true);
  assert.ok(errors.some(e => e.message.includes("tên tour")));
  assert.ok(errors.some(e => e.message.includes("Số khách tối đa")));
  assert.ok(errors.some(e => e.message.includes("tiêu đề lịch trình ngày 1")));
  assert.ok(errors.some(e => e.message.includes('giờ "5153" không hợp lệ')));
  assert.ok(errors.some(e => e.tab === "pricing"));
  assert.ok(errors.some(e => e.tab === "regulations"));
});

test("valid time and numeric boundaries pass while invalid ranges are explained", () => {
  assert.deepEqual(validateTourForm({ ...draft, numberOfDays: 1, numberOfNights: 0, price: 0,
    itinerary: [{ id: "day-1", day: 1, title: "Khởi hành", description: "", locations: [{ id: "a", name: "Điểm hẹn", time: "2359" }] }] }, false), []);
  assert.ok(validateTourForm({ ...draft, numberOfNights: 4, price: -1 }, false).length >= 2);
});

test("API required-field errors are readable in Vietnamese", () => {
  assert.equal(tourSaveErrorMessage("The Name field is required."), "Vui lòng nhập tên tour/điểm tham quan.");
  assert.equal(tourSaveErrorMessage("The Title field is required."), "Vui lòng nhập tiêu đề ngày.");
  assert.equal(tourSaveErrorMessage("Mã tour đã được sử dụng."), "Mã tour đã được sử dụng.");
});
