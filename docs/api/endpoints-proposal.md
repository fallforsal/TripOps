# Endpoints proposal sau Q1–Q11

Cập nhật2026-10-21. **Q1–Q11 đã giải quyết.** Những route nghiệp vụ dưới đây là contract thiết kế, chưa có code ở Task1; contract thực tế đang chạy tại [scaffold-contract](scaffold-contract.md). Không xem việc đã thống nhất bổ sung schema là đã có persistence/database/API chạy được.

## API đang có ở Task1

| Method | Route | Role/ownership | Request→response | Lỗi |
|---|---|---|---|---|
| GET | `/health` | Anonymous, không dữ liệu nghiệp vụ | —→200 text Healthy |500 ProblemDetails nếu pipeline lỗi |
| GET | `/api/v1/health` | Anonymous, không dữ liệu nghiệp vụ | —→status/application/database/scope/timestampUtc |500 ProblemDetails |
| GET | `/openapi/v1.json` | Development only | —→OpenAPI của endpoint thực tế |Production404 |
| GET | `/swagger/index.html` | Development only | —→Swagger UI |Production404 |

## Quy ước và quyết định đã áp dụng

Prefix nghiệp vụ /api/v1. C=CUSTOMER, A=TRAVEL_AGENCY, P=PROVIDER, G=TOUR_GUIDE, X=ADMIN; mỗi user một role. SELF/OWN từ principal/server, HOST duy nhất, MEMBER chỉ own accepted segment, BOOK=booking.customer_id, ASSIGNED đúng booking/agency/participant. Guide ownership qua guide_profiles/current agency+history, không từ booking cũ. Admin policy audit. Không lấy agency_id/provider_id/customer_id client làm authority.

List `{items,page,pageSize,total}` bounded100; detail DTO allowlist không EF entity/PII/hash/secret; tiền chuỗi decimal+currency VND để client hiển thị, backend tính/round đồng AwayFromZero. Ngày YYYY-MM-DD, UTC timestamp ISO8601. Create201+Location, update/command200, archive204. Lỗi ProblemDetails+traceId:400 syntax/validation,401 token,403 role/state user,404 resource ngoài scope,409 state/version/idempotency,422 nghiệp vụ,429 rate-limit,503 integration_not_configured. Lỗi400 ApiController là hạ tầng đã có; auth/business errors còn kế hoạch. If-Match/expectedVersion và Idempotency-Key durable theo schema bổ sung, không thực hiện trong health endpoint.

S/P/B trong cột cuối là **mức dữ liệu của ERD gốc**: S đủ dữ liệu cốt lõi; P có một phần; B thiếu persistence gốc. Q1–Q11 đã cho phép mở rộng thiết kế ở schema-proposal; vì chưa Task2, các nhãn này không đổi thành API triển khai. Các câu “thiếu” trong bảng là thiếu ở baseline/implementation, không phải câu hỏi mở. Các API ngoài MVP đã bỏ khỏi bảng.

| Nhóm | Contract nghĩa vụ hiện hành (ghi đè các mô tả ngắn trong từng row) |
|---|---|
| Auth Q11 | Email/password BCrypt; JWT15m; refresh7d rotation/revoke/hash; logout revoke phiên refresh, protected nghiệp vụ check account lock; verify/reset token hash one-time; Mailpit/SMTP test. Không OAuth/public Guide register |
| Tour Q3 | Năm status DRAFT/PENDING_APPROVAL/PUBLISHED/HIDDEN/REJECTED, một PUBLIC/PRIVATE vẫn duyệt; restore tạo vN+1 |
| Options Q5 | Customer chỉ chọn options Agency cấu hình, không tùy ý catalogue; source reference+snapshot; meal khách/bữa, hotel khách/đêm, attraction khách/lượt; adult+child, infant miễn delta mặc định; ngoài option gửi requote; capacity không realtime |
| Co-host Q4 | Tour thường/custom, đúng một host; segment ngày/địa bàn/scope/handover/guide; PER_GUEST hoặc LUMP_SUM; hai bên accept revision; partner net, host fee/còn lại, host âm409/422 chặn chốt; share% chỉ derived |
| Booking Q6 | Approve→AWAITING_CONTRACT; customer accept current revision→AWAITING_DEPOSIT; verified deposit+approval+acceptance mới CONFIRMED; nghĩa vụ đổi tạo revision accept lại; contact typo chỉ audit; request nhiều quote nhưng một active booking |
| Operation Q7 | Departure−30/+60 config, ngoài cửa sổ Agency override reason/audit; attraction progress riêng; GPS>100m warning/review, thiếu vị trí có reason vẫn gửi; Guide report/host complete, partner own segment |
| Refund Q8 | Agency đề xuất/Admin tiền quyết cuối; policy structured snapshot demo14/7/3-day bands10/30/50/100%; fee trên effective contract, refundable cap trừ paid+reserved; không tự thu fee thiếu; window7 ngày, case mở đúng hạn tiếp tục sau hạn |
| Finance Q9 | VietQR+manual audited verification, ảnh không success; fee8% snapshot contract trên received−refunded kể cancellation retained fee; fee một lần host chịu, round VND/lệch host; final-only một payout/agency/run, không refund/dispute/obligation mở; timeout needs reconcile, retry cùng key+attempt history; không chuyển tiền thật |

Bank event route dưới chỉ adapter contract tương lai **ngoài tích hợp MVP**, phải trả503 khi chưa cấu hình; không làm ngân hàng thật. SignalR notifications có scope/after-commit vẫn trong thiết kế, không chat user. Native dialer chỉ từ thao tác user, không backend gọi điện.

## Tài khoản và doanh nghiệp

| Method | Route | Role / ownership | Request → Response | Mức; lỗi chính |
|---|---|---|---|---|
| POST | `/auth/register` | Guest; owner mới | name,email,password,phone?,role customer/agency/provider → userId,verificationRequired | P; duplicate_email 409, token/email persistence thiếu |
| POST | `/auth/login` | Guest; credentials | email,password → accessToken,expiresAt,user role | S cho access JWT; inactive/unverified 403; brute-force 429 |
| POST | `/auth/verify-email` | Guest; token subject | token → verified | B; invalid/expired/used token 422 |
| POST | `/auth/resend-verification` | Guest; rate-limited | email → thông báo chung 200 | B; không tiết lộ email tồn tại |
| POST | `/auth/forgot-password` | Guest | email → thông báo chung 200 | B; reset token/email chưa có |
| POST | `/auth/reset-password` | Guest; token subject | token,newPassword → completed | B; invalid/used token 422 |
| POST | `/auth/change-password` | C/A/P/G/X; SELF | oldPassword,newPassword → completed | P; wrong_password 422, session revocation thiếu |
| POST | `/auth/refresh` | Refresh credential | refreshToken → rotated token pair | B; revoked/reused 401; refresh7 ngày rotation/revoke Q11 |
| POST | `/auth/logout` | C/A/P/G/X; SELF | session credential → 204 | B nếu yêu cầu revoke server; local access-token discard không được mô tả là revoke |
| GET | `/me` | C/A/P/G/X; SELF | — → profile | S; 404 |
| PATCH | `/me` | C/A/P/G/X; SELF | name,phone,avatar? → profile | S; không nhận role/status |
| POST | `/business-profile` | A/P; SELF | businessName,taxCode,address,licenseUrl,description? → profile pending | P; duplicate_tax 409; GPS/địa chỉ hai cấp chưa có cấu trúc profile |
| GET | `/business-profile` | A/P; SELF | — → legal profile,status,reason | S; 404 |
| PATCH | `/business-profile` | A/P; SELF | legal fields,version → profile | P; approved edit cần review history |
| POST | `/business-profile/resubmit` | A/P; SELF | version → pending profile | P; invalid_state 409 |
| GET | `/admin/users` | X; ADMIN | role,status,page → user list | S; không trả hash |
| GET | `/admin/users/{id}` | X; ADMIN | — → account/legal detail | S |
| POST | `/admin/users` | X; ADMIN | name,email,allowedRole → account invitation | P; credential activation/token thiếu; không cấp Admin qua self-register |
| POST | `/admin/users/{id}/status` | X; ADMIN | active/suspended/inactive,reason,version → account | P; audit/revoke thiếu; chặn vô hiệu admin cuối cùng |
| POST | `/admin/business-profiles/{id}/review` | X; ADMIN | approved/rejected/suspended,reason,version → reviewed profile | P; reviewer/history/suspension reason thiếu |
| DELETE | `/admin/users/{id}` | X; ADMIN | version → 204 (deactivate đề xuất) | P; không hard-delete account có tham chiếu; cần thống nhất UI Delete |

## Catalogue provider và moderation

| Method | Route | Role / ownership | Request → Response | Mức; lỗi chính |
|---|---|---|---|---|
| GET | `/services` | A; catalogue approved + business approved | category,province,priceRange,page → service summaries cho Agency cấu hình option | S; Customer không truy cập toàn catalogue để tự chọn, Q5 |
| GET | `/services/{id}` | A; approved catalogue, hoặc C có option được Agency cho phép tham chiếu service này | tourId/optionId khi C → approved permitted service detail | S fields;404 chưa approved/ngoài option scope, Q5 |
| GET | `/tours/{id}/options` | C; public tour hoặc own shared request | — → chỉ permitted option groups, source summary và delta unit | P; Q5 option source/snapshot bổ sung, không trả catalogue tùy ý |
| GET | `/provider/services` | P; OWN | status,page → own list | S |
| POST | `/provider/services` | P; OWN, business hợp lệ | category,name,prices,capacity?,address,GPS,images,amenities,policies → draft | S cho fields ERD; range/GPS/category 422 |
| GET | `/provider/services/{id}` | P; OWN | — → detail + rejectionReason | S |
| PATCH | `/provider/services/{id}` | P; OWN | editable content,version → revised service | P nếu đã approved cần revision/moderation history |
| PUT | `/provider/services/{id}/images` | P; OWN | thumbnailUrl,images,version → detail | S cho URL metadata; file upload tách riêng |
| POST | `/provider/services/{id}/submit` | P; OWN | version → pending | P; review audit thiếu |
| DELETE | `/provider/services/{id}` | P; OWN | version → 204 archive nếu đã tham chiếu | S cho status archive; referenced_resource 409 nếu hard delete |
| GET | `/admin/services` | X; ADMIN | status,page → moderation queue | S |
| GET | `/admin/services/{id}` | X; ADMIN | — → full service/legal evidence | S |
| POST | `/admin/services/{id}/review` | X; ADMIN | approved/rejected/suspended,reason,version → service | P; review history thiếu |
| GET | `/provider/dashboard` | P; OWN | dateRange? → counts by status | S; không bịa doanh thu provider khi chưa có service sales |

## Tour, custom request và AI

| Method | Route | Role / ownership | Request → Response | Mức; lỗi chính |
|---|---|---|---|---|
| GET | `/tours` | Guest/C; published+public+agency approved | destination,dates?,headcount?,budget?,page → tour list | S; date filter chỉ dữ liệu có, chưa có departure inventory |
| GET | `/tours/{id}` | Guest/C; public hoặc C đúng request đã share | — → tour,tiers,timeline,options | S; private 404; tránh lộ net quote |
| GET | `/agency/tours` | A; OWN | status,page → own tours | S |
| POST | `/agency/tours` | A; OWN | tour fields,tiers,timeline,options → draft v1 | S cho dữ liệu gốc; chưa có service links |
| GET | `/agency/tours/{id}` | A; HOST/MEMBER scoped | — → tour + own editable scope | P với co-host; OWN S |
| PUT | `/agency/tours/{id}` | A; HOST | editable tour/children,version,changeNote → vN+1 | P; rowversion/approved revision thiếu; stale 409 |
| POST | `/agency/tours/{id}/duplicate` | A; OWN | newName → new draft id/code/v1 | S; không copy booking/history/contracts |
| DELETE | `/agency/tours/{id}` | A; OWN | version → 204 archive hoặc xóa draft không tham chiếu | S; published cần hide trước 409 |
| POST | `/agency/tours/{id}/submit` | A; HOST | version → pending_approval | P; moderation revision pointer thiếu |
| POST | `/agency/tours/{id}/hide` | A; HOST | reason,version → hidden | P cho audit reason; status có |
| GET | `/agency/tours/{id}/versions` | A; OWN | page → versions metadata | S; tour_versions 1:N đã chốt Q3 |
| GET | `/agency/tours/{id}/versions/{number}` | A; OWN | — → immutable snapshot + diff basis | S |
| POST | `/agency/tours/{id}/versions/{number}/restore` | A; HOST | currentVersion,reason → draft vN+1 | P concurrency; không ghi đè version cũ |
| GET | `/admin/tours` | X; ADMIN | status,page → queue | S; flow Admin cần bổ sung screen tour moderation Q3 |
| GET | `/admin/tours/{id}` | X; ADMIN | — → submitted tour/version/itinerary/pricing/policies | S fields gốc; approved revision/audit còn P |
| POST | `/admin/tours/{id}/review` | X; ADMIN | version,approve/reject,reason → reviewed tour | P; rejection/reviewer/history thiếu |
| POST | `/tours/{id}/price-estimates` | C; public hoặc shared request OWN | departureDate,participants tier/DOB,option IDs → server subtotal,deltas,total,currency,version | P; quantity basis/service mapping đã chốt Q5; bổ sung columns; không dùng client price |
| POST | `/ai/tour-recommendations` | C; public catalogue | groupSize,budget,dates,preferences → valid tour IDs + explanation | S cho stateless selection; external AI chưa cấu hình 503, timeout 504; không đề xuất ID bịa |
| POST | `/agency/ai/itinerary-drafts` | A; OWN, business approved | destination,duration,style → validated draft + source resource IDs | P; chưa có services→itinerary link; AI không auto publish |
| POST | `/custom-requests` | C; SELF | dates,destination,headcount,budget,hotelRating,requirements,contact → submitted request | S; user_id từ principal |
| GET | `/custom-requests` | C; SELF | status,page → own requests | S |
| GET | `/custom-requests/{id}` | C; SELF | — → request + shared quote summary | P quote; request fields S |
| POST | `/custom-requests/{id}/cancel` | C; SELF | reason,version → cancelled | P audit/cancel fields; accepted 409 |
| GET | `/agency/custom-requests` | A; HOST/MEMBER | status,page → scoped request list | S cho request_agencies scope |
| GET | `/agency/custom-requests/{id}` | A; HOST/MEMBER | — → brief + own cooperation data | S cốt lõi |
| POST | `/agency/custom-requests/{id}/start-design` | A; HOST | version → in_design | S status; concurrency bổ sung |
| POST | `/agency/custom-requests/{id}/tours` | A; HOST | draft fields,version → dedicated tour | S; tour.custom_request_id từ route, không tùy ý client |
| POST | `/agency/custom-requests/{id}/quotes` | A; HOST | tourVersion,expiry,terms → formal quote revision | B; quote/acceptance thiếu |
| GET | `/custom-requests/{id}/quotes/{quoteId}` | C; SELF của request | — → shared immutable quote/version/terms/expiry | B; quote phải thuộc request và đã share đúng người |
| GET | `/agency/custom-requests/{id}/quotes` | A; HOST/MEMBER chỉ own scope | page → quote revisions + acceptance history | B; không lộ net quote của partner khác |
| POST | `/custom-requests/{id}/quotes/{quoteId}/accept` | C; SELF | quoteVersion → accepted quote | B; immutable quote và acceptance thiếu |
| POST | `/agency/tours/{id}/share` | A; HOST | customer đúng request,version → shared quote/tour | P; is_shared_to_customer không có shared version/recipient history |

## Co-host và guide workforce

| Method | Route | Role / ownership | Request → Response | Mức; lỗi chính |
|---|---|---|---|---|
| GET | `/agency/cohost-invitations` | A; server xác định sender/recipient | direction,status,page → invitations | B; không có invitation tour thường |
| GET | `/agency/cohost-invitations/{id}` | A; sender/recipient | — → invitation + segment terms | B |
| POST | `/agency/tours/{id}/cohost-invitations` | A; HOST | targetAgencyId,segment scope,expiry → invitation | B; target phải approved, không chứng minh quyền host |
| POST | `/agency/cohost-invitations/{id}/respond` | A; đúng recipient | accept/reject,reason,version → response | B; không dùng request.status thay agreement |
| POST | `/agency/tours/{id}/segments/{segmentId}/quotes` | A; đúng segment member | netPerGuest hoặc lumpSum,currency,revision → quote | B; baseline thiếu; Q4/Q5 đã thiết kế bổ sung |
| POST | `/agency/tours/{id}/segments/{segmentId}/quotes/{quoteId}/accept` | A; HOST | quoteVersion → accepted agreement | B; stale/conflicting terms 409 |
| GET | `/agency/tours/{id}/combined-price` | A; HOST/MEMBER chỉ phần được phép | headcount,version → server totals/shares | B; không lấy suggested_budget làm net quote (Q4 cấm) |
| PUT | `/agency/tours/{id}/segments/{segmentId}/handover` | A; hai bên được phân công | time,timezone,location,from/toGuide,version → handover | B; cần acceptance và history |
| GET | `/agency/guides` | A; OWN workforce | status,page → internal guides | B; users.role=guide không xác lập agency |
| POST | `/agency/guides` | A; OWN workforce | name,email,license,expiry,languages → guide activation | B; workforce/license/token thiếu |
| GET | `/agency/guides/{id}` | A; OWN workforce | — → guide details | B |
| PATCH | `/agency/guides/{id}` | A; OWN workforce | profile/license/status,version → guide | B; không sửa guide agency khác |
| DELETE | `/agency/guides/{id}` | A; OWN workforce | reason,version → inactive | B; giữ assignment history |

## Booking, hành khách, hợp đồng và thanh toán

| Method | Route | Role / ownership | Request → Response | Mức; lỗi chính |
|---|---|---|---|---|
| POST | `/bookings` | C; SELF + tour/quote được phép | tourId,sourceVersion,departureDate,contact,participants,options → booking + backend totals | P; snapshot version/contract/idempotency thiếu; price_changed 409 |
| GET | `/bookings` | C; BOOK | status,page → own bookings | S |
| GET | `/bookings/{id}` | C; BOOK | — → snapshot,manifest,payment summary | S cho fields hiện có; full contract P |
| GET | `/agency/bookings` | A; HOST/MEMBER | status,dateRange,page → bookings scoped | S |
| GET | `/agency/bookings/{id}` | A; HOST/MEMBER | — → own operation scope/services/prices | S cốt lõi; segment P |
| POST | `/agency/bookings/{id}/decision` | A; HOST | approve/reject,reason,version → booking state | P; contract/reject history thiếu |
| POST | `/bookings/{id}/cancellation-requests` | C; BOOK | reason,version → cancellation decision/request | P; baseline chỉ cuối status/cancel_reason, chưa có request/review history |
| POST | `/agency/bookings/{id}/price-adjustments` | A; HOST | delta,reason,expectedVersion → previous/new totals + adjustment | S cho audit adjustment; chống concurrent bằng bổ sung token; delta backend kiểm tra |
| GET | `/bookings/{id}/participants` | C; BOOK | page → manifest | S; PII chỉ chủ booking |
| POST | `/bookings/{id}/participants` | C; BOOK hoặc A; HOST | passenger fields,expectedVersion → participant + recalculated total | P cho sau chốt; trước chốt CRUD S; không nhận price/owner |
| PATCH | `/bookings/{id}/participants/{participantId}` | C; BOOK hoặc A; HOST | allowed fields,expectedVersion → updated manifest/price | P audit/revision; chỉ trước departure |
| DELETE | `/bookings/{id}/participants/{participantId}` | C; BOOK hoặc A; HOST | expectedVersion,reason → cancelled passenger + repriced total | P; không hard-delete attendance/financial history |
| POST | `/bookings/{id}/participant-imports/preview` | C; BOOK hoặc A; HOST | .xlsx file,expectedVersion → normalized rows,rowErrors,previewHash | S stateless; đề xuất kỹ thuật tối đa5MB/1000 dòng, template DTO; invalid_file 422 |
| POST | `/bookings/{id}/participant-imports/commit` | C; BOOK hoặc A; HOST | validated rows,previewHash,expectedVersion,key → import summary + price | P; atomic commit/dedup/audit thiếu, không lưu file có PII công khai |
| POST | `/agency/bookings/{id}/guide-assignments` | A; HOST hoặc own MEMBER | guideId,role,own participant/segment scope → assignment | P; workforce/segment thiếu; guide_not_owned 404 |
| GET | `/bookings/{id}/contract` | C; BOOK hoặc A; HOST | — → immutable contract revision/document | B; không có TourContract |
| POST | `/agency/bookings/{id}/contracts` | A; HOST | snapshotVersion,terms → issued revision | B |
| POST | `/bookings/{id}/contracts/{contractId}/accept` | C; BOOK | revision,acceptanceEvidence → accepted contract | B; stale_revision 409 |
| GET | `/bookings/{id}/payment-requests` | C; BOOK hoặc A; HOST | — → requests/outstanding | S cốt lõi |
| GET | `/bookings/{id}/payment-requests/{requestId}` | C; BOOK hoặc A; HOST | — → request/status | S; request phải thuộc route booking |
| POST | `/agency/bookings/{id}/payment-requests` | A; HOST | kind,amount,dueDate,description,version,key → request | P; kind/sequence/idempotency thiếu; overcollection 422 |
| POST | `/agency/bookings/{id}/payment-requests/{requestId}/replace` | A; HOST | revised amount/dueDate,reason,version,key → superseding request | P; thiếu supersedes/history, không sửa đã paid |
| GET | `/bookings/{id}/payment-requests/{requestId}/vietqr` | C; BOOK | — → QR/account/amount/reference/environment | B cho config/reference persistence; chưa cấu hình 503; không đồng nghĩa paid |
| POST | `/bookings/{id}/payment-proofs` | C; BOOK | requestId,proofUrl,reference,key → pending_verification transaction | P; dedup/review history thiếu; receipt không là success |
| GET | `/bookings/{id}/transactions` | C; BOOK hoặc A; HOST (đã che thông tin) | page → transaction history | S cho rows ERD, không phải đầy đủ ledger |
| POST | `/admin/transactions/{id}/verify` | X; ADMIN | bankReference,decision,reason,key,version → verified transaction | B cho đối soát đủ audit/idempotency; mismatched_amount 422 |
| POST | `/integrations/bank/events` | W; chữ ký/event identity, không bearer user | signed bank event → acknowledgement + reconcile status | B; duplicate event trả kết quả cũ, invalid_signature 401; không cấu hình 503 |

## Tour Guide mobile, feedback, complaint và finance

| Method | Route | Role / ownership | Request → Response | Mức; lỗi chính |
|---|---|---|---|---|
| GET | `/guide/bookings` | G; ASSIGNED | status,dates,page → assigned/current/completed trips | S theo assignment hiện có |
| GET | `/guide/bookings/{id}` | G; ASSIGNED | — → scoped snapshot itinerary + assigned passengers/contact | P timing/emergency contacts; không trả financial/private PII thừa |
| GET | `/guide/bookings/{id}/attractions` | G; ASSIGNED + location scope | — → locations + check-in status | S cho fields có; segment scope P |
| POST | `/guide/bookings/{id}/departure-attendance` | G; ASSIGNED + assigned passengers | participantId,present/late/absent,expectedVersion → attendance | P; thiếu pickup window/audit, attraction check-in không thay roll-call |
| POST | `/guide/attractions/{id}/checkins` | G; ASSIGNED + own attraction | photoUrl,notes,GPS,accuracy,capturedAt,key → check-in | P; ảnh/timestamp có, GPS/idempotency không có |
| GET | `/guide/attractions/{id}/checkins` | G; ASSIGNED | page → check-in history | S; không expose ảnh cho guide khác |
| POST | `/guide/bookings/{id}/incidents` | G; ASSIGNED | type,title,description,evidenceUrls → reported incident | S cho báo sự cố; GPS không lưu được nếu thêm |
| POST | `/agency/incidents/{id}/transition` | A; đúng scope hoặc X; ADMIN | nextState,resolution,version → incident | P; resolution/audit thiếu |
| POST | `/guide/bookings/{id}/wrap-up-reports` | G; ASSIGNED | satisfaction,serviceQuality,summary,evidence → submitted report | B |
| POST | `/agency/bookings/{id}/start` | A; HOST | version → in_progress | P; departure window/audit thiếu |
| POST | `/agency/bookings/{id}/complete` | A; HOST | report approvals,version → completed | P; completion/report acceptance/time thiếu, không tự payout |
| GET | `/tours/{id}/feedbacks` | Guest/C; public tour, published feedback | page → anonymized ratings/comments | S |
| GET | `/me/feedbacks` | C; SELF | page → own feedbacks | S |
| POST | `/bookings/{id}/feedbacks` | C; BOOK completed | agencyId,rating,comments,images → feedback | S; agency phải thuộc booking, duplicate_feedback 409 |
| PATCH | `/feedbacks/{id}` | C; SELF | rating,comments,images,version → feedback | P nếu cần full edit history; current row S |
| DELETE | `/feedbacks/{id}` | C; SELF | version → hidden | S cho hide; giữ audit là P |
| POST | `/agency/feedbacks/{id}/reply` | A; đúng agency của feedback | reply,version → replied feedback | S cho current reply; nhiều vòng cần bổ sung |
| GET | `/complaints` | C; SELF hoặc A; bị phản ánh hoặc X; ADMIN | status,page → scoped complaints | S |
| GET | `/complaints/{id}` | C; SELF hoặc A; đúng agency hoặc X | — → evidence/response allowed | S |
| POST | `/bookings/{id}/complaints` | C; BOOK | agencyId,subject,description,evidenceUrls → submitted | S; Q8 nhiều complaint/booking đã chốt |
| POST | `/agency/complaints/{id}/response` | A; đúng agency | response,version → agency_responded | S cho một phản hồi |
| POST | `/admin/complaints/{id}/resolution` | X; ADMIN | decision,notes,version → resolved/rejected | P full audit/settlement hold; không tạo refund giả |
| DELETE | `/complaints/{id}` | C; SELF, submitted | version → withdrawn/soft hidden | P; history thiếu, under_review 409 |
| POST | `/bookings/{id}/refund-requests` | C; BOOK | transaction refs,reason,requestedAmount,key → refund request | B; policy backend tính amount, không lấy client amount làm chuẩn |
| GET | `/refund-requests` | C; SELF hoặc A; HOST hoặc X | status,page → scoped refunds | B |
| GET | `/refund-requests/{id}` | C; SELF hoặc A; HOST hoặc X | — → policy calculation/status/history | B |
| POST | `/refund-requests/{id}/review` | A; HOST đề nghị hoặc X; quyết định cuối Q8 | decision,reason,version → reviewed refund | B |
| POST | `/admin/refund-requests/{id}/execute` | X; ADMIN | key,version → payout/refund attempt | B; không gọi chuyển tiền thật |
| GET | `/admin/transactions` | X; ADMIN | dateRange,status,page → transaction rows | S cốt lõi; full financial audit P |
| GET | `/admin/settlements` | X; ADMIN | status,page → booking_agencies summary | P; chỉ tổng/trạng thái cuối, không đủ ledger |
| POST | `/admin/settlements/{id}/payouts` | X; ADMIN | key,expectedVersion → durable payout attempt | B; completion/dispute/reconcile guards |
| GET | `/admin/finance-settings` | X; ADMIN | — → bank/commission config version | B |
| PUT | `/admin/finance-settings` | X; ADMIN | bank fields,commissionRate,version → config version | B; commission mặc định yêu cầu 8%, chưa có nơi lưu |
| GET | `/admin/dashboard` | X; ADMIN | dateRange → account/booking counts + reconciled finance only | P; counts S, revenue/escrow balance thiếu ledger |
| GET | `/agency/dashboard` | A; OWN | dateRange → scoped tour/booking counts, finance summary | P; guide count thiếu workforce, revenue cần định nghĩa |
| POST | `/uploads` | C/A/P/G/X; purpose + resource scope | file,purpose,target resource → private object ID/URL | P; file_objects theo Q2/Q7/Q11, chưa triển khai storage; type/size/malware controls |

Q11 đã loại chat giữa user, subscription và Google OAuth khỏi MVP; không tạo route hoặc bảng tương ứng. Native dialer emergency chỉ mở số liên hệ được phép từ trip detail, không cần backend gọi điện. Maps là adapter kiểm pin/địa chỉ, không tự tạo endpoint đặt dịch vụ. SignalR events đề xuất `booking.updated`, `payment.updated`, `incident.reported` chỉ sau commit cho đúng booking/agency group; chưa phải API hợp đồng realtime đã chốt.

## Ví dụ DTO để review

```json
{
  "tourId": 42,
  "sourceVersion": 3,
  "departureDate": "2027-01-15",
  "contact": {"fullName": "Đại diện đoàn", "phone": "...", "email": "..."},
  "participants": [{"fullName": "Khách", "dateOfBirth": "2000-01-01"}],
  "options": {"accommodationIds": [7], "mealIds": [8]}
}
```

Ví dụ này là request tạo booking đề xuất, không có customer_id, agency_id hoặc total_price. Backend trả `{id,bookingCode,status,sourceVersion,price:{originalTotal,total,currency},snapshot,version}` sau khi kiểm tra quyền, lựa chọn và tính tiền. sourceVersion là bổ sung đã thống nhất Q6, chưa có migration, nên endpoint vẫn P. Ví dụ/ID không phải dữ liệu thật. Hợp đồng chính thức, passenger import commit và tài chính cần persistence được duyệt trước khi có hành vi thành công.

## Endpoint bổ sung để thực hiện quyết định đã chốt

Các route sau đều **planned, chưa triển khai**; role/ownership và lỗi chung như trên.

| Method | Route | Role/ownership | Request→Response | Lỗi chính / persistence bổ sung |
|---|---|---|---|---|
| POST | `/agency/guides/{id}/transfer` | A own source agency hoặc X Admin | targetAgencyId,reason,expectedVersion→current agency+history |409 future assignment conflict; không user tự chuyển, Q2 |
| POST | `/agency/bookings/{id}/participants/{participantId}/attendance-overrides` | A HOST hoặc own MEMBER | assignmentId,newAttendance,reason,version→attendance+audit |409 scope/window,422 reason; Q7 |
| POST | `/agency/bookings/{id}/contracts/{contractId}/revisions` | A HOST | changed obligations,expectedVersion,reason→new immutable revision/reacceptRequired |409 stale; Q6 |
| GET | `/bookings/{id}/contracts/{contractId}/revisions/{revision}` | C BOOK hoặc A HOST | —→version/content/hash/acceptance |404 ngoài booking; Q6 |
| POST | `/agency/bookings/{id}/segments/{segmentId}/complete` | A own MEMBER/HOST, assigned own scope | report,version→segment COMPLETED |403 không whole-booking completion; Q7 |
| POST | `/agency/bookings/{id}/wrap-up-reports/{reportId}/review` | A HOST | accept/requestChanges,reason,version→review audit |409 report chưa submitted; Q7 |
| POST | `/admin/transactions/{id}/reconcile` | X ADMIN | reference,result,evidence,reason,key,version→same operation final state |409 duplicate/reference conflict,422 unknown không retry; Q9 |
| GET | `/admin/settlements/{id}/attempts` | X ADMIN | —→attempt history và reconciliation status |404; Q9 |

Request checkin Q7 bổ sung `locationMissingReason?`, `capturedAt?`, `accuracyM?`; response `verificationStatus`, `warnings`, checkinId; thiếu location không bị reject nếu có reason, >100m cảnh báo. Assignment transfer giữ history, không edit assignment agency đã qua. Import commit và create booking dùng expectedVersion+durable idempotency; chỉ mock passenger trong development. Không endpoint nào ở phần này tồn tại trong OpenAPI Task1.
