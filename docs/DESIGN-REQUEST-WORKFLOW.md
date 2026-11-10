# Thiết kế tour riêng — luồng đang áp dụng

Customer gửi yêu cầu → Agency tiếp nhận hoặc từ chối kèm lý do → thiết kế mới hoặc clone tour của Agency → lưu nháp/hoàn tất nội bộ → bấm Chia sẻ → Customer xem và chat → Agency sửa/khôi phục rồi chia sẻ lại → Customer đặt tour → quy trình booking, hợp đồng, thanh toán dùng chung.

## Database và migration

Migration: `20261109192041_SimplifyPrivateTourDesignWorkflow` (kèm Designer và ModelSnapshot).

- Bỏ `tour_plan_proposals` và `tour_design_request_agencies`. Trước khi bỏ, migration chuyển trao đổi JSON, lời nhắn/JSON đề xuất và phản hồi cũ sang `chat_messages`.
- `tour_design_requests`: thêm `rejection_reason`, `responded_at`; bỏ `AgreedTourId`, `AgreedTourVersion`, `AgreedAt`. Giữ `SourceTourId`, `SourceSnapshotJson`, `InitialChangesJson` cho khách gửi yêu cầu từ tour mẫu. `Revision` vẫn dùng để kiểm soát cập nhật đồng thời.
- Trạng thái SQL: `pending`, `in_progress`, `rejected`, `cancelled`. DTO dùng `reviewing` cho đã tiếp nhận và `designed` khi có phiên bản chia sẻ, để tương thích các màn hình hiện tại; chúng không tạo thêm trạng thái database.
- `tours`: thêm `shared_version`, `cloned_from_tour_id`; bỏ `is_shared_to_customer`. Unique index có điều kiện bảo đảm mỗi yêu cầu tối đa một tour. FK `(id, shared_version)` tham chiếu `(tour_id, version)` của `tour_versions`.
- `tour_versions`: thay `SharedToCustomer` bằng `shared_at`, `shared_by`, thêm `restored_from_version`. Snapshot không sửa đè; đánh dấu chia sẻ chỉ cập nhật metadata.
- `chat_messages.design_request_id`: gắn tin nhắn với đúng yêu cầu; tái sử dụng hội thoại 1–1 giữa hai người.
- `bookings.tour_version`: ghi phiên bản khách thực sự đặt; booking được tạo từ snapshot đã chia sẻ. Dữ liệu booking cũ lấy phiên bản từ quotation đầu tiên nếu có.

Team pull code, tự cấu hình kết nối SQL trong file cấu hình local, sau đó chạy từ thư mục `backend`:

```powershell
dotnet ef database update --project src/TripOps.Data --startup-project src/TripOps.Api
```

Trước migration cần sao lưu database. Nếu một yêu cầu cũ đang có nhiều tour, migration dừng và báo rõ để xuất/gộp dữ liệu trước; không tự xóa các phương án cũ. Không sửa các migration lịch sử để né kiểm tra này. Down khôi phục cấu trúc cũ; để khôi phục nguyên dữ liệu bảng đã xóa cần bản backup (nội dung trao đổi đã được chuyển sang chat).

## API Agency

- `GET /api/v1/agency/tour-design-requests`: yêu cầu, lý do từ chối, phiên bản làm việc và phiên bản chia sẻ.
- `POST /api/v1/agency/tour-design-requests/{id}/action`: `{ "action": "review" }` hoặc `{ "action": "reject", "reason": "Không đủ nguồn lực tổ chức..." }`. Reason bắt buộc khi từ chối, tối đa 2000 ký tự.
- `POST /api/v1/agency/tour-design-requests/{id}/tours`: cấu hình tour mới; chỉ sau tiếp nhận và chỉ một tour/yêu cầu.
- `PUT /api/v1/agency/tour-design-requests/{id}/tour`: `{ "version": 6, "configuration": {...}, "complete": true, "reason": "..." }`. FE dùng API này để lưu nháp hoặc hoàn tất trong một giao dịch: tạo mới v1 (`version: null`), cập nhật chỉ tăng đúng một phiên bản. Không gọi thêm `/complete` sau lần lưu này.
- `POST /api/v1/agency/tour-design-requests/{id}/clone`: `{ "tourId": 123 }`; tour mẫu phải thuộc Agency và không phải tour riêng khác. Chỉ sao chép khách sạn/bữa ăn mặc định của từng chặng/loại bữa; loại các phương án thay thế, giữ nguyên tour nguồn.
- `PUT /api/v1/agency/tours/{tourId}`: sửa bản làm việc theo version hiện hành.
- `POST /api/v1/agency/tours/{tourId}/complete`: `{ "version": 3 }`; lưu hoàn tất, không chia sẻ.
- `POST /api/v1/agency/tour-design-requests/{id}/share`: `{ "version": 4 }`; chia sẻ đúng bản làm việc đã hoàn tất, không tăng số phiên bản. Bấm lại cùng bản không gửi thông báo trùng.
- `GET /api/v1/agency/tour-design-requests/{id}/history`: tất cả phiên bản nội bộ và đã chia sẻ.
- `POST /api/v1/agency/tours/{tourId}/versions/{number}/restore`: `{ "version": 4, "reason": "Khách muốn dùng lại bản trước" }`; tạo bản nháp mới. Hoàn tất rồi chia sẻ bằng nút riêng.
- `GET/POST /api/v1/agency/tour-design-requests/{id}/messages`: trao đổi theo yêu cầu; POST `{ "message": "..." }`, tối đa 2000 ký tự.

## API Customer và booking

- `GET /api/v1/tour-design-requests/{id}/tour` hoặc `/plans`: chỉ snapshot của phiên bản đang chia sẻ, không lấy bản nháp mới nhất.
- `GET /api/v1/tour-design-requests/{id}/history`: chỉ những phiên bản từng chia sẻ.
- `GET/POST /api/v1/tour-design-requests/{id}/messages`: chat với Agency của yêu cầu. UI tải lại mỗi 10 giây khi tab đang hiển thị, có nút Tải lại.
- `POST /api/v1/bookings`: payload thông thường, thêm `tourVersion` bắt buộc với tour riêng. BE kiểm tra khách sở hữu yêu cầu, đúng bản chia sẻ và chưa có booking đang xử lý; sai phiên bản trả 409.
- Bỏ API `/agree-plan`, `/proposals`, `/proposals/{proposalId}/reply`.
- Sau khi có booking, phương án nguồn không sửa/khôi phục/chia sẻ lại; điều phối dịch vụ và phụ thu thực hiện trên booking hiện có.

## Các nút trên giao diện

Agency: Tiếp nhận, Từ chối (hộp thoại nhập lý do), Thiết kế/Sửa tour, Clone tour, Chia sẻ phiên bản đã hoàn tất. Nút **Lịch sử / Khôi phục** nằm ngay cạnh **Sửa tour**, mở danh sách phiên bản và nút khôi phục ở từng bản cũ. Khôi phục tạo bản nháp mới; hoàn tất rồi chia sẻ riêng.

Customer: Xem hồ sơ, Xem chi tiết tour, Đặt tour phiên bản đang chia sẻ, Gửi trao đổi, xem lịch sử và nhắn Agency khi muốn khôi phục. Không còn form tự sửa phương án rồi gửi duyệt/báo giá.

Khách sạn mặc định hiển thị cả ở phương án chia sẻ và tab Lịch trình của trang chi tiết tour riêng, kèm số đêm, địa chỉ, ảnh/bản đồ nếu có. Giữ địa chỉ của nhà cung cấp riêng trong response Customer, loại giá vốn và thông tin liên hệ nội bộ; modal bài dịch vụ ẩn giá.

Một bản nháp mới không làm biến mất bản đang chia sẻ: Agency có thể đang sửa v4 trong khi khách xem và đặt v3. Khi chia sẻ v4, form đặt v3 đang mở phải tải lại trước khi gửi.

## Kiểm tra

Các test tích hợp dùng database SQLite cô lập: tiếp nhận/từ chối, phân quyền, một tour/yêu cầu, clone, lưu hoàn tất không tự chia sẻ, bản nháp không lộ ra Customer, booking từ bản chia sẻ, chặn phiên bản cũ sau khi chia sẻ lại, khôi phục thành bản mới, chat và quyền sở hữu, hợp đồng/payOS qua gateway giả lập. Có kiểm tra schema, ModelSnapshot và OpenAPI. Migration SQL được kiểm tra thêm trên bản phục hồi SQL Server riêng với dữ liệu trao đổi/đề xuất cũ rồi xóa database kiểm thử; không tạo booking thử trong database đang sử dụng.
