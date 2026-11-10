Project TripOps {
  Note: 'Schema hiện tại của TripOps, bao gồm luồng thiết kế riêng và chia sẻ phiên bản. Provider không quản lý loại phòng hoặc tồn phòng. Các Note ghi rõ quy tắc cần triển khai thêm trong SQL/BE; đường nối FK không tự kiểm tra vai trò người dùng. Khi triển khai SQL Server dùng datetime2 thay timestamp, nvarchar cho tiếng Việt và nvarchar(max) có ISJSON cho JSON. Không cascade xóa booking, thanh toán, phiên bản hoặc dữ liệu vận hành đã phát sinh.'
}

Enum user_role_enum {
  user
  admin
  travel_agency
  provider
  tour_guide
  customer
}

Table users {
  BanReason text
  BannedAt timestamp
  id varchar(36) [pk, note: 'UUID định danh duy nhất người dùng']
  name varchar(150) [not null, note: 'Họ và tên hiển thị']
  email varchar(191) [unique, not null, note: 'Email chính đăng nhập']
  phone varchar(30) [note: 'Số điện thoại liên hệ']
  password_hash varchar(255) [note: 'Mật khẩu đã băm bcrypt/argon2']
  role user_role_enum [not null, default: 'user', note: 'Vai trò người dùng trong hệ thống']
  avatar varchar(500) [note: 'Đường dẫn ảnh đại diện']
  is_verified boolean [not null, default: true]
  agency_id varchar(36) [ref: > users.id, note: 'Chỉ áp dụng khi role = TOUR_GUIDE, trỏ tới user có role = TRAVEL_AGENCY']
  status varchar(30) [not null, default: 'active', note: 'active, inactive, banned']
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]
}

// Hồ sơ chuyên môn HDV; tài khoản và Agency quản lý vẫn nằm trong users.
Table guide_profiles {
  user_id varchar(36) [pk, ref: - users.id]
  experience_years int [not null, note: 'Từ 0 đến 50 năm']
  languages json [not null, note: 'Danh sách ngôn ngữ']
  routes json [not null, note: 'Địa bàn/tuyến hoạt động, cho phép tag tự nhập']
  specialties json [not null, note: 'Kỹ năng và thế mạnh']
  bio text
  suspended_at timestamp
  suspended_reason varchar(2000)
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table business_profiles {
  id int [pk, increment]
  user_id varchar(36) [unique, not null]
  business_name varchar(255)
  tax_code varchar(50)
  business_address text
  business_license_url text
  description text
  LogoUrl text [note: 'Ảnh logo doanh nghiệp; tên cột theo migration FixTourPendingChanges']
  status varchar(50)
  rejection_reason text
  approved_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

// ============================================================================
// BẢNG DỊCH VỤ CỦA NHÀ CUNG CẤP (SINGLE TABLE CHO HOTEL, FNB, XE, THAM QUAN)
// ============================================================================
Table services {
  PriceUnit text
  id int [pk, increment]
  provider_id varchar(36) [not null, note: 'FK tới users.id - Nhà cung cấp dịch vụ']

  // 1. PHÂN LOẠI DỊCH VỤ
  category varchar(50) [not null, note: 'hotel (Lưu trú), fnb (Ẩm thực), transportation (Vận chuyển), attraction (Tham quan)']

  sub_category varchar(100) [note: 'Phân loại chi tiết; SQL Server nvarchar(100), NULL']

  // 2. THÔNG TIN BÀI ĐĂNG
  name varchar(255) [not null, note: 'Tên cơ sở / bài đăng dịch vụ (VD: Khách Sạn Heritage Đà Lạt, Xe Limousine VIP...)']
  description text [note: 'Mô tả chi tiết bài đăng dịch vụ']

  // 3. GIÁ CẢ (KHOẢNG GIÁ ĐỂ CÔNG TY DU LỊCH THAM KHẢO & THỎA THUẬN)
  price decimal(12, 2) [not null, default: 0, note: 'Giá chuẩn tham chiếu']
  price_from decimal(12, 2) [note: 'Khoảng giá từ (VNĐ)']
  price_to decimal(12, 2) [note: 'Khoảng giá đến (VNĐ)']

  // 4. QUY MÔ, TIỆN ÍCH & CHÍNH SÁCH ĐẶC THÙ
  capacity int [default: 0, note: 'Quy mô chung: Hotel (số phòng), FnB (số khách), Xe (số ghế), Điểm đến (sức chứa/ngày)']
  star_rating int [note: 'Hạng sao (1-5 sao, chủ yếu dùng cho Khách sạn/Resort)']
  amenities json [note: 'Danh sách tiện ích nổi bật dạng mảng JSON: ["Wifi", "Bãi đỗ xe 45 chỗ", "Bể bơi", "Phòng VIP máy lạnh"...]']
  policies json [note: 'Danh sách quy định & chính sách dạng mảng JSON: ["Nhận phòng 14:00", "Miễn phí hủy trước 24h"...]']

  // 5. ĐỊA CHỈ & TỌA ĐỘ GPS GOOGLE MAPS
  province varchar(100) [not null, note: 'Tỉnh / Thành phố']
  ward varchar(100) [note: 'Phường / Xã']
  street varchar(255) [note: 'Số nhà, tên đường']
  full_address varchar(500) [note: 'Địa chỉ đầy đủ; SQL Server nvarchar(500), NULL']
  operating_hours varchar(100) [note: 'Giờ mở cửa hoặc nhận/trả phòng; SQL Server nvarchar(100), NULL']
  latitude decimal(10, 8) [note: 'Tọa độ GPS vĩ độ để ghim bản đồ']
  longitude decimal(11, 8) [note: 'Tọa độ GPS kinh độ để ghim bản đồ']

  // 6. HÌNH ẢNH DỊCH VỤ
  thumbnail_url text [not null, note: 'Ảnh đại diện chính của bài đăng']
  images json [note: 'Các ảnh bổ sung dạng JSON; không chứa lại thumbnail_url']

  // 7. ĐÁNH GIÁ & KIỂM DUYỆT (ADMIN DANG XÉT DUYỆT)
  rating decimal(3, 2) [default: 5.0, note: 'Điểm đánh giá trung bình']
  status varchar(30) [default: 'PENDING', note: 'PENDING (Chờ duyệt), APPROVED (Đã duyệt mở bán), REJECTED (Bị từ chối), HIDDEN (Tạm ẩn)']
  hidden_reason text [note: 'Lý do Admin tạm ẩn bài; SQL Server nvarchar(max), NULL']
  is_paused boolean [not null, default: false, note: 'Provider tạm ngừng cung cấp, độc lập với trạng thái kiểm duyệt Admin']
  rejection_reason text [note: 'Lý do Admin từ chối phê duyệt bài đăng']

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (id, provider_id) [unique]
  }
}

// MỐI QUAN HỆ KHÓA NGOẠI:
Ref: services.provider_id > users.id

Table tours {
  configuration_data json [note: 'Cấu hình đang làm việc; không phụ thuộc lịch sử version']
  revision int [not null, note: 'Khóa chống ghi đè mỗi lần lưu; không phải số phiên bản thiết kế']
  has_draft_changes boolean [not null, default: false, note: 'Cột tương thích mô hình nháp cũ; luồng hiện tại cập nhật trực tiếp version và đặt false']
  id int [pk, increment]
  agency_id varchar(36) [not null] // FK tới users.id, vai trò agency
  tour_code varchar(50) [unique, not null]
  name varchar(255)
  location text
  departure_location text
  duration_tour text
  operation_period varchar(255)
  duration_days int
  duration_nights int
  baseprice decimal(12, 2)
  min_participants int
  max_participants int
  highlights text
  inclusions text
  exclusions text
  policies text
  message text
  thumbnail_urls text // hoặc json/text[] tùy hệ cơ sở dữ liệu
  image_urls text     // hoặc json/text[]
  status varchar(50)
  visibility varchar(50)
  is_request boolean [default: false] // tour thiết kế riêng
  version int [default: 1, note: 'Số phiên bản hiện tại đang áp dụng (v1, v2, v3...)']
  change_note text [note: 'Ghi chú tóm tắt lý do hoặc nội dung cập nhật của phiên bản hiện tại']
  design_request_id int [note: 'FK tới tour_design_requests.id']
  shared_version int [note: 'FK (id, shared_version) tới tour_versions.(tour_id, version); khách xem snapshot này']
  cloned_from_tour_id int
  is_ai_generated boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    design_request_id [note: 'Một yêu cầu có thể có nhiều Tour plan']
  }
}

Table tour_pricing_tiers {
  id int [pk, increment]
  tour_id int [not null] // FK tham chiếu tới tours.id
  agency_id varchar(36) [not null, note: 'FK tới users.id - ID của công ty báo giá (Cty A, Cty B...)']
  tier_name varchar(100)
  min_age int
  max_age int
  price decimal(12, 2)
  display_order int [default: 0]
}

Ref: tour_pricing_tiers.agency_id > users.id

Table tour_provinces {
  id int [pk, increment]
  tour_id int [not null]
  province_code varchar(32) [not null]
  created_at timestamp [default: `now()`]

  indexes {
    (tour_id, province_code) [unique]
    (province_code, tour_id)
  }
}

Ref: tour_provinces.tour_id > tours.id

Table tour_timeline {
  id int [pk, increment]
  tour_id int [not null] // FK tham chiếu tới tours.id
  day_number int [not null]
  title varchar(255)
  description text

  indexes {
    (tour_id, day_number) [unique]
  }
}

Table tourist_locations {
  id int [pk, increment]
  tour_timeline_id int [not null]
  time timestamp
  name_location text
  agency_id varchar(36) [note: 'FK tới users.id - Agency phụ trách điểm đến này']
}


// 2. Bữa ăn của tour (Gồm tất cả các options món/nhà hàng của bữa đó)
Table tour_restaurants {
  id int [pk, increment]
  service_id int
  supplier_source varchar(20) [note: 'PLATFORM_PARTNER or AGENCY_SUPPLIER']
  agency_supplier_id int
  supplier_snapshot text [note: 'Immutable tour-specific JSON: address, area, contact, reference price, conditions']
  tour_timeline_id int [not null]
  agency_id varchar(36)
  time timestamp
  meal_type varchar(20) [not null, note: 'breakfast, lunch, dinner']
  restaurant_name varchar(255) [not null]
  description text
  is_default boolean [not null, default: false]
  price_difference decimal(12, 2) [not null, default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

// 1. Chỗ ở của tour (Gồm tất cả các options mà công ty cung cấp)
Table tour_hotels {
  id int [pk, increment]
  tour_id int [not null]
  service_id int
  supplier_source varchar(20) [note: 'PLATFORM_PARTNER or AGENCY_SUPPLIER']
  agency_supplier_id int
  supplier_snapshot text [note: 'Immutable tour-specific JSON: address, area, contact, reference price, conditions']
  destination_name varchar(255) [not null]
  hotel_name varchar(255) [not null]
  star_rating int [default: 3]
  nights_count int [default: 1]
  is_default boolean [default: false, note: 'true: Phương án chuẩn theo tour gốc']
  price_difference decimal(12, 2) [default: 0, note: '0đ: Phương án chuẩn theo giá tour | > 0: Option phụ thu']
  address text
  agency_id varchar(36)
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table agency_suppliers {
  id int [pk, increment]
  agency_id varchar(36) [not null]
  supplier_type varchar(20) [not null, note: 'HOTEL or RESTAURANT']
  name varchar(255) [not null]
  address varchar(500)
  area varchar(255)
  contact_name varchar(150)
  contact_phone varchar(30)
  contact_email varchar(191)
  star_rating int
  reference_price decimal(12, 2)
  conditions varchar(2000)
  notes varchar(2000)
  status varchar(20) [not null, note: 'ACTIVE or ARCHIVED']
  created_at timestamp
  updated_at timestamp

  indexes {
    (agency_id, supplier_type, status)
    (agency_id, supplier_type, name)
  }
}


Table tour_design_requests {
  rejection_reason varchar(2000)
  responded_at timestamp
  Revision int [not null]
  SourceSnapshotJson text
  SourceTourId int
  InitialChangesJson text
  id int [pk, increment]

  // 1. CHỌN CÔNG TY DU LỊCH (Agency/Business Profile nhận yêu cầu)
  user_id varchar(36) // FK trỏ tới users.id (người dùng gửi form, có thể null nếu cho phép khách vãng lai)
  agency_id varchar(36) [note: 'Agency nhận yêu cầu và thiết kế tour riêng']
  business_name varchar(255)
  business_email varchar(191)
  business_phone varchar(30)
  // 2. ĐẠI DIỆN ĐẶT TOUR
  contact_name varchar(150) [not null] // Người liên hệ, đại diện đặt tour (*)
  contact_email varchar(191) [not null] // Email cá nhân người đại diện (*)
  contact_phone varchar(30) [not null] // Hotline người liên hệ (*)

  // 3. THÔNG TIN THIẾT KẾ TOUR
  destination varchar(255) [not null] // Điểm đến mong muốn (*)
  departure_date date [not null] // Ngày khởi hành dự kiến
  return_date date // Ngày về
  number_of_participants int // Số người tham gia
  budget_per_person decimal(12, 2) // Chi phí dự kiến cho 1 người (VNĐ)
  hotel_rating_requirement varchar(50) // Khách sạn lưu trú (vd: 3 sao, 4 sao, 5 sao, resort...)

  // 4. THÔNG TIN BỔ SUNG THÊM
  special_requirements text // Các điểm tham quan, hoạt động tour, lửa trại... hay ghi chú khác

  // 5. TRẠNG THÁI XỬ LÝ CỦA HỆ THỐNG
  status varchar(50) [default: 'pending'] // pending, in_progress, rejected, cancelled
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

// ============================================================================
// LỊCH SỬ PHIÊN BẢN & SAO LƯU TOUR (VERSION CONTROL & ROLLBACK)
// ============================================================================


Table tour_versions {
  NumberOfGuests int
  shared_at timestamp
  shared_by varchar(36)
  restored_from_version int
  id int [pk, increment]
  tour_id int [not null, note: 'FK tới tours.id']
  version int [not null, note: 'Số thứ tự phiên bản: 1, 2, 3...']
  change_note text [note: 'Ghi chú lý do thay đổi: VD: Nâng cấp Terracotta 4 sao và bổ sung Gala Dinner VIP...']
  price decimal(12, 2) [note: 'Giá tour tại thời điểm của phiên bản này']
  tour_snapshot json [not null, note: 'Cấu hình đầy đủ của một phương án tour thiết kế riêng; Lưu cập nhật chính phương án này']
  created_by varchar(36) [note: 'FK tới users.id - Nhân viên công ty thực hiện cập nhật/lưu bản sao']
  created_at timestamp [default: `now()`, note: 'Thời điểm tạo bản sao lưu']

  indexes {
    (tour_id, id) [unique]
    (tour_id, version) [unique, note: 'Mỗi tour chỉ có 1 bản ghi duy nhất cho mỗi số version']
  }
  Note: 'Chỉ áp dụng tour thiết kế riêng. Lưu cập nhật version đang chọn; Lưu với phiên bản mới tạo dòng với số lớn nhất cộng 1. Chọn bất kỳ version để share; tour đăng bán không sinh version mới.'
}

Ref: tour_versions.tour_id > tours.id
Ref: tour_versions.created_by > users.id

// 2. Bảng trung gian gán nhiều công ty cho 1 đơn


Table bookings {
  tour_configuration_data json [note: 'Cấu hình riêng tại thời điểm booking, gồm bảng giá từng Agency; không trả thẳng cho Customer']
  AcceptedQuotationId int
  tour_version int [not null, note: 'Phiên bản khách đặt; sao chép sang booking_*']
  id int [pk, increment]
  booking_code varchar(50) [unique, not null]
  customer_id varchar(36) // FK tới users.id
  tour_id int // FK tới tours.id
  design_request_id int // FK tới tour_design_requests.id (nếu đặt từ tour thiết kế riêng)
  departure_date date [not null]
  contact_full_name varchar(150) [not null]
  contact_phone varchar(30) [not null]
  contact_email varchar(191) [not null]
  contact_note text

  // --- BỔ SUNG CÁC TRƯỜNG QUẢN LÝ TÙY BIẾN & GIÁ CHỐT ---
  payment_status varchar(30) [default: 'unpaid', note: 'status: pending, confirmed, completed...) và trạng thái tiền (unpaid - chưa thanh toán, partially_paid - đã trả 1 phần/cọc, paid - đã trả đủ 100%, refunded - đã hoàn tiền)']
  has_customization boolean [default: false, note: 'true: có tùy biến khách sạn/ăn uống/điểm đến']
  original_total_price decimal(12, 2) [note: 'Tổng tiền gốc ban đầu trước khi công ty duyệt phụ thu/giảm trừ']
  total_price decimal(12, 2) [not null, note: 'Tổng tiền thực tế cuối cùng cần thanh toán']

  status varchar(20) [default: 'pending', note: 'pending, confirmed, completed, cancelled, rejected']
  cancel_reason text
  cancelled_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  Note: 'Khách đặt tour qua tour_id. BE kiểm tra design_request_id khớp yêu cầu nguồn của tour nếu có. tour_versions chỉ lưu lịch sử chỉnh sửa tour, không có FK từ booking tới version. Các bảng booking_timelines, booking_locations, booking_restaurants, booking_hotels và booking_participants giữ dữ liệu đã chốt khi đặt; không cập nhật theo tour gốc.'
}

// ============================================================================
// DANH SÁCH HÀNH KHÁCH THEO TỪNG CHẶNG VÀ CÔNG TY
// ============================================================================

Table booking_participants {
  creation_key varchar(36)
  id int [pk, increment]
  booking_id int [not null, note: 'FK trỏ tới bookings.id']
  creation_key uniqueidentifier [note: 'Khóa chống tạo trùng khi Agency gửi lại yêu cầu thêm khách; unique theo booking_id khi khác NULL']
  agency_id varchar(36) [not null, note: 'FK tới users.id - Công ty du lịch phụ trách khách này']
  participant_index int [not null, note: 'STT khách trong đoàn (1, 2, 3...) để định danh cùng 1 người giữa Cty A & B']
  is_primary boolean [not null, default: true, note: 'true: Dòng hồ sơ gốc hiển thị cho khách xem | false: Dòng chặng phụ của cty đối tác']

  // Thông tin cá nhân
  full_name varchar(150) [not null]
  date_of_birth date
  gender varchar(20) // MALE, FEMALE, OTHER
  identity_card_number varchar(50) // CCCD / CMND / Hộ chiếu
  note text // Ăn chay, dị ứng, say xe...

  // Giá chốt độc lập của chặng (Snapshot)
  tier_name varchar(100) [note: 'Snapshot tên phân khúc lúc đặt: Người lớn, Trẻ em 5-11t...']
  price decimal(12, 2) [not null, default: 0, note: 'Giá chốt thực tế cho chặng này (đã gồm tùy biến)']

  // Điểm danh & Vận hành thực tế lúc tour chạy
  assigned_guide_id varchar(36) [note: 'FK tới users.id - HDV của công ty này phụ trách']
  attendance_status varchar(50) [default: 'PENDING', note: 'PENDING, CHECKED_IN, ABSENT']
  checked_by varchar(36) [note: 'FK tới users.id - Người điểm danh']
  checked_at timestamp

  // Trạng thái tham gia (chốt trước khi khởi hành)
  status varchar(20) [default: 'ACTIVE', note: 'ACTIVE: Tham gia chặng | INACTIVE: Đã hủy/xoá khỏi chặng này']
  status_note text [note: 'Lý do nếu khách không tham gia chặng']
  roommate_note text
  restaurant_note text

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (booking_id, participant_index)
    (booking_id, agency_id, participant_index) [unique]
  }
  Note: 'Mỗi dòng là một khách trong phạm vi agency của booking. Các dòng cùng booking_id và participant_index đại diện cùng một người; chỉ một dòng is_primary = true. SQL dùng unique index có điều kiện cho dòng primary; BE đồng bộ thông tin cá nhân. Giá và điểm danh độc lập theo agency. Mô hình này không tách nhiều chặng khác nhau của cùng một agency.'
}

Table booking_assigned_guides {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  guide_id varchar(36) [not null, note: 'FK tới users.id - Hướng dẫn viên được chỉ định']
  agency_id varchar(36) [not null, note: 'FK tới users.id - Công ty trực tiếp quản lý và phân công HDV này']
  role varchar(50) [default: 'lead_guide', note: 'lead_guide (Trưởng đoàn), stage_guide (HDV chặng), support_guide (HDV phụ tá), logistics (Hậu cần)']
  notes text [note: 'Ghi chú phân công nhiệm vụ cụ thể']
  assigned_at timestamp [default: `now()`]

  indexes {
    (booking_id, agency_id, guide_id) [unique]
    (booking_id, guide_id) [unique] // Mỗi HDV chỉ xuất hiện 1 lần trong 1 đơn booking
  }
  Note: 'BE bảo đảm guide_id có vai trò HDV và thuộc agency_id tại thời điểm phân công. Không xóa lịch sử phân công đã được tham chiếu.'
}

// ==========================================
// CÁC MỐI QUAN HỆ KHÓA NGOẠI (REFS):
// ==========================================
Ref: booking_assigned_guides.booking_id > bookings.id
Ref: booking_assigned_guides.guide_id > users.id
Ref: booking_assigned_guides.agency_id > users.id

// ============================================================================
// 1. TỪNG NGÀY LỊCH TRÌNH CỦA ĐƠN BOOKING (Snapshot ngày & tiêu đề)
// ============================================================================
Table booking_timelines {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  day_number int [not null, note: 'Ngày 1, Ngày 2...']
  title varchar(255) [not null, note: 'VD: Ngày 1: Đón đoàn – Check-in Vinpearl Resort...']
  description text [note: 'VD: Xe đón khách tại sân bay Cam Ranh về bến cảng...']
  created_at timestamp [default: `now()`]

  indexes {
    (booking_id, day_number) [unique]
  }
}

// ============================================================================
// 2. ĐIỂM THAM QUAN (Lưu cả điểm gốc & điểm đổi)
// ============================================================================
Table booking_locations {
  id int [pk, increment]
  booking_timeline_id int [not null, note: 'FK tới booking_timelines.id']
  time timestamp
  agency_id varchar(36)
  // ĐIỂM GỐC THEO TOUR BAN ĐẦU
  original_location_name varchar(255) [not null, note: 'Điểm gốc của tour (VD: Đảo Hòn Mun, Chợ đêm Đà Lạt)']

  // ĐIỂM MỚI NẾU KHÁCH ĐỀ XUẤT ĐỔI (NULL nếu đi theo tour)
  current_location_name varchar(255) [note: 'Điểm mới khách muốn đi (VD: Hòn Tằm & Tắm bùn khoáng)']

  is_customized boolean [default: false, note: 'false: Đi theo tour mặc định | true: Có đổi điểm']
  customer_note text [note: 'Lý do hoặc mong muốn của khách khi đổi']
  price_difference decimal(12, 2) [default: 0, note: 'Phụ thu vé phát sinh (nếu có)']
  status varchar(30) [default: 'approved', note: 'pending (chờ duyệt), approved (đồng ý), rejected (từ chối)']
  attendance_status varchar(50)
  guide_id varchar(36) [note: 'HDV phụ trách điểm; BE kiểm tra đã được phân công đúng booking và agency.']
}

// ============================================================================
// 3. BỮA ĂN (Lưu nhà hàng gốc & nhà hàng mới - Hiển thị chữ "Mặc định")
// ============================================================================
Table booking_restaurants {
  agency_id varchar(36)
  id int [pk, increment]
  service_id int
  booking_timeline_id int [not null]
  date_service date [note: 'Ngày sử dụng dịch vụ thực tế']
  time timestamp
  meal_type varchar(20) [not null, note: 'breakfast, lunch, dinner']
  original_restaurant_name varchar(255) [not null]
  current_restaurant_name varchar(255)
  price_difference decimal(12, 2) [default: 0]
  is_customized boolean [not null, default: false]
  total_price decimal(12, 2)
  provider_response text
  status varchar(30) [default: 'approved']
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  Note: 'Nhà cung cấp được xác định qua service_id. Tên và giá giữ snapshot lúc đặt; không tự thay đổi khi danh mục dịch vụ đổi. BE kiểm tra service có category fnb. Provider không quản lý tồn phòng.'
}


// ============================================================================
// 4. KHÁCH SẠN LƯU TRÚ (Lưu khách sạn gốc & khách sạn đổi)
// ============================================================================
Table booking_hotels {
  agency_id varchar(36)
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  service_id int
  destination varchar(100) [not null, note: 'Khu vực: Nha Trang, Đà Lạt...']

  date_from timestamp
  date_to timestamp

  // KHÁCH SẠN GỐC THEO TOUR
  original_hotel_name varchar(255) [not null, note: 'VD: Vinpearl Resort & Spa Nha Trang Bay']
  original_stars int [default: 5]

  // KHÁCH SẠN MỚI NẾU ĐỔI HẠNG / NÂNG CẤP (Snapshot tên tại thời điểm đặt)
  current_hotel_name varchar(255) [note: 'VD: Khách Sạn Heritage Đà Lạt']
  current_stars int
  provider_response text
  nights_count int [default: 1]
  price_difference decimal(12, 2) [default: 0, note: 'Chênh lệch (+450.000đ)']
  is_customized boolean [default: false, note: 'false: Theo tour | true: Đổi khách sạn']
  status varchar(30) [default: 'approved', note: 'pending, approved, rejected']
  total_price decimal(12, 2)
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  Note: 'Nhà cung cấp xác định qua service_id. BE kiểm tra category hotel. Các thông tin tên, hạng sao và giá là snapshot của booking; không quản lý loại phòng hoặc tồn phòng.'
}


// ============================================================================
    // NHẬT KÝ PHÂN CÔNG & CHECK-IN ĐIỂM THAM QUAN CỦA HƯỚNG DẪN VIÊN
    // ============================================================================
    Table booking_attraction_checkins {
      id int [pk, increment]
      booking_timeline_attraction_id int [not null, note: 'FK tới booking_locations.id']
      guide_id varchar(36) [not null, note: 'FK tới users.id - Hướng dẫn viên phụ trách dẫn điểm/xe này']
      agency_id varchar(36) [not null, note: 'FK tới users.id - Công ty trực tiếp quản lý HDV này']

      attendance_status varchar(30) [default: 'PENDING', note: 'PENDING (Chưa đến) - CHECKED_IN (Đã đến điểm) -SKIPPED (Bỏ qua/sự cố)']
      checked_at timestamp [note: 'Thời điểm check-in hoặc báo skip thực tế']
      photo_proof_url text [note: 'Ảnh chụp minh chứng đoàn đã tới điểm']
      notes text [note: 'Ghi chú của HDV: nổ lốp xe, kẹt xe, thời tiết xấu nên đổi điểm...']

      created_at timestamp [default: `now()`]
      updated_at timestamp [default: `now()`]

      indexes {
        (booking_timeline_attraction_id, guide_id) [unique, note: 'Mỗi HDV chỉ có 1 lượt check-in cho 1 điểm']
      }
      Note: 'BE suy ra booking qua booking_location và timeline; chỉ cho HDV đã được phân công đúng booking và agency check-in. Không coi FK tới users là đủ quyền thao tác.'
}

    // Khóa ngoại liên kết
    Ref: booking_attraction_checkins.booking_timeline_attraction_id > booking_locations.id
    Ref: booking_attraction_checkins.guide_id > users.id
    Ref: booking_attraction_checkins.agency_id > users.id


// ============================================================================
// BÁO CÁO SỰ CỐ VẬN HÀNH TOUR (TOUR INCIDENTS - NỐI TRỰC TIẾP TỚI BOOKING)
// ============================================================================
Table booking_incidents {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id - Nối thẳng tới đơn booking']
  agency_id varchar(36) [not null, note: 'FK tới users.id - Công ty phụ trách xử lý']
  reported_by varchar(36) [not null, note: 'FK tới users.id - HDV hoặc Điều hành tour báo cáo sự cố']

  incident_type varchar(50) [default: 'OTHER', note: 'TRAFFIC (Giao thông), WEATHER (Thời tiết), HEALTH (Sức khỏe), ITINERARY (Lộ trình), OTHER']
  title varchar(255) [not null, note: 'Tiêu đề sự cố: VD: Hỏng xe tại đèo, Sạt lở đường...']
  description text [not null, note: 'Mô tả chi tiết sự cố và phương án xử lý (VD: bỏ qua 1 số điểm tham quan)']

  status varchar(30) [default: 'REPORTED', note: 'REPORTED (Đã báo), IN_PROGRESS (Đang xử lý), RESOLVED (Đã khắc phục)']
  evidence_urls json [note: 'Ảnh chụp hiện trường sự cố / biên bản xác nhận']
  resolved_at timestamp [note: 'Thời điểm sự cố được khắc phục xong']

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Ref: booking_incidents.booking_id > bookings.id
Ref: booking_incidents.agency_id > users.id
Ref: booking_incidents.reported_by > users.id

// ============================================================================
// 1. CÁC ĐỢT YÊU CẦU THANH TOÁN (PAYMENT MILESTONES)
// ============================================================================
Table payment_requests {
  beneficiary_agency_id varchar(36)
  QuotationId int
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  stage varchar(20) [note: 'Đợt thu: deposit (cọc 50%, mở khi Agency duyệt đơn) | balance (phần còn lại, tạo cùng lúc duyệt, thu sau khi đủ cọc, hạn trước khởi hành 1 tuần). NULL = khoản cũ trước khi có lịch thanh toán. CHECK CK_payment_requests_stage']
  description varchar(255) [not null, note: 'Khớp 100% với ô nhập "Nội dung yêu cầu" trên Modal (công ty có thể gõ tự do: "Cọc đợt 1 (50%)", "Thanh toán đợt 2", "Phụ thu đổi khách sạn"...).']
  amount decimal(12, 2) [not null, note: 'Số tiền cần thu']
  due_date date [note: 'Ngày hạn thanh toán (theo giờ Việt Nam). Khoản cũ chỉ có cột này']
  due_at timestamp [note: 'Hạn thanh toán chính xác, lưu UTC. Đợt cọc: thời điểm Agency duyệt + 24 giờ (backend tính, không gia hạn khi duyệt lặp). Đợt 2: 00:00 ngày khởi hành (giờ VN) − 7 ngày, ví dụ khởi hành 30/11 thì hạn hết ngày 22/11']
  status varchar(30) [default: 'PENDING', note: 'PENDING, PAID, OVERDUE, CANCELLED']
  created_by varchar(36) [note: 'FK tới users.id']
  created_at timestamp [default: `now()`]
  paid_at timestamp

  indexes {
    (booking_id, id) [unique]
    (booking_id, stage) [unique, name: 'UX_payment_requests_active_stage', note: 'Lọc: stage IS NOT NULL AND status IN (Pending, Overdue, Paid) — mỗi đơn chỉ một khoản đang hiệu lực cho mỗi đợt']
  }
}

// ============================================================================
// 2. LỊCH SỬ GIAO DỊCH TIỀN NỘP VÀO HỆ THỐNG
// ============================================================================
Table payment_transactions {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  payment_request_id int [note: 'FK tới payment_requests.id']
  transaction_code varchar(100) [unique, not null, note: 'Mã GD ngân hàng/cổng thanh toán']
  payment_method varchar(50) [not null, note: 'PAYOS (cổng hiện dùng), DEMO (mô phỏng Development), VNPAY (lịch sử cũ, không còn tạo mới)']
  amount decimal(12, 2) [not null, note: 'Số tiền thực nộp']
  status varchar(30) [default: 'SUCCESS', note: 'SUCCESS, PENDING, FAILED, REFUNDED, CANCELLED, EXPIRED, NEEDSREVIEW (cổng báo tiền không khớp, chưa cộng vào đơn)']
  payer_name varchar(150)
  payment_proof_url text [note: 'Ảnh chụp bill']
  paid_at timestamp [default: `now()`, note: 'Chỉ có nghĩa khi status = SUCCESS; giao dịch cổng được ghi đúng lúc backend xác minh thành công']
  gateway_transaction_no varchar(100) [note: 'Mã giao dịch phía cổng/ngân hàng (payOS: reference; VNPAY cũ: vnp_TransactionNo)']
  gateway_response_code varchar(10) [note: 'Trạng thái/mã kết quả cổng trả về (payOS: PAID, CANCELLED...; VNPAY cũ: vnp_ResponseCode)']
  gateway_link_id varchar(100) [note: 'Mã link thanh toán phía cổng (payOS: paymentLinkId)']
  checkout_url varchar(1000) [note: 'Trang thanh toán của cổng, dùng lại khi khách bấm lặp lúc link còn hạn']
  expires_at timestamp [note: 'Hạn của link thanh toán, lưu UTC']
  review_note varchar(500) [note: 'Ghi chú đối soát: tiền đến muộn, trả dư, số tiền không khớp']
  created_at timestamp [default: `now()`, note: 'Thời điểm tạo lần thanh toán']
}

// ============================================================================
// 3. NHẬT KÝ ĐIỀU CHỈNH TĂNG / GIẢM GIÁ TOUR DO PHÁT SINH
// ============================================================================
Table booking_supplier_requests {
  AvailabilityConfirmed boolean [not null]
  AvailableQuantity decimal(19,2)
  HoldUntil timestamp
  PriceConfirmed boolean [not null]
  ReplyDeadline timestamp
  ResponseHistoryJson text [not null]
  id int [pk, increment]
  booking_id int [not null]
  service_id int [not null]
  provider_id varchar(36) [not null]
  slot_key varchar(100) [not null]
  service_name varchar(255) [not null]
  service_date_from date
  service_date_to date
  quantity decimal(12, 2) [not null]
  unit varchar(30) [not null]
  estimated_cost decimal(12, 2) [not null]
  quoted_cost decimal(12, 2)
  status varchar(30) [not null]
  note varchar(1000)
  created_at timestamp [not null]
  responded_at timestamp
  indexes {
    (provider_id, status)
    (booking_id, slot_key)
  }
}
Ref: booking_supplier_requests.booking_id > bookings.id
Ref: booking_supplier_requests.service_id > services.id
Ref: booking_supplier_requests.provider_id > users.id

Table booking_quotations {
  NumberOfGuests int [not null]
  PaymentPolicy text [not null]
  PlanSnapshotJson text [not null]
  ValidUntil timestamp
  id int [pk, increment]
  booking_id int [not null]
  version int [not null]
  tour_id int [not null]
  tour_version int [not null]
  status varchar(30) [not null]
  estimated_sale decimal(12, 2) [not null]
  total_cost decimal(12, 2) [not null]
  agency_profit decimal(12, 2) [not null]
  sale_total decimal(12, 2) [not null]
  lines_json text [not null, note: 'Snapshot bất biến của từng dòng chi phí']
  reason varchar(1000) [not null]
  created_at timestamp [not null]
  sent_at timestamp
  accepted_at timestamp
  indexes {
    (booking_id, version) [unique]
  }
}
Ref: booking_quotations.booking_id > bookings.id
Ref: booking_quotations.tour_id > tours.id


Table booking_price_adjustments {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  agency_id varchar(36) [note: 'FK tới users.id - Công ty phát sinh việc đổi giá (Cty A hay Cty B)']
  adjusted_by varchar(36) [not null, note: 'FK tới users.id - Người sửa giá']
  previous_total_price decimal(12, 2) [not null, note: 'Giá trước khi sửa']
  adjustment_amount decimal(12, 2) [not null, note: 'Chênh lệch (+ tăng, - giảm)']
  new_total_price decimal(12, 2) [not null, note: 'Giá mới sau khi sửa']
  reason text [not null, note: 'Lý do đổi giá theo trao đổi với khách']
  created_at timestamp [default: `now()`]
}

// ============================================================================
// PHÂN CHIA DOANH THU & GIẢI NGÂN CHO TỪNG CÔNG TY TRONG BOOKING
// ============================================================================
Table booking_agencies {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  agency_id varchar(36) [not null, note: 'FK tới users.id - Công ty du lịch tham gia']
  is_host boolean [default: false, note: 'true: Công ty chủ trì (Host), false: Công ty đối tác']

  // 1. DOANH THU CỦA CÔNG TY (TRƯỚC & SAU ĐIỀU CHỈNH)
  original_amount decimal(12, 2) [default: 0, note: 'Tiền tạm tính ban đầu lúc khách mới gửi booking']
  final_amount decimal(12, 2) [not null, default: 0, note: 'Tiền chốt cuối cùng của cty sau khi thêm/bớt khách hoặc tùy biến']

  // 2. THÔNG TIN GIẢI NGÂN CỦA NỀN TẢNG (DISBURSEMENT / PAYOUT)
  platform_fee decimal(12, 2) [default: 0, note: 'Phí hoa hồng nền tảng giữ lại (VD: 10%)']
  net_payout decimal(12, 2) [default: 0, note: 'Tiền thực tế công ty nhận được (final_amount - platform_fee)']
  settlement_status varchar(30) [default: 'UNPAID', note: 'UNPAID (Chưa giải ngân), READY (Đã hoàn thành tour, chờ chuyển), PAID (Đã giải ngân)']
  payout_transferred_at timestamp [note: 'Thời điểm nền tảng chuyển khoản thực tế']
  bank_reference_code varchar(100) [note: 'Mã ủy nhiệm chi / GD ngân hàng']

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (booking_id, agency_id) [unique] // Mỗi công ty chỉ xuất hiện 1 dòng trong 1 đơn booking
  }
  Note: 'SQL triển khai unique index có điều kiện: mỗi booking tối đa một is_host = true. BE yêu cầu đúng một Host trước khi xác nhận. Tiền chia cho agency không đồng nghĩa lợi nhuận nội bộ.'
}

// ============================================================================
// 1. ĐÁNH GIÁ TOUR & DỊCH VỤ (FEEDBACKS)
// ============================================================================
Table feedbacks {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  customer_id varchar(36) [not null, note: 'FK tới users.id - Khách hàng đánh giá']
  agency_id varchar(36) [not null, note: 'FK tới users.id - Công ty chủ trì nhận đánh giá']

  // Đánh giá trải nghiệm tour chung
  overall_rating int [not null, note: 'Điểm số 1 - 5 sao cho toàn bộ chuyến đi']
  overall_comment text [note: 'Nhận xét về lịch trình, cảnh quan, ẩm thực...']

  // Đánh giá công ty du lịch chủ trì
  agency_rating int [not null, note: 'Điểm số 1 - 5 sao về chất lượng phục vụ của cty']
  agency_comment text [note: 'Nhận xét về thái độ phục vụ, điều phối tour']

  images json [note: 'Ảnh chụp thực tế do khách đính kèm review']

  // Phản hồi từ công ty chủ trì
  agency_reply text [note: 'Lời cảm ơn hoặc phản hồi của cty chủ trì']
  replied_at timestamp

  status varchar(30) [default: 'VISIBLE', note: 'VISIBLE (Hiển thị công khai), HIDDEN (Vi phạm, bị ẩn), PENDING']
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    booking_id [unique, note: 'Mỗi đơn booking khách chỉ được đánh giá 1 lần']
  }
  Note: 'BE bảo đảm customer_id là chủ booking, agency_id là Host và booking đủ điều kiện đánh giá.'
}

// ============================================================================
// 2. KHIẾU NẠI & TRANH CHẤP (COMPLAINTS)
// ============================================================================
Table complaints {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  customer_id varchar(36) [not null, note: 'FK tới users.id - Khách hàng khiếu nại']
  agency_id varchar(36) [not null, note: 'FK tới users.id - Công ty chủ trì bị khiếu nại']

  // Thông tin khiếu nại từ khách
  subject varchar(255) [not null, note: 'Tiêu đề khiếu nại (VD: Sai hạng phòng khách sạn so với cam kết)']
  description text [not null, note: 'Mô tả chi tiết sự cố phát sinh']
  evidence_urls json [note: 'Danh sách link ảnh/video/hóa đơn làm bằng chứng']

  // Giải trình từ Công ty chủ trì
  agency_response text [note: 'Giải trình và phương án hỗ trợ/đền bù của công ty chủ trì']
  agency_responded_at timestamp

  // Trọng tài Admin xử lý
  admin_id varchar(36) [note: 'FK tới users.id - Admin sàn giải quyết khiếu nại']
  admin_notes text [note: 'Kết luận và phán quyết xử lý của Admin']
  status varchar(30) [default: 'PENDING', note: 'PENDING (Chờ cty giải trình), IN_REVIEW (Admin đang xử lý), RESOLVED (Đã giải quyết), REJECTED (Bác bỏ)']
  resolved_at timestamp

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp [note: 'Soft delete nếu cần']
  Note: 'BE kiểm tra customer_id và agency_id khớp các bên của booking; admin_id phải có vai trò quản trị.'
}

// ============================================================================
    // 1. MODULE CHAT (CHỈ CHAT 1-1 TRỰC TIẾP GIỮA 2 ACTORS BẤT KỲ)
    // ============================================================================

    Table chat_conversations {
      id int [pk, increment]
      user_one_id varchar(36) [not null, note: 'FK tới users.id - Người tham gia thứ nhất']
      user_two_id varchar(36) [not null, note: 'FK tới users.id - Người tham gia thứ hai']

      // Cache tin nhắn mới nhất để hiển thị danh sách hội thoại nhanh (Denormalized)
      last_message_content text
      last_message_sender_id varchar(36) [note: 'FK tới users.id - Người gửi tin nhắn cuối']
      last_message_at timestamp

      status varchar(20) [not null, default: 'active', note: 'active, archived']
      created_at timestamp [default: `now()`]
      updated_at timestamp [default: `now()`]
      Note: 'Chuẩn hóa thứ tự user_one_id < user_two_id; cấm tự chat. last_message_sender_id phải là một trong hai thành viên.'

  indexes {
    (user_one_id, user_two_id) [unique]
  }
}

    Table chat_messages {
      design_request_id int
      id int [pk, increment]
      conversation_id int [not null, note: 'FK tới chat_conversations.id']
      sender_id varchar(36) [not null, note: 'FK tới users.id - Người gửi']

      content text [not null, note: 'Nội dung tin nhắn']
      content_type varchar(20) [not null, default: 'text', note: 'text, image, file']

      // Trạng thái đã xem tin nhắn (Dành cho chat 1-1)
      is_read boolean [default: false, note: 'true khi đối phương đã mở xem tin nhắn']
      read_at timestamp

      reply_to_message_id int [note: 'FK tới chat_messages.id (khi trích dẫn/reply tin nhắn)']
      is_edited boolean [default: false]
      is_deleted boolean [default: false, note: 'Soft delete: hiển thị tin nhắn đã bị thu hồi']

      created_at timestamp [default: `now()`]
      updated_at timestamp [default: `now()`]
      Note: 'BE kiểm tra sender là thành viên hội thoại và tin được reply thuộc cùng conversation.'
}

    Table chat_attachments {
      id int [pk, increment]
      message_id int [not null, note: 'FK tới chat_messages.id']
      file_name varchar(255) [not null]
      file_url text [not null]
      file_type varchar(50) [note: 'image/jpeg, application/pdf...']
      file_size int [note: 'Dung lượng file (bytes)']
      thumbnail_url text
      created_at timestamp [default: `now()`]
    }

    // Khóa ngoại Chat:
    Ref: chat_conversations.user_one_id > users.id
    Ref: chat_conversations.user_two_id > users.id
    Ref: chat_conversations.last_message_sender_id > users.id
    Ref: chat_messages.conversation_id > chat_conversations.id
    Ref: chat_messages.sender_id > users.id
    Ref: chat_messages.reply_to_message_id > chat_messages.id
    Ref: chat_attachments.message_id > chat_messages.id


    // ============================================================================
    // 2. MODULE GÓI DỊCH VỤ - SUBSCRIPTION PLANS (CHỈ CHO CÔNG TY DU LỊCH)
    // Lưu ý: Không lưu gói Free vào DB. Cty nào không có record = mặc định dùng Free
    // ============================================================================

    Table subscription_plans {
  id int [pk, increment]
  name varchar(100) [not null, note: 'Tên gói trả phí: Cơ bản, Chuyên nghiệp, Doanh nghiệp...']
  slug varchar(50) [unique, not null, note: 'Mã định danh gói trong code: basic, pro, enterprise']
  description text

  // Biểu giá
  price_monthly decimal(12, 2) [not null, note: 'Giá theo tháng (VNĐ)']
  price_yearly decimal(12, 2) [note: 'Giá theo năm nếu trả trọn gói 1 năm (VNĐ)']

  // Hiển thị & Trạng thái
  is_popular boolean [default: false, note: 'Gắn huy hiệu Gói phổ biến nhất']
  sort_order int [default: 0]
  status varchar(20) [default: 'active', note: 'active, inactive']

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

    Table agency_subscriptions {
      id int [pk, increment]
      agency_id varchar(36) [not null, note: 'FK tới users.id (đại diện công ty) hoặc business_profiles']
      plan_id int [not null, note: 'FK tới subscription_plans.id']

      billing_cycle varchar(20) [not null, default: 'monthly', note: 'monthly (hàng tháng), yearly (hàng năm)']
      price decimal(12, 2) [not null, note: 'Số tiền thực tế thanh toán']

      start_date date [not null]
      end_date date [not null]

      status varchar(30) [not null, default: 'active', note: 'active (đang hiệu lực), past_due (quá hạn), cancelled (đã hủy), expired (hết hạn)']
      auto_renew boolean [default: true, note: 'Tự động gia hạn khi đến hạn']

      cancelled_at timestamp
      cancel_reason text

      last_payment_date timestamp
      next_payment_date timestamp

      created_at timestamp [default: `now()`]
      updated_at timestamp [default: `now()`]
      Note: 'BE kiểm tra khoảng hiệu lực không chồng nhau cho cùng agency; end_date >= start_date.'
}

    Table subscription_payment_history {
      id int [pk, increment]
      subscription_id int [not null, note: 'FK tới agency_subscriptions.id']
      company_id varchar(36) [not null, note: 'FK tới users.id']
      plan_id int [not null, note: 'FK tới subscription_plans.id']

      amount decimal(12, 2) [not null, note: 'Số tiền nộp']
      payment_method varchar(50) [not null, note: 'BANK_TRANSFER, VNPAY, MOMO, ZALOPAY']
      transaction_code varchar(100) [note: 'Mã giao dịch cổng thanh toán / ngân hàng']
      status varchar(30) [not null, default: 'PENDING', note: 'PENDING, SUCCESS, FAILED, REFUNDED']

      billing_period_start date [not null]
      billing_period_end date [not null]
      paid_at timestamp

      admin_note text
      created_at timestamp [default: `now()`]
      Note: 'company_id và plan_id phải khớp subscription tại thời điểm ghi nhận thanh toán; lịch sử đã chốt không đổi theo gói mới.'
}

    // Khóa ngoại Subscription:
    Ref: agency_subscriptions.agency_id > users.id
    Ref: agency_subscriptions.plan_id > subscription_plans.id
    Ref: subscription_payment_history.subscription_id > agency_subscriptions.id
    Ref: subscription_payment_history.company_id > users.id
    Ref: subscription_payment_history.plan_id > subscription_plans.id


    // ============================================================================
    // 3. MODULE YÊU CẦU HOÀN TIỀN (REFUND REQUESTS)
    // Tiền hoàn được tính toán tự động theo quy định của nền tảng & chính sách tour
    // ============================================================================

    Table refund_requests {
      id int [pk, increment]
      booking_id int [not null, note: 'FK tới bookings.id']
      requested_by varchar(36) [not null, note: 'FK tới users.id - Khách hàng hoặc Cty du lịch gửi yêu cầu']

      reason varchar(50) [not null, note: 'CUSTOMER_REQUEST, TOUR_CANCELLED, SERVICE_QUALITY, WEATHER_FORCE_MAJEURE,DUPLICATE_PAYMENT, OTHER']
      reason_detail text [not null, note: 'Mô tả chi tiết nguyên nhân']
      evidence_urls json [note: 'Mảng URL ảnh/tài liệu chứng minh dạng JSON: ["url1", "url2"]']

      // Tiền tệ (Tính theo quy định nền tảng & chính sách hủy tour)
      original_paid_amount decimal(12, 2) [not null, note: 'Tổng số tiền đã thanh toán của booking này']
      approved_refund_amount decimal(12, 2) [note: 'Số tiền hoàn trả thực tế (được tính theo chính sách hoàn hủy của sàn)']
      refund_fee decimal(12, 2) [default: 0, note: 'Phí hủy / phạt giữ lại theo quy định nếu có']

      // Tài khoản ngân hàng nhận tiền hoàn
      refund_bank_name varchar(100) [note: 'Tên ngân hàng nhận']
      refund_account_number varchar(50) [note: 'Số tài khoản nhận tiền']
      refund_account_holder varchar(150) [note: 'Tên chủ tài khoản nhận tiền']

      // Trạng thái xử lý
      status varchar(30) [not null, default: 'PENDING', note: 'PENDING (Chờ duyệt), REVIEWING (Đang kiểm tra), APPROVED (Đã duyệt), REJECTED (Từ chối), COMPLETED (Đã chuyển khoản hoàn tất)']

      reviewed_by varchar(36) [note: 'FK tới users.id - Admin xử lý']
      review_note text [note: 'Ghi chú nội bộ của Admin']
      rejection_reason text [note: 'Lý do từ chối nếu status = REJECTED']

      created_at timestamp [default: `now()`]
      reviewed_at timestamp
      completed_at timestamp
      Note: 'Tổng số tiền hoàn hoàn tất không vượt số tiền thực thu đủ điều kiện của booking. Ghi nhận chứng từ chuyển hoàn ở bước triển khai thanh toán.'
}

    // Khóa ngoại Refund:
    Ref: refund_requests.booking_id > bookings.id
    Ref: refund_requests.requested_by > users.id
    Ref: refund_requests.reviewed_by > users.id
    // Hợp đồng lữ hành (Luật Du lịch 2017 Điều 39): sinh khi Agency duyệt, khách ký rồi tải bản đã ký lên.
    // Giá đổi sau khi duyệt thì tạo phiên bản mới (bản cũ Superseded) và khách ký lại.
    Table booking_contracts {
      id int [pk, increment]
      booking_id int [not null, note: 'FK tới bookings.id']
      version int [not null, note: 'Phiên bản hợp đồng của booking, bắt đầu từ 1']
      contract_no varchar(50) [not null, note: 'Số hợp đồng, ví dụ HD-BK123-1']
      total_amount decimal(12, 2) [not null, note: 'Tổng giá trị tour tại thời điểm lập hợp đồng']
      status varchar(30) [not null, note: 'AwaitingSignature, Signed, Verified, ResignRequested, Superseded']
      signed_file_name varchar(260) [note: 'Tên file bản đã ký lưu trên máy chủ']
      signed_file_type varchar(50) [note: 'application/pdf, image/png, image/jpeg']
      signed_file_sha256 varchar(64) [note: 'Mã băm SHA-256 của bản đã ký để chứng minh không bị sửa']
      signed_at timestamp
      sign_method varchar(20) [note: 'upload (tải bản ký lên) hoặc web (ký trên web)']
      reviewed_by varchar(36) [note: 'FK tới users.id - Agency kiểm tra bản ký']
      reviewed_at timestamp
      review_note varchar(1000)
      created_at timestamp [default: `now()`]
      indexes {
        (booking_id, version) [unique]
      }
    }
    Ref: booking_contracts.booking_id > bookings.id
    Ref: booking_contracts.reviewed_by > users.id

    // Phiên ký hợp đồng trực tuyến: mở bằng QR (điện thoại) hoặc trên máy tính; một lần dùng, hết hạn 15 phút, xác nhận bằng OTP email.
    Table contract_sign_sessions {
      id int [pk, increment]
      contract_id int [not null, note: 'FK tới booking_contracts.id']
      token_hash varchar(64) [not null, unique, note: 'SHA-256 của mã phiên trong QR (không lưu mã gốc)']
      expires_at timestamp [not null]
      otp_hash varchar(64) [note: 'SHA-256 của OTP đã gửi email']
      otp_expires_at timestamp
      otp_sent_at timestamp
      otp_send_count int [not null, default: 0]
      otp_attempts int [not null, default: 0, note: 'Số lần nhập sai OTP; quá 5 lần thì khóa phiên']
      completed_at timestamp [note: 'Thời điểm khách xác nhận ký']
      signer_ip varchar(45)
      signer_user_agent varchar(300)
      created_at timestamp [default: `now()`]
    }
    Ref: contract_sign_sessions.contract_id > booking_contracts.id



    // ============================================================================
    // 4. MODULE TÀI KHOẢN NGÂN HÀNG HỆ THỐNG & CẤU HÌNH HOA HỒNG (COMMISSION)
    // Admin có thể tùy chỉnh 1 mức phí sàn duy nhất cho toàn hệ thống
    // ============================================================================

Table system_bank_accounts {
  id int [pk, increment]
  bank_name varchar(150) [not null, note: 'VD: Vietcombank, Techcombank, MB Bank...']
  bank_code varchar(30) [not null, note: 'VCB, TCB, MB, ICB... (Dùng để sinh mã VietQR động)']
  account_number varchar(50) [not null, note: 'Số tài khoản nhận tiền ký quỹ (Escrow)']
  account_holder varchar(150) [not null, note: 'Tên chủ tài khoản công ty sàn']
  branch varchar(150) [note: 'Chi nhánh mở tài khoản']

  is_default boolean [default: true, note: 'true: Tài khoản mặc định hệ thống hiển thị cho khách chuyển tiền']
  status varchar(20) [default: 'ACTIVE', note: 'ACTIVE, INACTIVE']
  notes text [note: 'Ghi chú thêm nếu có']

  updated_by varchar(36) [note: 'FK tới users.id - Admin cập nhật gần nhất']
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  Note: 'SQL dùng unique index có điều kiện để tối đa một tài khoản ACTIVE có is_default = true.'
}

// Khóa ngoại liên kết tới Admin thực hiện
Ref: system_bank_accounts.updated_by > users.id

Table system_commission_configs {
  id int [pk, increment]
  commission_rate decimal(5, 2) [not null, note: 'Tỷ lệ % phí sàn (VD: 8.00 = 8%)']
  note text [note: 'Lý do hoặc chính sách áp dụng (VD: Miễn phí sàn khai trương, Tăng phí mùa cao điểm...)']

  is_active boolean [default: true, note: 'true: Mức phí đang có hiệu lực hiện tại (các mức cũ chuyển thành false)']
  applied_from timestamp [default: `now()`, note: 'Thời điểm bắt đầu có hiệu lực']

  created_by varchar(36) [not null, note: 'FK tới users.id - Admin thiết lập mức phí này']
  created_at timestamp [default: `now()`]
  Note: 'SQL dùng unique index có điều kiện để tối đa một cấu hình is_active = true; commission_rate trong khoảng 0 đến 100. Khi chốt booking phải lưu số phí thực tế, không tính lại theo cấu hình mới.'
}

// Khóa ngoại liên kết tới Admin thiết lập
Ref: system_commission_configs.created_by > users.id

// KHÓA NGOẠI (REFS)
Ref: feedbacks.booking_id > bookings.id
Ref: feedbacks.customer_id > users.id
Ref: feedbacks.agency_id > users.id

Ref: complaints.booking_id > bookings.id
Ref: complaints.customer_id > users.id
Ref: complaints.agency_id > users.id
Ref: complaints.admin_id > users.id

// Khóa ngoại liên kết
Ref: booking_agencies.booking_id > bookings.id
Ref: booking_agencies.agency_id > users.id

// Các liên kết khóa ngoại
Ref: payment_requests.booking_id > bookings.id
Ref: payment_requests.created_by > users.id
Ref: payment_transactions.booking_id > bookings.id
Ref: payment_transactions.(booking_id, payment_request_id) > payment_requests.(booking_id, id)
Ref: booking_price_adjustments.booking_id > bookings.id
Ref: booking_price_adjustments.adjusted_by > users.id

// ============================================================================
// CÁC KHÓA NGOẠI REFS
// ============================================================================
Ref: booking_timelines.booking_id > bookings.id
Ref: booking_locations.booking_timeline_id > booking_timelines.id
Ref: booking_restaurants.booking_timeline_id > booking_timelines.id
Ref: booking_hotels.booking_id > bookings.id

// Các liên kết khóa ngoại (Refs)
Ref: booking_participants.booking_id > bookings.id


// Các liên kết khóa ngoại (Refs)
Ref: bookings.customer_id > users.id
Ref: bookings.tour_id > tours.id
Ref: bookings.design_request_id > tour_design_requests.id

// 1. Nhiều mốc timeline thuộc về 1 tour (tours -> tour_timeline)
Ref: tour_timeline.tour_id > tours.id

// 2. Nhiều mức giá thuộc về 1 tour (tours -> tour_pricing_tiers)
Ref: tour_pricing_tiers.tour_id > tours.id

// 3. Nhiều địa điểm tham quan thuộc về 1 mốc timeline (tour_timeline -> tourist_attractions)
Ref: tourist_locations.tour_timeline_id > tour_timeline.id

// 4. Nhiều bữa ăn thuộc về 1 mốc timeline (tour_timeline -> tour_meals)
Ref: tour_restaurants.tour_timeline_id > tour_timeline.id


// 1. Một doanh nghiệp/agency tạo được nhiều tour (business_profiles -> tours)
Ref: tours.agency_id > users.id

// 2. Một user có một hồ sơ doanh nghiệp (users -> business_profiles)
Ref: business_profiles.user_id - users.id


Ref: tour_hotels.tour_id > tours.id

// 3. Quan hệ (References)
Ref: tour_design_requests.user_id > users.id

Ref: tours.design_request_id > tour_design_requests.id

Ref: tourist_locations.agency_id > users.id
Ref: tour_restaurants.service_id > services.id
Ref: tour_restaurants.agency_id > users.id
Ref: tour_hotels.service_id > services.id
Ref: tour_hotels.agency_id > users.id
Ref: agency_suppliers.agency_id > users.id
Ref: tour_restaurants.agency_supplier_id > agency_suppliers.id
Ref: tour_hotels.agency_supplier_id > agency_suppliers.id
Ref: tour_design_requests.agency_id > users.id
Ref: booking_locations.agency_id > users.id
Ref: booking_restaurants.service_id > services.id
Ref: booking_hotels.service_id > services.id
Ref: booking_price_adjustments.(booking_id, agency_id) > booking_agencies.(booking_id, agency_id)
Ref: booking_assigned_guides.(booking_id, agency_id) > booking_agencies.(booking_id, agency_id)
Ref: booking_incidents.(booking_id, agency_id) > booking_agencies.(booking_id, agency_id)

Ref: booking_participants.agency_id > users.id
Ref: booking_participants.checked_by > users.id
Ref: booking_participants.assigned_guide_id > users.id
Ref: booking_participants.(booking_id, agency_id) > booking_agencies.(booking_id, agency_id)
Ref: booking_participants.(booking_id, agency_id, assigned_guide_id) > booking_assigned_guides.(booking_id, agency_id, guide_id)
Ref: booking_locations.guide_id > users.id

Table workflow_notifications {
  Id int [pk, not null]
  UserId varchar(36) [not null]
  Message text [not null]
  RequestId int
  BookingId int
  CreatedAt timestamp [not null]
  ReadAt timestamp
}

Ref: tours.cloned_from_tour_id > tours.id
Ref: tours.(id, shared_version) > tour_versions.(tour_id, version)
Ref: chat_messages.design_request_id > tour_design_requests.id


// Thành viên liên minh; is_host đánh dấu Agency chủ trì.
Table tour_design_request_agencies {
  id int [pk, not null]
  request_id int [not null]
  agency_id varchar(36) [not null]
  is_host boolean [not null]
  stage_area varchar(255) [not null]
  suggested_budget decimal(12,2)
  communication_notes text
  status varchar(20) [not null, note: 'pending, accepted, rejected, cancelled']
  assigned_at timestamp [not null]
  responded_at timestamp
  indexes {
    (request_id, agency_id) [unique]
  }
}
Ref: tour_design_request_agencies.request_id > tour_design_requests.id
Ref: tour_design_request_agencies.agency_id > users.id

// Chủ sở hữu dịch vụ và đơn vị nhận phụ thu của booking liên minh.
Ref: booking_hotels.(booking_id, agency_id) > booking_agencies.(booking_id, agency_id)
Ref: booking_restaurants.agency_id > users.id
Ref: payment_requests.(booking_id, beneficiary_agency_id) > booking_agencies.(booking_id, agency_id)
