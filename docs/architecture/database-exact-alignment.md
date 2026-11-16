# Khớp bộ cột entity/SQL với backend/database.md

Ngày thực hiện: **26/10/2026**. Người dùng chọn “Khớp hoàn toàn database.md, bỏ cột ngoài thiết kế và sửa các chức năng bị ảnh hưởng”.

## Kết quả hiện tại

- `TripOps` trên `.\SQLEXPRESS`: **36 bảng nghiệp vụ, đúng 433 cột** trong `backend/database.md`.
- Đã bỏ **95 cột ngoài thiết kế**, không bỏ cột nào thuộc thiết kế.
- Entity chỉ khai báo các scalar field thuộc thiết kế. BaseEntity chỉ còn Id; CreatedAt/UpdatedAt xuất hiện ở từng entity theo đúng bảng được khai báo trong tài liệu.
- NULL/NOT NULL khớp DBML, bao gồm các cột không có `[not null]`.
- SQL khớp EF model: không có chênh lệch cột/kiểu/nullable, không còn pending migration/model change.
- `__EFMigrationsHistory` và `sysdiagrams` là hai bảng hạ tầng, không tính vào 36 bảng nghiệp vụ.

Migration đã áp dụng:

```text
20261026014547_MatchDatabaseDesignExactly
```

Tổng cộng database đã áp dụng **8/8 migration**. Các migration đã chạy trước đó được giữ nguyên lịch sử.

## Các quy đổi kỹ thuật khi triển khai DBML trên SQL Server

File DBML có những kiểu không thể chuyển nguyên văn thành schema SQL Server hợp lệ. Các quy đổi từ giai đoạn trước tiếp tục được giữ:

- FK tới `users.id` dùng nvarchar(36), kể cả ba chỗ tài liệu ghi int: `business_profiles.user_id`, `tours.agency_id`, `tour_custom_request_agencies.agency_id`.
- `tours.baseprice` dùng decimal(12,2), thay cho text.
- varchar dùng nvarchar cùng độ dài để giữ Unicode tiếng Việt. text/json dùng nvarchar(max).
- timestamp mang nghĩa thời điểm dùng datetime2; ngày dùng date. Không dùng SQL Server rowversion để lưu thời gian.
- `user_role_enum` chưa có định nghĩa Enum trong file DBML; giữ UserRole hiện hành và lưu chuỗi.

Như vậy bộ bảng, bộ cột và nullable khớp thiết kế; các kiểu vật lý ở những vị trí trên được quy đổi rõ ràng, không tuyên bố là giống nguyên văn DBML.

## Chức năng BE/FE đã điều chỉnh

### Tour và lịch sử phiên bản

- Bỏ các cột mô tả tour, metadata kiểm duyệt và cờ soft-delete ngoài thiết kế.
- Xóa/ẩn tour dùng `status`/`visibility`; lịch sử tour vẫn bất biến.
- Các chi tiết cấu hình không có cột riêng như mô tả tour, thời gian/thứ tự hoạt động và loại phòng được lưu/đọc từ `tour_versions.tour_snapshot`, đúng mục đích snapshot toàn cấu hình. API/FE hiện tại vẫn nhận được các thông tin này sau reload, sửa, đăng bán, sao chép và khôi phục phiên bản.
- Chỗ ở gắn trực tiếp Tour qua `tour_accommodations.tour_id`; bỏ TourTimelineId/RoomType ngoài thiết kế. Vị trí của kỳ lưu trú trong lịch trình được giữ trong snapshot.
- Snapshot mới chuẩn hóa tiền và thông tin trước khi lưu, để JSON và các hàng quan hệ trả cùng giá trị.

### Booking và thanh toán

- Bỏ PaidAmount, DepositAmount, TotalGuests, EndDate khỏi entity/SQL.
- API tính tiền đã trả từ các giao dịch Success trong `payment_transactions`.
- Số tiền cọc lấy từ yêu cầu đặt cọc trong `payment_requests`; chính sách hiện tại là 30%.
- Số khách tính từ hành khách chính đang hoạt động; ngày về tính từ các ngày snapshot trong `booking_timelines`, không thay theo việc chỉnh thời lượng tour sau đặt.
- Booking mới tạo snapshot lịch trình, dịch vụ mặc định và yêu cầu đặt cọc.
- Thanh toán demo ghi giao dịch có mã tham chiếu, chứng từ và trạng thái. Gửi lại cùng mã/cùng khoản thanh toán không được cộng tiền lần hai. Đây vẫn là luồng demo hiện có, không phải xác nhận giao dịch ngân hàng.
- Giá từng hành khách lấy đúng Price/TierName đã chốt; FE không chia bình quân khi BE đã trả snapshot giá, kể cả vé em bé bằng 0.

### Hành khách và hướng dẫn viên

- Phân công vẫn lưu AgencyId/AssignedAt; FE ưu tiên thời điểm phân công thật thay vì UpdatedAt của booking.
- PhoneNumber của hành khách không còn là cột riêng: dữ liệu liên hệ hiện có được giữ dưới dòng `Điện thoại: ...` trong `note`; API tương thích đọc lại dòng này.
- Điểm danh vẫn lưu CheckedBy/CheckedAt.
- BookingAssignedGuide không còn cột Status ngoài thiết kế; các hàng trong bảng đại diện việc phân công hiện có.
- ResolutionNotes không còn là cột riêng của sự cố. Incident Report không nhận hoặc ghi nhận mức độ nghiêm trọng; các bản ghi cũ có hậu tố `Mức độ: ...` được làm sạch khi trả về API. IncidentType có cột riêng theo thiết kế.

### Các bảng còn lại

- Loại bỏ các property thừa của service, tài chính, refund, subscription, đánh giá/khiếu nại và các timestamps kế thừa không được thiết kế.
- Trạng thái vô hiệu hóa dùng cột status tương ứng; Complaint tiếp tục dùng deleted_at vì cột này có trong thiết kế.
- Đã bỏ ISoftDelete dùng chung. Repository xử lý trạng thái Tour/User và deleted_at của Complaint bằng các cột có thật.
- Không bổ sung toàn bộ các API/UI chưa được triển khai trước đó cho refund/chat/subscription.

## Sao lưu và chuyển dữ liệu

Trước thay đổi đã tạo COPY_ONLY backup với CHECKSUM và RESTORE VERIFYONLY thành công:

```text
C:\Program Files\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQL\Backup\TripOps_before_exact_schema_20261026.bak
```

Migration chuyển dữ liệu cần cho luồng đang chạy **trước khi DROP COLUMN**:

- Số dư PaidAmount chưa được ghi sổ được chuyển thành giao dịch `LEGACY` với mã `MIGRATION-PAID-{bookingId}-20261026`; không bịa thời điểm chuyển tiền khi dữ liệu cũ không lưu thời điểm đó.
- Đặt cọc được chuyển sang payment_requests.
- Thời lượng chuyến cũ được giữ bằng booking_timelines trước khi bỏ EndDate.
- PhoneNumber và mức độ sự cố được chuyển sang các trường note/description hiện có.
- Các cờ IsDeleted được chuyển sang trạng thái tương ứng trước khi bỏ cột.
- Kiểm tra tour có snapshot JSON hiện hành và kiểm tra số dư không mâu thuẫn sổ giao dịch trước khi chuyển.

Các giá trị ngoài thiết kế không còn được phục vụ bởi chức năng hiện tại được loại bỏ theo lựa chọn người dùng; bản backup giữ bản đầy đủ trước thay đổi. Down migration khôi phục schema và chuyển ngược các giá trị kế toán/khóa lịch trình có thể suy ra, không thay thế bản backup khi cần khôi phục đầy đủ mọi cột đã xóa.

## Kiểm tra đã thực hiện

- Build backend thành công, 0 warning/0 error.
- **93/93 tests BE đạt**, gồm kiểm tra bộ bảng/cột chính xác, nullable, snapshot cấu hình, quyền truy cập, phân công/điểm danh, thanh toán và phát lại mã giao dịch.
- FE typecheck đạt, **6/6 tests đạt**, production build đạt. Vite vẫn có cảnh báo bundle lớn đã tồn tại.
- Migration chạy thành công trên bản sao `TripOps_ExactSchemaCheck_20261026`; thử Down rồi Up lại thành công trước khi cập nhật TripOps.
- Trên TripOps: 433 cột nghiệp vụ; 8/8 migration; DBCC CHECKCONSTRAINTS không báo vi phạm.
- Số bản ghi chính không đổi: users=4, tours=1, bookings=1, booking_participants=10, tour_versions=5.
- Booking hiện có giữ tổng tiền **22.750.000đ** và tiền đã trả **22.750.000đ** sau khi chuyển sang ledger.
- Backend đã chạy lại ở localhost:5080: health=ok, danh sách tour công khai và chi tiết tour đều HTTP 200.
- Chưa kiểm tra lại toàn bộ giao diện bằng trình duyệt. Các database bản sao kiểm thử vẫn được giữ để đối chiếu.

Khi commit cần đưa cùng file thiết kế `backend/database.md`, entity/mapping/defaults, toàn bộ migration mới và snapshot, thay đổi service/repository, FE adapter và tests. Không commit backup, log hoặc các script kiểm tra trong `.local`.
