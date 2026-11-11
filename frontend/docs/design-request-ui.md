# Yêu cầu thiết kế tour — quy ước giao diện

- Giữ font chung của TripOps. Nền trắng `#ffffff`, chữ chính `#0f172a`, chữ phụ `#64748b`, thao tác chính xanh `#075985`, đang hiển thị xanh lá `#047857`, gỡ/thu hồi đỏ `#b91c1c`.
- Bảng ưu tiên thông tin yêu cầu và hành trình. Cột phương án 20%: thumbnail 40px và ô chọn v1/v2…, không lặp tên tour dài. Dòng trạng thái xác nhận đúng phiên bản khách đang xem.
- Chọn phiên bản cập nhật ngay cho khách sau khi API thành công. Đang gửi thì khóa thao tác; lỗi giữ nguyên bản hiện tại và báo bằng Sonner.
- “Xem tour” và “Chỉnh sửa” dùng phiên bản đang được chọn; khi chưa hiển thị bản nào thì dùng bản đang soạn. Xem trước mở trong trang Agency, không đổi phiên bản Customer.
- “Phiên bản & đối tác” mở khu vực có ba tab: Các phiên bản, Đối tác liên minh, Trao đổi với khách. Mỗi phiên bản có Xem chi tiết / Chỉnh sửa / Hiển thị cho khách riêng.
- Đối tác đang chờ có Thu hồi lời mời; đối tác đã nhận có Gỡ khỏi tour. Dùng AlertDialog màu đỏ để nêu rõ việc xóa nội dung trong bản đang soạn trước khi thực hiện.
- Form yêu cầu chỉ giữ tên đoàn/doanh nghiệp và tên, email, điện thoại người đại diện. Không thu thập email công ty/đoàn và điện thoại cơ quan.
