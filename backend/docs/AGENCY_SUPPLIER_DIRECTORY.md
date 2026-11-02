# Danh bạ nhà cung cấp riêng của Agency

Trang **Danh bạ nhà cung cấp** dùng dữ liệu thật trong `agency_suppliers`. Đây là khách sạn/nhà hàng do Agency tự lưu, không phải bài đăng của Provider trong `services`.

## API

Tất cả API yêu cầu cookie `TripOps.Session`, role `agency` và hồ sơ doanh nghiệp đã được duyệt. Chủ sở hữu được lấy từ tài khoản đăng nhập.

| Method | Đường dẫn | Kết quả |
| --- | --- | --- |
| GET | `/api/v1/agency/suppliers?type=HOTEL&search=...` | Các mục ACTIVE của Agency; bỏ `type` để lấy cả HOTEL và RESTAURANT. Tìm theo tên, khu vực, địa chỉ, người liên hệ, điện thoại, email. |
| GET | `/api/v1/agency/suppliers/{id}` | Chi tiết một mục ACTIVE thuộc Agency. |
| POST | `/api/v1/agency/suppliers` | Lưu khách sạn/nhà hàng vào danh bạ, dùng từ form tạo tour. |
| PUT | `/api/v1/agency/suppliers/{id}` | Cập nhật một mục chưa xóa; không cập nhật thông tin đã lưu trong tour. |
| DELETE | `/api/v1/agency/suppliers/{id}` | Trả 204 và chuyển `status` sang `ARCHIVED`, cập nhật `updated_at`. Gọi lại với cùng mục của chính Agency vẫn trả 204. |

GET chi tiết/PUT một mục đã xóa trả 404. Agency khác gọi GET chi tiết/PUT/DELETE trả 404. Tài khoản không đúng quyền trả 403; chưa đăng nhập trả 401.

Không xóa vật lý bản ghi, không thêm cột/bảng và không cần migration. Các khóa ngoại `agency_supplier_id`, `supplier_snapshot` trong `tour_hotels`/`tour_restaurants` và lịch sử `tour_versions` được giữ nguyên. Tour đã lưu vẫn đọc và chỉnh sửa được với thông tin cũ.

## FE

- Trang danh bạ tải GET danh sách, lọc/tìm kiếm không dấu trên danh sách đầy đủ, gọi GET chi tiết khi mở hồ sơ và DELETE sau xác nhận.
- Xóa thành công mới gỡ hàng khỏi bảng. Khi lỗi, hộp xác nhận giữ nguyên để thử lại; có trạng thái đang tải và thông báo lỗi khi lấy danh sách/chi tiết.
- Form tạo tour tải danh bạ ACTIVE khi mở và khi cửa sổ lấy lại focus, nên mục đã xóa không còn trong dropdown danh bạ. Các lựa chọn đã được lưu trong tour cũ vẫn giữ nguyên.
- Đơn vị giá lưu trú hiển thị `/ người / đêm`, ẩm thực `/ người / bữa`. Giá là tham khảo.

## Kiểm thử

`AgencySupplierTourTests.cs` kiểm tra phân quyền, quyền sở hữu, xem chi tiết, tìm kiếm, xóa cả khách sạn/nhà hàng đang liên kết tour, giữ snapshot/lịch sử và việc đọc/sửa tour cũ sau khi xóa. Có kiểm tra danh sách hơn 100 mục.

Kịch bản lưu trữ/xóa danh bạ cũng chạy trên SQL Server trong test opt-in tạo database tạm `TripOps_Test_<guid>` và dọn sau khi chạy:

```powershell
$env:TRIPOPS_TEST_SQLSERVER = 'Server=.\SQLEXPRESS;Integrated Security=true;TrustServerCertificate=true'
dotnet test backend/tests/TripOps.Tests/TripOps.Tests.csproj
```
