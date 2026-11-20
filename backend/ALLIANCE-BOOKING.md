# Booking liên minh theo chặng

## Danh sách khách

Một người có cùng `participant_index` trong booking. Mỗi Agency/chặng được chọn có một dòng `booking_participants` riêng, `agency_id` và `price` riêng. `(booking_id, participant_index, agency_id)` là duy nhất; một dòng đại diện có `is_primary = true`. `creation_key` chống tạo trùng khi gửi lại yêu cầu.

Agency chủ trì xem toàn đoàn hoặc lọc từng Agency. Đối tác chỉ xem khách đang tham gia chặng mình và phần doanh thu/phụ thu của công ty mình. API chi tiết trả `isPartnerView=true`, các trường tổng tiền là giá trị phần phân bổ của đối tác. API danh sách cũng giới hạn số khách và tổng tiền theo Agency. Đối tác không đọc báo giá toàn đoàn, hợp đồng PDF, lịch thanh toán/giao dịch hoặc lịch sử tài chính của công ty khác; toàn bộ lịch trình, khách sạn và nhà hàng được xem chung, có nhãn Agency phụ trách. `agencyDirectory` chỉ chứa mã Agency và tên hiển thị, không chứa doanh thu. Đối tác xem trạng thái xác nhận dịch vụ của bên khác nhưng không nhận giá xác nhận, số lượng hoặc ghi chú nội bộ của bên đó. Quyền cập nhật vẫn giới hạn theo chủ sở hữu từng mục. Tổng số khách tính theo người, không cộng các bản sao. Customer nhận danh sách đã gộp và không thấy bảng phân bổ giá nội bộ. HDV nhận danh sách thuộc chặng công ty mình.

Chỉ Agency chủ trì thêm khách, sửa hồ sơ và chọn/rút chặng. Giá khách mới của tour liên minh lấy từ bảng giá Agency trong đúng phiên bản tour đã booking, theo tuổi tại ngày khởi hành. Không dùng bảng giá tour vừa sửa sau này. Hiện mỗi Agency đại diện một chặng; nhiều chặng độc lập của cùng một Agency chưa có mã chặng riêng.

## Giá và phụ thu

Trước duyệt: thêm/rút chặng cập nhật tổng giá và phần phân bổ Agency. Sau duyệt: giữ nguyên giá gốc, hợp đồng, khoản cọc và khoản tất toán. Khách mới hoặc chặng chưa từng có tạo phụ thu riêng cho Agency tương ứng. Chọn lại chặng đã nằm trong giá trước đó không thu lần hai. Rút khách/chặng chỉ đổi trạng thái, không tự giảm tiền hoặc hoàn tiền; hoàn tiền theo quy trình riêng.

Agency chủ trì tạo phụ thu thủ công phải chọn một Agency có trong booking nhận tiền. Khoản này lưu `payment_requests.beneficiary_agency_id`; lịch thanh toán và nhật ký trả lại đơn vị nhận. Phần phân bổ `booking_agencies.final_amount/net_payout` tăng đúng Agency đó. Phụ thu có thể thanh toán độc lập; đợt 2 vẫn chờ đủ cọc.

Admin xem bảng phân bổ giá gốc, phụ thu đã thu/chưa thu, tổng từng Agency. Bảng này phục vụ đối soát; chưa thực hiện lệnh chuyển tiền ngân hàng tự động.

## Dịch vụ và hướng dẫn viên

Agency đối tác nhận thông báo booking và xuất hiện booking trong danh sách. Mỗi bên chỉ đổi điểm tham quan/khách sạn/nhà hàng có `agency_id` của mình; không sửa giá booking của bên khác. Thông tin ngày trong timeline có API sửa chung. Việc đổi dịch vụ không làm booking quay lại chờ duyệt. Provider được yêu cầu xác nhận lại khi đổi dịch vụ hoặc danh sách khách của chặng thay đổi; việc này độc lập với quyết định duyệt của Agency chủ trì.

Mỗi Agency giao/gỡ HDV công ty mình, phân công điểm thuộc chặng mình. HDV không điểm danh khách hoặc check-in điểm của Agency khác.

## API bổ sung

- `PUT /api/v1/agency/bookings/{id}/participants/{participantIndex}/stages`: `agencyIds`, `reason`, `expectedTotal`, `requestId`.
- `POST /api/v1/agency/bookings/{id}/participants`: bổ sung `agencyIds` khi thêm khách liên minh.
- `POST /api/v1/agency/bookings/{id}/surcharges`: bổ sung `beneficiaryAgencyId`.
- `PUT /api/v1/agency/bookings/{id}/guide-routing`: `locations: [{ locationId, guideIds }]`.
- `PUT /api/v1/agency/bookings/{id}/timeline-days/{dayId}`: `title`, `description`.
- `GET /api/v1/admin/bookings/allocations`, `GET /api/v1/admin/bookings/{id}/allocations`.

Các API chi tiết trả thêm `bookingAgencies`, `attractionCheckins` và chủ sở hữu của các dịch vụ đã chụp tại booking.

## Migration cho team

Migration `20261110142732_AddAllianceBookingStagesAndSurchargeBeneficiaries` gồm file chính, Designer và ModelSnapshot.

Thêm `booking_hotels.agency_id`, `booking_restaurants.agency_id`, `payment_requests.beneficiary_agency_id`, các khóa ngoại và chỉ mục bản sao hành khách theo Agency. Không thêm bảng.

Migration tách các dòng khách liên minh cũ theo giá trong phiên bản đã đặt, giữ tổng giá khách và booking. Chủ sở hữu khách sạn/nhà hàng lấy từ phiên bản đã đặt, thiếu thông tin thì về Agency chủ trì. Phụ thu cũ thuộc Agency tạo nếu có trong booking, nếu không về chủ trì; cần đối soát thủ công nếu khoản cũ thực tế thuộc đối tác. Sao lưu trước khi áp dụng. Down migration chủ động chặn nếu các bản sao có chung creation_key; khôi phục bản backup khi cần hạ cấp an toàn.

Từ thư mục backend:

```powershell
dotnet ef database update --project src/TripOps.Data --startup-project src/TripOps.Api
```

Chuỗi kết nối dùng cấu hình local của từng thành viên. Không chia sẻ khóa cấu hình trong Git.

Khi đối tác đổi dịch vụ/điểm tham quan, `expectedTotal` là phần `totalAmount` mà API đã trả cho chính đối tác (không phải tổng giá booking). Máy chủ so khớp phần phân bổ này và giữ nguyên tổng tiền toàn đoàn.
