# Hướng dẫn test yêu cầu thiết kế và liên minh theo phiên bản

## Chuẩn bị

Team pull code, cấu hình SQL Server riêng rồi chạy trong `backend`:

```powershell
dotnet ef database update --project src/TripOps.Data --startup-project src/TripOps.Api
```

Chạy BE/FE và tải lại trang. Dùng ba tài khoản Customer, Agency chủ trì A và Agency đối tác B đã được duyệt. Dùng yêu cầu thử mới để tránh booking đang khóa các phương án cũ. Không cần thực hiện thanh toán thật.

## 1. Lưu trữ riêng và đóng yêu cầu

1. Customer gửi yêu cầu cho A; A Tiếp nhận, lưu v1 và chọn v1 để Customer xem.
2. A mở menu `...` của yêu cầu, chọn **Lưu trữ yêu cầu**. Yêu cầu rời tab Đang xử lý, nằm ở Lưu trữ. Customer vẫn thấy v1, vẫn có thể đặt.
3. Trong Lưu trữ chọn **Bỏ lưu trữ**; yêu cầu trở lại nhóm trạng thái cũ.
4. A chọn **Đóng yêu cầu**, nhập lý do, ví dụ “Chưa thống nhất lịch đi”. Nếu bỏ trống thì không đóng được.
5. Customer tải lại danh sách, mở tab **Đã đóng / Hủy / Từ chối**: thấy lý do và xem lại phương án nhưng không thể đặt hoặc gửi tin nhắn trong yêu cầu đã đóng.
6. A mở tab **Đã đóng**, chọn **Mở lại yêu cầu**. Customer tải lại: yêu cầu trở lại phương án đang xem, có thể trao đổi và đặt tour. Nội dung/v1 vẫn còn.

## 2. v1 có liên minh, v2 không có liên minh

1. Trên một yêu cầu chưa booking, A lưu v1, mở **Phiên bản & đối tác → Đối tác liên minh**; chọn v1, mời B.
2. B vào **Liên minh lữ hành**, chọn v1 và nhận lời. B tạo hoạt động/khách sạn/bữa ăn của mình, nhập đầy đủ giá theo các khung tuổi A tạo, rồi Lưu. A không sửa được phần do B tạo, B không sửa phần A.
3. A chọn v1 cho Customer xem, rồi mở v1 và **Lưu với phiên bản mới** thành v2.
4. Trong Đối tác liên minh chọn **v2**, chọn **Bỏ khỏi phiên bản** đối với B, xác nhận gỡ nội dung và bảng giá. Chỉ v2 còn A; v1 vẫn có A+B. A kiểm tra thời lượng, dịch vụ mặc định và bảng giá v2 rồi chọn v2 cho Customer.
5. B chỉ truy cập/sửa được v1, không sửa v2. A vẫn xem được cả hai bản trong **Các phiên bản**.
6. A đổi lựa chọn Customer về **v1**. Customer tải lại sẽ thấy đúng v1 và giá tổng A+B. Không sinh v3, không ghi đè v2.

## 3. Chấm dứt toàn bộ và mời lại

1. Dùng yêu cầu chưa booking có v1 gồm A+B. Trong liên minh chọn **Chấm dứt toàn bộ** với B.
2. B mất quyền truy cập yêu cầu. A vẫn xem lại v1, nhưng B được ghi **Cần mời lại**; không thể chọn v1 cho Customer booking. Nếu v1 đang hiển thị thì lựa chọn đó bị bỏ.
3. A chọn đúng v1, mời lại B. B nhận lời mời v1.
4. A chọn v1 cho Customer. Nội dung/bảng giá lịch sử của B vẫn còn, số lượng version không tăng. Các bản đã loại B vẫn độc lập.

## 4. Đã booking và booking bị hủy/từ chối

1. Customer đặt phương án đang xem. Cả hai bên thấy yêu cầu ở **Đã đặt tour**; nút **Xem booking** mở đúng đoàn vừa đặt.
2. A thử sửa tour nguồn, đổi phiên bản, mời/gỡ đối tác: hệ thống chặn. Phương án, giá và phân bổ Agency ở booking được giữ như thời điểm đặt. Các cập nhật vận hành thực hiện trên booking.
3. Thử mở lại yêu cầu khi booking còn hiệu lực: bị chặn.
4. Customer hủy booking chưa thanh toán (hoặc A từ chối booking). Yêu cầu chuyển thành **Đã đóng**, thông báo Agency có thể mở lại. Customer chưa thể đặt lần nữa.
5. A chủ động **Mở lại yêu cầu**; Customer tải lại phương án rồi đặt lại được. Booking cũ không bị xóa hay chỉnh sửa.

## Kiểm tra API tự động

`DesignLifecycleTests.cs` kiểm tra quyền đóng/mở/lưu trữ, giới hạn lý do, Customer xem nhưng không book khi đóng, khóa nguồn khi đã booking và yêu cầu mở lại sau hủy. `DesignRequestManagementTests.cs` kiểm tra v2 bỏ B không làm mất v1, và booking từ v1 giữ phân bổ cho B. `DesignCoHostingTests.cs`, `AllianceBookingStageTests.cs` kiểm tra quyền sửa nội dung/bảng giá, snapshot booking và phân bổ phụ thu.

Test API chạy qua HTTP trong `WebApplicationFactory` với SQLite riêng, không thay dữ liệu SQL đang dùng và không chuyển tiền thật. Migration được áp dụng và đối chiếu riêng trên SQL Server local.
