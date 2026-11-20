import { test } from "node:test";
import assert from "node:assert/strict";
import { chatContextHref } from "../src/app/lib/chatLinks.ts";
import { providerQuoteCopy } from "../src/app/lib/providerQuoteCopy.ts";
test("business context links target the correct role-specific pages",()=>{
 const card={id:42,title:"Test",kind:"booking" as const};
 assert.equal(chatContextHref(card,"user",3,9),"#/my-bookings/42");
 assert.equal(chatContextHref(card,"agency",3,9),"#/agency/bookings/42");
 assert.equal(chatContextHref(card,"provider",3,9),"#/provider/room-requests?bookingId=42");
 assert.equal(chatContextHref({...card,kind:"service"},"agency",3,9),"#/agency/services/42");
 assert.equal(chatContextHref({...card,kind:"service"},"provider",3,9),"#/provider/detail/42");
 assert.equal(chatContextHref({...card,kind:"design-request"},"user",3,9),"#/my-requests?requestId=42");
 assert.equal(chatContextHref({...card,kind:"design-request"},"agency",3,9),"#/agency/custom-requests?requestId=42");
 assert.equal(chatContextHref({...card,kind:"tour",version:1},"user",3,9),"#/chat-tour/3/9");
 assert.equal(chatContextHref({...card,id:NaN},"user",3,9),undefined);
});
test("supplement quote explicitly covers only new guests",()=>{
 const copy=providerQuoteCopy({numberOfGuests:1,isSupplement:true,serviceType:"hotel"});
 assert.match(copy.label,/1 khách bổ sung/);assert.match(copy.hint,/Không cộng lại/);assert.doesNotMatch(copy.label,/trọn gói|toàn đoàn/);
 const meal=providerQuoteCopy({numberOfGuests:2,isSupplement:true,serviceType:"restaurant"});assert.match(meal.label,/bữa ăn cho 2 khách bổ sung/);
 const fresh=providerQuoteCopy({numberOfGuests:1,isSupplement:false,serviceType:"hotel"});assert.match(fresh.label,/1 khách trong yêu cầu/);
});
