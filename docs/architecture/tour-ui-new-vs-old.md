# Tạo/sửa tour: UI mới và UI cũ

Ngày kiểm tra: 2026-11-01. Đọc trực tiếp AgencyTourManagement.tsx của hai FE, wf02Tours.ts, TourContracts.cs, TourService.cs và DBML mới.

## Phạm vi dựng lại được người dùng xác định

Dựng nền BE theo DBML mới, dùng UI TripOps_FE_new thay FE cũ. Giữ tính năng đăng ký/đăng nhập/phân quyền, hồ sơ doanh nghiệp và duyệt đối tác, tìm kiếm/chi tiết tour, booking/tính giá/hành khách/hủy/xác nhận, gán HDV/điểm danh/báo sự cố. Bước hiện tại phân tích riêng tạo/sửa tour trước khi thay mã nguồn ứng dụng.

## Kết luận

Giữ được nghiệp vụ và phần lớn cấu trúc xử lý TourService. Không thể nối nguyên trạng request/response cũ với mọi khả năng của UI mới. Chuyển logic sang nền mới, bổ sung DTO và mapping EF theo DBML, đồng thời thay các handler mock của FE mới bằng API thật.

| Nội dung | FE cũ đang tích hợp | FE mới | BE cần làm |
|---|---|---|---|
| Thông tin tour, số ngày/đêm, khách, giá tuổi, chính sách | Đã có | Vẫn có | Giữ validation, chuyển mapping schema mới |
| Lịch trình và lựa chọn ăn/ở | Đã có, cho nhập cấu hình mặc định và thay thế | Bổ sung thao tác chọn thẻ dịch vụ, xem bài dịch vụ, đổi lựa chọn thành mặc định | Giữ quy tắc phụ thu; mở rộng DTO để giữ ID dịch vụ và dữ liệu cần thiết |
| Gợi ý điểm tham quan | Chủ yếu nhập cấu hình trong form | Gợi ý theo destinationCatalog.ts | Danh mục tĩnh có thể giữ ở FE; điểm được chọn vẫn phải lưu vào lịch trình BE |
| Khách sạn/nhà hàng trên sàn | API catalogue đã có, cấu hình tour cũ không mang ID dịch vụ | Chọn từ mockServices, giữ serviceId | Mở rộng catalogue trả địa chỉ/ảnh/giá tham khảo; validate dịch vụ thuộc loại đúng, còn được phép sử dụng; lưu service_id |
| Dịch vụ ngoài sàn | Có cấu hình theo tên | UI mới có luồng nhập dịch vụ ngoài sàn | service_id NULL, giữ tên/địa chỉ cần thiết; không dùng custom-* làm khóa ngoại |
| Lưu trạng thái | Nháp hoặc hoàn tất/mở bán | Có thêm complete_hidden | Thêm thao tác hoàn tất có kiểm tra đầy đủ nhưng visibility hidden |
| Upload | Upload thật qua API, có trạng thái chờ/lỗi | FileReader.readAsDataURL lưu ảnh base64 trong state | Chuyển lại upload thật, lưu URL HTTPS; BE hiện từ chối data URL |
| Lịch sử phiên bản | API quản lý số version, snapshot bất biến và kiểm tra xung đột | Form tự tạo versionHistory, tăng version cho tour theo yêu cầu | BE tiếp tục quản lý; FE gửi version đang đọc và changeNote, không tự ghi lịch sử |
| Nhân bản | Gọi endpoint duplicate | Sao chép object FE và đặt published/public | Giữ BE duplicate: bản sao là draft/hidden, không copy booking hoặc khách |
| Lưu thành công/thất bại | Có async, saving, lỗi lưu | onSubmit rồi đóng form, không đợi API | Chuyển callback thành async, chỉ đóng khi API lưu thành công |
| Đồng tổ chức và báo giá đối tác | Cả hai form đã có UI | Vẫn có, không phải hoàn toàn mới | BE hiện chủ yếu kiểm tra chủ tour, chưa hỗ trợ quyền chỉnh từng phần của nhiều agency; schema cũng thiếu lời mời cấp tour thông thường |

## Những xử lý cần giữ ở BE

- Agency phải đang hoạt động và hồ sơ được duyệt; kiểm tra chủ sở hữu khi đọc/sửa/ẩn/xóa/khôi phục.
- Kiểm tra số ngày/đêm, giới hạn khách, khoảng tuổi không chồng nhau, ngày lịch trình không trùng và nằm trong thời lượng tour.
- Khi hoàn tất: đủ lịch trình từng ngày, điểm đến, giới hạn khách, giá phân khúc và chính sách cần thiết.
- Mỗi nhóm lựa chọn ăn/ở có phương án mặc định với phụ thu bằng 0; phương án khác lưu mức chênh lệch theo đơn vị giá đã xác định.
- Kiểm tra trùng phiên bản khi hai người cùng sửa; giữ lịch sử cập nhật và khôi phục.
- Tách tour công khai khỏi tour thiết kế riêng; tour theo yêu cầu giữ ẩn. tour_versions chỉ phục vụ lịch sử; không thêm FK từ booking tới version.
- API không tin companyId, giá thanh toán hoặc trạng thái do FE gửi lên như bằng chứng quyền hay xác nhận tài chính.

## Các điểm cần chỉnh cụ thể

1. TourConfiguration hiện chưa có ServiceId trong MealInput/AccommodationInput, Time trong MealInput hoặc agency phụ trách trong từng phần. Apply hiện tạo toàn bộ phần con theo agency chủ tour. Muốn giữ lựa chọn Provider và quyền phối hợp đúng phải bổ sung hợp đồng dữ liệu; nếu nối nguyên trạng sẽ mất thông tin khi tải lại.
2. Mapping mới: destination của API/UI tới tours.location; tên/miêu tả/mặc định bữa ăn tới tour_restaurants.restaurant_name/description/is_default; địa chỉ tới tour_hotels.address; thời gian tới các cột time tương ứng. Không thêm lại tour_hotels.map_url.
3. Phân biệt giá tham khảo dịch vụ và giá tour Agency chốt. UI mới có công thức khách sạn lấy trung bình khoảng giá rồi chia 2 theo giả định hai người/phòng, và helper nhà hàng cũng chia 2. Không dùng những công thức đó làm giá thanh toán mặc định nếu chưa thống nhất đơn vị, số đêm và số người.
4. Không để form mới tự khởi tạo dịch vụ có ID service-1 hoặc Provider giả rồi gửi vào SQL. Gợi ý theo tên không tự chứng minh cơ sở đó là Provider đã được duyệt trên sàn.
5. UI Admin mới có approve/reject tour, nhưng BE cũ theo quy trình Agency tự công khai và Admin ẩn sau công khai. Đây là khác biệt nghiệp vụ ở module kiểm duyệt, không phải chỉ đổi nhãn nút. Không tự thêm bước duyệt trước vào luồng tạo tour khi chưa xác định quy trình.
6. Kiểu API có thể giữ cấu trúc tên quen thuộc để giảm thay đổi FE; entity không cần có tên giống UI. Bổ sung test lưu -> đọc lại giữ được serviceId, phương án mặc định, phụ thu, giờ và ảnh; kiểm tra cập nhật tour không sửa snapshot của booking đã phát sinh.

## Luồng đề xuất

Agency nhập/chọn dữ liệu -> lưu nháp -> BE kiểm tra -> hoàn tất ẩn hoặc công khai -> khách xem/đặt. Sửa tour tạo bản lưu lịch sử mới; đổi trạng thái công khai qua thao tác được kiểm tra riêng. Dùng lại các API create/update/validation/publish/hide/duplicate/versions/restore hiện có về ý nghĩa, mở rộng phần complete_hidden và cấu hình dịch vụ theo schema mới.

Lượt này chỉ phân tích và ghi tài liệu, chưa thay BE/FE hoặc database.
