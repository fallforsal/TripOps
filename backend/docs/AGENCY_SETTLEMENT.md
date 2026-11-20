# Quyết toán cho Agency (trả tiền sau tour)

## Quy tắc

| Mục | Quy tắc |
|---|---|
| Mốc tính | Lúc **Agency chủ trì bấm "Hoàn thành tour"** (`POST /api/v1/agency/bookings/{id}/complete`) |
| Ngày tự chuyển | Mốc + `Settlement:AutoPayoutDelayDays` (mặc định 2 ngày). VD hoàn thành 10/11 → tự chuyển từ 12/11 |
| Phí sàn | `system_commission_configs` mới nhất còn hiệu lực; chưa có thì `Settlement:DefaultFeePercent` (10%). Chốt vào `booking_agencies.fee_percent` lúc hoàn thành |
| Số tiền | Agency nhận = tiền khách đã trả − phí sàn. VD tour 10.000.000đ → phí 1.000.000đ → Agency nhận 9.000.000đ |
| Nhiều Agency | Mỗi Agency nhận `final_amount` của mình sau phụ thu/giảm giá được duyệt, trừ phí sàn; tổng phân bổ phải khớp tổng booking |
| Tài khoản nhận | Agency tự nhập (`PUT /api/v1/agency/payout-account`); ngân hàng phải có trong danh sách chi hộ (`VietnamBanks`) |

## Điều kiện

**Chuyển được (cả thủ công):** tour đã hoàn thành, khách đã trả đủ, không có yêu cầu hủy/hoàn tiền đang mở.

Tiền thực thu dùng chung `BookingBilling.NetPaidAmount`: trừ các khoản hoàn giảm giá
`PRICE_REDUCTION` đã hoàn tất, giữ nguyên giao dịch thu gốc. Không chuyển phần tiền đã hoàn
hoặc chưa phân bổ cho Agency chủ trì. Chỉ Agency chủ trì được hoàn thành booking đang diễn ra.
Với booking liên minh, phải đến ngày cuối lịch trình mới được hoàn thành toàn bộ tour.
HDV tiếp tục khởi hành, điểm danh và check-in; không có quyền hoàn thành booking.
Bấm hoàn thành lặp lại trả trạng thái hiện tại, không thay đổi mốc quyết toán hoặc gửi thông báo trùng.

**Tự động chuyển thêm cần:**
- đã tới ngày hẹn;
- **không có khiếu nại đang mở** (Pending / InReview). Có khiếu nại thì Admin giải quyết với Agency rồi chuyển thủ công, bắt buộc ghi chú, có thể chuyển ít hơn để trừ bồi thường;
- Agency đã nhập tài khoản và không đổi tài khoản trong 24 giờ qua (`Settlement:BankAccountCooldownHours`);
- đã cấu hình kênh chi hộ payOS (`PayOsPayout`).

Đủ điều kiện sau ngày hẹn (ví dụ khách trả nốt sau đó) thì lượt quét kế tiếp sẽ chuyển.

## Trạng thái (`booking_agencies.settlement_status`)

```
Unpaid ──HDV hoàn thành──► Ready ──► Processing ──► Paid
                             │   ▲          └──► Failed ──(Admin thử lại / chuyển tay)
                             ▼   │
                            OnHold (Admin tạm giữ)
```

Tour hoàn thành **trước** khi có tính năng này vẫn hiện là "Chờ chuyển" nhưng chỉ chuyển thủ công (`auto_payout_at` = NULL).

## Chống chuyển hai lần

- Mọi thao tác khóa dòng booking trong transaction (cùng khóa với thanh toán / hoàn tiền).
- Đang `Processing` thì không tạo lệnh khác, không ghi nhận chuyển tay, Agency không đổi được tài khoản.
- Mã lệnh `SETTLE-{id}-{lần}` là khóa idempotency gửi payOS: gửi lại không tạo lệnh thứ hai.
- payOS không trả lời rõ (mạng lỗi) → giữ `Processing`, Admin bấm "Kiểm tra". **Không** chuyển tay khi đang `Processing`.

## API

| Ai | API |
|---|---|
| Admin | `GET /api/v1/admin/settlements?status=` · `GET /{id}` · `POST /{id}/payout` (chuyển qua payOS) · `POST /{id}/payout/sync` · `POST /{id}/manual` (đã chuyển tay) · `POST /{id}/hold` · `POST /{id}/release` · `POST /run` (chạy lượt tự động ngay) |
| Agency | `GET/PUT /api/v1/agency/payout-account` · `GET /api/v1/agency/settlements` |

## Cấu hình (`appsettings.Development.json` hoặc user-secrets, KHÔNG commit khóa)

```json
"Settlement": {
  "AutoPayoutEnabled": false,
  "AutoPayoutDelayDays": 2,
  "DefaultFeePercent": 10,
  "WorkerIntervalMinutes": 30,
  "BankAccountCooldownHours": 24
}
```

`AutoPayoutEnabled` mặc định **false**. Bật `true` thì tác vụ chạy ngầm (`SettlementWorker`) tự chuyển **tiền thật** qua chi hộ payOS.
Tác vụ chỉ chạy khi API đang chạy; API tắt đúng ngày hẹn thì lần chạy sau sẽ chuyển bù.
Số dư kênh chi hộ phải đủ (xem ở trang Admin). Tùy cài đặt trên my.payos.vn, lệnh có thể cần duyệt thêm trên payOS.
