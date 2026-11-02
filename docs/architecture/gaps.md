# Gaps sau khi áp dụng Q1–Q11

Cập nhật 2026-10-21. **Toàn bộ Q1–Q11 đã giải quyết; không hỏi lại.** Phân biệt hai trạng thái: đã chốt thiết kế và đã triển khai. Task 1 chỉ triển khai scaffold; các bảng/cột/state/API nghiệp vụ ở đây chưa có code hoặc migration và thuộc Task 2 trở đi.

## Nguồn và bằng chứng

Đủ 10 file nguồn, không thiếu file yêu cầu: ERD.drawio.xml, Phiếu Đăng kí đồ án cập nhật.docx, BackendPackageDiagram.drawio.xml, CustomerScreenFlow.drawio.xml, TravelAgencyFlow.drawio.xml, ProviderScreenFlow.drawio.xml, TourGuideScreenFlow.drawio.xml, AdminScreenFLow.drawio.xml, ContextDiagram.drawio.xml, UseCase.drawio.xml. Hash và toàn bộ11 trang UseCase giữ ở [source-review](source-review.md). Chỉ ERD độc lập27 bảng là baseline, không Page-8/ERD MySQL cũ. Không sửa file gốc; Q decisions được lưu đầy đủ trong decisions.

## Giải quyết các gap của Task 0

| Gap | Quyết định hiện hành | Trạng thái và công việc còn lại |
|---|---|---|
| G01 visibility trùng | Q3: một PUBLIC/PRIVATE, độc lập năm tour status | Đã chốt; inventory giữ lỗi gốc, schema triển khai bỏ một cột |
| G02 accommodation edge thiếu source | Q3: booking_accommodations.booking_id→bookings.id | Đã chốt theo cột, không dựa tọa độ; chưa sửa XML nguồn |
| G03 source nhầm customer_id | Q3: payment_transactions.booking_id và adjustments.booking_id→bookings.id | Đã đối chiếu cột; mapping triển khai sửa cả hai, không FK tới customer_id |
| G04 cardinality | Q3 tours1:N versions; Q9 requests1:N transactions; Q6 request nhiều tour/quote, Q8 nhiều complaint | Đã chốt, UNIQUE đúng đối tượng trong schema; giữ marker gốc ở inventory |
| G05 agency_id | Q1→users.id role TRAVEL_AGENCY | Đã chốt, service role/state/ownership |
| G06 provider/guide đích | Q1/Q2→users.id PROVIDER/TOUR_GUIDE | Đã chốt, không tạo providers/guides entity riêng |
| G07 business/account | Q1 một admin account/business, profile UNIQUE user | Đã chốt, không Organizations/OrganizationMembers |
| G08 participant assignment | Q2→booking_assigned_guides.id cùng booking | Đã chốt, composite FK/guard Task2 |
| G09 services/options | Q5 source_service reference + snapshot, agency-only options/delta basis | Đã chốt, source/quantity columns bổ sung |
| G10 co-host | Q4 invitation/segment/agreement revisions+acceptance/handover | Đã chốt, bảng bổ sung không nhét notes |
| G11 formal quotes | Q6 nhiều quote/tour, một active booking/request | Đã chốt, custom_request_quotes/filter UNIQUE |
| G12 snapshots | Q3/Q5/Q6 versions+booking revisions/current pointers | Đã chốt, contract/obligation changes immutable |
| G13 contract | Q6 contracts/revisions/acceptances online | Đã chốt, không ký số ngoài |
| G14 passenger import | Q5/Q6 preview stateless, commit atomic dedup/audit/reprice | Đã chốt, booking_revision/idempotency; không cần bảng import riêng MVP |
| G15 phased payment | Q6 request kind/sequence/contract/supersedes | Đã chốt, không sửa request đã paid |
| G16 financial dedup | Q9 transaction/ref/verify/audit/idempotency/attempts | Đã chốt manual audit, không ngân hàng thật |
| G17 refund/settlement | Q8/Q9 structured policy/refund reserve/ledger/final payout history | Đã chốt, fee một lần host chịu, host âm chặn |
| G18 GPS/attendance | Q7 separate rollcall và attraction completion, window30/60 và review GPS | Đã chốt, thêm columns/audit |
| G19 wrap-up | Q7 Guide gửi, host review/complete; partner chỉ chặng | Đã chốt, tour_wrap_up_reports |
| G20 auth/email | Q11 BCrypt/JWT15m/refresh7d rotate/revoke/hash, Mailpit | Đã chốt; auth chưa code, Task1 Mailpit config scaffold |
| G21 tour moderation | Q3 approved version/reason/reviewer/audit | Đã chốt, UI Admin cần bổ sung ở task nghiệp vụ |
| G22 complaint/review history | Q8 multi complaint, feedback unique triple+revision; audit evidence | Đã chốt, không xóa chứng cứ khi còn nghĩa vụ |
| G23 timing/emergency/availability | Q5 không auto inventory; Q7 pickup/operation contacts/timing | Đã chốt, không cam kết realtime capacity |
| G24 config/phụ | Q9 config versioned; Q11 subscription/chat user/OAuth ngoài MVP | Đã chốt, SignalR notifications vẫn trong scope |

Các bảng/cột bổ sung cùng lý do và FK được liệt kê trong [schema-proposal](schema-proposal.md). Không mở lại câu hỏi; các ràng buộc chi tiết sẽ kiểm chứng bằng entity/configuration/tests ở Task2. Retention production hoãn có chủ ý, không tự xóa theo số năm tùy ý.

## Đối chiếu từng yêu cầu §3.2(c) sau quyết định

| Locator phiếu | Yêu cầu gốc | Quyết định áp dụng | Thiết kế và trạng thái triển khai |
|---|---|---|---|
| ADM01 Admin 1 | Duyệt/từ chối/đình chỉ doanh nghiệp, giấy phép/tax | Q1/Q2 đã chốt | Legal profile review/audit; không multi-admin/multi-role. Chưa triển khai nghiệp vụ ở Task1. |
| ADM02 Admin 2 | Duyệt/từ chối tour trước public | Q3 đã chốt | Moderation đúng version, reason/reviewer; thêm UI Admin review tour. Chưa triển khai nghiệp vụ ở Task1. |
| ADM03 Admin 3 | Moderation component rooms/meals/tickets/transport | Q5 đã chốt | Approved catalogue, source reference; menu/category metadata; moderation history. Chưa triển khai nghiệp vụ ở Task1. |
| ADM04 Admin 4 | Bank VietQR, phí mặc định 8%, escrow, disbursement tới đối tác | Q8/Q9 đã chốt | VietQR manual audit, ledger/refund/final settlement, host chịu fee8% snapshot. Chưa triển khai nghiệp vụ ở Task1. |
| ADM05 Admin 5 | Giám sát booking/tour vận hành, account/ban, complaint resolution | Q7/Q8/Q11 đã chốt | Booking operations và dispute history/hold; role+account state. Chưa triển khai nghiệp vụ ở Task1. |
| AG01 Agency 1 | AI draft theo điểm đến/thời lượng/phong cách, staff sửa/publish | Q5 đã chốt | AI draft chỉ approved resources, human review; adapter chưa cấu hình. Chưa triển khai nghiệp vụ ở Task1. |
| AG02 Agency 2 | CRUD/duplicate tour, itinerary, tuổi adult/2–11/<2, regulations | Q3/Q5 đã chốt | Naming mapping/tiers/lifecycle, không tạo lại code. Chưa triển khai nghiệp vụ ở Task1. |
| AG03 Agency 3 | Hotel/meal alternatives có chênh +/- VND | Q5 đã chốt | Meal khách/bữa, hotel khách/đêm, attraction khách/lượt; infant miễn delta mặc định. Chưa triển khai nghiệp vụ ở Task1. |
| AG04 Agency 4 | Snapshot mọi update, compare/one-click rollback | Q3/Q6 đã chốt | 1:N versions, restore vN+1, immutable snapshots. Chưa triển khai nghiệp vụ ở Task1. |
| AG05 Agency 5 | Draft→Pending Approval→Published→Hidden | Q3 đã chốt | Năm status tour, một PUBLIC/PRIVATE; PRIVATE vẫn cần duyệt. Chưa triển khai nghiệp vụ ở Task1. |
| AG06 Agency 6 | Invite/accept, days/legs, net/guest/lump sum, shares, handover | Q4 đã chốt | Tour thường/custom, segment+agreement+hai acceptance+handover; host âm chặn. Chưa triển khai nghiệp vụ ở Task1. |
| AG07 Agency 7 | RFP→dedicated tour designedTourId→formal quote | Q6 đã chốt | Nhiều quote/tour/request, một booking còn hiệu lực. Chưa triển khai nghiệp vụ ở Task1. |
| AG08 Agency 8 | Internal guide accounts/license expiry/languages/assign confirmed booking | Q2 đã chốt | guide_profiles/current agency+history, certificates storage, only own workforce. Chưa triển khai nghiệp vụ ở Task1. |
| AG09 Agency 9 | Approve/reject, adjustment notes, manifest, phased payments | Q5/Q6/Q9 đã chốt | Manifest revision/reprice, approval→contract→verified deposit, request supersedes. Chưa triển khai nghiệp vụ ở Task1. |
| GUI01 Guide 1 | Assigned schedule, day itinerary/timings/attractions | Q4/Q7 đã chốt | Booking segments/timing/scoped itinerary, emergency contacts snapshot. Chưa triển khai nghiệp vụ ở Task1. |
| GUI02 Guide 2 | Camera+GPS check-in, notes/timestamps | Q7 đã chốt | Photo/GPS/accuracy/time; >100m warning, thiếu vị trí reason+review. Chưa triển khai nghiệp vụ ở Task1. |
| GUI03 Guide 3 | Present/Late/Absent chỉ departure/pickup | Q7 đã chốt | Departure rollcall window−30/+60, override Agency reason/audit. Chưa triển khai nghiệp vụ ở Task1. |
| GUI04 Guide 4 | One-tap gọi đại diện/điều hành | Q7 đã chốt | Booking contact+Agency operations phone, native dialer. Chưa triển khai nghiệp vụ ở Task1. |
| GUI05 Guide 5 | Incident escalation kèm camera evidence | Q7 đã chốt | Incident report/photo evidence, scoped escalation/audit. Chưa triển khai nghiệp vụ ở Task1. |
| GUI06 Guide 6 | Wrap-up satisfaction/service quality report | Q7 đã chốt | Guide wrap-up report, host complete toàn booking, partner own segment. Chưa triển khai nghiệp vụ ở Task1. |
| PRO01 Provider 1 | Enterprise tax/contact/địa chỉ hai cấp/GPS Maps | Q1/Q7 đã chốt | Profile one user, cấu trúc địa chỉ/GPS và operations phone. Chưa triển khai nghiệp vụ ở Task1. |
| PRO02 Provider 2 | Sáu category, ảnh, price ranges, menus, amenities | Q5 đã chốt | Sáu categories, menu/range/amenities; capacity informational. Chưa triển khai nghiệp vụ ở Task1. |
| PRO03 Provider 3 | Pending/Approved/Rejected kèm feedback | Q1/Q5 đã chốt | Service status/rejection+review audit. Chưa triển khai nghiệp vụ ở Task1. |
| PRO04 Provider 4 | Approved resource vào tour và customer customization | Q5 đã chốt | Agency dùng resource tạo allowed options; customer không tùy chọn mọi approved service. Chưa triển khai nghiệp vụ ở Task1. |
| CUS01 Customer 1 | AI recommendation theo nhóm/budget/preferences | Q5 đã chốt | Stateless approved tour recommendation; không Google OAuth/chat. Chưa triển khai nghiệp vụ ở Task1. |
| CUS02 Customer 2 | Age pricing + live hotel/meal/location delta | Q5 đã chốt | Allowed options và delta units rõ trên UI; ngoài option gửi request. Chưa triển khai nghiệp vụ ở Task1. |
| CUS03 Customer 3 | RFP dates/headcount/budget/hotel rating | Q6 đã chốt | RFP nhiều phương án/báo giá, chọn một tạo active booking. Chưa triển khai nghiệp vụ ở Task1. |
| CUS04 Customer 4 | Nhập/sửa manifest trước departure, Excel bulk | Q5/Q6 đã chốt | Import preview+atomic commit/idempotency; số khách/tuổi ảnh hưởng nghĩa vụ tạo revision. Chưa triển khai nghiệp vụ ở Task1. |
| CUS05 Customer 5 | Digital TourContract, phased Payment Requests, VietQR escrow | Q6/Q9 đã chốt | Online contract accept đúng revision; manual verified deposit mới confirmed. Chưa triển khai nghiệp vụ ở Task1. |
| CUS06 Customer 6 | Post-trip review, cancellation/refund theo penalty | Q8 đã chốt | Structured demo cancellation/partial refund Admin quyết; multi complaints và unique feedback/history. Chưa triển khai nghiệp vụ ở Task1. |

## Đối chiếu yêu cầu xuyên suốt

§3.2(a/b) B2B2C/AI/co-host/escrow/customization: các quyết định Q1/Q4/Q5/Q6/Q9 cụ thể hóa, baseline thiếu persistence được mở rộng có nhãn; không nhập schema cũ. §3.2(d): responsive portal bốn role và Flutter Guide; query/reprice/checkin2s, AI5s vẫn là mục tiêu chưa đo. Role+ownership/BCrypt/JWT, atomic snapshots/concurrent edits/idempotency/finance ledger cần test nghiệp vụ sau; Task1 mới test hạ tầng.

§3.2(e): thay .NET8 bằng .NET10 theo Q10, nhóm phải cập nhật hồ sơ chính thức; Flutter theo chỉ dẫn mới. React/TS/Vite/Tailwind/shadcn/Lucide, SQL Server/EF10, Maps/AI/SignalR chưa có integration nghiệp vụ. §3.2(f): Task1 có source scaffold và setup README, chưa phải sản phẩm hoàn thiện/URD/SRS/TestReport/UserManual. §3.2(g): dừng Task1, không tự chạy các package nghiệp vụ/Task2.

## Sai khác UI đã xác định

Các flow nguồn chưa có đủ màn Admin tour moderation/booking operation; Customer manifest/import/contract revision acceptance; Agency segment/handover/two-sided agreement/guide certificates/manifest/report acceptance; Guide departure rollcall/emergency/incident/wrap-up; Provider menu/profile GPS. Đây là công việc UI tương lai theo quyết định đã chốt, không câu hỏi mở. Subscription screens và Google OAuth/chat trong UseCase bị loại khỏi MVP Q11. Screen navigation theo tọa độ không là transition backend.

## Truy vết từng node màn hình

155 nhãn (gồm5 tiêu đề) từ năm flow độc lập. Mỗi node được đối chiếu với quyết định hiện hành; endpoint nghiệp vụ tương ứng nằm trong [endpoints-proposal](../api/endpoints-proposal.md), **chưa triển khai**, chỉ `/health` và `/api/v1/health` hiện có ở Task1. Screen nguyên bản được giữ tên, không tự code UI nghiệp vụ.

### AdminScreenFLow.drawio.xml

| Node ID | Nhãn nguyên bản | Đối chiếu hiện hành |
|---|---|---|
| `title` | Admin Screen Flow | Tiêu đề sơ đồ, không endpoint riêng. |
| `login` | Login Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `dashboard` | Dashboard Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `accounts` | User Account Management Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `user_list` | User Account List Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `user_detail` | User Account Detail Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `user_create` | Create User Account Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `user_approve` | Account Approval Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `user_status` | Account Status Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `user_delete` | Delete Account Confirmation | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `plans` | Subscription Plan Management Page | Q11: ngoài MVP; không tạo subscription API/schema. |
| `plan_list` | Subscription Plan List Page | Q11: ngoài MVP; không tạo subscription API/schema. |
| `plan_create` | Create Subscription Plan Page | Q11: ngoài MVP; không tạo subscription API/schema. |
| `plan_edit` | Update Subscription Plan Page | Q11: ngoài MVP; không tạo subscription API/schema. |
| `plan_delete` | Delete Plan Confirmation | Q11: ngoài MVP; không tạo subscription API/schema. |
| `services` | Provider Service Management Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_list` | Provider Service List Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_detail` | Provider Service Detail Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_approve` | Service Approval Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_reject` | Service Rejection Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |
| `service_suspend` | Service Suspension Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `disputes` | Complaint and Dispute Page | Q8: nhiều complaint/booking, Admin quyết tiền, hold/audit/evidence7 ngày; chưa triển khai. |
| `complaint_list` | Complaint List Page | Q8: nhiều complaint/booking, Admin quyết tiền, hold/audit/evidence7 ngày; chưa triển khai. |
| `dispute_detail` | Dispute Detail Page | Q8: nhiều complaint/booking, Admin quyết tiền, hold/audit/evidence7 ngày; chưa triển khai. |
| `evidence` | Dispute Evidence Page | Q8: nhiều complaint/booking, Admin quyết tiền, hold/audit/evidence7 ngày; chưa triển khai. |
| `resolution` | Dispute Resolution Page | Q8: nhiều complaint/booking, Admin quyết tiền, hold/audit/evidence7 ngày; chưa triển khai. |
| `refunds` | Refund Management Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `refund_list` | Refund Request List Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `refund_detail` | Refund Request Detail Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `refund_calc` | Refund Calculation Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `refund_approve` | Refund Approval Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `refund_reject` | Refund Rejection Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `finance` | System Finance Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `transactions` | Transaction History Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `settlements` | Settlement Status Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `bank` | System Bank Account Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `withdrawal` | Withdrawal Request Page | Q9: chỉ final payout/agency/run; platform withdrawal riêng không nằm luồng MVP đã chọn. |

### CustomerScreenFlow.drawio.xml

| Node ID | Nhãn nguyên bản | Đối chiếu hiện hành |
|---|---|---|
| `title` | Customer Screen Flow | Tiêu đề sơ đồ, không endpoint riêng. |
| `login` | Login Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `home` | Home Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `register` | Register Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `verify` | Verify Email Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `forgot` | Forgot Password Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `profile` | Profile Page | Q1/Q7/Q11: own profile, legal/GPS/operation contacts, allowlist PII; chưa triển khai. |
| `update_profile` | Update Profile Page | Q1/Q7/Q11: own profile, legal/GPS/operation contacts, allowlist PII; chưa triển khai. |
| `tour_list` | Tour List Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `tour_detail` | Tour Detail Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `customize` | Tour Customization Page | Q5: Customer chỉ option Agency cho phép; source snapshot/delta theo khách+bữa/đêm/lượt; chưa triển khai. |
| `price` | Estimated Tour Price Page | Q5: Customer chỉ option Agency cho phép; source snapshot/delta theo khách+bữa/đêm/lượt; chưa triển khai. |
| `hotel` | Hotel Option Page | Q5: Customer chỉ option Agency cho phép; source snapshot/delta theo khách+bữa/đêm/lượt; chưa triển khai. |
| `meal` | Meal Option Page | Q5: Customer chỉ option Agency cho phép; source snapshot/delta theo khách+bữa/đêm/lượt; chưa triển khai. |
| `provider_hotel` | Provider Hotel Service Page | Q5: Customer chỉ option Agency cho phép; source snapshot/delta theo khách+bữa/đêm/lượt; chưa triển khai. |
| `provider_meal` | Provider Restaurant Service Page | Q5: Customer chỉ option Agency cho phép; source snapshot/delta theo khách+bữa/đêm/lượt; chưa triển khai. |
| `sightseeing` | Sightseeing Change Request Page | Q5: Customer chỉ option Agency cho phép; source snapshot/delta theo khách+bữa/đêm/lượt; chưa triển khai. |
| `ai_search` | AI Tour Search Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `ai_results` | AI Tour Results Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `requests` | Tour Design Request Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `request_list` | Design Request List Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `request_detail` | Design Request Detail Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `request_create` | Create Design Request Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `request_cancel` | Cancel Design Request Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `booking` | Booking Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `booking_history` | Booking History Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `booking_detail` | Booking Detail Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `booking_form` | Create Booking Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `contract` | Tour Contract Page | Q6: online acceptance đúng immutable revision, thay nghĩa vụ cần accept lại; chưa triển khai. |
| `deposit_request` | Deposit Request Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `deposit_payment` | Deposit Payment Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `balance_request` | Remaining Balance Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `final_payment` | Final Payment Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `payment_history` | Payment History Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `reviews` | Tour Review Page | Q8: eligible customer, UNIQUE booking/customer/agency, edit/moderation history; chưa triển khai. |
| `review_list` | Tour Review List Page | Q8: eligible customer, UNIQUE booking/customer/agency, edit/moderation history; chưa triển khai. |
| `own_reviews` | My Reviews Page | Q8: eligible customer, UNIQUE booking/customer/agency, edit/moderation history; chưa triển khai. |
| `review_update` | Update Review Page | Q8: eligible customer, UNIQUE booking/customer/agency, edit/moderation history; chưa triển khai. |
| `review_delete` | Delete Review Confirmation | Q8: eligible customer, UNIQUE booking/customer/agency, edit/moderation history; chưa triển khai. |
| `issues` | Complaint and Refund Page | Q8: nhiều complaint/booking, Admin quyết tiền, hold/audit/evidence7 ngày; chưa triển khai. |
| `complaints` | Complaint History Page | Q8: nhiều complaint/booking, Admin quyết tiền, hold/audit/evidence7 ngày; chưa triển khai. |
| `complaint_create` | Create Complaint Page | Q8: nhiều complaint/booking, Admin quyết tiền, hold/audit/evidence7 ngày; chưa triển khai. |
| `refund_requests` | Refund Request Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `refund_status` | Refund Status Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |

### ProviderScreenFlow.drawio.xml

| Node ID | Nhãn nguyên bản | Đối chiếu hiện hành |
|---|---|---|
| `title` | Provider Screen Flow | Tiêu đề sơ đồ, không endpoint riêng. |
| `login` | Login Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `dashboard` | Provider Dashboard Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `profile` | Business Profile Page | Q1/Q7/Q11: own profile, legal/GPS/operation contacts, allowlist PII; chưa triển khai. |
| `profile_detail` | Business Profile Detail Page | Q1/Q7/Q11: own profile, legal/GPS/operation contacts, allowlist PII; chưa triển khai. |
| `profile_edit` | Update Business Profile Page | Q1/Q7/Q11: own profile, legal/GPS/operation contacts, allowlist PII; chưa triển khai. |
| `services` | Service Management Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_list` | Service List Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_detail` | Service Detail Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_create` | Create Service Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_update` | Update Service Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_images` | Service Images Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `service_delete` | Delete Service Confirmation | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `approval` | Service Approval Tracking Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `approval_status` | Approval Status Page | Q1/Q5: own provider service/moderation, approved catalogue cho Agency, capacity không inventory; chưa triển khai. |
| `rejection_reason` | Rejection Reason Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |

### TourGuideScreenFlow.drawio.xml

| Node ID | Nhãn nguyên bản | Đối chiếu hiện hành |
|---|---|---|
| `title` | Tour Guide Screen Flow | Tiêu đề sơ đồ, không endpoint riêng. |
| `login` | Login Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `dashboard` | Tour Guide Home Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `assigned` | Assigned Trip Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `assigned_list` | Assigned Trip List Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `trip_detail` | Assigned Trip Detail Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `locations` | Trip Location Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `location_list` | Trip Location List Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `check_in` | Location Check-In Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `check_status` | Check-In Status Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `history` | Guided Trip History Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `history_list` | Completed Trip List Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |
| `history_detail` | Completed Trip Detail Page | Q2/Q7: ASSIGNED scope, departure attendance riêng, GPS checkin review và wrap-up host complete; chưa triển khai. |

### TravelAgencyFlow.drawio.xml

| Node ID | Nhãn nguyên bản | Đối chiếu hiện hành |
|---|---|---|
| `title` | Travel Agency Screen Flow | Tiêu đề sơ đồ, không endpoint riêng. |
| `login` | Login Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `dashboard` | Agency Dashboard Page | Q1/Q11: role+ownership, email/password/token lifecycle; chưa triển khai. |
| `tours` | Tour Management Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `tour_list` | Tour List Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `tour_detail` | Tour Detail Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `tour_create` | Create Tour Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `ai_draft` | AI Draft Tour Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `tour_edit` | Update Tour Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `tour_duplicate` | Duplicate Tour Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `tour_versions` | Tour Version History Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `tour_restore` | Restore Tour Version Page | Q3/Q5/Q6: năm tour status, một visibility, version restore mới, AI draft không auto publish; chưa triển khai. |
| `requests` | Design Request Management Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `request_list` | Design Request List Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `request_detail` | Design Request Detail Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `request_status` | Request Status Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `request_quote` | Tour Quotation Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `request_tour` | Create Custom Tour Page | Q4/Q6: nhiều phương án/quote, một active booking/request, cancel giữ history; chưa triển khai. |
| `cohost` | Co-hosted Tour Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |
| `invitation_list` | Co-host Invitation List Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |
| `invitation_detail` | Co-host Invitation Detail Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |
| `invite` | Invite Agency Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |
| `accept` | Accept Invitation Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |
| `reject` | Reject Invitation Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |
| `segment_quote` | Segment Quotation Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |
| `combined_price` | Combined Tour Price Page | Q4: invitation/segment/agreement hai bên và handover; partner net, host chịu fee; chưa triển khai. |
| `bookings` | Booking Management Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `booking_list` | Booking List Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `booking_detail` | Booking Detail Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `selected_services` | Selected Services Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `booking_price` | Booking Price Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `booking_contract` | Tour Contract Page | Q6: online acceptance đúng immutable revision, thay nghĩa vụ cần accept lại; chưa triển khai. |
| `booking_decision` | Booking Approval Page | Q5/Q6: snapshot/delta units/manifest revision, approval→contract→verified deposit; chưa triển khai. |
| `payments` | Payment Request Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `payment_list` | Payment Request List Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `payment_detail` | Payment Request Detail Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `deposit` | Deposit Request Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `revised_deposit` | Revised Deposit Request Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `deposit_status` | Deposit Status Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `balance` | Remaining Balance Request Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `balance_status` | Final Payment Status Page | Q6/Q8/Q9: contract→verified deposit, manual audit/refund reserve/final settlement/ledger; chưa triển khai. |
| `guides` | Tour Guide Management Page | Q2: own guide_profiles/agency history/license, chỉ agency trong booking_agencies phân công; chưa triển khai. |
| `guide_list` | Tour Guide List Page | Q2: own guide_profiles/agency history/license, chỉ agency trong booking_agencies phân công; chưa triển khai. |
| `guide_detail` | Tour Guide Detail Page | Q2: own guide_profiles/agency history/license, chỉ agency trong booking_agencies phân công; chưa triển khai. |
| `guide_assign` | Tour Guide Assignment Page | Q2: own guide_profiles/agency history/license, chỉ agency trong booking_agencies phân công; chưa triển khai. |
