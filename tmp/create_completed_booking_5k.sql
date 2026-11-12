/*
  TripOps – tạo 1 booking ĐÃ HOÀN THÀNH giá 5.000đ để test quyết toán (chuyển tiền cho Agency).
  CHỈ dùng trên DB máy dev. Không xóa / sửa dữ liệu khác; chỉ THÊM dòng mới.

  Cách chạy (PowerShell, thư mục bất kỳ):
    sqlcmd -S localhost -E -d TripOps -i create_completed_booking_5k.sql
  hoặc mở trong SSMS rồi bấm Execute.

  Sửa 3 biến bên dưới trước khi chạy:
    @AgencyEmail   : email tài khoản Agency nhận tiền (đã nhập tài khoản ngân hàng ở "Tài khoản doanh nghiệp")
    @CustomerEmail : email tài khoản khách
    @MarkPaid      : 1 = ghi khoản khách đã trả đủ 5.000đ dạng DEMO (mô phỏng, KHÔNG có tiền thật vào)
                         → Admin chuyển được ngay: Agency nhận 4.500đ (trừ 10% phí sàn = 500đ).
                     0 = để CHƯA thanh toán → trang Quyết toán sẽ báo "Khách chưa thanh toán đủ" và khóa nút chuyển.
                         (Code không cho thanh toán booking đã hoàn thành, nên kiểu này chỉ để xem trạng thái bị chặn.)
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @AgencyEmail   nvarchar(191) = N'agency@example.com';   -- ← SỬA
DECLARE @CustomerEmail nvarchar(191) = N'customer@example.com'; -- ← SỬA
DECLARE @MarkPaid      bit = 1;
DECLARE @Amount        decimal(12, 2) = 5000;
DECLARE @FeePercent    decimal(5, 2)  = 10;

DECLARE @AgencyId nvarchar(36) = (SELECT TOP 1 id FROM users WHERE email = @AgencyEmail);
DECLARE @CustomerId nvarchar(36) = (SELECT TOP 1 id FROM users WHERE email = @CustomerEmail);
DECLARE @TourId int = (SELECT TOP 1 id FROM tours WHERE agency_id = @AgencyId ORDER BY id DESC);

IF @AgencyId IS NULL   BEGIN RAISERROR(N'Không tìm thấy Agency có email @AgencyEmail.', 16, 1); RETURN; END;
IF @CustomerId IS NULL BEGIN RAISERROR(N'Không tìm thấy khách có email @CustomerEmail.', 16, 1); RETURN; END;
IF @TourId IS NULL     BEGIN RAISERROR(N'Agency này chưa có tour nào để gắn booking.', 16, 1); RETURN; END;

DECLARE @Now datetime2 = SYSUTCDATETIME();
DECLARE @Code nvarchar(50) = N'TEST5K-' + FORMAT(SYSDATETIME(), 'yyMMddHHmmss');
DECLARE @Fee decimal(12, 2) = ROUND(@Amount * @FeePercent / 100, 0);
DECLARE @BookingId int;

BEGIN TRANSACTION;

INSERT INTO bookings (booking_code, customer_id, tour_id, departure_date, contact_full_name, contact_phone, contact_email,
                      contact_note, payment_status, has_customization, original_total_price, total_price, status, created_at, updated_at)
SELECT @Code, @CustomerId, @TourId, CAST(DATEADD(day, -1, SYSDATETIME()) AS date),
       ISNULL(u.name, N'Khách test'), ISNULL(NULLIF(u.phone, N''), N'0900000000'), u.email,
       N'Booking test quyết toán 5.000đ (tạo bằng script).',
       CASE WHEN @MarkPaid = 1 THEN N'Paid' ELSE N'Unpaid' END, 0, @Amount, @Amount, N'Completed', @Now, @Now
FROM users u WHERE u.id = @CustomerId;
SET @BookingId = SCOPE_IDENTITY();

-- Agency chủ trì; trạng thái như lúc hướng dẫn viên vừa bấm hoàn thành.
-- auto_payout_at = bây giờ (không phải chờ 2 ngày) để bấm "Chạy chuyển tự động ngay" là thấy kết quả.
INSERT INTO booking_agencies (booking_id, agency_id, is_host, original_amount, final_amount, platform_fee, net_payout,
                              settlement_status, tour_completed_at, auto_payout_at, fee_percent, payout_attempts, created_at, updated_at)
VALUES (@BookingId, @AgencyId, 1, @Amount, @Amount, @Fee, @Amount - @Fee,
        N'Ready', @Now, @Now, @FeePercent, 0, @Now, @Now);

IF @MarkPaid = 1
    INSERT INTO payment_transactions (booking_id, transaction_code, payment_method, amount, status, payer_name, paid_at, review_note, created_at)
    VALUES (@BookingId, @Code + N'-DEMO', N'DEMO', @Amount, N'Success', N'Script test', @Now,
            N'Mô phỏng khách đã trả đủ để test quyết toán – không có tiền thật.', @Now);

COMMIT;

SELECT b.id AS booking_id, b.booking_code, b.status, b.payment_status, b.total_price,
       ba.id AS settlement_id, ba.settlement_status, ba.fee_percent, ba.platform_fee, ba.net_payout,
       bp.bank_name, bp.bank_account_number, bp.bank_account_holder
FROM bookings b
JOIN booking_agencies ba ON ba.booking_id = b.id
LEFT JOIN business_profiles bp ON bp.user_id = ba.agency_id
WHERE b.id = @BookingId;

IF NOT EXISTS (SELECT 1 FROM business_profiles WHERE user_id = @AgencyId AND bank_account_number IS NOT NULL)
    PRINT N'⚠ Agency chưa nhập tài khoản nhận tiền: đăng nhập Agency → Tài khoản doanh nghiệp → "Tài khoản nhận tiền quyết toán".';

/*
  Xóa booking test khi xong (thay @Id bằng booking_id ở kết quả trên):
    DECLARE @Id int = 0;
    DELETE FROM payment_transactions WHERE booking_id = @Id;
    DELETE FROM booking_agencies     WHERE booking_id = @Id;
    DELETE FROM workflow_notifications WHERE BookingId = @Id;
    DELETE FROM bookings             WHERE id = @Id;
  (Nếu đã chuyển tiền thật qua payOS thì NÊN GIỮ lại dòng booking_agencies để đối soát.)
*/
