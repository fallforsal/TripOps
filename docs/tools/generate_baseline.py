"""Generate only the XML inventory and per-column SQL proposal for Task 0.

Not DDL, not an EF model, not an approved schema. Run from repository root.
"""
# TASK_0_FROZEN
raise SystemExit("Task 0 generators are frozen after Q1-Q11. Use source_audit.py --check; edit approved design documents directly.")

from pathlib import Path
import collections
from source_audit import ROOT, parse_erd, read_sources

ARCH = ROOT / 'docs/architecture'
ARCH.mkdir(parents=True, exist_ok=True)
tables, edges = parse_erd()

def write(name, text):
    (ARCH / name).write_text(text.rstrip() + '\n', encoding='utf-8')

inventory = '''# ERD inventory từ XML mới

Ngày đối chiếu: 2026-10-21. Nguồn duy nhất cho schema gốc: `docs/source/ERD.drawio.xml`, trang `Database`. Đây là bản trích nguyên trạng, không phải schema đã duyệt.

Kết quả: **27 bảng, 330 dòng cột, 329 cặp bảng/cột phân biệt, 29 đường nối**. `tours.visibility` lặp hai dòng. Khoảng trắng/NBSP ở đầu/cuối nhãn được trim để đọc; tên, thứ tự và cell ID được giữ. Không đổi `baseprice`, `diemnoibat`, `duration_tour` hoặc tên bảng số ít thành tên chuẩn khác.

XML đánh dấu `PK` ở `id` của cả 27 bảng. Các ô dấu còn lại rỗng: không có nhãn FK, kiểu SQL, NULL, UNIQUE, index hay tập giá trị enum. Không suy ra những thuộc tính này từ hình dạng hoặc tên cột. Các đề xuất nằm trong [schema-proposal.md](schema-proposal.md).

## Danh sách bảng

| Bảng | Dòng cột | Table cell ID |
|---|---:|---|
'''
for t in tables:
    inventory += f'| `{t["name"]}` | {len(t["columns"])} | `{t["id"]}` |\n'
for t in tables:
    inventory += f'\n## {t["name"]}\n\n| STT | Cột gốc | Dấu trong XML | Column cell ID |\n|---:|---|---|---|\n'
    for i, c in enumerate(t['columns'], 1):
        inventory += f'| {i} | `{c["name"]}` | {c["marker"] or "—"} | `{c["cell_id"]}` |\n'
inventory += '''
## Các quan hệ được vẽ

Endpoint dưới đây được giải bằng cách lần `source`/`target` qua row/container tới bảng và cột, không dùng vị trí ảnh. Giữ nguyên chiều và arrow token. `ERmandOne` = một bắt buộc; `ERoneToMany` = một hoặc nhiều; `ERmany` = nhiều theo ký hiệu draw.io. Những marker này thể hiện ý đồ vẽ, không tự xác lập FK hay NULL của SQL Server. Không đảo chiều để làm cho sơ đồ có vẻ đúng.

| Edge ID | Source trong XML | Target trong XML | startArrow | endArrow |
|---|---|---|---|---|
'''
for e in edges:
    inventory += f'| `{e["id"]}` | `{e["source"]}` | `{e["target"]}` | `{e["start"]}` | `{e["end"]}` |\n'
inventory += '''
### Bất thường đọc trực tiếp

- `i8IDv60cwcrwSPCYD2tw-7`: không có thuộc tính `source`; chỉ có tọa độ `sourcePoint`. Không đủ bằng chứng khẳng định quan hệ được vẽ là bookings → booking_accommodations.
- `i8IDv60cwcrwSPCYD2tw-16` và `-17` nối từ `bookings.customer_id` đến `payment_transactions.booking_id` và `booking_price_adjustments.booking_id`. Không được chuyển chúng thành FK trỏ customer_id; cột đó không phải PK/unique trong XML.
- `i8IDv60cwcrwSPCYD2tw-23`: chiều bookings.tour_id → tours.id nhưng marker một → nhiều ngược với quan hệ FK dự kiến. `-25`: tours → tour_versions lại vẽ một → một, mâu thuẫn nhiều version.
- `-14`, `-18` vẽ booking → complaint/feedback một → một. `-15` vẽ payment_request → transaction một → một, cần xác nhận khả năng nhiều lần thanh toán/thử lại. `-24` và `kpDPMsVqOmSjCqEeZoyg-1` vẽ custom request với booking/tour một → một; chưa đủ cơ sở chốt UNIQUE.
- `tours.visibility`: cell `nT-pTPnVr-UvncDkvP_g-66` và `i8IDv60cwcrwSPCYD2tw-21` cùng nhãn. Không tự xóa hay coi là hai khái niệm khác nhau.

## FK chỉ suy ra từ tên và nghiệp vụ

Các cột `agency_id` chưa có đường vẽ tới một bảng doanh nghiệp/tài khoản. `services.provider_id` được vẽ tới `users.id`; `booking_assigned_guides.guide_id` được vẽ tới `users.id`. Không có bảng `agencies`, `providers` hoặc `guides` trong baseline. Toàn bộ đích FK ứng viên được liệt kê theo từng cột tại schema proposal, bao gồm các cột không có đường nối; đó là suy luận chờ duyệt, không phải dữ kiện XML.

`customer_id`, `created_by`, `adjusted_by`, `reported_by`, `admin_id`, `checked_by` có đích ứng viên `users.id`; `booking_participants.assigned_guide_id` còn mơ hồ giữa `users.id` và `booking_assigned_guides.id`. `bookings.design_request_id` ứng viên tới `tour_custom_requests.id`. Không có `service_id` trong các bảng meal/accommodation/attraction nên không thể tuyên bố chúng đã liên kết catalogue services.

## Tái lập

`python docs/tools/source_audit.py --check` kiểm tra đủ bảng/cột/edge và các liên kết tài liệu. `python docs/tools/source_audit.py` xuất cấu trúc đã giải cùng nội dung nguồn để kiểm tra sâu (có thông tin cá nhân trong phiếu đăng ký; không công bố output). Script chỉ đọc nguồn. `python docs/tools/generate_baseline.py` tái sinh inventory và schema proposal; không sửa nguồn hoặc tạo migration.
'''
write('erd-inventory.md', inventory)

def fk(table, col):
    if col == 'id': return '—'
    if col == 'assigned_guide_id': return 'booking_assigned_guides.id (đề xuất; cần chốt Q2)'
    if col in ('user_id', 'customer_id', 'agency_id', 'provider_id', 'guide_id', 'created_by', 'adjusted_by', 'reported_by', 'admin_id', 'checked_by'):
        return 'users.id (role tương ứng; Q1/Q2)'
    return {'tour_id':'tours.id', 'custom_request_id':'tour_custom_requests.id', 'design_request_id':'tour_custom_requests.id', 'request_id':'tour_custom_requests.id', 'booking_id':'bookings.id', 'tour_timeline_id':'tour_timeline.id', 'booking_timeline_id':'booking_timelines.id', 'payment_request_id':'payment_requests.id', 'booking_timeline_attraction_id':'booking_timeline_attractions.id'}.get(col, '—')

money = {'price','price_from','price_to','budget_per_person','suggested_budget','baseprice','price_difference','original_total_price','total_price','original_amount','final_amount','platform_fee','net_payout','amount','previous_total_price','adjustment_amount','new_total_price'}
ints = {'capacity','number_of_participants','duration_days','duration_nights','min_participants','max_participants','version','display_order','day_number','nights_count','participant_index'}
small = {'star_rating','hotel_rating_requirement','min_age','max_age','original_stars','customized_stars'}
jsons = {'amenities','images','image_urls','thumbnail_urls','tour_snapshot','evidence_urls'}
longs = {'description','special_requirements','communication_notes','diemnoibat','inclusions','exclusions','policies','message','change_note','notes','note','customer_note','address_notes','overall_comment','agency_comment','agency_reply','agency_response','admin_notes','reason','contact_note'}
statuses = {'role','category','status','visibility','payment_status','settlement_status','attendance_status','gender','meal_type','payment_method','incident_type'}

nullable = {
 'users': 'phone avatar updated_at',
 'business_profiles': 'description rejection_reason approved_at updated_at',
 'services': 'description price price_from price_to capacity star_rating amenities policies latitude longitude thumbnail_url images rating rejection_reason updated_at',
 'tour_custom_requests': 'agency_id hotel_rating_requirement special_requirements updated_at',
 'tour_custom_request_agencies': 'stage_area suggested_budget communication_notes responded_at',
 'tours': 'custom_request_id duration_tour operation_period diemnoibat inclusions exclusions policies message thumbnail_urls image_urls change_note updated_at',
 'tour_pricing_tiers': 'max_age',
 'tour_timeline': 'description',
 'tour_meals': 'description updated_at',
 'tour_accommodations': 'address_notes updated_at',
 'tour_versions': 'change_note',
 'bookings': 'design_request_id contact_note cancel_reason cancelled_at updated_at',
 'booking_agencies': 'payout_transferred_at bank_reference_code updated_at',
 'booking_assigned_guides': 'notes',
 'booking_participants': 'assigned_guide_id checked_by gender identity_card_number phone note checked_at status_note updated_at',
 'booking_timelines': 'description',
 'booking_timeline_attractions': 'customized_location_name customer_note guide_id',
 'booking_timeline_meals': 'provider_id customized_restaurant_name customer_note',
 'booking_accommodations': 'provider_id customized_hotel_name customized_stars customer_note',
 'payment_transactions': 'payer_name payment_proof_url paid_at',
 'feedbacks': 'overall_comment agency_rating agency_comment images agency_reply replied_at updated_at',
 'complaints': 'admin_id evidence_urls agency_response agency_responded_at admin_notes resolved_at updated_at deleted_at',
 'payment_requests': 'description paid_at',
 'booking_attraction_checkins': 'notes updated_at',
 'booking_incidents': 'evidence_urls resolved_at updated_at',
}

def sqltype(t,c):
    if c == 'id' or fk(t,c) != '—': return 'bigint'
    if c in money: return 'decimal(19,2)'
    if c in ints: return 'int'
    if c in small: return 'tinyint'
    if c in ('latitude','longitude'): return 'decimal(10,7)'
    if c in ('rating','overall_rating','agency_rating'): return 'decimal(3,2)'
    if c.startswith('is_') or c == 'has_customization': return 'bit'
    if c in ('date_of_birth','departure_date','return_date'): return 'date'
    if c.endswith('_at') or c == 'due_date': return 'datetime2(3)'
    if c in jsons or c in longs: return 'nvarchar(max)'
    if c in statuses: return 'varchar(40)'
    if c == 'email' or c.endswith('_email'): return 'nvarchar(254)'
    if c == 'phone' or c.endswith('_phone'): return 'varchar(32)'
    if c.endswith('_url') or c == 'avatar': return 'nvarchar(2048)'
    if c == 'password_hash': return 'varchar(255)'
    if c.endswith('_code') or c == 'tax_code' or c == 'identity_card_number': return 'nvarchar(64)'
    if c.endswith('_reason') or c == 'status_note': return 'nvarchar(2000)'
    return 'nvarchar(255)'

def rule(t,c):
    if c == 'id': return 'PK clustered; IDENTITY(1,1) đề xuất'
    if fk(t,c) != '—': return 'IX FK; NO ACTION; kiểm tra role + cùng aggregate'
    if c in statuses: return 'CHECK tập giá trị; xem state-machines.md'
    if c in money: return 'CHECK >= 0' if c not in {'price_difference','adjustment_amount'} else 'Cho phép +/-; backend tính'
    if c in jsons: return 'CHECK ISJSON khi khác NULL; hợp đồng JSON có version'
    if c in ints or c in small: return 'CHECK >= 0; ràng buộc chéo ở dưới'
    if c == 'latitude': return 'CHECK -90..90'
    if c == 'longitude': return 'CHECK -180..180'
    if c in ('rating','overall_rating','agency_rating'): return 'CHECK 0..5; review yêu cầu 1..5'
    if c == 'created_at': return 'DEFAULT SYSUTCDATETIME(); immutable'
    if c.endswith('_at') or c == 'due_date': return 'UTC; set bởi backend theo transition'
    if c.startswith('is_') or c == 'has_customization': return 'DEFAULT 0; xác thực theo nghiệp vụ'
    return 'Độ dài/định dạng do backend kiểm tra'

schema = '''# Đề xuất schema SQL Server

**DRAFT — CHƯA ĐƯỢC DUYỆT. Không phải DDL/migration và không cho phép tự thêm bảng nghiệp vụ.** Baseline gồm đúng 27 bảng tại [erd-inventory.md](erd-inventory.md). Mỗi dòng dưới giữ một cột gốc từ ERD; riêng dòng visibility trùng được giữ để thấy lỗi, không thể tạo hai cột cùng tên trong SQL Server.

## Ranh giới nguyên bản và đề xuất

Nguyên bản: tên bảng, tên/thứ tự cột, nhãn PK `id` và 29 đường nối ở inventory. Tất cả kiểu dữ liệu, NULL, đích FK, index, UNIQUE, default, enum, CHECK, quy tắc xóa và cardinality hiệu chỉnh bên dưới **đều là đề xuất**. Chưa có DDL gốc xác nhận chúng. Không lấy database trong `UseCase.drawio.xml/Page-8` làm nguồn bổ sung.

Quy ước: PK bigint IDENTITY; ID của FK cùng bigint. NN = NOT NULL, Y = NULL. NULL là đề xuất cho dữ liệu chưa biết/chưa phát sinh; trạng thái draft có thể thiếu nội dung nghiệp vụ nhưng không bỏ các trường NN, hoặc phải sửa đề xuất trước triển khai. FK `agency_id/provider_id` → users dựa trên mô hình một tài khoản doanh nghiệp (Q1), không phải quyết định đã duyệt. Role/ownership là invariant ở service, FK đơn không kiểm tra được role.

Tiền decimal(19,2), mặc định nghiệp vụ đề xuất VND (chưa có cột currency); không dùng float/double. Thời điểm datetime2(3) lưu UTC, ngày hành trình/date_of_birth là date. Nội dung tiếng Việt nvarchar; enum ASCII varchar(40) + CHECK, không dùng SQL enum. Không dùng JSON để ngụy trang một hệ thống hợp đồng/tài chính thiếu schema.

Mọi FK đề xuất ON DELETE NO ACTION / ON UPDATE NO ACTION để tránh cascade phá snapshot và SQL Server multiple cascade paths. Tạo non-unique IX trên từng FK, nhưng gộp vào composite index có cùng prefix nếu đã đáp ứng truy vấn; SQL Server không tự index FK. Kiểm tra bảng NULL không có nghĩa là quyền client tự điền ID.
'''
for t in tables:
    schema += f'\n## {t["name"]}\n\n| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |\n|---|---|---|---|---|\n'
    for c in t['columns']:
        n=c['name']
        schema += f'| `{n}` | `{sqltype(t["name"],n)}` | {"Y" if n in nullable.get(t["name"], "").split() else "NN"} | {fk(t["name"],n)} | {rule(t["name"],n)} |\n'
schema += '''
## UNIQUE và index theo aggregate

Tất cả mục này chờ duyệt. `UX` = unique index; filtered UX dùng điều kiện nêu rõ. Mọi bảng đã có PK(id); mọi FK đã có IX theo quy ước trên.

| Bảng | UNIQUE đề xuất | Index truy vấn bổ sung |
|---|---|---|
| users | UX(email), chuẩn hóa trim/case theo collation được chốt | (role,status) |
| business_profiles | UX(user_id); UX(tax_code) chuẩn hóa nếu một mã số thuế/một profile | (status,created_at) |
| services | Không unique theo tên | (provider_id,status), (status,category,province); cân nhắc full text sau đo tải |
| tour_custom_requests | Không unique theo user/ngày | (user_id,status,created_at), (agency_id,status) |
| tour_custom_request_agencies | UX(request_id,agency_id); filtered UX(request_id) WHERE is_host=1 | (agency_id,status) |
| tours | UX(tour_code); không UNIQUE custom_request_id cho tới khi chốt số phương án/request | (agency_id,status), (status,visibility,destination) |
| tour_pricing_tiers | UX(tour_id,tier_name) | (tour_id,display_order) |
| tour_timeline | UX(tour_id,day_number) nếu mỗi ngày đúng một timeline | (tour_id,day_number) được UX phục vụ |
| tourist_attractions | Không: có thể lặp điểm tham quan | (tour_timeline_id,agency_id) |
| tour_meals | Không: nhiều lựa chọn cho một bữa | (tour_timeline_id,meal_type,is_default) |
| tour_accommodations | Không: nhiều hotel thay thế mỗi điểm | (tour_id,destination_name,is_default) |
| tour_versions | UX(tour_id,version), sửa ý đồ quan hệ 1:1 thành 1:N | (created_by,created_at) |
| bookings | UX(booking_code); design_request_id không UNIQUE mặc định | (customer_id,created_at), (tour_id,departure_date,status) |
| booking_agencies | UX(booking_id,agency_id); filtered UX(booking_id) WHERE is_host=1 | (agency_id,settlement_status) |
| booking_assigned_guides | UX(booking_id,guide_id,agency_id) nếu không chia assignment theo segment | (guide_id,booking_id) |
| booking_participants | UX(booking_id,participant_index); filtered UX(booking_id) WHERE is_primary=1 | (assigned_guide_id,attendance_status) |
| booking_timelines | UX(booking_id,day_number) với cùng giả định tour_timeline | (booking_id,day_number) được UX phục vụ |
| booking_timeline_attractions | Không unique theo tên | (booking_timeline_id,status), (guide_id,status) |
| booking_timeline_meals | Không unique meal_type trước khi chốt nhiều bữa/ngày | (booking_timeline_id,status) |
| booking_accommodations | Không unique destination trước khi chốt nhiều hotel/điểm | (booking_id,status) |
| payment_transactions | UX(transaction_code), nhưng chưa đủ chống trùng webhook/bank transfer | (booking_id,paid_at), (payment_request_id,status) |
| booking_price_adjustments | Append-only, không unique theo reason | (booking_id,created_at) |
| feedbacks | UX(booking_id,customer_id,agency_id), thay quan hệ vẽ 1:1 để hỗ trợ co-host | (agency_id,status,created_at) |
| complaints | Không UNIQUE booking_id: đề xuất nhiều complaint/booking, cần chốt Q8 | (customer_id,status), (agency_id,status), (admin_id,status) |
| payment_requests | Không unique amount/due_date | (booking_id,status,due_date) |
| booking_attraction_checkins | Không UNIQUE attraction_id: giữ lần chụp/check lại | (booking_timeline_attraction_id,checked_at), (guide_id,created_at) |
| booking_incidents | Không unique booking_id | (booking_id,status,created_at), (agency_id,status) |

Filtered UX chỉ bảo đảm **tối đa** một host/primary, không bảo đảm tồn tại một. Service phải bảo đảm đúng một host khi xác nhận booking/request và đúng một đại diện khi chốt danh sách. Không unique identity_card_number toàn hệ thống (trẻ em/khách có nhiều booking).

## CHECK và invariant chéo

- services: price_from <= price_to khi đủ cả hai; ít nhất fixed price hoặc range khi gửi duyệt, quy tắc fixed/range cần chốt. capacity > 0 khi có; star_rating 1..5 khi có; GPS phải có cặp. Category theo phiếu: accommodation, fnb, attraction, adventure, guide, support; transportation là ví dụ ở phần moderation nhưng chưa có category riêng, cần map vào support hay sửa enum.
- tour_custom_requests: return_date >= departure_date, participants > 0, budget >= 0; hotel requirement 1..5. agency_id là host đề xuất và phải khớp bản ghi is_host; không dùng suggested_budget thay net quote.
- tours: duration_days > 0, duration_nights >= 0, min_participants > 0 và max >= min; version >= 1. duration_tour và operation_period giữ nvarchar vì chưa biết cấu trúc/đơn vị, không tự chuyển thành ngày khởi hành. Chưa có departure inventory/capacity theo đợt nên không cam kết giữ chỗ.
- tiers: min_age <= max_age nếu có; tuổi theo ngày khởi hành, dưới 2, 2..11, từ 12 là dải mẫu theo phạm vi; không được chồng dải, max_age NULL nghĩa không giới hạn. Giá 0 hợp lệ cho infant. Kiểm tra overlap trong transaction, không thể bằng CHECK một dòng.
- timeline.day_number > 0 và <= duration_days. meals có enum meal_type; số bữa/default mỗi ngày cần quyết định. Mỗi nhóm accommodation có tối đa một default; chưa có group ID ổn định để filtered UX, nên cần chốt nhóm trước.
- booking: tour_id bắt buộc; design_request_id NULL với tour thường, nếu có phải khớp tours.custom_request_id và đúng customer. Chụp tour_versions.tour_snapshot và child rows khi chốt; baseline thiếu booking→version/contract link, xem phần bổ sung. Không cập nhật booking từ tour sống.
- assignment: agency phải thuộc booking_agencies; guide phải là nhân sự của agency (thiếu liên kết workforce). assigned_guide_id đề xuất trỏ assignment, đồng thời assignment.booking_id/agency_id phải khớp participant. checked_by là users.id, phải là guide được phân công và chỉ điểm danh đầu chuyến.
- adjustment: new_total_price = previous_total_price + adjustment_amount >= 0; khóa booking khi tính; original_total_price giữ bất biến. Một transaction cập nhật current total và append adjustment. Backend tính tiền từ passenger tiers/options; phải chốt đơn vị chênh giá theo người/bữa/phòng/đêm trước khi dùng công thức; client không truyền total làm chuẩn.
- booking_agencies: các amount >= 0; đề xuất net_payout = final_amount - platform_fee, tổng final_amount khớp booking.total_price. Phí 8% là mặc định yêu cầu, chưa có cấu hình/lịch sử tỷ lệ. Nếu refund/offset phát sinh công thức phải sửa theo schema tài chính đã duyệt, không ép âm vào net_payout.
- payment_requests/transactions: amount > 0; booking_id ở transaction phải khớp booking của payment_request; đề xuất FK composite (payment_request_id,booking_id) → payment_requests(id,booking_id), cần UNIQUE(id,booking_id) bổ sung. Nhiều transaction/request là đề xuất để hỗ trợ thử lại, chưa hỗ trợ partial allocation/refund. Tổng successful không vượt amount; xử lý đồng thời trong transaction. Proof upload không tự đồng nghĩa paid.
- feedback chỉ customer sở hữu booking đã completed; complaint agency_id phải thuộc booking; admin_id đúng Admin. Check-in guide/agency phải thuộc booking của attraction. FK đơn không đủ, dùng composite FK khi khả thi và service transaction.

## Quy tắc xóa và lịch sử

| Dữ liệu | Quy tắc đề xuất |
|---|---|
| users/business_profiles | Suspend/inactive, không hard-delete khi có tham chiếu; baseline chưa có deleted_at/audit actor. Không xóa guide để xóa lịch sử |
| services/tours | Draft chưa tham chiếu có thể xóa có kiểm soát; đã công bố/được dùng thì archived/hidden. Sửa service không thay option/booking đã chốt |
| tour_versions | Append-only; rollback tạo version mới, không ghi đè version cũ; JSON snapshot đầy đủ children và giá |
| booking và child snapshots | Không cascade, không hard-delete; đổi sau chốt cần quy trình revision/approval. Baseline chưa lưu lịch sử sửa từng child/manifest |
| payment_requests | Chưa thu: cancel, không xóa; đã thu không sửa amount/due_date để viết lại lịch sử |
| transactions/adjustments/booking_agencies | Không hard-delete; thành công bất biến, correction cần bút toán mới có liên kết. Baseline chưa đủ ledger/payout history |
| checkins/incidents/complaints | Giữ evidence, thời điểm, actor; complaint.deleted_at chỉ ẩn, không xóa chứng cứ khi đang tranh chấp |
| feedback | Hide theo status; chưa có lịch sử chỉnh sửa hoặc deleted_at, không tuyên bố đã audit đầy đủ |

Thời hạn lưu PII/evidence, ẩn danh và quyền xóa cần chính sách được duyệt; chưa có retention policy trong nguồn. Không tự đặt số năm.

## Phần bổ sung cần xét duyệt riêng

Không mục nào ở đây đã có trong ERD. Không tạo bảng/migration ở Task 0.

| Nhu cầu | Bổ sung ứng viên, chưa chốt cấu trúc | Hệ quả nếu giữ nguyên baseline |
|---|---|---|
| Guide workforce | Quan hệ guide→agency; license/expiry/languages, trạng thái mời/kích hoạt tài khoản; cân nhắc cột hay mô hình nhân sự riêng | Không chứng minh guide thuộc agency chỉ từ assignment do client gửi |
| Business identity | Nếu nhiều tài khoản/doanh nghiệp: business membership + business-scoped FK; nếu 1:1 giữ users FK | Không hỗ trợ nhân viên nhiều tài khoản an toàn |
| Service resource | service_id tùy chọn trên tour/booking option, snapshot tên/giá/nhà cung cấp, thời điểm sử dụng | Chỉ có tên hotel/restaurant/location, không truy nguồn catalogue hoặc bảo đảm còn chỗ |
| Invitation/segment/net quote/handover | Mô hình gắn tour/booking, người mời/nhận, đoạn/ngày, đơn vị giá, quote version, acceptance, handover time/location/guide teams | request_agencies không biểu diễn co-host tour thường hay thỏa thuận đã ký |
| Contract và booking snapshot | Link booking→tour version, contract revision/document/hash/accepted_by/accepted_at, snapshot đầy đủ chính sách/giá/đơn vị | Chưa thể phát hành hợp đồng bất biến có bằng chứng chấp nhận |
| Refund/settlement/payout | Refund lifecycle, immutable allocation/commission snapshot, payout attempt/reference/idempotency + history/ledger | booking_agencies chỉ giữ tổng và trạng thái cuối, không đủ giao dịch tiền thật |
| Financial dedup | Idempotency key + scope + request hash + saved response, unique bank event/reference, verification/reconciliation actor/time/history | transaction_code không bảo vệ cùng bank event gửi mã khác hoặc replay sau timeout |
| Auth/email/token | Email verification/reset token hash+expiry+used_at, refresh-session/revocation nếu chọn refresh, Google subject mapping nếu chọn OAuth | is_verified/password_hash không lưu vòng đời token và logout thu hồi |
| GPS/report/timing | Latitude/longitude/accuracy/captured_at cho check-in, pickup window/timezone, wrap-up report/approval, itinerary times/emergency contacts | Chỉ ảnh+timestamp, không có GPS hoặc báo cáo kết thúc |
| Manifest import/audit | Import preview/error report/idempotency và lịch sử passenger edit; preview có thể stateless, commit cần consistency | Có thể CRUD từng participant nhưng chưa có audit/import retry bảo đảm |
| Concurrent edits | rowversion trên aggregate, snapshot atomicity, unique version; command audit actor/reason/state transitions | updated_at không đủ chống lost update; tour_versions chỉ audit tour |
| Platform config/subscription/chat | Config/version history cho bank/commission; subscription và chat nếu xác nhận thuộc phạm vi | Không có bảng tương ứng; không nhét vào policies/notes |

Các enum và transition đề xuất ở [state-machines.md](state-machines.md); câu hỏi ở [decisions.md](decisions.md), đối chiếu phạm vi ở [gaps.md](gaps.md).
'''
write('schema-proposal.md', schema)

# Enumerate every proposed FK with its exact evidence, including broken edges.
inventory += '''
## Phân loại bằng chứng cho từng FK ứng viên

Toàn bộ bảng dưới là **đích FK đề xuất**, không phải khai báo FK trong XML. Nhãn “cạnh đủ endpoint” chỉ xác nhận hai cột được nối, không xác nhận cardinality, NULL hoặc UNIQUE đúng. Các ID Q1/Q2 dẫn tới decisions. Cột không nằm trong bảng này không được đề xuất là FK ở Task 0.

| FK ứng viên | Đích đề xuất | Bằng chứng so với XML |
|---|---|---|
'''
for t in tables:
    for c in t['columns']:
        target = fk(t['name'], c['name'])
        if target == '—':
            continue
        endpoint = t['name'] + '.' + c['name']
        target_endpoint = target.split(' ', 1)[0]
        exact = [e for e in edges if {e['source'], e['target']} == {endpoint, target_endpoint}]
        touching = [e for e in edges if endpoint in (e['source'], e['target'])]
        if exact:
            evidence = 'Cạnh đủ endpoint: ' + ', '.join('`'+e['id']+'`' for e in exact) + '; marker vẫn cần đối chiếu'
        elif touching:
            evidence = 'Cạnh thiếu/sai endpoint: ' + ', '.join('`'+e['id']+'`' for e in touching) + '; FK đích chỉ suy luận'
        else:
            evidence = 'Không có cạnh tới đích này; suy luận từ tên/nghiệp vụ, chờ duyệt'
        inventory += f'| `{endpoint}` | {target} | {evidence} |\n'
write('erd-inventory.md', inventory)

if __name__ == '__main__':
    print(f'Generated inventory/schema proposal: {len(tables)} tables / {sum(len(t["columns"]) for t in tables)} column rows / {len(edges)} edges')
