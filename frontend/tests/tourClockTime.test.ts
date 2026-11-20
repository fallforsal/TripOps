import { test } from "node:test";
import assert from "node:assert/strict";
import { toTourApiTime } from "../src/app/lib/tourClockTime.ts";

test("tour clock times normalize supported text inputs to valid TimeSpan JSON",()=>{
  for(const [input,expected] of [["9:00","09:00:00"],["9h","09:00:00"],["9h30","09:30:00"],["09H05","09:05:00"],[" 9 : 5 ","09:05:00"],["14:00","14:00:00"],["18:30:45","18:30:45"],["0","00:00:00"],["23:59:59","23:59:59"]])
    assert.equal(toTourApiTime(input,"Ngày 4, điểm 2"),expected);
});
test("unscheduled times remain null instead of creating malformed TimeSpan strings",()=>{
  for(const value of [undefined,null,"","  "])assert.equal(toTourApiTime(value,"Bữa trưa"),null);
});
test("invalid clock times stop saving and identify the exact day and activity",()=>{
  for(const value of ["24:00","23:60","-1:00","09:00:60","8h70","9::30","08:00 - 09:00","abc"])
    assert.throws(()=>toTourApiTime(value,"Ngày 4, điểm 2 (Về khách sạn)"),error=>error instanceof Error && error.message.includes("Ngày 4, điểm 2 (Về khách sạn)") && error.message.includes(value));
});
