# Đồng bộ entity với backend/database.md

> **Cập nhật 26/10/2026:** người dùng đã chọn bỏ toàn bộ cột ngoài thiết kế. Migration tiếp theo đã loại bỏ 95 cột, hiện SQL/model có đúng 36 bảng và 433 cột. Xem [database-exact-alignment.md](database-exact-alignment.md). Nội dung bên dưới ghi lại giai đoạn đồng bộ bổ sung trước đó.

Ngày thực hiện: 25/10/2026. Database đã cập nhật: `TripOps`, server `.\SQLEXPRESS`.

## Phạm vi đã thực hiện

- Đủ 36 bảng và 433 cột được khai báo trong `backend/database.md` đều có mapping EF.
- Bổ sung 129 property; 38 cặp tên C# gần tương ứng giữ tên API hiện hành và ánh xạ sang tên cột trong thiết kế.
- Các cột thiết kế dùng tên vật lý snake_case. Migration dùng RenameColumn để giữ dữ liệu hiện có.
- Bổ sung UNIQUE/index trong thiết kế và các FK được khai báo bằng Ref, gồm cả FK người điểm danh, Agency và các liên kết tài chính/subscription/chat còn thiếu.
- Khóa ngoại `BookingParticipant.AssignedGuideId` chuyển từ int trỏ bản ghi phân công sang string trỏ `users.id`. Migration chuyển giá trị thông qua bảng phân công cũ, không ép ID user từ một số thứ tự.
- `TourAccommodation` có thêm liên kết trực tiếp tới Tour; liên kết ngày lịch trình cũ vẫn được giữ để các màn hình lịch trình và versioning tiếp tục hoạt động.
- Cấu hình 120 giá trị mặc định theo thiết kế; thời gian phía SQL dùng UTC.

## Các cột mở rộng còn giữ

95 property nằm ngoài thiết kế vẫn được giữ trong database, gồm thông tin tiền cọc/đã trả, mô tả tour, soft delete, metadata kiểm duyệt, một số cột snapshot và timestamps kế thừa. Đây là đồng bộ bổ sung đầy đủ thiết kế, **chưa phải loại bỏ toàn bộ cột ngoài thiết kế**.

Đã hỏi người dùng lựa chọn giữa giữ các cột đang phục vụ ứng dụng và xóa để khớp tuyệt đối. Chưa nhận câu trả lời khi bàn giao; không xóa các cột này. Nếu chọn xóa cần một thay đổi tiếp theo ở cả entity, API/service và giao diện liên quan.

## Các quyết định kỹ thuật do mâu thuẫn trong thiết kế

- FK tới `users.id` dùng string/nvarchar(36), kể cả các vị trí thiết kế ghi int như `business_profiles.user_id`, `tours.agency_id`, `tour_custom_request_agencies.agency_id`.
- `tours.baseprice` dùng decimal(12,2) thay vì text.
- varchar trong tài liệu được triển khai bằng nvarchar để giữ tiếng Việt; giới hạn độ dài được áp dụng theo thiết kế.
- text và json dùng nvarchar(max); chưa bổ sung CHECK ISJSON vì chưa phải toàn bộ cột cũ đều được quy định JSON chặt chẽ.
- timestamp mang nghĩa thời điểm dùng datetime2; date dùng date. Không dùng SQL Server timestamp/rowversion thay thời gian.
- Các trường được ghi `[not null]` được bắt buộc trong EF. Một số trường thiết kế không ghi rõ nullable vẫn giữ non-null hiện có vì CLR và luồng hiện tại yêu cầu, bao gồm nhiều timestamps và trạng thái.
- ServiceStatus bổ sung Pending/Rejected, mặc định service mới là Pending; giữ các giá trị trạng thái cũ để đọc dữ liệu/luồng hiện hành.
- Tên C# gần tương ứng không tự chứng minh cùng nghĩa: ExpectedBudget vẫn tách khỏi BudgetPerPerson, QuotedPrice tách khỏi SuggestedBudget, AgreedAmount tách khỏi OriginalAmount/FinalAmount.

## Migration và chuyển dữ liệu

1. `20261025162940_AlignEntitiesWithDatabaseDesign`
2. `20261025163643_AlignDatabaseDesignDefaults`

Trước migration đã backup COPY_ONLY với CHECKSUM và RESTORE VERIFYONLY thành công:

```text
C:\Program Files\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQL\Backup\TripOps_before_database_alignment_20261025.bak
```

Migration đầu tiên có kiểm tra trước khi thu hẹp độ dài/precision; không âm thầm cắt chuỗi hoặc ép số vượt giới hạn. Backfill Agency, Tour, thứ tự hành khách và thông tin có thể suy ra từ bản ghi cũ trước khi tạo các FK/UNIQUE mới.

Giá lịch sử từng hành khách chỉ được tái lập từ nhóm tuổi/giá tour hiện có khi tổng của cả booking khớp chính xác tổng tiền đã lưu. Nếu không khớp, migration để giá mặc định 0 và đánh dấu `Legacy price unknown` trong tier/note, không phân bổ bình quân rồi coi là giá lịch sử thật. Với database hiện tại, tổng snapshot 10 hành khách khớp tổng booking **22.750.000đ**.

Lượt dự định thử trên bản sao đầu tiên gặp lỗi đặt database đích trong PowerShell, nên migration cấu trúc đã chạy vào TripOps trước. Đã thông báo người dùng, đối chiếu dữ liệu và chạy lại thành công trên bản sao `TripOps_AlignmentCheck_20261025`. Migration defaults đã được thử trên bản sao trước khi áp dụng vào TripOps. Database bản sao này vẫn còn để kiểm tra; thao tác dọn database thử bị công cụ chặn và không được thực hiện.

## Logic BE được đồng bộ

- Tạo booking lưu AgencyId, ParticipantIndex, IsPrimary, TierName và Price cho từng hành khách, cùng OriginalTotalPrice của booking.
- Phân công Guide lưu AgencyId và AssignedAt.
- Điểm danh lưu CheckedBy và CheckedAt.
- Hủy booking lưu CancelReason và CancelledAt.
- Báo sự cố lưu AgencyId và IncidentType riêng, giữ định dạng API hiện tại.
- Tạo/sửa tour lưu owner cho bảng nhóm giá, điểm tham quan, bữa ăn và chỗ ở; lưu TourId trực tiếp của chỗ ở.
- Đây không phải triển khai toàn bộ API/UI mới cho các module refund/chat/subscription; các trường đã có persistence nhưng luồng nghiệp vụ mới vẫn cần công việc riêng.

## Kiểm tra thực tế

- Build backend: 0 warning, 0 error.
- Test backend: **92/92 đạt**, gồm kiểm tra đủ 433 cột/36 bảng, khóa ngoại Guide, UNIQUE hành khách/phân công, snapshot giá/Agency, audit điểm danh và giá trị IsPrimary=false không bị default=true ghi đè.
- Thử migration trên bản sao database: thành công.
- SQL TripOps: **7/7 migration đã áp dụng**, không còn pending migration hoặc pending model changes.
- Đối chiếu model với SQL: không thiếu bảng nghiệp vụ, không khác cột/kiểu/nullable.
- DBCC CHECKCONSTRAINTS: không báo vi phạm.
- Số bản ghi giữ nguyên: users=4, tours=1, bookings=1, booking_participants=10, tour_versions=5.
- Backend đã khởi động lại: health=ok, public tours API HTTP 200 trên localhost:5080.
- Không kiểm tra toàn bộ UI bằng trình duyệt; không thay đổi FE.

Các file database.md, migration, snapshot, cấu hình mapping/defaults và test mới phải được đưa cùng nhau vào commit/PR. Không chỉ commit migration mà bỏ quên file thiết kế vì schema contract test đọc chính file này.
