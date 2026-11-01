# Admin service moderation

Đăng nhập tại `POST /api/v1/auth/login` và gửi cookie `TripOps.Session` cho các request sau. Tất cả endpoint dưới đây yêu cầu tài khoản đang hoạt động với role `admin` của hệ thống hiện tại; không cần thêm role hoặc migration.

| Method | Endpoint | Nội dung |
| --- | --- | --- |
| GET | `/api/v1/admin/services` | Bộ lọc `status`, `category`, `search`, `page`, `pageSize` |
| GET | `/api/v1/admin/services/{id}` | Toàn bộ chi tiết bài đăng, mọi trạng thái |
| POST | `/api/v1/admin/services/{id}/approve` | Không cần body; duyệt từ `pending` hoặc `rejected` |
| POST | `/api/v1/admin/services/{id}/reject` | `{ "rejectionReason": "Ảnh không rõ ràng" }`; chỉ từ `pending` |
| POST | `/api/v1/admin/services/{id}/toggle-hide` | `{ "action": "hide", "hiddenReason": "Thông tin sai lệch" }` hoặc `{ "action": "unhide" }` |

Danh sách trả `{ items, total, page, pageSize }`. Mặc định `status=all`, `page=1`, `pageSize=20`; `pageSize` từ 1 đến 100. Trạng thái hỗ trợ lọc: `all`, `pending`, `approved`, `hidden`, `rejected`. Danh mục: `all`, `hotel`, `fnb`, `transportation`, `attraction`. Tìm kiếm theo tên dịch vụ, tên doanh nghiệp/tên Provider, tỉnh/thành và địa chỉ đầy đủ; không phân biệt hoa/thường. Sắp xếp ngày tạo mới nhất rồi ID giảm dần. Trang vượt tổng số kết quả trả `items: []`.

Chi tiết và mỗi phần tử danh sách sử dụng cùng DTO camelCase tương thích các trường có trong FE `Service`: ID dạng chuỗi, `providerName`, `image` và `thumbnailUrl`, các trường giá, sức chứa, địa chỉ, tọa độ, giờ hoạt động, `amenities`, `policies`, lý do kiểm duyệt, ngày tạo/cập nhật. Thông tin liên hệ có tại `provider: { id, businessName, hotline, email }` và `providerHotline`/`providerEmail`. Hotline và Email lấy từ tài khoản Provider; BusinessName lấy từ hồ sơ doanh nghiệp, dự phòng bằng tên tài khoản. `images` là mảng ảnh bổ sung, không lặp thumbnail. `amenities` và `policies` trả mảng chuỗi; chính sách dạng văn bản cũ được giữ trong một phần tử. Trường nullable chưa có dữ liệu trả `null`.

Các thao tác thành công trả `{ message, service }`. `hide` yêu cầu lý do không rỗng và chỉ áp dụng từ `approved`; `unhide` chỉ từ `hidden`. Duyệt/mở lại xóa lý do từ chối và lý do ẩn cũ; từ chối xóa lý do ẩn. Mọi chuyển trạng thái cập nhật `updated_at` bằng UTC. Điều kiện trạng thái được kiểm tra ngay trong câu lệnh UPDATE để tránh hai Admin ghi đè quyết định của nhau.

Lỗi sử dụng ProblemDetails: `400` dữ liệu/bộ lọc không hợp lệ, `401` chưa đăng nhập hoặc phiên không còn hợp lệ, `403` không phải Admin, `404` không có dịch vụ, `409` chuyển trạng thái không hợp lệ hoặc bài đăng vừa được xử lý. API công khai và danh sách dịch vụ cho Agency tiếp tục chỉ lấy `approved` từ Provider có tài khoản hoạt động và hồ sơ đã duyệt; khi ẩn/từ chối, bài đăng tự biến mất khỏi các API này.

FE đã nối API thật: `App.tsx` tải danh sách theo role, `ServicePostApproval` lọc đủ 4 trạng thái và gọi duyệt/từ chối/ẩn/mở lại; `ProviderDashboard` tạo/sửa/xóa bài của chính Provider. Khi lỗi lưu, form giữ nguyên dữ liệu và hiển thị lỗi. Nút xóa Admin không hiển thị vì không thuộc 5 API kiểm duyệt này.

## Provider đăng bài

`/api/v1/provider/services` yêu cầu role `provider`, tài khoản hoạt động và hồ sơ doanh nghiệp đã duyệt:

| Method | Endpoint | Nội dung |
| --- | --- | --- |
| GET | `/api/v1/provider/services` | Chỉ các bài của Provider đăng nhập, có bộ lọc/phân trang như Admin |
| GET | `/api/v1/provider/services/{id}` | Chi tiết bài của chính Provider |
| POST | `/api/v1/provider/services` | Tạo bài ở `pending`, trả `201` và DTO dịch vụ |
| PUT | `/api/v1/provider/services/{id}` | Sửa và gửi duyệt lại; bài bị Admin ẩn bị khóa, trả `409`, Provider cần tạo bài mới |
| DELETE | `/api/v1/provider/services/{id}` | Xóa bài chưa được tour/booking tham chiếu; đang dùng trả `409` |
| POST | `/api/v1/provider/services/images` | Multipart field `image`, PNG/JPEG tối đa 5 MB; trả `{ url }` |
| POST | `/api/v1/provider/services/{id}/availability` | `{ "isPaused": true }` để tạm ngừng, `false` để mở cung cấp lại |

Body tạo/sửa có các trường nội dung camelCase: `name`, `category`, `subCategory`, `description`, `price`, `priceFrom`, `priceTo`, `capacity`, `stars`, `province`, `ward`, `street`, `fullAddress`, `latitude`, `longitude`, `operatingHours`, `thumbnailUrl`, `images`, `amenities`, `policies`. `amenities`/`policies` là mảng chuỗi. `fullAddress` bỏ trống sẽ được ghép từ số nhà/đường, phường/xã, tỉnh/thành. ID Provider, rating, thời gian tạo và trạng thái kiểm duyệt được server quyết định. Ảnh chính lưu ở `thumbnail_url`, mảng bổ sung lưu JSON trong `images`, tiện nghi/chính sách lưu JSON. Giá không âm và `priceTo >= priceFrom`; độ dài dữ liệu được kiểm tra trước khi ghi SQL.

Ảnh mới dùng Cloudinary (`Storage:UseLocal=false`). FE chỉ tạo `blob:` URL để xem trước khi chọn file; bấm Lưu/Gửi duyệt mới gọi upload qua BE, nhận URL HTTPS rồi tạo/cập nhật bài đăng với URL đó. SQL không nhận `blob:` hoặc base64. Ảnh cũ tại `App_Data/uploads/services/{providerId}` và URL `/api/v1/files/services/{owner}/{name}` vẫn giữ nguyên để đọc; không tự di chuyển hay xóa khi đổi cấu hình. Khóa Cloudinary chỉ cấu hình ở BE bằng User Secrets hoặc biến môi trường.

Migration `AddServiceAvailability` thêm `services.is_paused BIT NOT NULL DEFAULT 0`. DTO trả `isPaused`; danh sách Admin/Provider hỗ trợ bộ lọc `isPaused=true/false`. Provider tạm ngừng/mở lại chỉ đổi cờ này, không đổi trạng thái hoặc lý do Admin kiểm duyệt; khi bài bị Admin ẩn (`hidden`), Provider không được sửa hoặc đổi trạng thái cung cấp (`409`). Admin duyệt/mở lại không xóa cờ Provider tạm ngừng. Sửa bài giữ nguyên cờ. Bài chỉ đủ điều kiện công khai khi được duyệt, Provider đủ điều kiện và `isPaused=false`.

Provider thấy nhãn **Admin đã ẩn**, bộ lọc riêng và nguyên văn `hiddenReason` trong danh sách/trang chi tiết. Bài `hidden` không có nút sửa hay tạm ngừng/mở cung cấp; muốn đăng lại, Provider tạo bài mới ở `pending` để Admin thẩm định.

FE có nút **Tạm ngừng / Mở cung cấp lại**, nhãn trạng thái và bộ lọc **Tạm ngừng** ở Quản lý Dịch vụ, cùng nút ở trang chi tiết. Dịch vụ tạm ngừng không nằm trong catalogue, không được gắn thêm vào tour và không dùng để tạo booking mới. Tour/booking đã lưu giữ nguyên dữ liệu và lịch sử.
