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

DELETE `/api/v1/agency/tour-design-requests/{id}/co-hosts/{agencyId}` thu hồi lời mời. Thêm `?removeContent=true` để gỡ đối tác đã nhận kèm hoạt động, khách sạn, nhà hàng và bảng giá của họ trong **bản đang làm việc**. Chỉ Agency chủ trì được làm, không gỡ Agency chủ trì, không thay đổi khi đã có booking còn hiệu lực. Membership được đánh dấu `cancelled` để thu hồi quyền truy cập và có thể mời lại.

Các phiên bản khác vẫn được lưu để xem lại. Nếu bản Customer đang xem chứa đối tác bị gỡ thì bỏ `shared_version`; Agency cần kiểm tra và chọn lại phương án hợp lệ. Phiên bản còn chứa đối tác chưa chấp nhận/đã rời liên minh không được hiển thị cho Customer. Chỉnh sửa và lưu lại sẽ loại nội dung của thành viên không còn tham gia khỏi bản đó. Không sửa booking đã phát sinh.

Migration `20261111115754_RemoveDesignRequestBusinessContacts` xóa đúng hai cột `tour_design_requests.business_email` và `business_phone`. Giữ `business_name`, `contact_name`, `contact_email`, `contact_phone`. Entity, DTO và ba tài liệu DBML đã đồng bộ. Team pull code rồi chạy lệnh `dotnet ef database update --project src/TripOps.Data --startup-project src/TripOps.Api` trong `backend`. Down migration chỉ tạo lại cột nullable, không khôi phục dữ liệu đã xóa.
