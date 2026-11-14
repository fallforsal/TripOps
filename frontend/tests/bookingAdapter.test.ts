import { test } from "node:test";
import assert from "node:assert/strict";
import { fromAdminRefund, fromApiBooking } from "../src/app/services/bookingAdapter.ts";
import { formatVietnamDateTime, formatVietnamDeadline, isPayOsUrl } from "../src/app/services/payos.ts";
import type { BookingDto } from "../src/app/services/wf05Bookings.ts";

const dto: BookingDto = {
  id: 101, bookingCode: "BK-TEST", customerId: "customer", customerName: "Customer",
  tourId: 5, tourName: "Tour", agencyId: "agency", agencyName: "Agency",
  startDate: "2026-11-01T00:00:00", endDate: "2026-11-03T00:00:00",
  totalGuests: 1, totalAmount: 10000000, depositAmount: 3000000, paidAmount: 0,
  status: "Pending", paymentStatus: "Unpaid", createdAt: "2026-10-25T10:00:00",
  participants: [{ id: 1, fullName: "Passenger", attendanceStatus: "Pending", status: "ACTIVE" }],
  assignedGuides: [],
};

test("booking selections preserve original names separately from current hotel, meal and attraction", () => {
  const booking = fromApiBooking({ ...dto,
    snapshotDays: [{ id: 10, dayNumber: 1, title: "Day one", locations: [
      { id: 11, name: "Attraction C", originalName: "Attraction A", changeReason: "Road closure" },
    ], meals: [{ id: 12, mealType: "lunch", name: "Restaurant C", originalName: "Restaurant A", priceDifference: 0 }] }],
    snapshotHotels: [{ id: 13, destination: "Da Lat", name: "Hotel C", originalName: "Hotel A", priceDifference: 0 }],
  });
  assert.equal(booking.tour.hotels?.[0].name, "Hotel C");
  assert.equal(booking.tour.hotels?.[0].originalName, "Hotel A");
  assert.equal(booking.tour.itinerary[0].meals?.[0].serviceName, "Restaurant C");
  assert.equal(booking.tour.itinerary[0].meals?.[0].originalName, "Restaurant A");
  assert.equal(booking.tour.itinerary[0].locations[0].name, "Attraction C");
  assert.equal(booking.tour.itinerary[0].locations[0].originalName, "Attraction A");
  assert.equal(booking.tour.itinerary[0].locations[0].changeReason, "Road closure");
});

test("partial deposit requests only the missing deposit and remains partially paid", () => {
  const booking = fromApiBooking({ ...dto, paidAmount: 1000000, paymentStatus: "PartiallyPaid" });
  assert.equal(booking.paymentStatus, "partially_paid");
  assert.equal(booking.paymentRequests?.[0].amount, 2000000);
  assert.equal(booking.paidAmount, 1000000);
  assert.equal(booking.depositPaid, false);
});

test("a deposited booking is not described as fully paid", () => {
  const booking = fromApiBooking({ ...dto, status: "Deposited", paidAmount: 3000000, paymentStatus: "PartiallyPaid" });
  assert.equal(booking.status, "deposited");
  assert.equal(booking.paymentStatus, "partially_paid");
  assert.equal(booking.remainingAmount, 7000000);
  assert.equal(booking.paymentRequests?.[1].dueDate, "2026-11-03");
});

test("all eight API booking states are represented without collapsing InProgress", () => {
  for (const [status, expected] of Object.entries({ Pending: "pending", Deposited: "deposited", Confirmed: "confirmed", Paid: "paid", InProgress: "in_progress", Completed: "completed", Cancelled: "cancelled", Rejected: "rejected" })) {
    assert.equal(fromApiBooking({ ...dto, status: status as BookingDto["status"] }).status, expected);
  }
});

test("attendance survives reloading; an unknown date of birth remains empty", () => {
  const booking = fromApiBooking({ ...dto, participants: [{ ...dto.participants[0], attendanceStatus: "CheckedIn" }] });
  assert.equal(booking.passengers?.[0].attendanceStatus, "CHECKED_IN");
  assert.equal(booking.passengers?.[0].departureAttendance, "present");
  assert.equal(booking.passengers?.[0].dateOfBirth, "");
  assert.equal(fromApiBooking(dto).passengers?.[0].departureAttendance, undefined);
});

test("guide schedule data retains persisted incidents and actual trip duration", () => {
  const booking = fromApiBooking({ ...dto, incidents: [{ id: 3, bookingId: dto.id, title: "Traffic", description: "Late", status: "Reported", createdAt: dto.createdAt }] });
  assert.equal(booking.guideIncidents?.[0].id, "3");
  assert.equal("severity" in booking.guideIncidents![0], false);
  assert.equal(booking.tour.duration, "3 ngày");
  assert.equal(booking.tour.images?.length, 0);
});

test("guide roles survive reloading and the lead guide is selected independently of row order", () => {
  const roles = ["support_guide", "lead_guide", "stage_guide", "logistics", "Lead"];
  const booking = fromApiBooking({ ...dto, assignedGuides: roles.map((role, id) => ({
    id, guideId: `guide-${id}`, guideName: `Guide ${id}`, role, status: "ASSIGNED",
  })) });
  assert.deepEqual(booking.assignedGuides?.map(g => g.role), ["support_guide", "lead_guide", "stage_guide", "logistics", "lead_guide"]);
  assert.equal(booking.guideId, "guide-1");
});

test("passenger snapshot prices retain different age prices and a free infant", () => {
  const booking = fromApiBooking({ ...dto, totalGuests: 3, totalAmount: 5000000,
    participants: [
      { ...dto.participants[0], id: 1, price: 3000000, tierName: "Adult" },
      { ...dto.participants[0], id: 2, price: 2000000, tierName: "Child" },
      { ...dto.participants[0], id: 3, price: 0, tierName: "Infant" },
    ] });
  assert.deepEqual(booking.passengers?.map(p => p.price), [3000000, 2000000, 0]);
});

test("pending booking has no payment schedule from the server, so nothing can be paid yet", () => {
  const booking = fromApiBooking({ ...dto, paymentSchedule: [], paymentTransactions: [] });
  assert.deepEqual(booking.paymentRequests, []);
  assert.equal(booking.depositPaid, false);
});

test("approved booking maps the server schedule: deposit outstanding and a scheduled balance", () => {
  const booking = fromApiBooking({
    ...dto, status: "Confirmed", paidAmount: 1000000, paymentStatus: "PartiallyPaid",
    paymentSchedule: [
      { id: 7, stage: "deposit", description: "Đặt cọc 30%", amount: 3000000, outstanding: 2000000, dueDate: "2026-10-28T00:00:00", status: "Overdue" },
      { id: null, stage: "balance", description: "Thanh toán phần còn lại sau khi tour kết thúc", amount: 7000000, outstanding: 7000000, dueDate: null, status: "Scheduled" },
    ],
    paymentTransactions: [
      { id: 1, paymentRequestId: 7, transactionCode: "PAYOS-1", paymentMethod: "PAYOS", amount: 1000000, status: "Success", paidAt: "2026-10-26T03:00:00Z", gatewayTransactionNo: "14000000" },
      { id: 2, paymentRequestId: 7, transactionCode: "PAYOS-2", paymentMethod: "PAYOS", amount: 2000000, status: "Expired", createdAt: "2026-10-27T03:00:00Z" },
    ],
  });
  const [deposit, balance] = booking.paymentRequests!;
  assert.equal(deposit.id, "7");
  assert.equal(deposit.stage, "deposit");
  assert.equal(deposit.status, "overdue");
  assert.equal(deposit.amount, 2000000);
  assert.equal(deposit.totalAmount, 3000000);
  assert.equal(deposit.dueDate, "2026-10-28");
  assert.equal(balance.status, "scheduled");
  assert.equal(balance.dueDate, "");
  assert.equal(booking.depositPaid, false);
  assert.deepEqual(booking.paymentTransactions?.map((t) => t.status), ["success", "expired"]);
  assert.equal(booking.paymentTransactions?.[0].gatewayTransactionNo, "14000000");
});

test("a paid deposit shows the full stage amount and counts as deposit paid", () => {
  const booking = fromApiBooking({
    ...dto, status: "Confirmed", paidAmount: 3000000, paymentStatus: "PartiallyPaid",
    paymentSchedule: [{ id: 7, stage: "deposit", description: "Đặt cọc 30%", amount: 3000000, outstanding: 0, dueDate: "2026-10-28T00:00:00", status: "Paid", paidAt: "2026-10-26T03:00:00Z" }],
  });
  assert.equal(booking.paymentRequests?.[0].amount, 3000000);
  assert.equal(booking.paymentRequests?.[0].paidAt, "2026-10-26");
  assert.equal(booking.depositPaid, true);
});

test("only official payOS checkout hosts over https are accepted as redirect targets", () => {
  assert.equal(isPayOsUrl("https://pay.payos.vn/web/abc123"), true);
  assert.equal(isPayOsUrl("http://pay.payos.vn/web/abc123"), false);
  assert.equal(isPayOsUrl("https://pay.payos.vn.evil.test/web"), false);
  assert.equal(isPayOsUrl("https://evilpayos.vn/web"), false);
  assert.equal(isPayOsUrl("javascript:alert(1)"), false);
});

test("deadlines from the server are shown in Vietnam time with date and time", () => {
  // Duyệt 14:30 02/11 (giờ VN) => hạn backend trả về 07:30Z 03/11 => hiển thị 14:30 03/11/2026.
  assert.equal(formatVietnamDateTime("2026-11-03T07:30:00Z"), "14:30 03/11/2026");
  assert.equal(formatVietnamDateTime("2026-11-02T17:05:00Z"), "00:05 03/11/2026");
  assert.equal(formatVietnamDateTime(null), "");
  assert.equal(formatVietnamDateTime("not-a-date"), "");
});

test("server deadline, overdue and not-issued deposit states are mapped without recomputing", () => {
  const booking = fromApiBooking({
    ...dto, status: "Confirmed",
    paymentSchedule: [
      { id: 9, stage: "deposit", description: "Đặt cọc 50%", amount: 5000000, outstanding: 5000000, dueDate: "2026-11-03T00:00:00", dueAt: "2026-11-03T07:30:00Z", status: "Overdue", warning: "Hạn cọc rơi sau thời điểm khởi hành." },
      { id: null, stage: "balance", description: "Phần còn lại", amount: 5000000, outstanding: 5000000, status: "Scheduled" },
    ],
    paymentTransactions: [
      { id: 3, transactionCode: "PAYOS-261102143000123", paymentMethod: "PAYOS", amount: 5000000, status: "NeedsReview", reviewNote: "Trả thiếu", expiresAt: "2026-11-02T07:45:00Z" },
    ],
  });
  const [deposit] = booking.paymentRequests!;
  assert.equal(deposit.status, "overdue");
  assert.equal(deposit.dueAt, "2026-11-03T07:30:00Z");
  assert.equal(deposit.warning, "Hạn cọc rơi sau thời điểm khởi hành.");
  assert.equal(booking.paymentTransactions?.[0].status, "needsreview");
  assert.equal(booking.paymentTransactions?.[0].reviewNote, "Trả thiếu");
  const legacy = fromApiBooking({ ...dto, status: "Confirmed", paymentSchedule: [
    { id: null, stage: "deposit", description: "Đặt cọc 50%", amount: 5000000, outstanding: 5000000, status: "NotIssued" },
  ] });
  assert.equal(legacy.paymentRequests?.[0].status, "not_issued");
});

test("a tour approved close to departure has one full payment and no balance stage", () => {
  const booking = fromApiBooking({
    ...dto, status: "Confirmed",
    paymentSchedule: [
      { id: 11, stage: "full", description: "Thanh toán toàn bộ (tour sát ngày)", amount: 10000000, outstanding: 10000000, dueDate: "2026-11-26T00:00:00", dueAt: "2026-11-26T07:00:00Z", status: "Pending", warning: "Tour sát ngày khởi hành: thanh toán toàn bộ một lần, không chia hai đợt." },
    ],
  });
  assert.equal(booking.paymentRequests?.length, 1);
  assert.equal(booking.paymentRequests?.[0].stage, "full");
  assert.equal(booking.paymentRequests?.[0].amount, 10000000);
  assert.equal(booking.depositPaid, false);
  const paid = fromApiBooking({ ...dto, status: "Paid", paymentSchedule: [
    { id: 11, stage: "full", description: "Thanh toán toàn bộ (tour sát ngày)", amount: 10000000, outstanding: 0, status: "Paid", paidAt: "2026-11-25T08:00:00Z" },
  ] });
  assert.equal(paid.depositPaid, true);
});

test("cancellation request from the server is kept as is on the booking", () => {
  const booking = fromApiBooking({
    ...dto, status: "Confirmed", paidAmount: 5000000, paymentStatus: "PartiallyPaid",
    cancellation: {
      id: 3, reason: "CUSTOMER_REQUEST", reasonDetail: "Bận việc", status: "Pending", requestedByRole: "customer",
      feePercent: 25, fee: 2500000, paidAmount: 5000000, suggestedRefund: 2500000, hasRefundAccount: true,
      createdAt: "2026-11-03T08:00:00Z",
    },
  });
  assert.equal(booking.cancellation?.status, "Pending");
  assert.equal(booking.cancellation?.suggestedRefund, 2500000);
});

test("travel contract from the server is exposed for signing before payment", () => {
  const booking = fromApiBooking({
    ...dto, status: "Confirmed",
    contract: { id: 4, version: 1, contractNo: "HD-BK-TEST-1", totalAmount: 10000000, status: "AwaitingSignature", requiredBeforePayment: true },
  });
  assert.equal(booking.travelContract?.contractNo, "HD-BK-TEST-1");
  assert.equal(booking.travelContract?.requiredBeforePayment, true);
});

test("admin refund rows use the server amounts and map statuses", () => {
  const row = fromAdminRefund({
    id: 7, bookingId: 101, bookingCode: "BK-TEST", tourName: "Tour", startDate: "2026-11-20T00:00:00",
    customerName: "Customer", reason: "PAYMENT_OVERDUE", reasonDetail: "Không trả đợt 2", status: "Pending",
    requestedByRole: "agency", totalAmount: 10000000, feePercent: 100, fee: 5000000, paidAmount: 5000000,
    suggestedRefund: 0, createdAt: "2026-11-13T01:00:00Z",
  });
  assert.equal(row.status, "PENDING");
  assert.equal(row.approvedRefundAmount, 0);
  assert.equal(row.suggestedRefundAmount, 0);
  assert.equal(row.refundFee, 5000000);
  assert.equal(row.refundAccountNumber, "");
  const done = fromAdminRefund({
    id: 8, bookingId: 102, bookingCode: "BK-2", startDate: "2026-12-20T00:00:00", customerName: "C",
    reason: "TOUR_CANCELLED", reasonDetail: "Agency hủy", status: "Completed", requestedByRole: "agency",
    totalAmount: 6000000, feePercent: 0, fee: 0, paidAmount: 3000000, suggestedRefund: 3000000,
    approvedRefundAmount: 3000000, refundTransactionCode: "FT1", bankName: "MB", accountNumber: "123456", accountHolder: "C",
    createdAt: "2026-11-03T01:00:00Z",
  });
  assert.equal(done.status, "COMPLETED");
  assert.equal(done.bankTransactionCode, "FT1");
  assert.equal(done.refundPercentage, 100);
});

test("balance deadline at 00:00 is shown as the end of the previous day", () => {
  // Khởi hành 30/11 → backend trả hạn 17:00Z 22/11 (= 00:00 23/11 giờ VN) → hiển thị "23:59 22/11/2026".
  assert.equal(formatVietnamDeadline("2026-11-22T17:00:00Z"), "23:59 22/11/2026");
  assert.equal(formatVietnamDeadline("2026-11-03T07:30:00Z"), "14:30 03/11/2026");
});


test("alliance booking retains stage rows, service owners, guide routes and fee beneficiaries", () => {
  const b=fromApiBooking({...dto,totalGuests:1,participants:[
    {...dto.participants[0],id:1,participantIndex:1,agencyId:"agency",isPrimary:true,price:1500000},
    {...dto.participants[0],id:2,participantIndex:1,agencyId:"partner",isPrimary:false,price:600000},
  ],bookingAgencies:[
    {id:1,agencyId:"agency",agencyName:"Host",isHost:true,originalAmount:1500000,finalAmount:1500000,netPayout:1500000,settlementStatus:"Unpaid",paidSurchargeAmount:0,unpaidSurchargeAmount:0},
    {id:2,agencyId:"partner",agencyName:"Partner",isHost:false,originalAmount:600000,finalAmount:650000,netPayout:650000,settlementStatus:"Unpaid",paidSurchargeAmount:0,unpaidSurchargeAmount:50000},
  ],snapshotHotels:[{id:3,name:"Hotel B",agencyId:"partner"}],
  snapshotDays:[{id:10,dayNumber:2,title:"Stage B",locations:[{id:11,name:"Visit B",agencyId:"partner"}],meals:[{id:12,mealType:"lunch",name:"Meal B",agencyId:"partner"}]}],
  attractionCheckins:[{id:1,locationId:11,agencyId:"partner",guideId:"gb",guideName:"Guide B",status:"Pending"}],
  paymentSchedule:[{id:8,stage:"surcharge",description:"Extra",amount:50000,outstanding:50000,status:"Pending",beneficiaryAgencyId:"partner",beneficiaryAgencyName:"Partner"}],
  });
  assert.equal(b.passengers?.length,2);assert.deepEqual(b.passengers?.map(p=>p.agencyId),["agency","partner"]);
  assert.equal(b.isCoHosted,true);assert.equal(b.bookingAgencies?.[1].finalAmount,650000);
  assert.equal(b.tour.hotels?.[0].createdByCompanyId,"partner");assert.equal(b.tour.itinerary[0].meals?.[0].createdByCompanyId,"partner");
  assert.equal(b.attractionCheckins?.[0].agencyId,"partner");assert.equal(b.paymentRequests?.[0].beneficiaryAgencyId,"partner");
});


test("partner response remains scoped in the UI even when the tour catalogue contains the full tour",()=>{
 const own={id:2,agencyId:"partner",agencyName:"Partner",isHost:false,originalAmount:600000,finalAmount:650000,netPayout:650000,settlementStatus:"Unpaid",paidSurchargeAmount:0,unpaidSurchargeAmount:50000};
 const fullTour=fromApiBooking({...dto,totalAmount:99999999}).tour;
 const b=fromApiBooking({...dto,isPartnerView:true,totalAmount:650000,baseTourAmount:600000,bookingAgencies:[own],snapshotDays:[],snapshotHotels:[],paymentSchedule:[],paymentTransactions:[]},[fullTour]);
 assert.equal(b.tour.price,650000);
 assert.equal(b.isPartnerView,true);assert.equal(b.isCoHosted,true);assert.equal(b.totalPrice,650000);assert.equal(b.bookingAgencies?.length,1);assert.equal(b.coHosts?.[0].role,"partner");
 assert.deepEqual(b.paymentRequests,[]);assert.deepEqual(b.paymentTransactions,[]);assert.equal(b.travelContract,undefined);assert.deepEqual(b.tour.itinerary,[]);
});


test("partner sees the whole itinerary and ownership names while only its own financial allocation is present",()=>{
 const agencies=[{agencyId:"agency",agencyName:"Host Travel"},{agencyId:"partner",agencyName:"Partner Travel"}];
 const b=fromApiBooking({...dto,isPartnerView:true,agencyDirectory:agencies,totalAmount:650000,
   bookingAgencies:[{id:2,agencyId:"partner",agencyName:"Partner Travel",isHost:false,originalAmount:600000,finalAmount:650000,netPayout:650000,settlementStatus:"Unpaid",paidSurchargeAmount:0,unpaidSurchargeAmount:50000}],
   snapshotDays:[{id:10,dayNumber:1,title:"Host day",locations:[{id:11,name:"Host visit",agencyId:"agency"}],meals:[{id:12,mealType:"lunch",name:"Host meal",agencyId:"agency"}]},{id:20,dayNumber:2,title:"Partner day",locations:[{id:21,name:"Partner visit",agencyId:"partner"}],meals:[]}],
   snapshotHotels:[{id:13,name:"Host hotel",agencyId:"agency"},{id:23,name:"Partner hotel",agencyId:"partner"}],paymentSchedule:[],paymentTransactions:[]});
 assert.deepEqual(b.agencyDirectory,agencies);assert.equal(b.tour.itinerary.length,2);assert.equal(b.tour.hotels?.length,2);
 assert.equal(b.tour.itinerary[0].locations[0].createdByCompanyId,"agency");assert.equal(b.tour.itinerary[1].locations[0].createdByCompanyId,"partner");
 assert.equal(b.tour.itinerary[0].meals?.[0].createdByCompanyId,"agency");assert.equal(b.bookingAgencies?.length,1);assert.equal(b.totalPrice,650000);
});

const bookedHost={id:1,agencyId:"agency",agencyName:"Host A",isHost:true,originalAmount:10000000,finalAmount:10000000,netPayout:10000000,settlementStatus:"Unpaid",paidSurchargeAmount:0,unpaidSurchargeAmount:0};
const bookedPartner={...bookedHost,id:2,agencyId:"partner",agencyName:"Partner B",isHost:false};
test("booking single-agency v1 never inherits alliance metadata from current tour v2",()=>{
  const currentTour={...fromApiBooking(dto).tour,version:2,isCoHosted:true,coHosts:[
    {companyId:"agency",companyName:"A",role:"lead" as const,status:"accepted" as const},
    {companyId:"partner",companyName:"B",role:"partner" as const,status:"accepted" as const}
  ]};
  for(const snapshotDays of [undefined,[],[{id:1,dayNumber:1,title:"Booked day",locations:[],meals:[]}]]) {
    const booking=fromApiBooking({...dto,bookingAgencies:[bookedHost],snapshotDays},[currentTour]);
    assert.equal(booking.isCoHosted,false);assert.equal(booking.tour.isCoHosted,false);
    assert.deepEqual(booking.coHosts?.map(h=>h.companyId),["agency"]);
    assert.deepEqual(booking.tour.coHosts?.map(h=>h.companyId),["agency"]);
    assert.equal(currentTour.isCoHosted,true);assert.equal(currentTour.coHosts.length,2);
  }
});
test("booking alliance membership remains when current source tour has only its lead",()=>{
  const currentTour={...fromApiBooking(dto).tour,version:3,isCoHosted:false,coHosts:[]};
  const booking=fromApiBooking({...dto,bookingAgencies:[bookedHost,bookedPartner]},[currentTour]);
  assert.equal(booking.isCoHosted,true);assert.equal(booking.tour.isCoHosted,true);
  assert.deepEqual(booking.tour.coHosts?.map(h=>h.companyId),["agency","partner"]);
});
test("missing booking allocation data never invents agencies from a newer catalogue version",()=>{
  const currentTour={...fromApiBooking(dto).tour,isCoHosted:true,coHosts:[{companyId:"partner",companyName:"B",role:"partner" as const,status:"pending" as const}]};
  const booking=fromApiBooking({...dto,bookingAgencies:undefined},[currentTour]);
  assert.equal(booking.isCoHosted,false);assert.equal(booking.tour.isCoHosted,false);
  assert.deepEqual(booking.coHosts,[]);assert.deepEqual(booking.tour.coHosts,[]);
});
