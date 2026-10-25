# Kiểm tra WF05–WF06 qua UI — 25/10/2026

Kiểm tra trên nhánh `feat/wf05-wf06-booking-operation`, xuất phát từ `cb1b21e`. Các thay đổi nằm trong working tree, chưa commit/push. Không dùng nhánh FixUI làm nguồn cho lượt này.

## Chạy local đúng thư mục

Mở hai terminal. Backend:

```powershell
cd D:\fpt\SEP\TripOps\backend\src\TripOps.Api
dotnet run --launch-profile http
```

Frontend:

```powershell
cd D:\fpt\SEP\TripOps\frontend
npm.cmd install
npm.cmd run dev
```

Nếu đã cài dependencies thì bỏ bước install. Mở http://localhost:5173; Swagger ở http://localhost:5080/swagger. Vite chuyển `/api` sang cổng 5080 và HTTP client gửi cookie. Dùng nhất quán hostname localhost khi test đăng nhập. Không chạy npm tại thư mục gốc vì ở đó không có package.json. Có thể chạy từ thư mục gốc bằng `npm.cmd --prefix frontend run dev`.

Nếu vừa đổi nhánh/cài dependencies và thấy Invalid hook call, dừng Vite rồi chạy `npm.cmd run dev -- --force` và tải lại trang. Trong lượt này React và React DOM đều là 18.3.1; lỗi runtime do cache tối ưu dependency cũ đã hết sau restart. Không cần tắt bảo vệ Windows thêm để chạy FE.

## Kết quả xác minh mới

- Frontend: `npm.cmd run typecheck` không còn lỗi TypeScript theo cấu hình dự án; `npm.cmd test` đạt 5/5; `npm.cmd run build` đạt. Vite còn cảnh báo bundle lớn.
- Backend: `dotnet test TripOps.sln --no-restore` đạt 95/95, không skip. Các integration test tự tạo SQLite riêng; không thay dữ liệu SQL Server đang dùng.
- UI thực tế: đăng nhập bằng ba tài khoản test do người dùng cung cấp, gọi API local hiện có và tạo một booking riêng. Không tạo tài khoản mới, không chuyển tiền ngân hàng, không apply migration.
- Booking kiểm thử: ID **2**, mã **BK261025114736283**, người liên hệ **QA WF05-WF06 2510**, 10 hành khách có tên bắt đầu bằng QA, ngày đi 01/11/2026. Tổng 35.000.000đ, cọc demo 10.500.000đ, còn lại 24.500.000đ. Có một khách được điểm danh Có mặt và một báo cáo ghi rõ là dữ liệu test. Giữ booking này để người dùng xem; không xóa booking cũ ID 1.
- Bằng chứng ảnh nằm ngoài repo ở `D:/fpt/SEP/output/wf05-wf06-audit-20261025`.

## Cách lặp lại trên giao diện

1. Customer đăng nhập → chọn tour → Đặt ngay. Tour test yêu cầu tối thiểu 10 người. Điền liên hệ và danh sách hành khách, ngày sinh, ngày khởi hành → Tiếp theo → gửi yêu cầu. Khi server báo lỗi, form giữ dữ liệu và không chuyển sang Thành công. Đã kiểm tra lỗi 422 khi chỉ gửi 1 khách.
2. Mở Tour của tôi/Lịch sử đặt tour → Xem chi tiết booking mới. Kiểm tra giá và số cọc server trả về; không dùng cứng 2.100.000đ trong hướng dẫn cũ cho mọi booking.
3. Có thể duyệt trước rồi mới cọc theo mô tả WF05; hoặc lặp lại thứ tự Swagger đã gửi: Customer dùng nút **[DEMO]** ghi nhận cọc trước. Nếu booking đang Pending, đủ cọc sẽ thành **Deposited**, thanh toán **PartiallyPaid**. Nếu Agency đã duyệt thành Confirmed thì cọc không đổi ngược trạng thái đơn về Deposited.
4. Đăng xuất Customer, đăng nhập Agency → Đặt tour & Khách → tìm mã booking → Phê duyệt. Đơn thành Confirmed. Chọn Gán HDV/Giao HDV, chọn Guide có thật từ BE.
5. Đăng xuất Agency, đăng nhập Guide → chọn đúng đoàn bằng mã booking và tên người liên hệ → Điều hành tour → Điểm danh → đánh dấu khách → Lưu & Chốt. Tải lại trang, chọn lại đoàn, kiểm tra trạng thái vẫn còn. Đã kiểm chứng 1 Có mặt / 9 Chưa đến.
6. Guide → Sự cố → Báo sự cố mới → nhập nội dung có nhãn test → Gửi. Tải lại trang, chọn lại đúng đoàn → Sự cố. Đã kiểm chứng báo cáo tồn tại sau reload.

Không ghi mật khẩu tài khoản test vào tài liệu hoặc source.

## Những lỗi đã sửa

- Thêm TypeScript/config alias @, React/DOM/Node types và script typecheck. Sửa các lỗi props/model/handler có thật trong FE, thay vì bỏ qua bằng ts-ignore. File `src/imports/ui-components.tsx` chỉ là cây thư mục dạng văn bản, không được import: đổi thành `.md` để editor không phân tích như TSX. Dự án chưa có bộ lint riêng; typecheck không thay thế kiểm tra lint hoặc chế độ strict.
- Bỏ mock booking/schedule và fallback ghi thành công local cho các thao tác WF05–WF06 đã nối API. Tải đủ các trang booking, có thông báo lỗi và thử lại, không giữ dữ liệu booking của phiên người dùng trước.
- Form đặt tour, thanh toán demo, duyệt/phân công nhanh, điểm danh và báo sự cố chờ API thành công trước khi báo lưu. Lỗi API không được chuyển thành bản ghi thành công chỉ trong React state.
- Giữ riêng tám trạng thái booking, bao gồm InProgress; phân biệt đã cọc với đã thanh toán đủ; cọc thiếu chỉ yêu cầu số còn thiếu. Tính tiền đã trả từ PaidAmount thật.
- Nạp danh sách Guide thật qua GET `/api/v1/agency/bookings/available-guides` (chỉ Agency); kiểm tra ở BE người được gán thực sự có role Guide và đơn đã được xác nhận. Thêm metadata Swagger và cập nhật test hợp đồng API.
- Backend tự xét nhóm giá theo ngày sinh/ngày đi nếu FE không gửi pricingTierId, từ chối nhóm giá không thuộc tour hoặc không đúng tuổi. Trước đây FE không gửi tier nên khách trẻ em bị tính giá cơ bản.
- Giữ attendance và incidents từ DTO khi reload. BookingDto được bổ sung incidents theo dữ liệu đang lưu; không thay schema database. Bổ sung mã đơn/tên liên hệ trong bộ chọn đoàn để tránh chọn nhầm hai đoàn cùng tour.
- Test cũ mong Confirmed ngay sau cọc đã được cập nhật theo code trạng thái mới, có bước Agency duyệt rõ ràng. Bổ sung test cọc một phần, giá theo tuổi, truy cập chéo, phân công sai role và nạp lại dữ liệu đã lưu.

## Các phần chưa thể coi là hoàn chỉnh

Các test đạt không có nghĩa toàn bộ WF05–WF06 theo ảnh đã hoàn thành.

1. **Check-in địa điểm và kết thúc chuyến đi:** `App.handleCheckIn` và `handleWrapUpTour` vẫn chỉ sửa state FE, chưa có endpoint tương ứng trong BookingsController. Chưa chứng minh vòng đời Confirmed → InProgress → Completed từ thao tác vận hành. Tải lại sẽ mất các thay đổi local này.
2. **Quản lý hành khách sau đặt, thay/rút Guide, chỉnh giá:** còn handler state local (`handleUpdateBookingPassengers`, `handleUpdateAssignedGuides`, `handleUpdateBookingPrice`). Thêm Guide ban đầu đã gọi API; các thao tác chỉnh sửa còn lại chưa có API tương ứng và chưa được coi là lưu database.
3. **Thanh toán là demo:** endpoint deposit cộng PaidAmount từ amount do client gửi. Chưa có xác minh ngân hàng/webhook, chống phát lại/idempotency, đối soát hoặc ghi đầy đủ transactionReference/paymentProofUrl vào sổ giao dịch. Chưa thể dùng làm chứng cứ thu tiền thật; WF07 và hoàn tiền nằm ngoài phần đã test. Luồng còn cho ghi khoản còn lại trước khi tour hoàn thành, cần đồng bộ quy tắc WF07 theo tài liệu nhóm chốt.
4. **Snapshot booking/giá từng hành khách:** DTO chưa trả giá đã chốt riêng từng hành khách; adapter hiện dùng bình quân để điền cột giá. Lịch trình đang lấy từ tour hiện tại, chưa chứng minh snapshot lịch trình tại thời điểm đặt. Cần hoàn thiện để giá/chi tiết không thay theo việc chỉnh tour sau này, đặc biệt đoàn có nhiều nhóm tuổi hoặc tour bị ẩn.
5. **Thông tin incident:** không có cột riêng cho loại/mức độ/địa điểm trong entity hiện tại; loại gắn ở Title, mức độ đang dùng ResolutionNotes. Nội dung địa điểm mới được ghép vào mô tả để không mất khi gửi từ FE; cần thiết kế lại hợp đồng dữ liệu nếu dùng các trường này để lọc/thống kê nghiệp vụ.
6. **Giới hạn kiểm tra:** lượt này kiểm tra Guide UI mô phỏng trên web, không phải build/test ứng dụng mobile riêng; không kiểm tra bản deploy. Một số chức năng khác như service/co-host vẫn giữ triển khai cũ, chưa được audit toàn bộ.

Npm audit còn các cảnh báo đã có trong nhóm dependency Vite/react-router/xlsx; không dùng audit fix --force vì có thể đổi phiên bản/phá tương thích. Cần lên lịch xử lý riêng. EF Core còn warning về query filter quan hệ và precision tọa độ; build/test vẫn đạt, chưa sửa schema trong lượt này.
