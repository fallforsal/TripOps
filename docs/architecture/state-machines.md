# State machines sau Q1–Q11

Cập nhật 2026-10-21. Q1–Q11 **đã chốt** tại [decisions](decisions.md). Đây là thiết kế nghiệp vụ cho Task 2 trở đi; Task 1 chưa triển khai các enum/entity/transition này. XML gốc chỉ có tên cột status, không chứa tập enum; mọi trạng thái dưới đây là thiết kế hiện hành, tách khỏi inventory.

## Guard chung và lịch sử

Service kiểm role ADMIN/TRAVEL_AGENCY/PROVIDER/CUSTOMER/TOUR_GUIDE, trạng thái user và ownership từ dữ liệu server; ID client gửi không là bằng chứng quyền. Mọi transition kiểm version/state/condition và ghi audit trong transaction. 409 sai state/version/key-payload, 422 sai nghiệp vụ, 403 sai role, 404 ngoài scope. Chưa có business auth ở scaffold; các guard là yêu cầu triển khai, không phải tính năng đã chạy.

Giao dịch tiền thành công và snapshot effective bất biến. Retry cùng idempotency key trả kết quả cũ, payload khác409; timeout không rõ kết quả phải reconcile. Contact typo chỉ audit. Thay nghĩa vụ thương mại tạo revision cần chấp nhận lại, không sửa lịch sử. History tables/column additions nằm trong schema-proposal, không giả có trong 27 bảng ERD.

## Doanh nghiệp và user

business_profiles.status: PENDING, APPROVED, REJECTED, SUSPENDED. users.status: ACTIVE, SUSPENDED, INACTIVE. is_verified là email verification độc lập pháp lý. Một user một role, một tài khoản quản trị mỗi doanh nghiệp, không multi-role/membership.

| Transition | Actor và guard | Tác động |
|---|---|---|
| mới→PENDING | Agency/Provider tự tạo profile hợp lệ | Chưa công bố service/tour |
| PENDING→APPROVED/REJECTED | Admin; reject có reason | Lưu reviewer/time/audit, approved_at |
| REJECTED→PENDING | Chủ hồ sơ sửa/gửi lại | Giữ review history |
| APPROVED→SUSPENDED | Admin có reason | Chặn command mới; không xóa booking/history |
| SUSPENDED→PENDING | Chủ gửi rà soát, Admin nhận | Chỉ Admin approve lại |

Guide chỉ Agency chủ quản hoặc Admin tạo/kích hoạt/khóa; không public register/tự chuyển Agency. Transfer Agency: kiểm và xử lý future assignments xung đột, đóng history cũ, tạo history mới và đổi current agency nguyên tử; assignment đã qua không đổi. Guide SUSPENDED/INACTIVE không thao tác protected API; refresh bị revoke theo policy khóa. Logout revoke session refresh tương ứng, access JWT15 phút vẫn phải kiểm current-account status khi gọi nghiệp vụ.

## Service

services.status: DRAFT, PENDING, APPROVED, REJECTED, SUSPENDED, ARCHIVED. Category: ACCOMMODATION, FNB, ATTRACTION, ADVENTURE, GUIDE, SUPPORT; transportation thuộc SUPPORT trong MVP, không thêm category thứ bảy. Đây là mapping kỹ thuật theo sáu category nguồn.

| Transition | Actor/guard | Tác động |
|---|---|---|
| mới→DRAFT | Provider OWN | Chỉ owner thấy |
| DRAFT/REJECTED→PENDING | Provider OWN, business APPROVED, đủ nội dung/giá | Review version + audit |
| PENDING→APPROVED/REJECTED | Admin, reason reject | APPROVED vào catalogue cho Agency |
| APPROVED→PENDING | Provider sửa trọng yếu | Duyệt lại; snapshot booking không đổi |
| APPROVED→SUSPENDED | Admin có reason | Ngừng lựa chọn mới |
| DRAFT/REJECTED/APPROVED/SUSPENDED→ARCHIVED | Owner/Admin, giữ tham chiếu | Không hard-delete dữ liệu đã dùng |

Customer chỉ xem/chọn option Agency cho phép, không tự lấy mọi approved service. capacity là thông tin công bố, không realtime inventory/reservation; Agency xác nhận cung ứng trước booking approval.

## Tour và phiên bản

Chỉ năm tours.status Q3: **DRAFT, PENDING_APPROVAL, PUBLISHED, HIDDEN, REJECTED**. visibility độc lập chỉ **PUBLIC, PRIVATE**, một cột. PRIVATE giới hạn viewer, không bỏ moderation. Archive dùng HIDDEN+deleted_at, không thêm ARCHIVED vào tour enum. agency_id là host.

| Transition | Actor/guard | Tác động |
|---|---|---|
| mới/duplicate/AI draft→DRAFT | Agency HOST | ID/code mới khi duplicate, AI không auto publish |
| DRAFT/REJECTED/HIDDEN→PENDING_APPROVAL | HOST, đủ itinerary/tiers/policy/options | Snapshot version gửi duyệt |
| PENDING_APPROVAL→PUBLISHED/REJECTED | Admin xét đúng version, reject reason | Lưu approved version/reviewer/audit |
| PUBLISHED→HIDDEN | HOST/Admin | Không nhận booking public mới, giữ lịch sử |
| PUBLISHED/HIDDEN→DRAFT | HOST sửa nội dung có nghĩa vụ | vN+1, cần duyệt lại; không cập nhật booking đã chốt |

tours.version là current version, tour_versions 1:N UNIQUE(tour_id,version). Restore vK tạo vN+1 không ghi đè hoặc xóa vK. Private custom tour chỉ share đúng customer của request/quote; share không publish hoặc tự approve.

## Custom request, quote và co-host

Request status: SUBMITTED→IN_DESIGN→QUOTED→ACCEPTED; REJECTED/CANCELLED/EXPIRED là nhánh terminal tùy guard. Customer tạo/cancel request của mình trước accepted; host design/reject/quote; customer chọn đúng quote/version/expiry. Revision báo giá tạo phương án mới và giữ lịch sử. Một request nhiều tours/quotes, chỉ một booking còn hiệu lực; booking hủy được giữ và is_active false, không xóa để đặt lại.

| Aggregate | Transition | Actor/guard và tác động |
|---|---|---|
| cohost invitation | INVITED→ACCEPTED/REJECTED/EXPIRED/WITHDRAWN | Đúng recipient respond, host withdraw trước accept; dùng cho tour thường và custom |
| agreement revision | DRAFT→PROPOSED→PARTIALLY_ACCEPTED→ACCEPTED | Host và partner chấp nhận cùng hash/version mới effective; mỗi người đúng role/agency |
| agreement revision | PROPOSED/PARTIALLY_ACCEPTED→REJECTED/SUPERSEDED | Reject có reason hoặc có revision thay thế; acceptance cũ không chuyển sang revision mới |
| booking segment | PLANNED→IN_PROGRESS→COMPLETED | Partner phụ trách/guide assignment ghi tiến độ và own completion; không kết thúc cả booking |

Segment có thứ tự/ngày/địa bàn/scope/handover location/time/timezone/guide. PER_GUEST=agreed net×billable guests snapshot, LUMP_SUM=agreed net fixed. Mặc định ADULT+CHILD, INFANT không tính, ngoại lệ phải cấu hình/snapshot. suggested_budget không là agreement. Partner net giữ nguyên theo thỏa thuận, host chịu platform fee; host âm chặn chốt. Tỷ lệ chia chỉ derived display, không công thức thứ hai.

## Booking, contract và revision

bookings.status: **PENDING_APPROVAL, AWAITING_CONTRACT, AWAITING_DEPOSIT, CONFIRMED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED**.

| Transition | Actor/guard | Tác động |
|---|---|---|
| mới→PENDING_APPROVAL | Customer SELF, source tour/quote được phép | Backend tính giá và snapshot nguyên tử, không lấy client total |
| PENDING_APPROVAL→AWAITING_CONTRACT | Host approve sau kiểm cung ứng và dữ liệu | Tạo contract revision, lưu agency approval |
| PENDING_APPROVAL→REJECTED | Host có reason | Audit, giữ booking/quote history |
| AWAITING_CONTRACT→AWAITING_DEPOSIT | Đúng customer chấp nhận **current** contract revision | Lưu acceptance user/time/hash/content snapshot, không chữ ký số ngoài |
| AWAITING_DEPOSIT→CONFIRMED | Backend kiểm agency approval + đúng acceptance + cọc đã đối soát thực nhận đủ | Ghi confirmation atomically; ảnh chuyển khoản không đủ |
| CONFIRMED→IN_PROGRESS | Host, đúng lịch, current acceptance/cọc/manifest/guide hợp lệ | Mở vận hành, roll-call theo pickup window |
| IN_PROGRESS→COMPLETED | Host xác nhận, xét wrap-up guide và segment progress | completed_at/by, khởi cửa sổ financial dispute; không tự settle |
| trạng thái trước IN_PROGRESS→CANCELLED | Customer yêu cầu; Agency đề xuất, Admin quyết tiền nền tảng | Snapshot cancellation policy, reserve refund riêng; không sửa transactions |

IN_PROGRESS abort do incident phải host/Admin xử lý có lý do/audit và disposition nghĩa vụ; không cho customer tự đổi trạng thái hoặc tự payout. Partner không complete toàn booking. Thời điểm kết thúc chuyến và hoàn tất tài chính độc lập.

Contract revision: ISSUED (trạng thái suy từ issued row)→ACCEPTED qua append acceptance; superseded khi có bản mới. Nội dung issued immutable. Thay giá/dịch vụ chính/ngày/điều khoản/số khách ảnh hưởng nghĩa vụ: tạo booking+contract revision mới, đưa booking trước khởi hành về AWAITING_CONTRACT, chặn thao tác dựa bản stale. Sau accept kiểm lại tiền cọc đã nhận: đủ thì CONFIRMED, thiếu thì AWAITING_DEPOSIT. Tiền đã nhận vẫn giữ nguyên. Lỗi liên hệ/chính tả không đổi nghĩa vụ chỉ audit.

Pricing: tier sum + delta options × quantity basis + accepted adjustments. Meal VND/khách/bữa; hotel VND/khách/đêm; attraction VND/khách/lượt. Billable mặc định adult+child, infant miễn delta; default delta0, delta âm được phép. Customer ngoài option cấu hình chỉ gửi yêu cầu để Agency báo lại giá. Không hotel room allocation/reservation.

Child selection status: SELECTED, CHANGE_REQUESTED, CONFIRMED, CANCELLED; thay sau chốt phải revision. Adjustment: PROPOSED→ACCEPTED/REJECTED, chỉ accepted nằm trong effective total. Participant status ACTIVE/CANCELLED; attendance **NOT_CHECKED, PRESENT, LATE, ABSENT** riêng.

## Guide operation và check-in

Điểm danh một lần departure: cửa sổ mặc định pickup_at−30 phút đến pickup_at+60 phút, lưu config/snapshot để thay cấu hình không đổi chuyến đã chốt. Guide ASSIGNED đúng booking/participant; assignment agency nằm booking_agencies. Agency cho sửa ngoài cửa sổ với reason và append audit. Không điểm danh lại từng khách ở attraction.

Attraction progress: PENDING, COMPLETED, SKIPPED. Checkin verification: ACCEPTED, NEEDS_REVIEW, REVIEWED; camera/photo, coordinates, accuracy/captured timestamp nếu có. Accuracy>100m: cảnh báo/cho chụp lại hoặc gửi NEEDS_REVIEW, không chặn toàn bộ công việc. Không vị trí: lý do bắt buộc+NEEDS_REVIEW. Agency review có actor/time/reason. App chỉ xác nhận đã gửi khi backend success; MVP không complex offline sync, có thể draft.

Wrap-up: DRAFT→SUBMITTED→ACCEPTED/CHANGES_REQUESTED; guide gửi satisfaction/service-quality summary; host review, sửa tạo revision. Emergency contacts lấy booking.contact_phone và operations_phone snapshot của Agency, chỉ mở native dialer sau thao tác user.

## Payment request, transaction và đối soát

Payment request status: PENDING, OVERDUE, PAID, CANCELLED; kind DEPOSIT/MILESTONE/FINAL. Host phát hành theo effective contract. Worker chuyển OVERDUE khi hết due_date; backend chuyển PAID khi verified receipts đủ. Chưa nhận tiền có thể cancel/replace bằng request mới có supersedes; không sửa request đã paid để mất lịch sử. Booking.payment_status derived UNPAID/PARTIALLY_PAID/PAID/PARTIALLY_REFUNDED/REFUNDED, không client PATCH.

| Transaction transition | Actor/guard | Tác động |
|---|---|---|
| mới→PENDING_VERIFICATION | Customer proof hoặc operation refund/payout đã được phép | Idempotency key + hash, không ghi confirmed ledger |
| PENDING_VERIFICATION→SUCCEEDED | Admin manual verify amount/reference/evidence/account/booking | Ghi verified_by/time/reason, immutable ledger, request totals/booking guard cùng ACID |
| PENDING_VERIFICATION→REJECTED/FAILED | Admin có bằng chứng kết quả chắc chắn, reason | Giữ history; không biến timeout thành failed |
| PENDING_VERIFICATION→RECONCILIATION_REQUIRED | Timeout/kết quả không rõ | Chặn blind retry và giữ refund reservation/settlement pending |
| RECONCILIATION_REQUIRED→SUCCEEDED/FAILED | Admin đối soát được kết quả chắc chắn | Cùng operation/business code/key, append attempt/event |

Transaction SUCCEEDED terminal; correction/refund/reversal là operation mới liên kết gốc. transaction_kind RECEIPT/REFUND/PAYOUT/REVERSAL, direction IN/OUT, payment_method BANK_TRANSFER/MOCK. Mock luôn gắn environment/source, không lẫn confirmed manual bank receipt. MVP VietQR + đối soát tay có audit; bank adapter chỉ interface thiết kế tương lai, không tích hợp/gọi chuyển tiền thật.

## Refund, complaint và settlement

| Aggregate | Transition | Actor/guard và tác động |
|---|---|---|
| refund | REQUESTED→AGENCY_PROPOSED→ADMIN_APPROVED/REJECTED | Agency đề nghị, Admin quyết số tiền/fee waiver có reason, current contract policy snapshot |
| refund | ADMIN_APPROVED→RESERVED→PROCESSING→PAID/FAILED/RECONCILIATION_REQUIRED | Khóa booking giữ chỗ refund; paid ghi OUT ledger và release reserved, unknown không release/retry mù |
| incident | REPORTED→ACKNOWLEDGED→IN_PROGRESS→RESOLVED→CLOSED | Guide ASSIGNED report camera evidence, Agency scope/Admin xử lý, resolution+audit |
| complaint | SUBMITTED→AGENCY_RESPONDED→UNDER_REVIEW→RESOLVED/REJECTED | Customer BOOK, agency bị phản ánh đáp, Admin kết luận; giữ evidence/history |
| complaint | SUBMITTED→WITHDRAWN | Customer trước review; không xóa evidence/financial hold khi còn nghĩa vụ |
| settlement | PENDING/ON_HOLD→ELIGIBLE→PROCESSING→PAID | Host completion, không refund/financial complaint/obligation mở, hết dispute7 ngày hoặc Admin override thời hạn có reason |
| payout attempt | PROCESSING→SUCCEEDED/FAILED/RECONCILIATION_REQUIRED | Một final payout/agency/run, business code/key cố định; unknown cần đối soát trước retry |

Financial dispute mặc định7 ngày sau completed_at, config snapshot; vụ mở đúng hạn xử lý sau hạn vẫn hợp lệ. Complaint ngoài tài chính không tự giữ toàn bộ tiền, nhưng nghĩa vụ/hold liên quan phải giải quyết trước final settlement. Admin override thời hạn không tự bỏ qua vụ việc tài chính còn mở. Một booking nhiều complaint, feedback UNIQUE(booking,customer,agency), chỉ customer BOOK eligible completed review; cập nhật/moderation giữ feedback_revisions. Feedback status PUBLISHED/HIDDEN.

Cancellation demo theo ngày trước departure: >=14 ngày10%, >=7<14 ngày30%, >=3<7 ngày50%, <3 ngày100%, tính trên effective contract total và snapshot trước accept. Refund cap=max(0,received−fee)−paid_refunds−active_reserved_refunds, clamp0; phí vượt received không tự thu thêm, Admin xử lý/miễn giảm có audit.

Commission8% mặc định snapshot lúc chốt contract; fee basis=confirmed received−confirmed refunded, gồm cancellation fee giữ lại. Tính fee tổng một lần, round VND AwayFromZero; partner nhận agreed net, host nhận còn lại và chịu fee/phần lệch, host âm đặt hold/chặn chốt để giải quyết. Không trừ8% partner lần nữa; không arbitrary partial payout. Financial history append-only và booking_agencies chỉ summary.

## Ngoài MVP và chưa triển khai

Không subscription/chat user/Google OAuth, multi-admin/membership, room allocation, auto reservation hoặc complex offline sync. SignalR business notifications vẫn thuộc thiết kế, chỉ phát sau commit đúng scope. SMTP local Mailpit/test. Auth/finance/Guide/tour state machines chưa có code ở Task 1; chỉ health/OpenAPI/ProblemDetails scaffold đã chạy.
