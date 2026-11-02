# Quản lý HDV nội bộ Agency

Hoàn thiện ngày 02/11/2026. Agency tạo tài khoản trực tiếp với mật khẩu ban đầu; không có số thẻ, hạn thẻ, cơ quan cấp hay lời mời kích hoạt email.

## Lưu trữ

- `users`: tên, email duy nhất toàn hệ thống, điện thoại, avatar, mật khẩu băm, role `TourGuide`, `agency_id`, trạng thái tài khoản.
- `guide_profiles`: quan hệ 1–1 theo `user_id`; kinh nghiệm, JSON ngôn ngữ/địa bàn/kỹ năng, giới thiệu, thông tin tạm khóa và timestamps.
- `booking_assigned_guides`, `bookings`, lịch trình/hành khách booking: lịch dẫn đoàn thực tế. Trạng thái công việc được suy ra từ lịch và tài khoản, không lưu bản sao trong `users`.

Migration `20261101195316_AddGuideProfiles` tạo bảng mới và tạo hồ sơ rỗng cho các tài khoản `TourGuide` đã tồn tại, không tự sinh chuyên môn hoặc thông tin thẻ. Chạy trên máy thành viên:

```powershell
dotnet ef database update --project backend/src/TripOps.Data --startup-project backend/src/TripOps.Api
```

## API

Tất cả endpoint dưới đây yêu cầu cookie đăng nhập role `agency`. Agency được lấy từ principal, không nhận owner/role từ request.

| Method | Route | Mục đích |
| --- | --- | --- |
| GET | `/api/v1/agency/guides` | Danh sách, tìm tên/email/SĐT, lọc, phân trang và thống kê |
| POST | `/api/v1/agency/guides` | Tạo tài khoản và hồ sơ trong một transaction |
| GET | `/api/v1/agency/guides/{id}` | Hồ sơ, lịch phân công và điều kiện nhận đoàn |
| PUT | `/api/v1/agency/guides/{id}` | Sửa hồ sơ, giữ mật khẩu/trạng thái/lịch sử |
| PUT | `/api/v1/agency/guides/{id}/password` | Đổi mật khẩu, không mở khóa tài khoản |
| PATCH | `/api/v1/agency/guides/{id}/account-status` | Khóa hoặc mở khóa |
| DELETE | `/api/v1/agency/guides/{id}` | Xóa tài khoản và hồ sơ chưa có lịch sử |
| GET | `/api/v1/agency/guides/{id}/assignments` | Lịch hiện tại, sắp tới, đã hoàn thành hoặc hủy |

Danh sách nhận `search`, `mobileAccountStatus=all|active|suspended`, `workStatus=all|available|on_tour|unavailable`, `page`, `pageSize` (tối đa 100). Lịch nhận `status=all|upcoming|in_progress|completed|cancelled`.

Ví dụ tạo (JSON):

```json
{
  "profile": {
    "name": "Nguyễn Văn Hướng Dẫn",
    "email": "guide@example.test",
    "phone": "0912345678",
    "experienceYears": 3,
    "languages": ["Tiếng Việt", "Tiếng Anh"],
    "routes": ["Lâm Đồng"],
    "specialties": ["Văn hóa – Lịch sử"],
    "bio": "Giới thiệu nhân sự",
    "avatar": null
  },
  "password": "Example123!"
}
```

PUT hồ sơ nhận phần `profile` trực tiếp. Đổi mật khẩu nhận `newPassword`, `confirmPassword` (8–16 ký tự); mật khẩu chỉ gửi trong request, không nằm trong hồ sơ/response/state danh sách. Avatar xem trước tại FE; khi lưu gửi data URL PNG/JPG/WEBP, tối đa 2 MB. BE tải Cloudinary rồi lưu URL; khi sửa giữ nguyên URL cũ thì không tải lại. `Storage:UseLocal` chỉ phục vụ development và kiểm thử.

Khóa/mở nhận `action=suspend|reactivate`, `reason`, `confirmWithUpcomingTours`. Khi có lịch đang dẫn/sắp khởi hành, khóa cần xác nhận. Khóa không xóa phân công; cookie cũ không dùng tiếp được khi tài khoản ngừng hoạt động. Agency không được mở khóa tài khoản `Banned` bởi Admin. Xóa bị chặn nếu có tham chiếu hoạt động; dùng tạm khóa thay thế.

Gán HDV tiếp tục dùng `/api/v1/agency/bookings/{id}/guide-assignments`; kiểm tra cùng Agency, tài khoản hoạt động và chống trùng khoảng ngày. Thay đổi phân công/khóa/xóa được tuần tự hóa theo bản ghi HDV để tránh thao tác đồng thời vượt kiểm tra.

## Kiểm thử

- Toàn bộ backend: **123/123 test đạt**, gồm CRUD/login/password, phân quyền và cô lập Agency, dữ liệu không hợp lệ, email trùng, phân trang, khóa/mở, thu hồi quyền dùng cookie khi khóa, chống trùng lịch, giữ lịch sử và upload avatar qua Cloudinary giả lập.
- Frontend: kiểm tra TypeScript; các thao tác thêm, xem chi tiết, sửa, mở form mật khẩu, khóa/mở và lịch được kiểm tra trên trình duyệt với SQL Server riêng `TripOps_GuideFlowTest_20261102`.
- **10/10 test frontend đạt**. Kiểm thử trình duyệt còn xác nhận tìm kiếm không có kết quả, dữ liệu giữ sau reload, chặn xóa khi có lịch, và mở đúng chi tiết booking từ lịch HDV. Lỗi vai trò trưởng đoàn bị map thành phụ tá đã được sửa và thêm test hồi quy.
- HDV được tạo từ form Agency đã đăng nhập được trên FE và nhận đúng chuyến đã giao. Lịch ứng dụng HDV không còn mặc định cứng ngày 15/10/2026; dùng ngày địa phương hiện tại.
- Việc đổi mật khẩu được xác minh bằng API và đăng nhập: mật khẩu cũ bị từ chối, mật khẩu mới dùng được; không đổi mật khẩu tài khoản thật của người dùng để test.
- Migration đã áp dụng vào `TripOps` sau backup `COPY_ONLY, CHECKSUM` và `RESTORE VERIFYONLY`. Database chính giữ nguyên **55 services, 4 users**; dữ liệu thử nghiệm nằm ngoài database chính.
- Sau kiểm thử, server/DB kiểm thử riêng đã được dọn. BE chính chạy tại cổng 5080 ở chế độ Development, FE chính tại 5174. Danh sách nhân sự trong database chính ban đầu trống vì không còn chèn HDV giả từ FE; dùng nút Thêm HDV để tạo tài khoản thật.

Chạy lại kiểm thử:

```powershell
dotnet test backend/tests/TripOps.Tests/TripOps.Tests.csproj
```

```powershell
cd frontend
npm run typecheck
npm test
npm run build
```
