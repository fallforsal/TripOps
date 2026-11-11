# Yêu cầu thiết kế tour — quy ước giao diện

- Giữ font chung của TripOps. Nền trắng `#ffffff`, chữ chính `#0f172a`, chữ phụ `#64748b`, thao tác chính xanh `#075985`, đang hiển thị xanh lá `#047857`, gỡ/thu hồi đỏ `#b91c1c`.
- Bảng ưu tiên thông tin yêu cầu và hành trình. Cột phương án 20%: thumbnail 40px và ô chọn v1/v2…, không lặp tên tour dài. Dòng trạng thái xác nhận đúng phiên bản khách đang xem.
- Chọn phiên bản cập nhật ngay cho khách sau khi API thành công. Đang gửi thì khóa thao tác; lỗi giữ nguyên bản hiện tại và báo bằng Sonner.
- “Xem tour” và “Chỉnh sửa” dùng phiên bản đang được chọn; khi chưa hiển thị bản nào thì dùng bản đang soạn. Xem trước mở trong trang Agency, không đổi phiên bản Customer.
- “Phiên bản & đối tác” mở khu vực có ba tab: Các phiên bản, Đối tác liên minh, Trao đổi với khách. Mỗi phiên bản có Xem chi tiết / Chỉnh sửa / Hiển thị cho khách riêng.
- Liên minh có bộ chọn phiên bản riêng. Đối tác đã nhận có Bỏ khỏi phiên bản; Chấm dứt toàn bộ là hành động khác, cần AlertDialog đỏ giải thích phạm vi và yêu cầu nhận lại lời mời. Không hiển thị nút sửa khi yêu cầu đã đóng/đã booking.
- Form yêu cầu chỉ giữ tên đoàn/doanh nghiệp và tên, email, điện thoại người đại diện. Không thu thập email công ty/đoàn và điện thoại cơ quan.

- Danh sách Agency mặc định chỉ hiện Đang xử lý; có các tab Đã đặt tour, Đã đóng và Lưu trữ. Menu dấu ba chấm có Lưu trữ/Bỏ lưu trữ, Đóng yêu cầu (nhập lý do), Mở lại khi không còn booking hiệu lực. Xem booking chuyển thẳng chi tiết booking.
- Customer có tab Đã đặt tour và Đã đóng/Hủy/Từ chối. Khi đóng, giữ phương án đã chọn để xem, hiển thị lý do, tắt Đặt tour và ô gửi trao đổi. Khi đã booking thì chuyển người dùng sang booking hiện tại.
- Lưu trữ là trạng thái riêng của từng Agency, không biến mất phương án ở Customer. Các dialog và kết quả dùng AlertDialog/Sonner theo giao diện chung.
