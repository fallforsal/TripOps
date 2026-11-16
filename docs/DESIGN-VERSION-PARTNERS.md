# Đối tác theo phiên bản tour thiết kế

- Chủ trì lưu tour trước, chọn phiên bản rồi gửi lời mời. Đối tác phải chấp nhận lời mời của đúng phiên bản trước khi đọc hoặc sửa nội dung tour.
- Chỉ có thao tác **Gỡ đối tác**. API `DELETE /api/v1/agency/tour-design-requests/{id}/co-hosts/{partner}?version={version}` gỡ cả điểm tham quan, bữa ăn, khách sạn, thành viên liên minh và bảng giá của đối tác trong phiên bản được chọn. Giá tổng được tính lại. Bản khác không bị sửa.
- Dòng `tour_version_agencies` được giữ với trạng thái `excluded`, thời điểm phản hồi là lúc gỡ. API trả trạng thái lịch sử `removed`, nhãn giao diện **Đã bị chủ trì gỡ**. Không xóa lời mời khỏi danh sách của đối tác. Đối tác đã bị gỡ chỉ xem thông tin lời mời, không xem tour hoặc thông tin liên hệ khách.
- Gửi lại lời mời vào bản đã gỡ chuyển dòng thành `pending`; phải chấp nhận lại. Đây là trạng thái lời mời hiện tại theo phiên bản, không phải nhật ký từng lần mời lại.
- Khi sao chép thành phiên bản mới, nội dung đã đóng góp được giữ nhưng quyền đối tác không được kế thừa. Thành viên sao chép có trạng thái nội bộ `uninvited` (**Chưa mời vào phiên bản này**), không xuất hiện trong hộp thư đối tác. Chủ trì phải mời rõ phiên bản mới. Bản còn đối tác chưa xác nhận không được chia sẻ/booking.
- Không còn thao tác chấm dứt hợp tác toàn yêu cầu. Tham số cũ `terminate=true` bị từ chối. Các bản ghi chấm dứt toàn bộ từ dữ liệu cũ vẫn bị thu hồi quyền; mời lại một bản không khôi phục quyền ở các bản khác.
- Chỉ chủ trì được gỡ. Yêu cầu đã có booking còn hiệu lực không được thay đổi phương án nguồn. Việc gỡ ghi thông báo có số phiên bản cho đối tác.

Không cần migration mới: dùng bảng thành viên theo phiên bản và các cột thời gian đã có; `status` hiện là chuỗi.

Trang Agency dùng chung mục **Thiết kế tour & Liên minh** (`#/agency/custom-requests`), mở mặc định tab **Tất cả**. Hai tab **Yêu cầu khách hàng** và **Lời mời đối tác** tách theo vai trò chủ trì/được mời; lời mời đã gỡ vẫn xuất hiện trong danh sách. Đường dẫn cũ `#/agency/co-hosting` được chuyển về trang chung, giữ tham số `requestId` để mở đúng yêu cầu từ liên kết chat/thông báo.
