import { test } from "node:test";
import assert from "node:assert/strict";
import { orderTimeline,moveTimeline } from "../src/app/lib/tourTimelineOrder.ts";
import { tourSaveBody } from "../src/app/lib/tourSaveBody.ts";
import { DeferredImageUploads } from "../src/app/lib/deferredImageUploads.ts";

test("moving an attraction across a meal moves its original time with it; explicit sorting restores time order",()=>{
 const items=[{key:"attraction:a",minutes:510,time:"08:30"},{key:"meal:b",minutes:720,time:"12:00"},{key:"attraction:c",minutes:870,time:"14:30"}];
 const original=structuredClone(items);const manual=moveTimeline(items,0,2);
 assert.deepEqual(orderTimeline(items,manual).map(item=>item.time),["12:00","14:30","08:30"]);
 assert.deepEqual(items,original);
 assert.deepEqual(orderTimeline(items).map(item=>item.key),["attraction:a","meal:b","attraction:c"]);
});
test("deleted timeline items disappear and new items are included without losing the manual order",()=>{
 const items=[{key:"a",minutes:600},{key:"new",minutes:500}];
 assert.deepEqual(orderTimeline(items,["removed","a"]).map(item=>item.key),["a","new"]);
 assert.deepEqual(moveTimeline(items,0,-1),["a","new"]);
});
test("tour image selection and cover changes stay local until a multipart save is assembled",()=>{
 const drafts=new DeferredImageUploads();
 try {
  const previews=drafts.stage([new File(["a"],"a.png",{type:"image/png"}),new File(["b"],"b.jpg",{type:"image/jpeg"})]);
  assert.ok(previews.every(url=>url.startsWith("blob:")));
  const body=tourSaveBody({revision:1,configuration:{images:[previews[1],"https://existing.test/cover.jpg",previews[0]]}}, {pendingTourImages:drafts.entries(previews)});
  assert.ok(body instanceof FormData);
  assert.deepEqual(body.getAll("images").map(file=>(file as File).name),["b.jpg","a.png"]);
  assert.deepEqual(JSON.parse(body.get("payload") as string).configuration.images,["upload:0","https://existing.test/cover.jpg","upload:1"]);
  drafts.retain([previews[0]]);
  assert.equal(drafts.entries(previews).length,1);
 } finally {drafts.dispose();}
});
test("saving existing tour images stays JSON and expired local files cannot be submitted",()=>{
 assert.equal(typeof tourSaveBody({images:["https://example.test/a.jpg"]},{}),"string");
 assert.throws(()=>tourSaveBody({images:["blob:missing"]},{}),/chọn lại ảnh/);
});
