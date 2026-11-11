# Chia sẻ dữ liệu dịch vụ cho team

## Thêm 5 HDV mẫu cho Agency

Chạy khi BE đã hoạt động, có Agency `agency@tripops.test`:

```powershell
pwsh -File backend/scripts/seed-agency-guides.ps1
```

Tạo qua API để BE băm mật khẩu và lưu đồng thời `users` + `guide_profiles`. Có 5 tài khoản `guide01@tripops.test` đến `guide05@tripops.test`, mật khẩu mẫu `12345678`; toàn bộ hồ sơ và điện thoại là dữ liệu giả lập. Các tài khoản mới hoạt động và chưa có lịch phân công. Giữ nguyên HDV cũ, bỏ qua email đã có trong danh sách của Agency khi chạy lại; không reset mật khẩu hay sửa hồ sơ cũ. Có thể truyền `-ApiBaseUrl`, `-AgencyEmail`, `-AgencyPassword`, `-GuidePassword` cho môi trường khác. Không cần migration.

## Danh bạ riêng của Agency: 30 cơ sở Đà Lạt

`seed-dalat-agency-suppliers-30.sql` thêm **15 khách sạn và 15 nhà hàng** vào `agency_suppliers` của Agency `agency@tripops.test`. Đây là danh bạ riêng, không thêm bài vào `services`. Xem [nguồn từng cơ sở và cách chạy](dalat-agency-suppliers-30.sources.md).

Tên, địa chỉ và liên hệ tham khảo nguồn công khai; giá là **giá mẫu giả lập để kiểm thử**, lưu trú theo người/đêm, nhà hàng theo người/bữa, có ghi chú rõ trong từng mục. Khi dùng thực tế cần thay bằng báo giá đã xác nhận. Script không tạo trùng khi chạy lại, chỉ bổ sung giá còn NULL của các mục ACTIVE thuộc bộ dữ liệu này; giữ giá đã có và mục ARCHIVED. Không cần migration mới.

## Bộ bổ sung 50 dịch vụ Đà Lạt

`seed-dalat-50-services.sql` thêm **22 lưu trú, 22 ẩm thực, 3 phương tiện và 3 điểm tham quan** vào Provider demo. Xem [nguồn tham khảo và cách chạy](dalat-50-services.sources.md). Tên/địa chỉ tham khảo web; giá và sức chứa giả lập để test; ảnh clone từ một dịch vụ hiện có của Provider. Bài được tạo ở trạng thái `Approved`, `is_paused = 0` để thử tìm kiếm và ráp tour. Chạy lại không tạo bài trùng, không sửa bài đang có.

## Bộ 5 dịch vụ xuất trước đó

`seed-services.sql` chứa 5 dịch vụ được xuất từ database TripOps hiện tại, gồm mô tả, địa chỉ, giá, sức chứa, tiện ích/chính sách JSON, ảnh đại diện, bộ sưu tập ảnh, trạng thái và thời gian tạo/cập nhật. File chỉ thêm bài chưa có; không ghi đè hoặc xóa dữ liệu sẵn có.

## Cách chạy trên máy mỗi thành viên

1. Pull code có migration và thư mục `backend/scripts`.
2. Cấu hình chuỗi kết nối đúng máy rồi chạy từ thư mục gốc `TripOps`:

   ```powershell
   dotnet ef database update --project backend/src/TripOps.Data --startup-project backend/src/TripOps.Api
   ```

3. Database cần có Provider `provider@tripops.test`, tài khoản hoạt động và hồ sơ doanh nghiệp đã duyệt. Có thể dùng tài khoản demo đã tạo, hoặc đổi `@ProviderEmail1` ở đầu SQL sang email Provider trên máy mình. Script tự lấy GUID theo email, không yêu cầu GUID giống máy xuất dữ liệu.
4. Mở SQL Server Management Studio, chọn database `TripOps`, mở `seed-services.sql` và Execute toàn bộ file. Hoặc chạy từ thư mục gốc:

   ```powershell
   sqlcmd -S '.\SQLEXPRESS' -E -C -b -f 65001 -d TripOps -i backend/scripts/seed-services.sql
   ```

   Thay server/database nếu máy dùng tên khác. Kết quả trả `inserted_count` và `skipped_existing_count`.

Chạy lại không chèn thêm bài trùng theo Provider + tên dịch vụ + danh mục. Nếu máy đã có bài cùng khóa này, nội dung cũ được giữ nguyên. ID dịch vụ được SQL Server tự tạo nên có thể khác ID trên máy xuất dữ liệu; file này chỉ seed dịch vụ, không nhập tour hoặc booking có tham chiếu ID cũ.

Tất cả ảnh của 5 dịch vụ hiện dùng URL Cloudinary, không cần chép thư mục ảnh local. Các URL dùng chung ảnh trong tài khoản Cloudinary nguồn; giữ các ảnh đó để các máy thành viên tiếp tục xem được. Không cần chia sẻ API Secret để hiển thị các ảnh công khai này; thành viên cần cấu hình Cloudinary của mình nếu muốn tải ảnh mới lên.

File SQL không chứa tài khoản/mật khẩu, API key hay API secret. Việc xác minh script được thực hiện hai lần trên bảng tạm: lần đầu thêm 5 bài, lần sau bỏ qua cả 5 và đối chiếu toàn bộ dữ liệu xuất với nguồn. Database nghiệp vụ không bị thay đổi khi xác minh.


## Seed tour GPS khởi hành hôm nay cho Flutter Guide

Lệnh **chỉ chạy trong ASPNETCORE_ENVIRONMENT=Development**, không xóa hay
ghi đè dữ liệu hiện có, và tự dùng **ngày Việt Nam (UTC+7)** tại lúc chạy.
Chạy lại trong cùng ngày không tạo trùng hay reset trạng thái điểm danh/check-in.
Qua ngày mới sẽ tạo một booking mới với mã chứa ngày (tour cũng được đánh mã theo ngày).

**Điều kiện:** SQL Server development đã được cấu hình; có backup; backend đã
checkout nhánh `hiep` và cập nhật migration GPS `20261110150000_AddGuideLocationGeofencing`.
Từ thư mục gốc repo:

```powershell
git switch hiep
git pull --ff-only origin hiep
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --project backend/src/TripOps.Api -- --SeedGuideGpsDemo=true
Remove-Item Env:ASPNETCORE_ENVIRONMENT
```

Lệnh trên **chỉ seed rồi kết thúc**, không mở API. Để chạy backend sau đó:

```powershell
dotnet run --project backend/src/TripOps.Api --urls http://0.0.0.0:5080
```

Nếu `--SeedGuideGpsDemo=true` không được đọc từ đối số, dùng biến cấu hình
chuẩn của .NET:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:SeedGuideGpsDemo = "true"
dotnet run --project backend/src/TripOps.Api
Remove-Item Env:SeedGuideGpsDemo
Remove-Item Env:ASPNETCORE_ENVIRONMENT
```

**Tài khoản thử nghiệm mới**, chỉ sinh khi email chưa tồn tại:
- HDV: `guide-gps-demo@tripops.test`
- Mật khẩu: `DemoGps#2026!`
- Agency: `agency-gps-demo@tripops.test`, cùng mật khẩu
- Customer: `customer-gps-demo@tripops.test`, cùng mật khẩu

**Lưu ý:** không reset mật khẩu tài khoản demo nếu đã tồn tại.

Tour tên `[TEST GPS] Tour Vũng Tàu - DD/MM/YYYY`, gồm 1 ngày, 4 hành khách
`Pending` có số điện thoại thử nghiệm, 3 điểm GPS có bán kính **300m**.
Booking `Confirmed`, đã phân công HDV demo, vẫn chưa bắt đầu hay check-in.
Mã booking `GPS-TEST-YYYYMMDD` và mã tour `GPSDEMO-YYYYMMDD`.

| Thứ tự | Tên | Latitude | Longitude | Lệnh Android Emulator (đã khởi động) |
|---|---|---|---|---|
| 1 | Điểm A | 10.342000 | 107.082000 | `adb -s emulator-5554 emu geo fix 107.082000 10.342000` |
| 2 | Điểm B | 10.350000 | 107.090000 | `adb -s emulator-5554 emu geo fix 107.090000 10.350000` |
| 3 | Điểm C | 10.358000 | 107.098000 | `adb -s emulator-5554 emu geo fix 107.098000 10.358000` |

Tọa độ trên là **tọa độ mô phỏng** gần Vũng Tàu, không phải tọa độ
đã kiểm chứng của danh thắng. Với Android Emulator, có thể dùng **Extended
Controls → Location → Single points** thay vì `adb`. Chú ý cú pháp
`geo fix <longitude> <latitude>` (kinh độ trước, vĩ độ sau).

### Luồng kiểm thử
1. Đăng nhập Flutter bằng HDV demo, mở tour `[TEST GPS]` hôm nay.
2. Kiểm tra màn hình **Điểm danh** cho phép `Có mặt/Vắng mặt`; trạng thái
   hành khách ban đầu là Pending, số điện thoại có trong thẻ.
3. Mở **Check-in địa điểm**, xác nhận chỉ điểm A được mở, B và C khóa.
4. Đặt GPS tại tọa độ B, thử điểm A: backend báo ngoài phạm vi.
5. Chuyển GPS sang A, check-in thành công. Lúc này B được mở, C vẫn khóa.
6. Chuyển GPS sang B và C, check-in lần lượt. Cuối cùng 3/3 điểm đều CheckedIn.
7. Lặp lại lệnh seed **cùng ngày**: không tạo bản ghi trùng và không
   làm mất trạng thái check-in/điểm danh.

Nếu kiểm thử sang ngày khác: seed sẽ tự tạo tour/booking mới cho ngày đó,
không làm mất lịch sử ngày trước. Nếu cần lặp lại từ đầu **cùng ngày**,
hãy dùng một database test mới hoặc xóa có kiểm soát **duy nhất** dữ liệu
fixture này theo khóa mã; seed cố tình không tự reset tác vụ HDV.

**Bảo mật:** không bật cờ seed trên staging/production; không dùng tài khoản
và mật khẩu này cho dữ liệu thật; không coi GPS của emulator là bằng chứng
hiện diện thực tế.
