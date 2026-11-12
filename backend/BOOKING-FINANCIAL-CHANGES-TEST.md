# Test thay dịch vụ, điều chỉnh tiền và danh sách khách liên minh

## Quy tắc

- Agency phụ trách tự đổi khách sạn/nhà hàng của mình. Việc đổi dịch vụ không tự thay tiền khách phải trả.
- Có thể nhập đề nghị chênh lệch khi đổi dịch vụ, hoặc tạo đề nghị tại **Điều chỉnh & Phụ thu**.
- Chủ trì duyệt/từ chối đề nghị. Từ chối bắt buộc nhập lý do. Đối tác chỉ thấy đề nghị và doanh thu của mình.
- Tăng sau khi duyệt booking: tạo khoản phụ thu độc lập có Agency thụ hưởng. Không đổi hợp đồng gốc, không duyệt lại booking, không đổi hạn cọc/đợt 2.
- Giảm sau khi duyệt: ghi credit vào các khoản chưa thu trước (đợt 2, phụ thu, rồi cọc). Nếu tiền đã thu vượt tổng giá mới, tạo yêu cầu hoàn phần dư. Giá gốc trong hợp đồng được giữ làm mốc; tổng phải trả và phân bổ được giảm.
- Hoàn tiền giảm giá dùng trang hoàn tiền Admin nhưng không hủy tour. Customer nhập tài khoản nhận hoàn ở chi tiết booking. Hoàn tiền thật cần giao dịch ngân hàng hoặc cấu hình chi hộ hiện có.
- Số tiền quyết toán mỗi Agency = giá chặng đã chốt + phụ thu thuộc Agency − giảm giá Agency chịu − phí sàn. Không chia lại theo tỷ lệ và không thay tiền của Agency khác.
- Thêm/xóa khách sau khi đặt không bị giới hạn min/max của mẫu tour. Việc đặt ban đầu vẫn giữ điều kiện số lượng khách của tour.
- Chủ trì chọn chặng khi thêm khách: tạo dòng hành khách và phụ thu riêng cho từng Agency theo bảng giá/độ tuổi của phiên bản đã đặt. Gửi lặp cùng request key không thu trùng.
- Thùng rác cho phép xóa khỏi một hoặc tất cả chặng. Dữ liệu được đánh dấu INACTIVE để giữ đối soát; giao diện không hiện khách đã rút. Có thể rút hết khách; đây không phải thao tác hủy booking.
- Xóa khách sau khi duyệt không tự hoàn tiền hoặc xóa khoản thu đã phát hành. Muốn giảm tiền: chủ trì tạo/duyệt khoản giảm cho đúng Agency.

## Test nhanh bằng UI

1. Mở một booking liên minh bằng tài khoản đối tác. Đổi khách sạn/nhà hàng do đối tác tạo; nhập chênh lệch `+100.000`, lưu. Kiểm tra dịch vụ đã đổi, đề nghị **Chờ chủ trì duyệt**, tiền hiện tại chưa đổi. Provider mới nhận yêu cầu xác nhận riêng.
2. Đăng nhập chủ trì, mở booking và xem **Điều chỉnh & Phụ thu**. Bấm Duyệt, xác nhận popup. Tổng tiền tăng 100.000; lịch thu có phụ thu 100.000 thuộc đối tác; tiền chủ trì không đổi. Bấm lại không thu trùng.
3. Tạo đề nghị `-50.000` cho đối tác. Chủ trì duyệt khi khách chưa trả đủ: số tiền còn phải trả giảm 50.000, phần phân bổ đối tác giảm 50.000; hạn thanh toán và hợp đồng gốc giữ nguyên.
4. Với booking đã trả đủ, duyệt một khoản giảm. Customer vào chi tiết booking → **Các khoản điều chỉnh đã duyệt** → **Nhập tài khoản nhận hoàn**. Admin vào hoàn tiền, chọn loại **Hoàn do giảm giá (tour tiếp tục)**, kiểm tra thông tin và xử lý đúng số tiền. Hoàn xong booking vẫn hoạt động, không thành Đã hủy.
5. Chủ trì thêm khách vượt số tối đa của mẫu tour. Chọn riêng chặng B: phụ thu chỉ thuộc B. Chọn A+B: có hai phần thu đúng giá từng chặng. Đối tác không tự thêm/xóa khách.
6. Bấm thùng rác, chọn một chặng hoặc toàn đoàn và nhập lý do. Kiểm tra khách đã rút không còn hiển thị ở chặng đó. Có thể xóa xuống dưới số tối thiểu, kể cả rút hết khách. Tiền đã chốt không tự giảm.
7. Nếu cần giảm tiền sau khi rút khách, tạo các khoản giảm cho từng Agency tương ứng và duyệt. Admin xem **Phân bổ tiền theo Agency**: giá chặng, phụ thu, giảm giá, tổng phân bổ, sau phí sàn và khoản chờ hoàn. Tổng phân bổ hai Agency phải bằng tổng tiền booking mới.

Không duyệt điều chỉnh khi có link payOS đang hiệu lực hoặc Agency đã được quyết toán; hệ thống yêu cầu kiểm tra giao dịch/chờ link hết hạn để tránh thu theo số tiền cũ.

## Database và API

Migration: `20261111155146_AddBookingFinancialChangesAndCredits` (có Designer và ModelSnapshot).

- Thêm bảng `booking_financial_changes`: Agency nhận/chịu tiền, số tăng/giảm, lý do, trạng thái, người đề nghị/người duyệt, request key chống trùng và liên kết yêu cầu hoàn.
- Thêm `payment_requests.credit_amount`, mặc định 0. Không xóa/sửa dữ liệu thanh toán thành công cũ.
- Dùng `refund_requests.reason = PRICE_REDUCTION` để phân biệt hoàn giảm giá với hủy tour.

API chung:

- `GET /api/v1/bookings/{id}/financial-changes`: chủ trì/Admin xem đầy đủ; đối tác chỉ phần mình; Customer chỉ khoản đã duyệt.
- `POST /api/v1/bookings/{id}/financial-changes`: Agency gửi đề nghị, `amount` có dấu; `agencyId` xác định bên nhận/chịu.
- `POST /api/v1/bookings/{id}/financial-changes/{changeId}/decision`: chủ trì approve/reject.
- `PUT /api/v1/bookings/{id}/financial-changes/refunds/{refundId}/account`: Customer cập nhật tài khoản nhận hoàn.
- `POST /api/v1/agency/bookings/{id}/service-changes`: hỗ trợ `proposedAmount`, `financialRequestId` để đổi dịch vụ và gửi đề nghị trong cùng transaction.

## Team pull code

Chạy trong `backend`, sau khi cấu hình đúng SQL Server local:

```powershell
dotnet ef database update --project src/TripOps.Data --startup-project src/TripOps.Api
```

Các test API dùng database SQLite riêng, không chuyển tiền thật và không sửa dữ liệu demo đang dùng.
