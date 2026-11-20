# Các phương án tour thiết kế riêng

Chỉ tour thiết kế riêng (`is_request = true`, gắn yêu cầu thiết kế) dùng `tour_versions`. Tour đăng bán thông thường lưu cấu hình hiện tại, không tạo version mới. Dữ liệu lịch sử cũ được giữ để tương thích booking đã có.

- Lần lưu đầu tạo tour và **v1**.
- **Lưu**: cập nhật đúng version đang mở, kể cả version đã chia sẻ. Không tạo dòng mới. Nếu khách đang xem chính version đó, lần tải tiếp theo sẽ thấy nội dung vừa sửa.
- **Lưu với phiên bản mới**: lưu nội dung thành một dòng mới, số version = số lớn nhất hiện có + 1. Những phương án khác được giữ nguyên. Lưu từ v1 khi đã có v2 sẽ tạo v3.
- **Phương án tour**: ô chọn trong bảng cập nhật ngay phiên bản Customer được xem. Nút Xem chi tiết/Chỉnh sửa trong tab Các phiên bản chỉ mở bản đó, không đổi lựa chọn của Customer.
- **Chọn vN cho khách**: kiểm tra đầy đủ cấu hình rồi đặt `tours.shared_version = N`. Không tạo version mới, không khôi phục hay sao chép vào version khác. Customer xem và đặt đúng phương án được chọn.
- Chia sẻ lại v1 sau v2 giữ nguyên hai dòng v1/v2. API khôi phục cũ đã bỏ.
- Đối tác chỉ lưu nội dung thuộc chặng của mình trên phương án làm việc chung. Chỉ Agency chủ trì tạo version mới và chia sẻ.
- Yêu cầu đã có booking còn hiệu lực không được sửa phương án nguồn; thay đổi dịch vụ trên booking.

## API và chống ghi đè

`GET /api/v1/agency/tour-design-requests/{id}/versions/{number}` lấy đúng phương án đã chọn cùng revision hiện tại.

`PUT /api/v1/agency/tour-design-requests/{id}/tour` nhận `revision`, `version`, `configuration`, `createNewVersion` (mặc định false). Lưu thông thường không đòi hỏi bước Hoàn tất riêng. Chia sẻ kiểm tra cấu hình đầy đủ.

`POST /api/v1/agency/tour-design-requests/{id}/share` nhận `revision` và `version` muốn chia sẻ.

`tours.revision` tăng khi nội dung hoặc version chia sẻ thay đổi, độc lập số version. Revision cũ trả 409. Booking tour riêng gửi cả `tourVersion` và `tourRevision` từ dữ liệu Customer đã xem; nếu Agency sửa nội dung/chia sẻ version khác thì Customer phải tải lại trước khi đặt.

`tours.configuration_data` là cấu hình của version đang làm việc. `tour_versions.tour_snapshot` lưu riêng đầy đủ mỗi phương án. `has_draft_changes` còn lại để tương thích mô hình nháp cũ, các lần lưu hiện tại đặt false.

`bookings.tour_configuration_data` giữ cấu hình và giá tại thời điểm đặt, độc lập với tour nguồn; không trả nguyên cấu hình nội bộ này cho Customer.

## Database cho thành viên

Thay đổi từ mô hình nháp cũ sang các phương án chỉnh sửa/chia sẻ trực tiếp không thêm bảng/cột hoặc migration mới. Migration nền `20261110194257_SeparateDesignDraftsFromTourVersions` trước đó vẫn cần cho thành viên chưa cập nhật:

```powershell
dotnet ef database update --project src/TripOps.Data --startup-project src/TripOps.Api
```

Chạy từ thư mục `backend` sau khi cấu hình SQL Server trên máy. Migration nền thêm cấu hình tour, revision, cờ tương thích và cấu hình booking; không xóa tour, booking hay version cũ.


## Quản lý phương án và liên minh (11/11/2026)

Ô chọn phiên bản gọi API `/share` trực tiếp, không cần bước bấm Chia sẻ riêng. GET `/versions/{number}` dùng để xem trước/chỉnh sửa và không đổi `shared_version`.

Thành viên từng phương án được lưu trong `tour_version_agencies`. `tour_design_request_agencies` giữ tư cách hợp tác toàn yêu cầu và trạng thái lưu trữ riêng của mỗi Agency.

- `GET .../co-hosts?version=N` và `GET .../working-tour?version=N` đọc đúng liên minh/cấu hình vN.
- Lời mời và phản hồi gửi `version` trong body. Đối tác chỉ truy cập/sửa version họ đã chấp nhận; lời mời đang chờ chỉ xem thông tin mời.
- `DELETE .../co-hosts/{agencyId}?version=N&removeContent=true` bỏ đối tác, nội dung và bảng giá **chỉ trong vN**. Đánh dấu membership của bản đó `excluded`, không hủy tư cách ở các bản khác. Nếu khách đang xem vN thì bỏ lựa chọn; Agency kiểm tra và chọn lại phiên bản.
- `DELETE .../co-hosts/{agencyId}?terminate=true` chấm dứt hợp tác **toàn yêu cầu**. Giữ nguyên cấu hình lịch sử nhưng thu hồi quyền đối tác. Bản còn họ không được chọn/booking cho đến khi Agency mời lại đúng bản và đối tác nhận lời. Không tự tạo version khi mời lại.
- Lưu version mới sao chép danh sách thành viên của version nguồn. Sau đó có thể bỏ B khỏi v2, v1 vẫn gồm A+B và có thể chọn lại nguyên bản.
- Khi có booking còn hiệu lực, khóa sửa tour nguồn, lời mời và thay đổi liên minh. Chỉnh dịch vụ tiếp trên booking, không sửa cấu hình/tiền của booking từ phương án nguồn.

## Đóng, lưu trữ và hoàn thành yêu cầu

`POST /api/v1/agency/tour-design-requests/{id}/lifecycle` với `{ "action": "archive|unarchive|close|reopen", "reason": "..." }`.

- `archive/unarchive`: ẩn/hiện trong công việc riêng của Agency. Customer vẫn xem và booking; không thay `shared_version` hay `revision` của tour.
- `close`: chỉ chủ trì, lý do bắt buộc tối đa 2000 ký tự. Customer xem lý do và phương án cũ nhưng không booking mới/nhắn tin trên yêu cầu đã đóng. Nội dung nguồn cũng khóa chỉnh sửa.
- `reopen`: chỉ chủ trì, chỉ khi không có booking còn hiệu lực; tiếp tục thiết kế và đặt tour. Tăng revision để yêu cầu tải lại phương án cũ.
- Booking thành công ghi `tour_design_requests.status = booked`, chuyển yêu cầu sang tab **Đã đặt tour**, trả `bookingId`. Nếu booking hủy/từ chối, danh sách hiển thị **Đã đóng** và yêu cầu Agency chủ động mở lại trước khi khách đặt lần nữa.
- Đã đóng/từ chối/hủy và Lưu trữ có tab riêng. Hoạt động lưu trữ không được gửi sang Customer.

## Migration mới và kiểm tra thủ công

`20261111125921_VersionScopedAllianceAndDesignLifecycle` thêm `tour_version_agencies`, hai cột `tour_design_requests.closed_at/close_reason` và `tour_design_request_agencies.archived_at`. Backfill thành viên từ từng snapshot cũ; lời mời chưa nằm trong snapshot chỉ gắn bản đang làm việc. Yêu cầu đã có booking chuyển sang booked. Không xóa tour, version hay booking. Down sẽ bỏ dữ liệu membership mới, thông tin đóng/lưu trữ và chuyển booked/closed về in_progress.

Hướng dẫn từng tình huống và kết quả mong đợi: [DESIGN-LIFECYCLE-TEST.md](DESIGN-LIFECYCLE-TEST.md).

Migration `20261111115754_RemoveDesignRequestBusinessContacts` xóa đúng hai cột `tour_design_requests.business_email` và `business_phone`. Giữ `business_name`, `contact_name`, `contact_email`, `contact_phone`. Entity, DTO và ba tài liệu DBML đã đồng bộ. Team pull code rồi chạy lệnh `dotnet ef database update --project src/TripOps.Data --startup-project src/TripOps.Api` trong `backend`. Down migration chỉ tạo lại cột nullable, không khôi phục dữ liệu đã xóa.
