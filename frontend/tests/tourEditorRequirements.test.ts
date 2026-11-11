import { orderTimeline, appendTimeline } from "../src/app/lib/tourTimelineOrder.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareTourCreation, emptyTourDays, publicTourSaveState, tourStatusOrder } from "../src/app/lib/tourEditorDefaults.ts";
import { bookingCancellationReason, bookingRefusalReason } from "../src/app/lib/bookingRefusal.ts";
import { tourClockDraft, toTourApiTime } from "../src/app/lib/tourClockTime.ts";

test("saving preserves a public or hidden tour and never publishes a new draft", () => {
  assert.deepEqual(publicTourSaveState(), {status:"draft",visibility:"hidden"});
  assert.deepEqual(publicTourSaveState({status:"draft",visibility:"hidden"}), {status:"draft",visibility:"hidden"});
  assert.deepEqual(publicTourSaveState({status:"completed",visibility:"public"}), {status:"completed",visibility:"public"});
  assert.deepEqual(publicTourSaveState({status:"completed",visibility:"hidden"}), {status:"completed",visibility:"hidden"});
});

test("new itinerary days have no preselected hotel, meal, place, or description", () => {
  const days = emptyTourDays(3,"Đà Lạt");
  assert.equal(days.length,3);
  for (const day of days) {
    assert.equal(day.title,""); assert.equal(day.description,"");
    assert.deepEqual(day.locations,[]); assert.deepEqual(day.meals,[]);
    assert.equal("hotel" in day,false);
  }
});

test("creation sorting ignores subsequent edits and status sorting is explicit", () => {
  const tours=[{id:"1",createdAt:"2026-10-01",status:"completed",visibility:"public"},
    {id:"2",createdAt:"2026-11-01",status:"draft",visibility:"hidden"},
    {id:"3",createdAt:"2026-11-01",status:"completed",visibility:"hidden"}];
  assert.deepEqual([...tours].sort(compareTourCreation).map(t=>t.id),["3","2","1"]);
  assert.deepEqual([...tours].sort((a,b)=>tourStatusOrder(a)-tourStatusOrder(b)||compareTourCreation(a,b)).map(t=>t.id),["1","3","2"]);
});

test("numeric HHmm and 24-hour boundaries normalize without permitting invalid clock times", () => {
  for (const [value,time] of [["2300","23:00:00"],["2000","20:00:00"],["1200","12:00:00"],["930","09:30:00"],["0000","00:00:00"],["2359","23:59:00"]])
    assert.equal(toTourApiTime(value,"Ngày 1"),time);
  for (const value of ["2401","2400","1260","2360","99999"])
    assert.throws(()=>toTourApiTime(value,"Ngày 1"));
});

test("booking refusal shows the actual agency reason, including existing legacy notes", () => {
  assert.equal(bookingRefusalReason("Ăn chay [Lý do từ chối: Không thể dẫn tour đợt này]"),"Không thể dẫn tour đợt này");
  assert.equal(bookingRefusalReason("Ghi chú của khách","Không đủ nhân sự"),"Không đủ nhân sự");
  assert.equal(bookingRefusalReason("[Lý do từ chối: Cũ] [Lý do từ chối: Mới]"),"Mới");
});


test("time drafts retain only the last four digits and still validate the final time", () => {
  assert.equal(tourClockDraft("15153"),"5153");
  assert.equal(tourClockDraft("123456"),"3456");
  assert.equal(tourClockDraft("15:30"),"15:30");
  assert.equal(toTourApiTime(tourClockDraft("11515"),"Giờ"),"15:15:00");
  assert.throws(()=>toTourApiTime(tourClockDraft("15153"),"Giờ"));
});

test("cancelled bookings show the customer's cancellation reason", () => {
  assert.equal(bookingCancellationReason("Ăn chay [Khách hủy: Thay đổi kế hoạch cá nhân]"),"Thay đổi kế hoạch cá nhân");
  assert.equal(bookingCancellationReason("[Khách hủy: Cũ] [Agency hủy: Mới]"),"Mới");
  assert.equal(bookingCancellationReason(undefined,"Không thể khởi hành"),"Không thể khởi hành");
});


test("new entries append and typing time preserves order until the edit is committed", () => {
  const entries=[{key:"location:a",minutes:120},{key:"meal:b",minutes:720}];
  const appended=appendTimeline(entries,undefined,"location:new");
  const withNew=[...entries,{key:"location:new",minutes:600}];
  assert.deepEqual(orderTimeline(withNew,appended).map(e=>e.key),["location:a","meal:b","location:new"]);
  const editing=withNew.map(e=>e.key==="location:new"?{...e,minutes:180}:e);
  assert.deepEqual(orderTimeline(editing,appended).map(e=>e.key),["location:a","meal:b","location:new"]);
  assert.deepEqual(orderTimeline(editing).map(e=>e.key),["location:a","location:new","meal:b"]);
  assert.deepEqual(appendTimeline(entries,["meal:b","location:a"],"meal:new"),["meal:b","location:a","meal:new"]);
});
