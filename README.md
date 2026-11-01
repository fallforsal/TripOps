# TripOps

Nền tảng tour đoàn dùng React/TypeScript/Vite, ASP.NET Core .NET 10, EF Core và SQL Server.

Bản dựng lại ngày 01/11/2026 sử dụng UI từ `D:/SEP/TripOps_FE_new`. Schema chuẩn là [backend/database.dbml](backend/database.dbml): **36 bảng, 453 cột**. Database cũ đã được reset theo yêu cầu; chỉ còn migration khởi tạo `InitialSchema`, không nâng cấp dữ liệu từ schema trước.

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
- Booking, tính giá ở BE, hành khách/ghi chú xếp phòng và ăn uống, lựa chọn dịch vụ đã cấu hình, lưu snapshot lịch trình/dịch vụ đã chốt.
- Khách xem/hủy booking; Agency xác nhận/từ chối và gán/gỡ HDV.
- HDV chỉ xem/thao tác booking được giao; điểm danh có người thực hiện/thời gian, check-in điểm tham quan, báo sự cố, bắt đầu/hoàn tất tour.

## Upload và thanh toán Development

`Storage:UseLocal` được bật trong `appsettings.Development.json`. Ảnh lưu ở `backend/src/TripOps.Api/App_Data/uploads`, đã Git ignore. Ảnh tour công khai; giấy phép chỉ chủ hồ sơ và Admin đọc được qua API.

Khi dùng Cloudinary, tắt `Storage:UseLocal` và đặt `Cloudinary:CloudName`, `Cloudinary:ApiKey`, `Cloudinary:ApiSecret` bằng user secrets/biến môi trường. Không đưa khóa vào Git. Chế độ lưu cục bộ chỉ hoạt động trong Development.

Thanh toán là **mô phỏng Development**: ghi transaction `DEMO`, cập nhật tiền cọc/trạng thái; không thực hiện hoặc xác minh chuyển khoản ngân hàng. Endpoint mô phỏng bị chặn trong Production.

## Phạm vi còn lại

UI mới được giữ, nhưng thao tác chưa có API trong đợt này báo chưa hỗ trợ thay vì ghi giả bằng setState: Provider tự quản lý/báo giá đoàn, thiết kế tour riêng, đồng tổ chức đầy đủ, hoàn tiền/quyết toán, chat/khiếu nại/đánh giá và AI.

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
