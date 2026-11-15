import { test } from "node:test";
import assert from "node:assert/strict";
import { birthDateToIso, formatBirthDateInput } from "../src/app/utils/birthDate.ts";

test("birthdays accept compact typing and pasted dates without losing leading zeroes", () => {
  for (const value of ["01021995", "1/2/1995", "1995-02-01", "01.02.1995"])
    assert.equal(birthDateToIso(formatBirthDateInput(value)), "1995-02-01");
  assert.equal(formatBirthDateInput("01021"), "01/02/1");
});

test("partial, impossible and future birthdays never become a saved ISO date", () => {
  const today = new Date(2026, 10, 15);
  for (const value of ["", "01/02/19", "31/04/1995", "29/02/1900", "00/01/1995", "01/13/1995", "16/11/2026", "01/01/0000"])
    assert.equal(birthDateToIso(value, today), "", value);
  assert.equal(birthDateToIso("29/02/2000", today), "2000-02-29");
  assert.equal(birthDateToIso("15/11/2026", today), "2026-11-15");
});
