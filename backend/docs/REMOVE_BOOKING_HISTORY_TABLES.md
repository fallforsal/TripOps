# Migration xóa hai bảng booking không còn sử dụng

Migration: **`20261102085451_RemoveBookingSnapshotsAndProposalEvents`**.

- Xóa `booking_proposal_events` trước vì bảng này tham chiếu `booking_snapshots`.
- Sau đó xóa `booking_snapshots`.
- Đã loại bỏ entity, DbSet, navigation, Fluent API, cấu hình mặc định và logic bảo vệ snapshot cũ khỏi model hiện tại.
- Cập nhật `TripOpsDbContextModelSnapshot`, file Designer của migration và các bản DBML. Sau khi gộp thêm phần lịch thanh toán/payOS, schema trong `backend/database.md` và EF model hiện tại có **39 bảng, 503 cột**.
- Các bảng booking đang hoạt động, lịch trình/hành khách/dịch vụ đã chốt và `tour_versions` được giữ nguyên.

## Người tạo thay đổi cần push gì?

Push cùng nhau: toàn bộ thay đổi entity/model/DbContext, migration `.cs`, migration `.Designer.cs`, `TripOpsDbContextModelSnapshot.cs`, tài liệu và test liên quan. Giữ các migration đã phát hành, bao gồm `AddBookingSnapshots` và `AddBookingProposalEvents`; migration mới sẽ nối tiếp lịch sử của team.

## Team làm gì sau khi pull?

1. Dừng BE đang chạy nếu đang dùng cùng thư mục build.
2. Kiểm tra chuỗi kết nối trỏ tới database của mình và sao lưu nếu hai bảng có dữ liệu cần lưu giữ.
3. Tại thư mục gốc `TripOps`, chạy:

```powershell
dotnet ef database update --project backend/src/TripOps.Data --startup-project backend/src/TripOps.Api
```

4. Khởi động lại BE.

Không cần tự tạo migration, không chạy `migrations remove` để xóa lịch sử cũ và không DROP TABLE bằng tay. Nếu máy còn thiếu migration trước đó, EF sẽ chạy các migration còn thiếu rồi áp dụng migration xóa hai bảng. Database mới cũng có thể chạy toàn bộ chuỗi migration đến phiên bản này.

Migration xóa toàn bộ nội dung hai bảng. `Down` chỉ tái tạo cấu trúc, ràng buộc và index của hai bảng; muốn lấy lại nội dung phải dùng bản sao lưu. Trên máy nguồn, hai bảng đều trống trước khi xóa và database đã được backup bằng `COPY_ONLY, CHECKSUM`, kiểm tra `RESTORE VERIFYONLY`.
