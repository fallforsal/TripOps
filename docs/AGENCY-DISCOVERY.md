# Tìm Agency bằng bằng chứng hoạt động

Customer chọn Agency tại trang tạo yêu cầu thiết kế tour. Agency chủ trì dùng cùng bộ chọn ở mục mời đối tác liên minh. Không có bước Agency đăng ký khu vực hoạt động và không thêm bảng dữ liệu mới.

## Dữ liệu và cách tính

- Chỉ hiện tài khoản Agency đang hoạt động, có hồ sơ doanh nghiệp đã duyệt. Agency mới chưa có tour hoặc booking vẫn có thể được chọn trong tab **Tất cả Agency**.
- `tour_provinces` là các địa bàn của tour đang cung cấp, dùng để đối chiếu điểm đến; không chứng minh chuyến đi đã diễn ra.
- Tour đang cung cấp phải ở trạng thái `Completed`, công khai và không phải tour thiết kế riêng. Trong mô hình này, `TourStatus.Completed` nghĩa là hoàn tất thiết kế; **khác** `BookingStatus.Completed`.
- Mỗi booking `Completed` tính một chuyến cho Agency trong `BookingAgencies`, độc lập số hành khách và số phiên bản tour. Booking hủy/chưa hoàn thành không được tính.
- Địa bàn lịch sử đọc từ `Booking.TourConfigurationData`, không lấy từ tour hiện tại. Một Agency phụ trách toàn tour được tính địa bàn trong bản chốt. Tour liên minh một tỉnh ghi nhận tỉnh đó cho các bên tham gia.
- Với tour liên minh nhiều tỉnh, chỉ ghi nhận tỉnh trùng mã/tên chuẩn trong khu vực nhà cung cấp hoặc điểm lưu trú của khách sạn/bữa ăn mặc định thuộc Agency trong bản chốt. Không suy luận địa bàn từ trụ sở hay tên ngày tour; không dùng lựa chọn dịch vụ không được chọn làm mặc định. Đây là cách tính thận trọng: dữ liệu chỉ có tên điểm tham quan tự do có thể chưa đủ căn cứ phân bổ.
- Booking thiếu/hỏng bản chốt hoặc chưa xác định được địa bàn vẫn tính vào tổng chuyến, kèm số chuyến chưa phân bổ. Không tự điền địa bàn cho dữ liệu cũ.
- Đánh giá hiển thị là trung bình các feedback `Visible` của Agency trên toàn hệ thống, có số lượng đánh giá; không phải điểm riêng cho tỉnh.
- Ví dụ chỉ chứa tối đa ba tour công khai phù hợp; không trả thông tin khách, tên tour thiết kế riêng, giá trị booking, nội dung feedback hay bảng giá đối tác.

Kết quả ưu tiên số địa bàn khớp, số booking hoàn thành tại địa bàn, số tour đang cung cấp phù hợp, số đánh giá và điểm trung bình. Dữ liệu này là căn cứ lựa chọn, không phải chứng nhận chuyên môn. Không cộng số chuyến ở từng tỉnh thành tổng chuyến vì một booking có thể qua nhiều tỉnh.

## API

- `GET /api/v1/tour-design-requests/agencies?provinceCode=LAM_DONG,KHANH_HOA`: công khai, trả tất cả Agency đủ điều kiện và `evidence`, xếp theo điểm đến. Không truyền tỉnh thì hiển thị thống kê toàn hệ thống. Mã tỉnh không hợp lệ trả `400`.
- `GET /api/v1/agency/tours/candidate-agencies?provinceCode=LAM_DONG&excludeSelf=true`: yêu cầu quyền Agency, chỉ trả ứng viên có tour công khai hoặc lịch sử phù hợp. Giữ các trường cũ và bổ sung `evidence`.

Các API gửi yêu cầu, mời đối tác, phân quyền chỉnh sửa, chia sẻ phiên bản và booking giữ nguyên kiểm tra nghiệp vụ hiện có. Không bắt buộc phải có lịch sử ở một tỉnh mới được mời.

## Kiểm tra

`AgencyDiscoveryTests.cs` kiểm tra Agency mới, quyền API, mã tỉnh, booking hủy, bản chốt bất biến, không đếm phiên bản, phân bổ tour liên minh nhiều tỉnh, thiếu dữ liệu lịch sử, feedback bị ẩn và dữ liệu công khai. Test candidate hiện có tiếp tục kiểm tra Agency có nhiều tour phù hợp và loại chính mình khỏi ứng viên.
