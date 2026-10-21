"""Regenerate evidence and append the screen-by-screen matrix, never change sources."""
# TASK_0_FROZEN
raise SystemExit("Task 0 generators are frozen after Q1-Q11. Use source_audit.py --check; edit approved design documents directly.")

from source_audit import ROOT, read_sources, clean
import xml.etree.ElementTree as ET

sources = read_sources()
groups = {}

def group(file, ids, description):
    for node in ids.split():
        key=(file,node)
        assert key not in groups, key
        groups[key]=description

C='CustomerScreenFlow.drawio.xml'
A='TravelAgencyFlow.drawio.xml'
P='ProviderScreenFlow.drawio.xml'
G='TourGuideScreenFlow.drawio.xml'
X='AdminScreenFLow.drawio.xml'
for f in (C,A,P,G,X):
    group(f,'title','Tiêu đề sơ đồ; không phải feature/API riêng.')
    group(f,'login','S access-JWT: POST /auth/login; token verify/reset/refresh/revoke cần bổ sung G20.')
group(C,'home','S: GET /tours, chỉ public/published; home là màn tổng hợp.')
group(C,'register','P: POST /auth/register; user có, verification token/email thiếu G20.')
group(C,'verify','B: POST /auth/verify-email; token hash/expiry/used_at chưa có G20.')
group(C,'forgot','B: /auth/forgot-password và /auth/reset-password; G20.')
group(C,'profile update_profile','S: GET/PATCH /me; không bind role/status hoặc owner ID.')
group(C,'tour_list tour_detail','S: GET /tours và /tours/{id}; public hoặc shared đúng customer, G01/G12.')
group(C,'customize price','P: POST /tours/{id}/price-estimates; G09/G12, chốt quantity basis Q5.')
group(C,'hotel meal','P: tour_accommodations/tour_meals có option/delta; source service và đơn vị chênh giá thiếu G09.')
group(C,'provider_hotel provider_meal','P: GET /services/{id}; approved catalogue có, liên kết vào option/booking thiếu G09.')
group(C,'sightseeing','P: booking_timeline_attractions có customized name/delta; tour attraction không có giá/dịch vụ nguồn G09.')
group(C,'ai_search ai_results','S stateless: POST /ai/tour-recommendations; chỉ ID tour được phép, external AI chưa cấu hình phải 503.')
group(C,'requests request_list request_detail request_create','S request fields: GET/POST /custom-requests và GET /custom-requests/{id}; formal quote P/B G11.')
group(C,'request_cancel','P: POST /custom-requests/{id}/cancel; state có, cancel reason/history thiếu.')
group(C,'booking booking_history booking_detail','S current data: GET /bookings và /bookings/{id}; chỉ BOOK; snapshot đầy đủ/contract P G12/G13.')
group(C,'booking_form','P: POST /bookings; snapshot/version/durable dedup thiếu, G12/G14/G16.')
group(C,'contract','B: GET /bookings/{id}/contract; TourContract/revision/acceptance thiếu G13.')
group(C,'deposit_request balance_request','S xem payment_requests; P kind/sequence/revised request G15.')
group(C,'deposit_payment final_payment','B QR config /vietqr; P proof /payment-proofs; không tự paid, G16/G17/G24.')
group(C,'payment_history','S đọc /bookings/{id}/transactions; lịch sử tài chính đầy đủ vẫn thiếu G16/G17.')
group(C,'reviews review_list','S: GET /tours/{id}/feedbacks, POST /bookings/{id}/feedbacks sau completed; G22.')
group(C,'own_reviews','S: GET /me/feedbacks; SELF.')
group(C,'review_update','P full audit, S current row: PATCH /feedbacks/{id}; G22.')
group(C,'review_delete','S hide status: DELETE /feedbacks/{id}; không xóa lịch sử; audit P.')
group(C,'issues','Màn tổng hợp complaint/refund; complaint S current row, refund B G17/G22.')
group(C,'complaints complaint_create','S: GET /complaints, POST /bookings/{id}/complaints; BOOK, đúng agency trong booking; audit nhiều vòng P.')
group(C,'refund_requests refund_status','B: POST /bookings/{id}/refund-requests, GET /refund-requests/{id}; thiếu refund lifecycle G17.')

group(A,'dashboard','P: GET /agency/dashboard; booking/tour count S, guide workforce/financial revenue thiếu G06/G17.')
group(A,'tours tour_list tour_detail','S OWN tour list/detail; co-host scope P G10.')
group(A,'tour_create','S dữ liệu tour cơ bản: POST /agency/tours; source service P G09.')
group(A,'ai_draft','P: POST /agency/ai/itinerary-drafts; resource linkage G09, không auto publish.')
group(A,'tour_edit','P: PUT /agency/tours/{id}; snapshot có, concurrency/approved revision thiếu G12/G21.')
group(A,'tour_duplicate','S: POST /agency/tours/{id}/duplicate, ID/code mới, không copy booking.')
group(A,'tour_versions','S: GET versions và version detail; đề xuất 1:N, G04.')
group(A,'tour_restore','P: POST version restore → version mới; rowversion/atomicity cần chốt G12.')
group(A,'requests request_list request_detail','S current brief: GET /agency/custom-requests và detail; HOST/MEMBER request_agencies.')
group(A,'request_status','S status cơ bản: /start-design; formal quoted/accepted/expired cần quote persistence G11.')
group(A,'request_quote','B: POST /agency/custom-requests/{id}/quotes; formal quote version/acceptance G11.')
group(A,'request_tour','S: POST /agency/custom-requests/{id}/tours; request/tour linkage có; cardinality cần chốt.')
group(A,'cohost invitation_list invitation_detail invite accept reject','B: /agency/cohost-invitations và /agency/tours/{id}/cohost-invitations; request_agencies chưa đủ G10.')
group(A,'segment_quote','B: /agency/tours/{id}/segments/{segmentId}/quotes; net/guest/lump sum/acceptance thiếu G10.')
group(A,'combined_price','B: GET /agency/tours/{id}/combined-price; segment/share/rounding thiếu G10/G17.')
group(A,'bookings booking_list booking_detail selected_services','S current snapshots: GET /agency/bookings và detail; HOST/MEMBER chỉ phần được phép; service source P G09.')
group(A,'booking_price','S adjustment row: POST /agency/bookings/{id}/price-adjustments; concurrency/reprice sau chốt P G12.')
group(A,'booking_contract','B: /agency/bookings/{id}/contracts và /bookings/{id}/contract; G13.')
group(A,'booking_decision','P: /agency/bookings/{id}/decision; confirmation/contract/deposit ordering Q6, reject audit thiếu.')
group(A,'payments payment_list payment_detail deposit balance','P tạo payment request; S xem amount/due/status; thiếu kind/milestone/dedup G15/G16.')
group(A,'revised_deposit','P: /payment-requests/{requestId}/replace; thiếu supersedes link/history, không sửa request đã paid G15.')
group(A,'deposit_status balance_status','S current payment_requests/payment_status; đối soát/idempotency/history P/B G16.')
group(A,'guides guide_list guide_detail','B workforce: GET/POST/PATCH /agency/guides; users guide không đủ agency membership/license G06/G08.')
group(A,'guide_assign','P: /agency/bookings/{id}/guide-assignments; assignment table có nhưng workforce/segment ownership thiếu G06/G10.')

group(P,'dashboard','S: GET /provider/dashboard; own services status counts, không doanh thu giả.')
group(P,'profile profile_detail','S: GET /business-profile; legal fields hiện có; GPS/cấu trúc địa chỉ còn thiếu.')
group(P,'profile_edit','P: PATCH /business-profile; profile GPS/two-tier address/review history thiếu G07.')
group(P,'services service_list service_detail','S: GET /provider/services và detail; OWN, gồm pending/rejected riêng tư.')
group(P,'service_create','S fields hiện có: POST /provider/services; menu data thiếu, category/basis Q5.')
group(P,'service_update','P approved revision; PATCH /provider/services/{id}; snapshot/moderation history thiếu.')
group(P,'service_images','S URL metadata: PUT /provider/services/{id}/images; file storage pipeline P.')
group(P,'service_delete','S archive status: DELETE /provider/services/{id}; hard delete chỉ draft chưa tham chiếu.')
group(P,'approval approval_status rejection_reason','S current status/rejection_reason qua detail; audit moderation P.')

group(G,'dashboard assigned assigned_list','S: GET /guide/bookings; ASSIGNED, cùng backend, Flutter riêng.')
group(G,'trip_detail','P: GET /guide/bookings/{id}; snapshot có nhưng timings/emergency manager contact/segment thiếu G23.')
group(G,'locations location_list','S: GET /guide/bookings/{id}/attractions; giới hạn assignment/scope.')
group(G,'check_in','P: POST /guide/attractions/{id}/checkins; photo/time có, GPS/accuracy/dedup thiếu G18.')
group(G,'check_status','S: GET attraction checkins; không đồng nghĩa điểm danh hành khách đầu chuyến.')
group(G,'history history_list history_detail','S: GET /guide/bookings?status=completed và detail; history không thay wrap-up report G19.')

group(X,'dashboard','P: GET /admin/dashboard; counts có, escrow/revenue cần ledger G17.')
group(X,'accounts user_list user_detail','S: GET /admin/users và detail; legal profile và protected PII theo ADMIN.')
group(X,'user_create','P: POST /admin/users; credential activation/audit thiếu G20.')
group(X,'user_approve','P: /admin/business-profiles/{id}/review; is_verified email không đồng nghĩa approval G07/G20.')
group(X,'user_status user_delete','P: /admin/users/{id}/status hoặc DELETE deactivate; không xóa account có history, revoke/audit thiếu.')
group(X,'plans plan_list plan_create plan_edit plan_delete','B: /admin/subscription-plans; scope từ flow/UseCase chưa chốt và không có schema G24/Q11.')
group(X,'services service_list service_detail','S: GET /admin/services và detail; ADMIN.')
group(X,'service_approve service_reject service_suspend','P: /admin/services/{id}/review; current state/reason có, review history thiếu.')
group(X,'disputes complaint_list dispute_detail evidence','S complaint current fields: /complaints và detail; multi-round evidence/history P G22.')
group(X,'resolution','P: /admin/complaints/{id}/resolution; kết luận không tự hoàn tiền G17/G22.')
group(X,'refunds refund_list refund_detail refund_calc refund_approve refund_reject','B: /refund-requests và review; policy/penalty/refund lifecycle thiếu G17.')
group(X,'finance transactions','S transaction rows qua /admin/transactions; full ledger/escrow reporting P/B G16/G17.')
group(X,'settlements','P: /admin/settlements; booking_agencies chỉ tổng và trạng thái cuối G17.')
group(X,'bank','B: GET/PUT /admin/finance-settings; không có bank/commission config G24.')
group(X,'withdrawal','B: POST /admin/withdrawals; chưa có withdrawal/ledger, khác agency payout G17/G24.')

def boundary_candidates(page, point):
    if not point:
        return 'không có point'
    px,py=float(point.get('x',0)),float(point.get('y',0))
    found=[]
    for n in page['nodes']:
        if n['id']=='title': continue
        g=n['geometry']
        if not all(k in g for k in ('x','y','width','height')): continue
        x,y,w,h=(float(g[k]) for k in ('x','y','width','height'))
        if x-0.01 <= px <= x+w+0.01 and y-0.01 <= py <= y+h+0.01:
            found.append(n['id'])
    return ', '.join(found) or 'không gắn node'

review='''# Nhật ký đọc và bằng chứng nguồn

Ngày 2026-10-21. Đọc toàn bộ XML/OOXML bằng Python standard library. File nguồn giữ nguyên. Hash SHA-256 để phát hiện thay đổi sau đối chiếu; không phải dấu phê duyệt. Không đưa nội dung PII trong phiếu vào tài liệu đầu ra. Không dùng database khác trong UseCase/Page-8 làm baseline.

## Tất cả file nguồn

| File | SHA-256 | Trang/nội dung đã đọc |
|---|---|---|
'''
for s in sources:
    detail='; '.join(f'{p["name"]}: {len(p["nodes"])} nhãn, {len(p["edges"])} edge' for p in s.get('pages',[]))
    if 'paragraphs' in s:
        detail=f'{len(s["paragraphs"])} paragraphs gồm cả table cells; đọc toàn bộ §1–4, chỉ §3 dùng thiết kế'
    review+=f'| `{s["file"]}` | `{s["sha256"]}` | {detail} |\n'
review+='''
## Kiểm tra package edges

Mọi edge backend/web/mobile được đọc từ XML. Endpoint không có source/target được giữ là MISSING, không tự gán theo vị trí.

| Edge ID | Source label | Target label |
|---|---|---|
'''
package=next(s for s in sources if s['file']=='BackendPackageDiagram.drawio.xml')['pages'][0]
labels={n['id']:n['label'] for n in package['nodes']}
for e in package['edges']:
    review+=f'| `{e["id"]}` | {labels.get(e["source"], "[MISSING/unnamed]")} | {labels.get(e["target"], "[MISSING/unnamed]")} |\n'
review+='''
## Navigation trong XML screen flow

Toàn bộ edge của năm file flow dùng điểm tọa độ, không có thuộc tính source/target gắn node. Bảng dưới giữ sourcePoint/targetPoint và chỉ liệt kê node chứa chính xác điểm đó theo mxGeometry (ứng viên hình học, không coi là quan hệ ngữ nghĩa đã xác nhận). Điểm nằm ngoài node giữ unresolved; không nối bằng node gần nhất. ERD inventory tách riêng và chỉ dùng thuộc tính source/target thật.

| File:edge ID | sourcePoint → targetPoint | Node ứng viên theo geometry |
|---|---|---|
'''
trace='''## Truy vết từng màn hình nguồn

Mỗi hàng là một node có nhãn trong file flow độc lập, gồm cả tiêu đề để đối chiếu đủ. S/P/B theo endpoint proposal; không phải tính năng đã triển khai. Tên nhóm/màn tổng hợp dùng chung endpoint thay vì tự tạo bảng hoặc API menu. Navigation evidence nằm trong source-review.
'''
count=0
for s in sources:
    if s['file'] not in (C,A,P,G,X): continue
    trace+=f'\n### {s["file"]}\n\n| Node ID | Nhãn nguyên bản | Đối chiếu schema/API và gap |\n|---|---|---|\n'
    for page in s['pages']:
        for n in page['nodes']:
            key=(s['file'],n['id'])
            assert key in groups, ('Unmapped screen',key)
            trace+=f'| `{n["id"]}` | {n["label"]} | {groups[key]} |\n'
            count+=1
        for e in page['edges']:
            assert e['source'] is None and e['target'] is None, e
            sp=next((p for p in e['points'] if p.get('as')=='sourcePoint'),None)
            tp=next((p for p in e['points'] if p.get('as')=='targetPoint'),None)
            def fmt(p): return f'({p.get("x")},{p.get("y")})' if p else '[MISSING]'
            review+=f'| `{s["file"]}:{e["id"]}` | {fmt(sp)} → {fmt(tp)} | {boundary_candidates(page,sp)} → {boundary_candidates(page,tp)} |\n'
review+='''
## Giới hạn và cách tái lập

Đọc tất cả nhãn/cột/cạnh và paragraph là kiểm tra cấu trúc/nội dung, không phải render QA Word hoặc xác nhận UX chạy được. Không có source code/build target để thực thi trong Task 0. UseCase trang cũ chỉ dùng ghi nhận mâu thuẫn; mọi bảng/cột schema proposal lấy từ ERD độc lập. Các màn hình/cạnh trùng trong UseCase không tăng baseline.

`python docs/tools/generate_baseline.py` sinh inventory và per-column proposal; `python docs/tools/generate_traceability.py` sinh evidence này và phần screen matrix cuối gaps; `python docs/tools/source_audit.py --check` kiểm tra coverage và hash. Hai generator chỉ ghi tài liệu đích, không ghi docs/source, không tạo DDL. Tránh sửa tay phần đã sinh mà không sửa generator.
'''
(ROOT/'docs/architecture/source-review.md').write_text(review,encoding='utf-8')
gaps=ROOT/'docs/architecture/gaps.md'
prefix=gaps.read_text(encoding='utf-8').split('<!-- SCREEN_TRACE_START -->')[0]
gaps.write_text(prefix+'<!-- SCREEN_TRACE_START -->\n\n'+trace,encoding='utf-8')
print(f'Generated evidence for {len(sources)} sources and {count} screen labels (including 5 titles).')
