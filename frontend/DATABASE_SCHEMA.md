# THIẾT KẾ CƠ SỞ DỮ LIỆU NỀN TẢNG DU LỊCH ĐA DỊCH VỤ & LIÊN MINH LỮ HÀNH (TOUR PLATFORM)

> **Hướng dẫn sử dụng:**
> 1. Truy cập vào trang web [https://dbdiagram.io/](https://dbdiagram.io/)
> 2. Nhấn nút **"Create Diagram"** hoặc xóa mã mẫu trên trình soạn thảo bên trái.
> 3. Copy toàn bộ đoạn mã trong khối ````dbml ... ```` bên dưới và dán vào [dbdiagram.io](https://dbdiagram.io/).
> 4. Hệ thống sẽ tự động vẽ toàn bộ sơ đồ ERD (Entity Relationship Diagram) với đầy đủ các bảng, quan hệ (1-n, 1-1), khóa chính, khóa ngoại và nhóm màu phân khu.

---

## 1. MÃ NGUỒN DBML (COPY DÁN VÀO DBDATAGRAM.IO)

```dbml
// ============================================================================
// DỰ ÁN: NỀN TẢNG DU LỊCH THÔNG MINH - ĐẶT TOUR, TÙY BIẾN DỊCH VỤ & LIÊN MINH LỮ HÀNH
// HỖ TRỢ: DBDATAGRAM.IO (CÚ PHÁP CHUẨN DBML)
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS (ĐỊNH NGHĨA CÁC KIỂU DỮ LIỆU LIỆT KÊ)
// ----------------------------------------------------------------------------
Enum user_role_enum {
  user [note: 'Khách hàng cá nhân / doanh nghiệp']
  guide [note: 'Hướng dẫn viên du lịch']
  admin [note: 'Quản trị viên nền tảng']
  provider [note: 'Nhà cung cấp dịch vụ bên thứ 3']
  company_admin [note: 'Quản trị viên công ty lữ hành']
}

Enum company_status_enum {
  pending [note: 'Chờ xét duyệt hồ sơ']
  approved [note: 'Đã duyệt hoạt động']
  rejected [note: 'Từ chối cấp phép']
  suspended [note: 'Tạm khóa / Đình chỉ']
}

Enum provider_type_enum {
  accommodation [note: 'Lưu trú (Khách sạn, Resort, Homestay)']
  fnb [note: 'Ẩm thực & Nhà hàng']
  attraction [note: 'Điểm tham quan & Vé danh thắng']
  adventure [note: 'Hoạt động trải nghiệm / Thể thao mạo hiểm']
  support [note: 'Dịch vụ hỗ trợ du lịch']
  transportation [note: 'Dịch vụ vận chuyển / Trung chuyển']
}

Enum service_category_enum {
  hotel [note: 'Khách sạn / Resort']
  restaurant [note: 'Nhà hàng ẩm thực']
  cafe [note: 'Quán cafe / Trà sữa / Điểm ngắm cảnh']
  attraction [note: 'Điểm tham quan / Check-in']
  activity [note: 'Trải nghiệm văn hóa / Mạo hiểm']
  transportation [note: 'Xe limousine / Cano cao tốc / Tàu hỏa']
}

Enum tour_type_enum {
  public [note: 'Tour mở bán đại trà']
  custom_request [note: 'Tour thiết kế riêng theo yêu cầu']
}

Enum cohost_role_enum {
  lead [note: 'Đơn vị Chủ trì tour (Quản lý hợp đồng & xe)']
  partner [note: 'Đối tác Chuyên môn địa phương']
}

Enum custom_request_status_enum {
  pending [note: 'Chờ công ty tiếp nhận']
  reviewing [note: 'Đang khảo sát & trao đổi']
  designed [note: 'Đã hoàn thiện bản thiết kế']
  quoted [note: 'Đã chốt gửi báo giá']
  accepted [note: 'Khách hàng đã đồng ý']
  rejected [note: 'Từ chối tiếp nhận']
  cancelled [note: 'Khách hủy yêu cầu']
}

Enum booking_status_enum {
  pending [note: 'Chờ chốt giá & duyệt tùy biến']
  confirmed [note: 'Đã xác nhận chính thức']
  completed [note: 'Đoàn đã hoàn thành tour']
  cancelled [note: 'Đã hủy đơn']
  rejected [note: 'Công ty từ chối nhận']
}

Enum payment_status_enum {
  unpaid [note: 'Chưa thanh toán (Thanh toán sau theo đợt)']
  paid [note: 'Đã thanh toán']
  refunded [note: 'Đã hoàn tiền']
}

Enum payment_request_status_enum {
  pending [note: 'Chờ khách nộp tiền']
  paid [note: 'Khách đã chuyển khoản vào TK Escrow']
  overdue [note: 'Quá thời hạn nộp']
  cancelled [note: 'Đã hủy yêu cầu thanh toán']
}

Enum settlement_status_enum {
  pending [note: 'Đang giữ tiền Escrow chờ quyết toán']
  settled [note: 'Admin sàn đã đối soát & giải ngân']
}

Enum incident_severity_enum {
  low [note: 'Nhẹ - Không ảnh hưởng lịch trình']
  medium [note: 'Trung bình - Cần điều chỉnh nhẹ']
  high [note: 'Nghiêm trọng - Cần hỗ trợ ngay']
  critical [note: 'Khẩn cấp - Nguy hiểm / Đình trệ tour']
}

// ============================================================================
// BẢNG 1: NGƯỜI DÙNG & TÀI KHOẢN (USERS & AUTHENTICATION)
// ============================================================================
Table users {
  id varchar(36) [pk, note: 'UUID định danh duy nhất người dùng']
  name varchar(150) [not null, note: 'Họ và tên hiển thị']
  email varchar(191) [unique, not null, note: 'Email chính đăng nhập']
  phone varchar(30) [note: 'Số điện thoại liên hệ']
  password_hash varchar(255) [note: 'Mật khẩu đã băm bcrypt/argon2']
  role user_role_enum [not null, default: 'user', note: 'Vai trò người dùng trong hệ thống']
  avatar varchar(500) [note: 'Đường dẫn ảnh đại diện']
  status varchar(30) [not null, default: 'active', note: 'active, inactive, banned']
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Bảng người dùng tập trung của hệ thống, quản lý đa phân quyền'
}

Table user_alias_emails {
  id varchar(36) [pk]
  user_id varchar(36) [not null]
  email varchar(191) [not null, unique, note: 'Email phụ tương đương (Google, FPT domain, v.v.)']
  is_verified boolean [not null, default: true]
  created_at timestamp [not null, default: `now()` ]

  Note: 'Hỗ trợ 1 tài khoản đăng nhập được bằng nhiều email alias (như khachhang.fpt@gmail.com, dang.ph@fpt.com)'
}

// ============================================================================
// BẢNG 2: DOANH NGHIỆP LỮ HÀNH & HƯỚNG DẪN VIÊN (COMPANIES & GUIDES)
// ============================================================================
Table tour_companies {
  id varchar(36) [pk]
  admin_id varchar(36) [not null, unique, note: 'User ID của tài khoản quản lý công ty (role company_admin)']
  name varchar(255) [not null, note: 'Tên pháp nhân công ty lữ hành']
  tax_code varchar(50) [not null, unique, note: 'Mã số thuế doanh nghiệp']
  license_number varchar(100) [note: 'Số giấy phép kinh doanh lữ hành quốc tế/nội địa']
  email varchar(191) [not null, note: 'Email chính thức của doanh nghiệp']
  phone varchar(50) [not null, note: 'Hotline công ty']
  address text [not null, note: 'Địa chỉ trụ sở chính']
  website varchar(255) [note: 'Website doanh nghiệp']
  description text [note: 'Giới thiệu năng lực công ty']
  logo varchar(500) [note: 'Logo công ty']
  cover_image varchar(500) [note: 'Ảnh bìa công ty']
  status company_status_enum [not null, default: 'pending']
  rejection_reason text [note: 'Lý do Admin sàn từ chối duyệt']
  rating decimal(3,2) [default: 5.0, note: 'Điểm đánh giá trung bình từ khách']
  bank_name varchar(150) [note: 'Ngân hàng thụ hưởng nhận giải ngân']
  bank_account_number varchar(50) [note: 'Số tài khoản nhận tiền quyết toán']
  bank_account_holder varchar(150) [note: 'Tên chủ tài khoản ngân hàng']
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Hồ sơ pháp lý và thông tin ngân hàng của các công ty lữ hành tham gia nền tảng'
}

Table guides {
  id varchar(36) [pk]
  user_id varchar(36) [not null, unique, note: 'Liên kết tài khoản user (role guide)']
  company_id varchar(36) [not null, note: 'Công ty lữ hành chủ quản của HDV']
  license_number varchar(100) [note: 'Số thẻ hướng dẫn viên du lịch']
  license_expiry_date date [note: 'Ngày hết hạn thẻ HDV']
  guide_type varchar(30) [default: 'domestic', note: 'domestic (nội địa), international (quốc tế)']
  experience_years int [default: 1, note: 'Số năm kinh nghiệm làm nghề']
  guide_status varchar(30) [not null, default: 'active', note: 'active, inactive, on_tour']
  bio text [note: 'Giới thiệu thế mạnh, tính cách HDV']
  languages text [note: 'Danh sách ngôn ngữ hướng dẫn dạng mảng JSON hoặc text']
  specialties text [note: 'Chuyên môn: leo núi, văn hóa bản địa, gala MC, v.v.']
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Hồ sơ năng lực của Hướng dẫn viên du lịch trực thuộc công ty lữ hành'
}

// ============================================================================
// BẢNG 3: NHÀ CUNG CẤP DỊCH VỤ NỀN TẢNG (SERVICE PROVIDERS & SERVICES)
// ============================================================================
Table service_providers {
  id varchar(36) [pk]
  user_id varchar(36) [not null, unique, note: 'Tài khoản người dùng (role provider)']
  provider_type provider_type_enum [not null, note: 'Loại hình cung cấp (lưu trú, ăn uống, tham quan...)']
  business_name varchar(255) [not null, note: 'Tên cơ sở kinh doanh / Doanh nghiệp đối tác']
  representative_name varchar(150) [note: 'Người đại diện pháp luật / Quản lý cơ sở']
  tax_code varchar(50) [note: 'Mã số thuế cơ sở']
  phone varchar(50) [not null, note: 'Số điện thoại liên hệ đặt dịch vụ']
  email varchar(191) [not null, note: 'Email liên hệ kinh doanh']
  address text [not null, note: 'Địa chỉ đầy đủ']
  province varchar(100) [not null, note: 'Tỉnh / Thành phố']
  ward varchar(100) [note: 'Phường / Xã']
  street varchar(255) [note: 'Số nhà, ngõ ngách, tên đường']
  latitude decimal(10,8) [note: 'Tọa độ Vĩ độ GPS hiển thị trên Google Map']
  longitude decimal(11,8) [note: 'Tọa độ Kinh độ GPS hiển thị trên Google Map']
  description text [note: 'Mô tả tổng quan cơ sở dịch vụ']
  status varchar(30) [not null, default: 'approved', note: 'pending, approved, rejected']
  rejection_reason text
  bank_name varchar(150) [note: 'Ngân hàng nhận thanh toán trực tiếp từ công ty']
  bank_account_number varchar(50)
  bank_account_holder varchar(150)
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Mạng lưới Đối tác cung ứng dịch vụ tại địa phương của Nền tảng'
}

Table services {
  id varchar(36) [pk]
  provider_id varchar(36) [not null, note: 'Đơn vị đối tác sở hữu dịch vụ này']
  name varchar(255) [not null, note: 'Tên dịch vụ (VD: Khách Sạn Heritage Đà Lạt, Lẩu gà lá é Heritage)']
  category service_category_enum [not null, note: 'hotel, restaurant, cafe, attraction, activity, transportation']
  sub_category varchar(100) [note: 'Chi tiết phân loại: resort, homestay, fine-dining, cano, v.v.']
  description text [note: 'Tóm tắt giới thiệu ngắn về dịch vụ']
  detailed_blog_content text [note: 'Bài viết chi tiết (Blog/Review) giới thiệu dịch vụ trước khi khách chọn']
  price decimal(15,2) [not null, default: 0, note: 'Giá chuẩn hoặc giá niêm yết']
  price_from decimal(15,2) [note: 'Khoảng giá từ (VNĐ)']
  price_to decimal(15,2) [note: 'Khoảng giá đến (VNĐ)']
  price_per_person decimal(15,2) [note: 'Giá theo đầu người (đối với suất ăn, vé tham quan)']
  location varchar(255) [note: 'Tên khu vực (VD: TP. Đà Lạt, TP. Nha Trang)']
  province varchar(100) [not null, note: 'Tỉnh/Thành phố']
  ward varchar(100) [note: 'Phường/Xã']
  street varchar(255) [note: 'Tên đường, số nhà']
  latitude decimal(10,8) [note: 'Tọa độ Vĩ độ GPS để ghim lên Google Map']
  longitude decimal(11,8) [note: 'Tọa độ Kinh độ GPS để ghim lên Google Map']
  image varchar(500) [not null, note: 'Ảnh đại diện chính của dịch vụ']
  rating decimal(3,2) [default: 5.0, note: 'Điểm đánh giá sao']
  capacity int [note: 'Sức chứa tối đa (số phòng hoặc số chỗ ăn cùng lúc)']
  status varchar(30) [not null, default: 'approved', note: 'pending, approved, rejected']
  rejection_reason text
  // Thuộc tính chuyên biệt cho Khách sạn (Hotel)
  hotel_stars int [note: 'Số sao khách sạn (1 - 5 sao)']
  hotel_total_rooms int [note: 'Tổng số phòng của khách sạn']
  hotel_check_in_time varchar(20) [default: '14:00']
  hotel_check_out_time varchar(20) [default: '12:00']
  hotel_room_type varchar(100) [note: 'Loại phòng chuẩn (Deluxe, Superior...)']
  hotel_amenities text [note: 'JSON mảng tiện ích: Wifi, Bể bơi, Ăn sáng, Spa...']
  hotel_policies text [note: 'Chính sách nhận/trả phòng, trẻ em']
  // Thuộc tính chuyên biệt cho Nhà hàng / FnB
  fnb_opening_hours varchar(100) [note: 'Giờ mở cửa: 06:30 - 22:00']
  fnb_cuisine_type varchar(100) [note: 'Ẩm thực: Đặc sản Tây Nguyên, Hải sản Nha Trang...']
  fnb_dietary_options text [note: 'Tùy chọn ăn uống: Ăn chay, Không cay, Đồ uống có cồn...']
  // Thuộc tính chuyên biệt cho Điểm tham quan / Vé (Attraction)
  attraction_child_price decimal(15,2) [note: 'Giá vé trẻ em']
  attraction_ticket_includes text [note: 'Bao gồm trong vé: Cáp treo, Xe điện...']
  // Thuộc tính chuyên biệt cho Vận chuyển & Trải nghiệm
  transport_vehicle_type varchar(100) [note: 'Loại phương tiện: Limousine 9 chỗ, Universe 45 chỗ...']
  transport_seats int [note: 'Số ghế ngồi']
  activity_duration varchar(100) [note: 'Thời lượng trải nghiệm: 2 giờ, Nửa ngày...']
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Kho dịch vụ đối tác độc lập của Nền tảng để khách hàng chọn thay thế trong Tour'
}

Table service_images {
  id varchar(36) [pk]
  service_id varchar(36) [not null]
  image_url varchar(500) [not null]
  is_thumbnail boolean [default: false]
  display_order int [default: 0]
  created_at timestamp [not null, default: `now()` ]

  Note: 'Bộ sưu tập hình ảnh chi tiết của dịch vụ đối tác'
}

Table room_bookings {
  id varchar(36) [pk]
  service_id varchar(36) [not null, note: 'Khách sạn được đặt trực tiếp']
  provider_id varchar(36) [not null]
  guest_name varchar(150) [not null]
  guest_email varchar(191) [not null]
  guest_phone varchar(50) [not null]
  check_in_date date [not null]
  check_out_date date [not null]
  number_of_guests int [not null, default: 2]
  number_of_rooms int [not null, default: 1]
  total_price decimal(15,2) [not null]
  status varchar(30) [not null, default: 'pending', note: 'pending, confirmed, cancelled, completed']
  special_requests text
  rejection_reason text
  created_at timestamp [not null, default: `now()` ]

  Note: 'Quản lý đơn đặt phòng trực tiếp với Nhà cung cấp dịch vụ lưu trú'
}

// ============================================================================
// BẢNG 4: TOUR & LỊCH TRÌNH CHI TIẾT (TOURS & ITINERARIES)
// ============================================================================
Table tours {
  id varchar(36) [pk]
  tour_code varchar(50) [unique, not null, note: 'Mã tour: VT-8801, TC-9901...']
  name varchar(255) [not null, note: 'Tên chương trình tour']
  company_id varchar(36) [not null, note: 'Công ty chủ trì tour']
  destination varchar(255) [not null, note: 'Điểm đến: Đà Lạt – Nha Trang, Hà Giang...']
  departure_city varchar(100) [note: 'Điểm xuất phát: TP.HCM, Hà Nội...']
  duration varchar(100) [not null, note: '4 ngày 3 đêm, 3 ngày 2 đêm...']
  number_of_days int [not null, default: 1]
  number_of_nights int [not null, default: 0]
  price decimal(15,2) [not null, note: 'Giá bán cơ bản của tour']
  description text [note: 'Mô tả chi tiết tổng quan tour']
  image varchar(500) [not null, note: 'Ảnh đại diện chính']
  rating decimal(3,2) [default: 5.0]
  min_guests int [not null, default: 10]
  max_guests int [not null, default: 45]
  operation_period varchar(150) [note: 'Khung thời gian vận hành: Tháng 1 - Tháng 6']
  tour_type tour_type_enum [not null, default: 'public', note: 'public (tour mở), custom_request (tour đoàn thiết kế riêng)']
  custom_request_id varchar(36) [note: 'Liên kết tới yêu cầu thiết kế riêng nếu là custom_request']
  target_user_id varchar(36) [note: 'ID khách hàng đặt làm tour này']
  target_customer_name varchar(150)
  target_customer_phone varchar(50)
  target_customer_email varchar(191)
  version int [default: 1, note: 'Phiên bản thiết kế hiện tại (v1, v2, v3...)']
  change_note text [note: 'Ghi chú các thay đổi trong phiên bản hiện tại']
  is_co_hosted boolean [not null, default: false, note: 'Có phải tour phối hợp liên minh nhiều công ty không']
  platform_fee_rate decimal(5,2) [not null, default: 0.00, note: 'Tỷ lệ phí sàn ký quỹ Escrow (hiện tại 0%)']
  pricing_status varchar(50) [default: 'draft', note: 'draft, pending_partner_quote, quoted, approved_by_customer']
  status varchar(30) [not null, default: 'published', note: 'draft, pending_approval, published, rejected, hidden']
  rejection_reason text
  created_by_user_id varchar(36) [note: 'Người trực tiếp nhập tour']
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Bảng trung tâm lưu trữ thông tin Tour (cả tour mở đại trà và tour thiết kế riêng theo yêu cầu)'
}

Table tour_images {
  id varchar(36) [pk]
  tour_id varchar(36) [not null]
  image_url varchar(500) [not null]
  display_order int [default: 0]

  Note: 'Album ảnh slide banner của Tour'
}

Table tour_highlights {
  id varchar(36) [pk]
  tour_id varchar(36) [not null]
  highlight_text varchar(255) [not null]
  display_order int [default: 0]

  Note: 'Các điểm nhấn nổi bật nhất trong chương trình tour'
}

Table tour_policies {
  id varchar(36) [pk]
  tour_id varchar(36) [not null]
  policy_type varchar(30) [not null, note: 'inclusion (bao gồm), exclusion (không bao gồm), regulation (quy định), cancel_rule (chính sách hủy)']
  content text [not null]
  display_order int [default: 0]

  Note: 'Điều khoản dịch vụ bao gồm, không bao gồm và quy định của Tour'
}

Table tour_price_table {
  id varchar(36) [pk]
  tour_id varchar(36) [not null]
  age_group varchar(50) [not null, note: 'adult (người lớn), child_2_11 (trẻ em), child_under_2 (em bé)']
  age_group_label varchar(100) [not null, note: 'Người lớn, Trẻ em (2–11 tuổi), Em bé (<2 tuổi)']
  age_range varchar(100) [note: 'Từ 11 tuổi trở lên, Từ 2 đến dưới 11 tuổi...']
  hotel_type varchar(100) [note: 'Phòng tiêu chuẩn 2 khách, phòng đơn...']
  price decimal(15,2) [not null, note: 'Đơn giá vé theo độ tuổi']

  Note: 'Bảng giá vé phân bổ theo từng độ tuổi và cơ cấu phòng'
}

Table tour_departure_dates {
  id varchar(36) [pk]
  tour_id varchar(36) [not null]
  departure_date date [not null]
  price decimal(15,2) [not null]
  seats_available int [not null, default: 30]
  label varchar(100) [note: 'Cuối tuần, Dịp lễ 30/4, Tết...']

  Note: 'Lịch khởi hành cố định cho các tour đại trà'
}

Table daily_itineraries {
  id varchar(36) [pk]
  tour_id varchar(36) [not null]
  day_number int [not null, note: 'Ngày 1, Ngày 2, Ngày 3...']
  date varchar(50) [note: 'Ngày tháng cụ thể hoặc dạng tương đối']
  title varchar(255) [not null, note: 'Tiêu đề ngày: TP.HCM – Đà Lạt – Terracotta Resort']
  description text [note: 'Mô tả chi tiết hoạt động trong ngày']
  destination_city varchar(100) [note: 'Thành phố hoạt động ngày này: Đà Lạt, Nha Trang...']
  created_by_company_id varchar(36) [note: 'Công ty thiết kế & chịu trách nhiệm chính ngày này']
  // Điểm hẹn bàn giao giữa 2 công ty liên minh
  is_handover_day boolean [not null, default: false, note: 'Đánh dấu ngày chuyển giao đoàn giữa 2 công ty']
  handover_time varchar(20) [note: 'Giờ bàn giao: 12:30']
  handover_location varchar(255) [note: 'Điểm hẹn bàn giao: Trạm dừng chân Đèo Khánh Lê']
  handover_note text [note: 'Ghi chú bàn giao HDV & danh sách đoàn']

  Note: 'Lịch trình chi tiết từng ngày của Tour'
}

Table itinerary_locations {
  id varchar(36) [pk]
  daily_itinerary_id varchar(36) [not null]
  name varchar(255) [not null, note: 'Tên điểm đến: Quảng trường Lâm Viên, Tháp Trầm Hương...']
  address varchar(255) [not null]
  time varchar(30) [note: 'Giờ tham quan: 08:30, 14:30']
  latitude decimal(10,8) [note: 'Tọa độ GPS điểm đến']
  longitude decimal(11,8)
  created_by_company_id varchar(36)
  display_order int [default: 0]

  Note: 'Các điểm tham quan, hoạt động chi tiết trong từng ngày của lịch trình'
}

Table itinerary_hotels {
  id varchar(36) [pk]
  daily_itinerary_id varchar(36) [not null, unique]
  service_id varchar(36) [note: 'Liên kết tới Provider Service nếu chọn từ kho dịch vụ Sàn']
  name varchar(255) [not null, note: 'Tên khách sạn mặc định: Terracotta Hotel & Resort Dalat']
  destination varchar(100)
  stars int [default: 3]
  price_per_night decimal(15,2) [not null, default: 0]
  nights int [default: 1]
  address varchar(255)
  image varchar(500)
  description text
  allow_custom_hotel_request boolean [not null, default: true, note: 'Cho phép khách tự đề xuất khách sạn ngoài danh sách']
  created_by_company_id varchar(36)

  Note: 'Khách sạn lưu trú tiêu chuẩn của từng ngày do công ty lữ hành thiết lập'
}

Table tour_alternative_hotels {
  id varchar(36) [pk]
  itinerary_hotel_id varchar(36) [not null]
  service_id varchar(36) [note: 'Dịch vụ của Đối tác nền tảng (nếu là dịch vụ có sẵn trên sàn)']
  name varchar(255) [not null, note: 'Tên khách sạn nâng cấp/đổi hạng']
  price_difference decimal(15,2) [not null, note: 'Chênh lệch tiền/đêm so với KS mặc định (+450.000, -200.000)']
  stars int [default: 4]
  description text
  address varchar(255)

  Note: 'Danh sách khách sạn đổi hạng cho khách hàng lựa chọn kèm giá chênh lệch'
}

Table itinerary_meals {
  id varchar(36) [pk]
  daily_itinerary_id varchar(36) [not null]
  meal_type varchar(20) [not null, note: 'breakfast (sáng), lunch (trưa), dinner (tối)']
  service_id varchar(36) [note: 'Liên kết với Provider Service nếu lấy từ kho Sàn']
  service_name varchar(255) [not null, note: 'Tên nhà hàng/món ăn: Gala Dinner Nhà hàng Biển Xanh']
  price_per_person decimal(15,2) [not null, default: 0, note: 'Đơn giá suất ăn/người']
  description text
  allow_custom_meal_request boolean [not null, default: true, note: 'Cho phép khách tự đề xuất nhà hàng']
  created_by_company_id varchar(36)

  Note: 'Bữa ăn tiêu chuẩn theo lịch trình ngày'
}

Table tour_alternative_meals {
  id varchar(36) [pk]
  itinerary_meal_id varchar(36) [not null]
  service_id varchar(36) [note: 'Dịch vụ của đối tác F&B trên sàn nếu có']
  restaurant_name varchar(255) [not null, note: 'Tên nhà hàng thay thế']
  price_difference decimal(15,2) [not null, note: 'Chênh lệch tiền/suất (+60.000, -30.000)']
  description text
  address varchar(255)

  Note: 'Các nhà hàng thay thế / đổi món được công ty hoặc đối tác gợi ý'
}

// ============================================================================
// BẢNG 5: LIÊN MINH LỮ HÀNH & QUẢN LÝ PHIÊN BẢN (ALLIANCE & VERSIONING)
// ============================================================================
Table tour_co_hosts {
  id varchar(36) [pk]
  tour_id varchar(36) [not null]
  company_id varchar(36) [not null, note: 'Công ty tham gia liên minh']
  role cohost_role_enum [not null, default: 'partner', note: 'lead (chủ trì), partner (đối tác chặng)']
  status varchar(30) [not null, default: 'pending', note: 'pending, accepted, rejected']
  rejection_reason text
  assigned_segments varchar(255) [note: 'Chặng phụ trách: Chặng TP.HCM – Đà Lạt, Chặng Nha Trang – Biển đảo...']
  assigned_days text [note: 'JSON mảng các ngày phụ trách: [1, 2] hoặc [3, 4]']
  // Cơ chế Cost Aggregation (Báo giá chi phí chặng độc lập)
  estimated_budget_per_guest decimal(15,2) [note: 'Ngân sách dự kiến/khách trao đổi ban đầu']
  quote_per_guest decimal(15,2) [note: 'Báo giá chi phí thực tế phần công ty phụ trách (VNĐ/khách)']
  quote_status varchar(30) [default: 'draft', note: 'draft, submitted']
  quote_note text [note: 'Diễn giải các dịch vụ bao gồm trong báo giá chặng']
  quoted_at timestamp [note: 'Thời điểm công ty chốt gửi báo giá chặng']
  fixed_payout_amount decimal(15,2) [note: 'Tổng kinh phí chặng khoán trọn gói']
  notes text [note: 'Thỏa thuận hợp tác giữa 2 công ty']
  invited_at timestamp [not null, default: `now()` ]
  responded_at timestamp
  settlement_status settlement_status_enum [default: 'pending']
  settled_amount decimal(15,2) [default: 0]

  Note: 'Cơ chế B2B Liên minh Lữ hành: Báo giá độc lập từng chặng & cộng dồn chi phí (Cost Aggregation)'
}

Table tour_versions {
  id varchar(36) [pk]
  tour_id varchar(36) [not null]
  version_number int [not null, note: '1, 2, 3...']
  change_note text [note: 'Ghi chú thay đổi giữa các phiên bản thiết kế']
  tour_snapshot json [not null, note: 'Toàn bộ snapshot dữ liệu tour tại thời điểm lưu version']
  created_by_user_id varchar(36)
  created_at timestamp [not null, default: `now()` ]

  Note: 'Lịch sử phiên bản Tour thiết kế riêng biệt để backup / hoàn tác (Version History)'
}

// ============================================================================
// BẢNG 6: YÊU CẦU THIẾT KẾ TOUR RIÊNG (CUSTOM TOUR REQUESTS)
// ============================================================================
Table custom_tour_requests {
  id varchar(36) [pk]
  user_id varchar(36) [note: 'Khách hàng có tài khoản gửi yêu cầu']
  business_name varchar(255) [note: 'Tên công ty / Doanh nghiệp đặt tour đoàn (VD: Tập đoàn FPT)']
  business_email varchar(191)
  business_phone varchar(50)
  contact_name varchar(150) [not null, note: 'Họ tên người phụ trách đoàn']
  contact_email varchar(191) [not null]
  contact_phone varchar(50) [not null]
  destinations varchar(255) [not null, note: 'Tuyến điểm mong muốn: Đà Lạt – Nha Trang 4N3Đ...']
  departure_date date [not null]
  return_date date [not null]
  number_of_people int [not null, default: 20]
  budget_per_person decimal(15,2) [note: 'Ngân sách dự kiến/người']
  hotel_stars varchar(50) [note: 'Hạng sao mong muốn: 3 sao, 4 sao, 5 sao']
  additional_info text [note: 'Yêu cầu đặc biệt: Team building bãi biển, tiệc gala dinner riêng...']
  target_company_id varchar(36) [not null, note: 'Công ty lữ hành tiếp nhận yêu cầu']
  status custom_request_status_enum [not null, default: 'pending']
  company_note text [note: 'Ghi chú phản hồi của công ty lữ hành cho khách']
  quoted_price_per_person decimal(15,2) [note: 'Giá công ty chào bán lại/khách']
  designed_tour_id varchar(36) [note: 'Tour độc quyền được tạo ra cho yêu cầu này']
  current_version int [default: 1]
  is_co_hosted boolean [not null, default: false, note: 'Có mời thêm công ty đối tác liên minh không']
  response_at timestamp
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Khách đoàn / Doanh nghiệp gửi yêu cầu thiết kế tour riêng biệt'
}

Table custom_request_co_hosts {
  id varchar(36) [pk]
  custom_tour_request_id varchar(36) [not null]
  company_id varchar(36) [not null]
  role cohost_role_enum [not null, default: 'partner']
  status varchar(30) [not null, default: 'pending']
  assigned_segments varchar(255)
  quote_per_guest decimal(15,2)
  notes text
  invited_at timestamp [not null, default: `now()` ]
  responded_at timestamp

  Note: 'Lời mời công ty liên minh phối hợp thực hiện yêu cầu tour riêng'
}

// ============================================================================
// BẢNG 7: ĐẶT TOUR, HÀNH KHÁCH & TÙY BIẾN (BOOKINGS & CUSTOMIZATIONS)
// ============================================================================
Table bookings {
  id varchar(36) [pk]
  booking_code varchar(50) [unique, not null, note: 'Mã hiển thị: #booking-1, #booking-cohost-1...']
  tour_id varchar(36) [not null]
  user_id varchar(36) [not null, note: 'Tài khoản người đặt']
  user_name varchar(150) [not null]
  user_email varchar(191) [not null]
  contact_name varchar(150) [not null]
  contact_phone varchar(50) [not null]
  contact_email varchar(191) [not null]
  contact_address text
  booking_notes text [note: 'Ghi chú của khách khi đặt: Ăn chay, người già đi xe lăn...']
  number_of_guests int [not null, default: 1]
  total_price decimal(15,2) [not null, note: 'Tổng tiền tour thực tế cần thanh toán']
  original_total_price decimal(15,2) [note: 'Tổng tiền trước khi công ty điều chỉnh phụ thu/giảm trừ']
  price_adjustment_note text [note: 'Diễn giải điều chỉnh: Phụ thu nâng cấp phòng Heritage...']
  price_adjusted_at timestamp
  status booking_status_enum [not null, default: 'pending']
  booking_date date [not null, default: `now()`]
  tour_start_date date [not null]
  company_id varchar(36) [not null, note: 'Công ty chủ trì điều hành']
  guide_id varchar(36) [note: 'Hướng dẫn viên được công ty phân công phụ trách']
  // Trạng thái thanh toán theo mô hình linh hoạt (không dùng cọc cứng)
  payment_status payment_status_enum [not null, default: 'unpaid', note: 'unpaid (chờ thanh toán), paid (đã thanh toán), refunded (đã hoàn)']
  remaining_amount decimal(15,2) [not null, default: 0, note: 'Số tiền còn lại cần nộp']
  // Quyết toán tài chính Escrow từ Admin Sàn
  settlement_status settlement_status_enum [not null, default: 'pending', note: 'pending, settled']
  settled_amount decimal(15,2) [default: 0, note: 'Số tiền thực tế sàn đã giải ngân cho công ty']
  settled_at timestamp
  platform_fee_rate decimal(5,2) [default: 0.00, note: 'Tỷ lệ phí sàn ký quỹ Escrow (hiện tại 0%)']
  platform_fee_amount decimal(15,2) [default: 0.00, note: 'Số tiền phí sàn khấu trừ (0đ)']
  is_co_hosted boolean [not null, default: false, note: 'Tour liên minh nhiều công ty']
  has_location_customization boolean [not null, default: false, note: 'Khách có tùy biến dịch vụ không']
  rejection_reason text
  cancellation_reason text
  rejected_by varchar(30) [note: 'admin, customer, company']
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Đơn đặt tour chính của khách hàng, quản lý toàn diện dòng tiền Escrow và phân bổ liên minh'
}

Table booking_passengers {
  id varchar(36) [pk]
  booking_id varchar(36) [not null]
  full_name varchar(150) [not null, note: 'Họ và tên hành khách đi tour']
  date_of_birth date [not null]
  gender varchar(10) [not null, note: 'male, female']
  age_group varchar(30) [not null, note: 'adult, child_2_11, child_under_2']
  price decimal(15,2) [not null, note: 'Đơn giá vé áp dụng cho hành khách này']
  phone varchar(50)
  email varchar(191)
  id_number varchar(50) [note: 'Số CCCD / Hộ chiếu để làm bảo hiểm du lịch']
  notes text [note: 'Tiền sử bệnh lý, dị ứng thức ăn...']
  departure_attendance varchar(20) [default: 'present', note: 'Điểm danh xuất phát: present (có mặt), late (trễ), absent (vắng)']
  departure_check_in_time timestamp

  Note: 'Danh sách hành khách tham gia chuyến đi, phục vụ điểm danh khởi hành và mua bảo hiểm'
}

Table booking_co_hosts {
  id varchar(36) [pk]
  booking_id varchar(36) [not null]
  company_id varchar(36) [not null]
  role cohost_role_enum [not null, default: 'partner']
  status varchar(30) [not null, default: 'accepted']
  assigned_segments varchar(255) [note: 'Chặng TP.HCM – Đà Lạt, Chặng Nha Trang – Biển đảo...']
  quote_per_guest decimal(15,2) [note: 'Báo giá chặng/khách']
  fixed_payout_amount decimal(15,2) [not null, note: 'Kinh phí chặng phân bổ cố định chính xác (VD: 9.400.000đ, 8.545.000đ)']
  settlement_status settlement_status_enum [not null, default: 'pending']
  settled_amount decimal(15,2) [not null, default: 0]
  notes text

  Note: 'Phân bổ kinh phí chính xác 100% cho từng công ty liên minh trong từng đơn booking'
}

Table booking_hotel_customizations {
  id varchar(36) [pk]
  booking_id varchar(36) [not null]
  destination varchar(100) [not null, note: 'Đà Lạt, Nha Trang...']
  original_hotel_name varchar(255) [note: 'Khách sạn ban đầu của tour']
  original_price_per_night decimal(15,2) [default: 0]
  new_hotel_name varchar(255) [not null, note: 'Khách sạn mới khách muốn ở']
  mode varchar(30) [not null, note: 'system (hệ thống gợi ý), custom (khách tự nhập), provider (chọn từ đối tác nền tảng)']
  is_provider_service boolean [not null, default: false]
  service_id varchar(36) [note: 'Liên kết tới bảng services nếu chọn từ Provider sàn']
  provider_id varchar(36) [note: 'Liên kết tới bảng service_providers']
  new_price_per_night decimal(15,2)
  price_difference decimal(15,2) [note: 'Chênh lệch chi phí/đêm (+450.000đ)']
  stars int
  address text
  latitude decimal(10,8) [note: 'Tọa độ GPS khách sạn mới']
  longitude decimal(11,8)
  note text [note: 'Ghi chú của khách']
  status varchar(30) [not null, default: 'approved', note: 'pending, approved, rejected']

  Note: 'Lịch sử khách hàng tùy biến khách sạn trong tour (tự nhập hoặc chọn từ Đối tác Nền tảng)'
}

Table booking_meal_customizations {
  id varchar(36) [pk]
  booking_id varchar(36) [not null]
  day_number int [not null]
  meal_type varchar(20) [not null, note: 'breakfast, lunch, dinner']
  original_meal_name varchar(255)
  new_meal_name varchar(255) [not null]
  mode varchar(30) [not null, note: 'system, custom, provider']
  is_provider_service boolean [not null, default: false]
  service_id varchar(36) [note: 'Dịch vụ của đối tác F&B trên sàn']
  provider_id varchar(36)
  price_per_person decimal(15,2)
  price_difference decimal(15,2) [note: 'Chênh lệch giá (+60.000đ)']
  note text
  status varchar(30) [not null, default: 'approved']

  Note: 'Khách hàng thay đổi nhà hàng/món ăn ẩm thực trong tour'
}

Table booking_location_customizations {
  id varchar(36) [pk]
  booking_id varchar(36) [not null]
  day_number int [not null]
  original_locations text [note: 'JSON mảng hoặc chuỗi các điểm tham quan cũ']
  requested_locations text [not null, note: 'Điểm tham quan mới khách tự đề xuất']
  note text
  status varchar(30) [not null, default: 'approved']

  Note: 'Khách hàng đề xuất thay đổi hoặc bổ sung điểm tham quan lịch trình'
}

// ============================================================================
// BẢNG 8: THANH TOÁN & BẢO CHỨNG KÝ QUỸ (PAYMENTS & ESCROW)
// ============================================================================
Table system_bank_accounts {
  id varchar(36) [pk]
  bank_name varchar(255) [not null, note: 'Ngân hàng Vietcombank, Techcombank...']
  bank_code varchar(50) [not null, default: 'VCB']
  account_number varchar(50) [not null, note: 'Số tài khoản trung gian của Sàn (VD: 9888666888)']
  account_holder varchar(255) [not null, note: 'Tên pháp nhân công ty vận hành Sàn']
  branch varchar(150) [not null, note: 'Chi nhánh mở tài khoản']
  default_commission_rate decimal(5,2) [not null, default: 0.00, note: 'Tỷ lệ hoa hồng sàn mặc định (hiện tại 0%)']
  notes text [note: 'Chính sách bảo chứng Escrow giữ tiền an toàn cho 2 bên']
  qr_code_url varchar(500)
  is_active boolean [not null, default: true]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Tài khoản Ký quỹ Escrow Trung gian của Sàn Du Lịch'
}

Table payment_requests {
  id varchar(36) [pk]
  booking_id varchar(36) [not null]
  amount decimal(15,2) [not null, note: 'Số tiền công ty lữ hành yêu cầu thanh toán ở đợt này']
  description varchar(255) [not null, note: 'Thanh toán đợt 1, Thanh toán 100% qua Ký quỹ...']
  due_date date [not null, note: 'Hạn chót thanh toán']
  status payment_request_status_enum [not null, default: 'pending']
  transaction_reference varchar(100) [note: 'Mã tham chiếu ngân hàng khi khách nộp tiền']
  created_at timestamp [not null, default: `now()` ]
  paid_at timestamp [note: 'Thời điểm hệ thống ghi nhận khách đã chuyển tiền']

  Note: 'Các đợt yêu cầu thanh toán linh hoạt do công ty gửi cho khách hàng'
}

Table financial_settlements {
  id varchar(36) [pk]
  booking_id varchar(36) [not null]
  beneficiary_company_id varchar(36) [not null, note: 'Công ty lữ hành được nhận tiền quyết toán']
  beneficiary_role cohost_role_enum [default: 'lead', note: 'Chủ trì hay đối tác liên minh']
  total_tour_revenue decimal(15,2) [not null, note: 'Tổng tiền khách đã nộp vào Sàn cho phần này']
  platform_fee_rate decimal(5,2) [not null, default: 0.00, note: 'Tỷ lệ phí sàn (0%)']
  platform_fee_amount decimal(15,2) [not null, default: 0.00, note: 'Phí sàn khấu trừ (0đ)']
  settled_amount decimal(15,2) [not null, note: 'Số tiền thực tế chuyển khoản cho công ty (100% doanh thu)']
  bank_transaction_reference varchar(100) [note: 'Mã ủy nhiệm chi (UNC) của ngân hàng']
  notes text
  settled_by_admin_id varchar(36) [not null, note: 'Admin Sàn đã phê duyệt giải ngân']
  settled_at timestamp [not null, default: `now()` ]

  Note: 'Lịch sử giải ngân, quyết toán dòng tiền Escrow từ Sàn chuyển về tài khoản Công ty lữ hành'
}

Table tour_contracts {
  id varchar(36) [pk]
  booking_id varchar(36) [not null, unique]
  contract_number varchar(100) [unique, not null, note: 'Số hợp đồng: HD-VT-2026-001...']
  contract_title varchar(255) [not null, default: 'HỢP ĐỒNG DỊCH VỤ DU LỊCH']
  contract_data json [note: 'Nội dung điều khoản hợp đồng đầy đủ (các bên, giá, lịch trình, escrow)']
  signed_by_customer boolean [not null, default: true]
  signed_by_company boolean [not null, default: true]
  created_at timestamp [not null, default: `now()` ]

  Note: 'Hợp đồng du lịch điện tử được tạo tự động giữa Khách hàng và Công ty Lữ hành'
}

// ============================================================================
// BẢNG 9: ĐIỀU HÀNH TOUR & BÁO CÁO SỰ CỐ CỦA HDV (GUIDE OPERATIONS & INCIDENTS)
// ============================================================================
Table guide_schedules {
  id varchar(36) [pk]
  booking_id varchar(36) [not null, unique]
  guide_id varchar(36) [not null]
  current_day int [default: 1]
  departure_roll_call_completed boolean [not null, default: false, note: 'Đã điểm danh khởi hành chưa']
  departure_roll_call_time timestamp
  personal_notes text [note: 'Sổ tay điều hành cá nhân của HDV']
  wrap_up_rating int [note: 'Đánh giá chuyến đi của HDV (1-5)']
  wrap_up_notes text [note: 'Báo cáo tổng kết đoàn sau khi kết thúc tour']
  wrap_up_completed_at timestamp
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]

  Note: 'Nhật ký điều hành đoàn và điểm danh khởi hành của Hướng dẫn viên'
}

Table guide_completed_locations {
  id varchar(36) [pk]
  guide_schedule_id varchar(36) [not null]
  itinerary_location_id varchar(36) [not null]
  checked_in_at timestamp [not null, default: `now()` ]
  check_in_image varchar(500) [note: 'Ảnh chụp minh chứng check-in đoàn tại điểm']
  check_in_note text

  Note: 'Dấu mốc check-in từng điểm tham quan trong thực tế dẫn tour'
}

Table guide_task_notes {
  id varchar(36) [pk]
  guide_schedule_id varchar(36) [not null]
  title varchar(255) [not null]
  content text [not null]
  category varchar(50) [default: 'general', note: 'important, transport, hotel_food, time, general']
  is_completed boolean [not null, default: false]
  created_at timestamp [not null, default: `now()` ]

  Note: 'Các việc cần làm (To-Do) nhắc nhở HDV trong tour'
}

Table incident_reports {
  id varchar(36) [pk]
  booking_id varchar(36) [not null]
  guide_id varchar(36) [not null]
  title varchar(255) [not null, note: 'Tiêu đề sự cố: Xe hỏng lốp đèo Khánh Lê, khách bị sốt...']
  category varchar(50) [not null, note: 'vehicle, weather, medical, schedule, service, other']
  severity incident_severity_enum [not null, default: 'medium']
  description text [not null, note: 'Tường trình chi tiết diễn biến sự cố']
  location varchar(255) [note: 'Địa điểm xảy ra sự cố']
  reported_at timestamp [not null, default: `now()` ]
  status varchar(30) [not null, default: 'reported', note: 'reported (vừa báo cáo), acknowledged (công ty đã nhận), resolved (đã xử lý xong)']
  resolved_note text [note: 'Phương án đã xử lý dứt điểm']
  resolved_at timestamp

  Note: 'Báo cáo sự cố khẩn cấp trên đường tour gửi về cho điều hành công ty'
}

Table incident_images {
  id varchar(36) [pk]
  incident_id varchar(36) [not null]
  image_url varchar(500) [not null]

  Note: 'Hình ảnh hiện trường sự cố'
}

// ============================================================================
// BẢNG 10: ĐÁNH GIÁ & PHẢN HỒI (REVIEWS & FEEDBACK)
// ============================================================================
Table tour_reviews {
  id varchar(36) [pk]
  tour_id varchar(36) [not null]
  booking_id varchar(36) [note: 'Xác thực khách đã thực sự đi tour này']
  user_id varchar(36) [not null]
  rating int [not null, default: 5, note: 'Số sao từ 1 đến 5']
  comment text [not null, note: 'Nội dung nhận xét đánh giá']
  tour_date varchar(50) [note: 'Ngày khách khởi hành tour']
  reply_comment text [note: 'Công ty lữ hành phản hồi lại khách']
  reply_date timestamp
  status varchar(30) [not null, default: 'published', note: 'published, hidden']
  created_at timestamp [not null, default: `now()` ]

  Note: 'Đánh giá, nhận xét chất lượng tour sau khi hoàn thành'
}


// ============================================================================
// QUAN HỆ KHÓA NGOẠI (RELATIONSHIPS & FOREIGN KEYS)
// ============================================================================

// --- User & Company / Guide / Provider ---
Ref: user_alias_emails.user_id > users.id [delete: cascade]
Ref: tour_companies.admin_id - users.id [delete: cascade]
Ref: guides.user_id - users.id [delete: cascade]
Ref: guides.company_id > tour_companies.id [delete: cascade]
Ref: service_providers.user_id - users.id [delete: cascade]

// --- Service Provider & Services ---
Ref: services.provider_id > service_providers.id [delete: cascade]
Ref: service_images.service_id > services.id [delete: cascade]
Ref: room_bookings.service_id > services.id
Ref: room_bookings.provider_id > service_providers.id

// --- Tours & Itineraries ---
Ref: tours.company_id > tour_companies.id [delete: cascade]
Ref: tours.target_user_id > users.id
Ref: tours.created_by_user_id > users.id
Ref: tour_images.tour_id > tours.id [delete: cascade]
Ref: tour_highlights.tour_id > tours.id [delete: cascade]
Ref: tour_policies.tour_id > tours.id [delete: cascade]
Ref: tour_price_table.tour_id > tours.id [delete: cascade]
Ref: tour_departure_dates.tour_id > tours.id [delete: cascade]
Ref: daily_itineraries.tour_id > tours.id [delete: cascade]
Ref: daily_itineraries.created_by_company_id > tour_companies.id

// --- Itinerary Locations, Hotels & Meals ---
Ref: itinerary_locations.daily_itinerary_id > daily_itineraries.id [delete: cascade]
Ref: itinerary_locations.created_by_company_id > tour_companies.id
Ref: itinerary_hotels.daily_itinerary_id - daily_itineraries.id [delete: cascade]
Ref: itinerary_hotels.service_id > services.id
Ref: itinerary_hotels.created_by_company_id > tour_companies.id
Ref: tour_alternative_hotels.itinerary_hotel_id > itinerary_hotels.id [delete: cascade]
Ref: tour_alternative_hotels.service_id > services.id
Ref: itinerary_meals.daily_itinerary_id > daily_itineraries.id [delete: cascade]
Ref: itinerary_meals.service_id > services.id
Ref: itinerary_meals.created_by_company_id > tour_companies.id
Ref: tour_alternative_meals.itinerary_meal_id > itinerary_meals.id [delete: cascade]
Ref: tour_alternative_meals.service_id > services.id

// --- Multi-Company Co-Hosting Alliance & Versioning ---
Ref: tour_co_hosts.tour_id > tours.id [delete: cascade]
Ref: tour_co_hosts.company_id > tour_companies.id [delete: cascade]
Ref: tour_versions.tour_id > tours.id [delete: cascade]
Ref: tour_versions.created_by_user_id > users.id

// --- Custom Tour Requests ---
Ref: custom_tour_requests.user_id > users.id
Ref: custom_tour_requests.target_company_id > tour_companies.id
Ref: custom_tour_requests.designed_tour_id > tours.id
Ref: custom_request_co_hosts.custom_tour_request_id > custom_tour_requests.id [delete: cascade]
Ref: custom_request_co_hosts.company_id > tour_companies.id

// --- Bookings, Passengers & Customizations ---
Ref: bookings.tour_id > tours.id
Ref: bookings.user_id > users.id
Ref: bookings.company_id > tour_companies.id
Ref: bookings.guide_id > guides.id
Ref: booking_passengers.booking_id > bookings.id [delete: cascade]
Ref: booking_co_hosts.booking_id > bookings.id [delete: cascade]
Ref: booking_co_hosts.company_id > tour_companies.id
Ref: booking_hotel_customizations.booking_id > bookings.id [delete: cascade]
Ref: booking_hotel_customizations.service_id > services.id
Ref: booking_hotel_customizations.provider_id > service_providers.id
Ref: booking_meal_customizations.booking_id > bookings.id [delete: cascade]
Ref: booking_meal_customizations.service_id > services.id
Ref: booking_meal_customizations.provider_id > service_providers.id
Ref: booking_location_customizations.booking_id > bookings.id [delete: cascade]

// --- Payment & Escrow Settlements ---
Ref: payment_requests.booking_id > bookings.id [delete: cascade]
Ref: financial_settlements.booking_id > bookings.id
Ref: financial_settlements.beneficiary_company_id > tour_companies.id
Ref: financial_settlements.settled_by_admin_id > users.id
Ref: tour_contracts.booking_id - bookings.id [delete: cascade]

// --- Guide Operations & Incidents ---
Ref: guide_schedules.booking_id - bookings.id [delete: cascade]
Ref: guide_schedules.guide_id > guides.id
Ref: guide_completed_locations.guide_schedule_id > guide_schedules.id [delete: cascade]
Ref: guide_completed_locations.itinerary_location_id > itinerary_locations.id
Ref: guide_task_notes.guide_schedule_id > guide_schedules.id [delete: cascade]
Ref: incident_reports.booking_id > bookings.id
Ref: incident_reports.guide_id > guides.id
Ref: incident_images.incident_id > incident_reports.id [delete: cascade]

// --- Reviews ---
Ref: tour_reviews.tour_id > tours.id [delete: cascade]
Ref: tour_reviews.booking_id > bookings.id
Ref: tour_reviews.user_id > users.id


// ============================================================================
// TABLE GROUPS (GOM CỤM PHÂN VÙNG MÀU TRÊN DBDATAGRAM.IO)
// ============================================================================
TableGroup User_And_Auth {
  users
  user_alias_emails
}

TableGroup Company_And_Guide {
  tour_companies
  guides
}

TableGroup Service_Provider_Network {
  service_providers
  services
  service_images
  room_bookings
}

TableGroup Tour_And_Itinerary {
  tours
  tour_images
  tour_highlights
  tour_policies
  tour_price_table
  tour_departure_dates
  daily_itineraries
  itinerary_locations
  itinerary_hotels
  tour_alternative_hotels
  itinerary_meals
  tour_alternative_meals
}

TableGroup Alliance_And_Versioning {
  tour_co_hosts
  tour_versions
}

TableGroup Custom_Tour_Requests {
  custom_tour_requests
  custom_request_co_hosts
}

TableGroup Booking_And_Customization {
  bookings
  booking_passengers
  booking_co_hosts
  booking_hotel_customizations
  booking_meal_customizations
  booking_location_customizations
}

TableGroup Payment_And_Escrow {
  system_bank_accounts
  payment_requests
  financial_settlements
  tour_contracts
}

TableGroup Guide_Operations_And_Incidents {
  guide_schedules
  guide_completed_locations
  guide_task_notes
  incident_reports
  incident_images
}

TableGroup Reviews_And_Feedback {
  tour_reviews
}
```

---

## 2. TỔNG QUAN KIẾN TRÚC & CÁC ĐẶC TRƯNG NGHIỆP VỤ ĐÃ MÃ HÓA

### 1. Phân quyền và Danh tính tập trung (User & Auth)
- Hỗ trợ đầy đủ **5 Role người dùng**: Khách hàng (`user`), Quản trị công ty lữ hành (`company_admin`), Hướng dẫn viên (`guide`), Đối tác nhà cung cấp (`provider`), và Quản trị viên sàn (`admin`).
- Bảng `user_alias_emails` giải quyết triệt để bài toán 1 người dùng đăng nhập bằng nhiều email alias (Gmail, tài khoản doanh nghiệp FPT, email đối tác).

### 2. Mạng lưới Dịch vụ Đối tác Bên thứ 3 (Service Provider Network)
- Các bảng `service_providers`, `services`, `service_images`, `room_bookings`.
- Hỗ trợ lưu trữ đầy đủ tọa độ GPS (`latitude`, `longitude`) để tích hợp hiển thị trực quan lên **Google Maps**.
- Hỗ trợ nội dung bài viết chi tiết (`detailed_blog_content`), hình ảnh thực tế và các trường chuyên biệt cho từng loại hình:
  - Khách sạn: số sao, tổng phòng, tiện ích (`amenities`), chính sách nhận/trả phòng.
  - Nhà hàng / Ẩm thực: giờ mở cửa, loại hình món ăn, tùy chọn ăn chay / kiêng.
  - Điểm tham quan / Trải nghiệm / Vận chuyển: giá vé trẻ em, phương tiện, sức chứa.

### 3. Tùy biến Lịch trình Tour (Tour Customization System)
- Khách hàng có thể thay đổi Khách sạn (`booking_hotel_customizations`), Nhà hàng ẩm thực (`booking_meal_customizations`), và Điểm tham quan (`booking_location_customizations`).
- Thiết kế hỗ trợ 3 chế độ thay đổi (`mode`):
  1. `system`: Chọn từ danh sách khách sạn / nhà hàng nâng cấp do công ty lữ hành cấu hình sẵn trong tour.
  2. `provider`: Khám phá và chọn trực tiếp từ **Mạng lưới Dịch vụ của Nhà cung cấp (Provider)** trên nền tảng (lưu vết `service_id` và `provider_id` kèm số điện thoại, người đại diện để công ty liên hệ).
  3. `custom`: Khách tự nhập địa điểm mình mong muốn.
- Tự động ghi nhận khoản chênh lệch chi phí (`price_difference`) và hỗ trợ công ty lữ hành điều chỉnh giá tổng (`price_adjustment_note`, `price_adjusted_at`).

### 4. Liên minh Lữ hành Đa Công ty (B2B Co-Hosting Alliance)
- Cơ chế phối hợp giữa **Đơn vị Chủ trì (Lead)** và **Đối tác Chuyên môn (Partner)** qua bảng `tour_co_hosts` và `booking_co_hosts`.
- Áp dụng mô hình **Cost Aggregation (Báo giá chi phí chặng độc lập)**: mỗi công ty tự tính toán và nhập báo giá phần dịch vụ của mình (`quote_per_guest`, `fixed_payout_amount`), hệ thống tự động tổng hợp để ra giá tour trọn gói cho khách.
- Phân bổ kinh phí quyết toán cho từng công ty liên minh khớp chính xác 100% với giá trị đơn booking.
- Hỗ trợ ngày chuyển giao chặng (`is_handover_day`, `handover_time`, `handover_location`, `handover_note`) trên đèo hoặc ranh giới giữa 2 tỉnh thành.

### 5. Yêu cầu Thiết kế Tour Riêng biệt (Custom Request & Versioning)
- Doanh nghiệp / Khách đoàn gửi yêu cầu qua bảng `custom_tour_requests` (số khách, ngân sách, khách sạn bao nhiêu sao, v.v.).
- Công ty lữ hành tiếp nhận và lưu lịch sử từng phiên bản thiết kế qua bảng `tour_versions` (v1, v2, v3...), cho phép xem lại hoặc hoàn tác bất kỳ lúc nào.

### 6. Mô hình Thanh toán Linh hoạt & Ký quỹ Escrow (Flexible Payment & Escrow Settlement)
- Đã loại bỏ trạng thái "đặt cọc" cứng nhắc; hỗ trợ quy trình công ty yêu cầu thanh toán linh hoạt qua bảng `payment_requests` (đợt 1, đợt 2, v.v.).
- Toàn bộ tiền khách nộp đi vào **Tài khoản trung gian Ký quỹ (Escrow)** của Sàn (`system_bank_accounts`).
- Bảng `financial_settlements`: Khi tour hoàn thành (`completed`), Admin sàn giải ngân độc lập cho công ty lữ hành hoặc chia cho các công ty liên minh theo kinh phí chặng, lưu mã ủy nhiệm chi (`bank_transaction_reference`).
- Tạm thời áp dụng chính sách **Miễn phí sàn 0%** (`platform_fee_rate = 0.00`, `platform_fee_amount = 0`), giải ngân 100% doanh thu tour về cho công ty du lịch.

### 7. Nghiệp vụ Hướng dẫn viên & Sự cố Trên tour (Guide On-Tour Operations)
- Bảng `guide_schedules`: HDV điểm danh khởi hành đoàn (`departure_roll_call`), check-in từng điểm đến thực tế (`guide_completed_locations`), quản lý việc cần làm (`guide_task_notes`), và viết báo cáo tổng kết chuyến đi (`wrap_up_report`).
- Bảng `incident_reports` & `incident_images`: Báo cáo sự cố khẩn cấp (hỏng xe, thời tiết, y tế, khách thất lạc...), phân cấp mức độ nghiêm trọng và trạng thái xử lý gửi tức thì về cho điều hành công ty.

---

## 3. CÁC BƯỚC ĐỂ XEM SƠ ĐỒ ĐỒ HỌA TRÊN DBDATAGRAM.IO
1. Mở trình duyệt và vào đường dẫn: **[https://dbdiagram.io/d](https://dbdiagram.io/d)**
2. Bấm vào khung soạn thảo mã (bên trái màn hình), nhấn `Ctrl + A` rồi nhấn `Delete` để xóa mã mặc định.
3. Sao chép toàn bộ khối mã nguồn nằm trong thẻ ````dbml ... ```` ở **Mục 1** phía trên.
4. Dán vào khung soạn thảo của dbdiagram.io (`Ctrl + V`).
5. **Kết quả:** Trình duyệt sẽ render tức thì một sơ đồ quan hệ thực thể (ERD) trực quan, có đầy đủ các đường liên kết quan hệ giữa các bảng và các nhóm màu (TableGroup) tương ứng với từng phân hệ nghiệp vụ.
