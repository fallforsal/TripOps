# TripOps

Nền tảng tour đoàn dùng React/TypeScript/Vite, ASP.NET Core .NET 10, EF Core và SQL Server.

Bản dựng lại ngày 01/11/2026 sử dụng UI từ `D:/SEP/TripOps_FE_new`. Schema chuẩn là [backend/database.dbml](backend/database.dbml): **36 bảng, 458 cột**. Database cũ đã được reset theo yêu cầu với migration khởi tạo `InitialSchema`; `AddServiceMetadata` bổ sung 4 cột nullable và `AddServiceAvailability` thêm cờ Provider tạm ngừng cung cấp, giữ nguyên dữ liệu hiện có.

## Chạy dự án

Chạy **run.bat** tại thư mục gốc để mở BE và FE trong hai cửa sổ riêng.

- FE: http://localhost:5174
- BE: http://localhost:5080
- Swagger: http://localhost:5080/swagger
- SQL Server: `.\SQLEXPRESS`, database `TripOps`, Windows Authentication.

Cổng 5173 thuộc một project khác trên máy, vì vậy workspace này dùng 5174. FE gọi `/api` qua Vite proxy; xác thực bằng cookie HttpOnly, không dùng token mock.

Chạy riêng BE:

```powershell
dotnet run --project backend/src/TripOps.Api -p:UseAppHost=false --launch-profile http
```

Chạy riêng FE:

```powershell
cd frontend
npm ci
npm run dev
```

## Tài khoản test

Mật khẩu chung: **12345678**.

| Vai trò | Email |
|---|---|
| Admin | admin@tripops.test |
| Agency | agency@tripops.test |
| Provider | provider@tripops.test |
| Khách hàng | customer@tripops.test |

Chỉ giữ 4 tài khoản trên; Agency và Provider đã duyệt. Có 1 dịch vụ khách sạn và 1 tour Đà Lạt 3 ngày 2 đêm. Không có tài khoản HDV, booking hay giao dịch test. Tour mẫu chỉ cấu hình dịch vụ lưu trú vì dữ liệu hiện chỉ có 1 service khách sạn.

## Các luồng có API thật

- Đăng ký Customer/Agency/Provider, đăng nhập/đăng xuất, giữ phiên và phân quyền. HDV không được tự đăng ký vai trò qua API công khai.
- Nộp/gửi lại hồ sơ doanh nghiệp, upload PNG/JPEG; Admin xem/duyệt/từ chối Agency/Provider.
- Tour: tạo/sửa nháp, hoàn tất giữ ẩn, công khai/tạm ẩn, lưu trữ, clone, lịch sử/khôi phục và kiểm tra xung đột phiên bản.
- Chọn ăn/ở từ dịch vụ Provider đã duyệt; giữ `service_id`, mặc định/thay thế, phụ thu và giờ bữa ăn khi lưu/đọc lại.
- Tìm kiếm/lọc/phân trang, chi tiết tour công khai.
- Booking, tính giá ở BE, hành khách/ghi chú xếp phòng và ăn uống, lựa chọn dịch vụ đã cấu hình, lưu bản sao lịch trình/dịch vụ lúc đặt.
- Khách xem/hủy booking; Agency xác nhận/từ chối và gán/gỡ HDV.
- HDV chỉ xem/thao tác booking được giao; điểm danh có người thực hiện/thời gian, check-in điểm tham quan, báo sự cố, bắt đầu/hoàn tất tour.

### Tạm gỡ luồng phương án và snapshot hợp đồng (02/11/2026)

Đã gỡ chức năng gửi/chấp nhận/yêu cầu sửa phương án, lịch sử phiên bản hợp đồng, hợp đồng từ bản đã chốt và thông báo phương án ở Customer/Agency. Booking và duyệt đơn trở về luồng trước PR #15; không tự chốt yêu cầu ban đầu thành phiên bản hợp đồng như PR #17. Các ghi chú hành khách, bản sao lịch trình/dịch vụ của booking, header và sửa lỗi điều hướng vẫn được giữ.

Hai bảng `booking_snapshots`, `booking_proposal_events` cùng mapping và các migration đã phát hành được giữ để bảo toàn dữ liệu cũ và tính nhất quán EF. Luồng booking hiện tại không đọc/ghi chúng và không còn các API phương án/thông báo. Không cần chạy migration mới, rollback database hoặc xóa bảng khi dùng bản hoàn tác này.

Code đầy đủ vẫn nằm trên nhánh `feat/customer-payment` và các nhánh snapshot. Khi muốn đưa trở lại, hoàn tác commit gỡ tính năng hoặc tạo commit áp dụng lại rõ ràng; chỉ merge nhánh cũ có thể không khôi phục các thay đổi đã bị revert. Phần lịch thanh toán mới trên nhánh payment chưa được đưa vào bản hoàn tác này.

## Upload và thanh toán Development

`Storage:UseLocal=false` trong `appsettings.Development.json`: ảnh mới được lưu trên Cloudinary. Khi chọn file ở form dịch vụ/tour, FE tạo preview local trong trình duyệt; chỉ khi bấm Lưu/Gửi duyệt mới upload qua BE rồi ghi URL Cloudinary vào SQL. Nếu lưu lỗi, form giữ nguyên nội dung và tái sử dụng các ảnh đã upload thành công khi thử lại.

Đặt `Cloudinary:CloudName`, `Cloudinary:ApiKey`, `Cloudinary:ApiSecret` bằng user secrets/biến môi trường rồi khởi động lại BE. Không đưa khóa vào Git hoặc FE. Từ thư mục gốc:

Các giá trị Cloudinary trong `appsettings.Development.json` được để trống. Mỗi thành viên cấu hình User Secrets trên máy mình; User Secrets không được đồng bộ khi pull code. Khi khóa đã bị lộ, người quản lý Cloudinary cần thu hồi/đổi khóa và cấp lại qua kênh riêng.

```powershell
dotnet user-secrets set "Cloudinary:CloudName" "<cloud-name>" --project backend/src/TripOps.Api
dotnet user-secrets set "Cloudinary:ApiKey" "<api-key>" --project backend/src/TripOps.Api
dotnet user-secrets set "Cloudinary:ApiSecret" "<api-secret>" --project backend/src/TripOps.Api
```

Ảnh cũ trong `backend/src/TripOps.Api/App_Data/uploads` vẫn đọc được qua đường dẫn đã lưu; giữ thư mục này cho đến khi chuyển ảnh cũ sang Cloudinary. Việc đổi cấu hình không tự chuyển hay xóa các ảnh cũ. Giấy phép mới dùng chế độ authenticated của Cloudinary. API upload trả `503` nếu thiếu cấu hình Cloudinary.

Thanh toán là **mô phỏng Development**: ghi transaction `DEMO`, cập nhật tiền cọc/trạng thái; không thực hiện hoặc xác minh chuyển khoản ngân hàng. Endpoint mô phỏng bị chặn trong Production.

## Phạm vi còn lại

Provider đã có API tạo/sửa/xóa, tải ảnh và xem bài của mình tại `/api/v1/provider/services`; Admin có 5 API danh sách, chi tiết, duyệt, từ chối và ẩn/mở lại tại `/api/v1/admin/services`. FE đã nối các API này; xem [hướng dẫn Service Moderation](backend/docs/service-moderation.md).

UI mới được giữ, nhưng thao tác chưa có API trong đợt này báo chưa hỗ trợ thay vì ghi giả bằng setState: Provider báo giá đoàn, thiết kế tour riêng, đồng tổ chức đầy đủ, hoàn tiền/quyết toán, chat/khiếu nại/đánh giá và AI.

Sửa hành khách sau đặt hỗ trợ hồ sơ/ghi chú của danh sách đã chốt. Thêm/bớt khách hoặc đổi ngày sinh cần luồng chốt lại giá riêng. Chưa có API quản lý đầy đủ nghề nghiệp HDV; gán HDV dùng tài khoản HDV thuộc Agency trong database.

## Tạo database mới trên máy khác

Trên database trống:

```powershell
dotnet run --project backend/src/TripOps.Api --launch-profile http -- --SeedDemo true
```

Lệnh tạo schema qua migration khởi tạo mới rồi nạp demo; yêu cầu database chưa có người dùng. Không chạy lại seed trên database đang sử dụng và không dùng migration cũ để nâng cấp schema trước. Cờ `--ClearDemoData true` sẽ xóa dữ liệu nghiệp vụ và nạp lại bộ mẫu tối giản; chỉ dùng khi chủ động muốn dọn toàn bộ dữ liệu.

## Kiểm tra

```powershell
dotnet test backend/TripOps.sln
cd frontend
npm run typecheck
npm test
npm run build
```

Xem [biên bản dựng lại](docs/architecture/rebuild-20261101.md) về bản sao lưu và kết quả kiểm chứng.
