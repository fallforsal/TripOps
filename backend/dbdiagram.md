Table users {
  id varchar(36) [pk, note: 'UUID định danh duy nhất người dùng']
  name varchar(150) [not null, note: 'Họ và tên hiển thị']
  email varchar(191) [unique, not null, note: 'Email chính đăng nhập']
  phone varchar(30) [note: 'Số điện thoại liên hệ']
  password_hash varchar(255) [note: 'Mật khẩu đã băm bcrypt/argon2']
  role user_role_enum [not null, default: 'user', note: 'Vai trò người dùng trong hệ thống']
  avatar varchar(500) [note: 'Đường dẫn ảnh đại diện']
  is_verified boolean [not null, default: true]
  status varchar(30) [not null, default: 'active', note: 'active, inactive, banned']
  created_at timestamp [not null, default: `now()` ]
  updated_at timestamp [not null, default: `now()` ]
}

Table business_profiles {
  id int [pk, increment]
  user_id int [unique] // hoặc gắn reference: > users.id
  business_name varchar(255)
  tax_code varchar(50)
  business_address text
  business_license_url text
  description text
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
  id int [pk, increment]
  provider_id varchar(36) [not null, note: 'FK tới users.id - Nhà cung cấp dịch vụ']
  
  // 1. PHÂN LOẠI DỊCH VỤ
  category varchar(50) [not null, note: 'hotel (Lưu trú), fnb (Ẩm thực), transportation (Vận chuyển), attraction (Tham quan)']
  sub_category varchar(100) [note: 'Phân loại chi tiết: Resort, Khách sạn, Nhà hàng hải sản, Xe 16 chỗ, Cano...']
  
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
  latitude decimal(10, 8) [note: 'Tọa độ GPS vĩ độ để ghim bản đồ']
  longitude decimal(11, 8) [note: 'Tọa độ GPS kinh độ để ghim bản đồ']
  
  // 6. HÌNH ẢNH DỊCH VỤ
  thumbnail_url text [not null, note: 'Ảnh đại diện chính của bài đăng']
  images json [note: 'Danh sách các ảnh chi tiết dạng mảng JSON']
  
  // 7. ĐÁNH GIÁ & KIỂM DUYỆT (ADMIN DANG XÉT DUYỆT)
  rating decimal(3, 2) [default: 5.0, note: 'Điểm đánh giá trung bình']
  status varchar(30) [default: 'PENDING', note: 'PENDING (Chờ duyệt), APPROVED (Đã duyệt mở bán), REJECTED (Bị từ chối), HIDDEN (Tạm ẩn)']
  rejection_reason text [note: 'Lý do Admin từ chối phê duyệt bài đăng']
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

// MỐI QUAN HỆ KHÓA NGOẠI:
Ref: services.provider_id > users.id

Table tours {
  id int [pk, increment]
  agency_id int // Khóa ngoại FK liên kết tới bảng agency/business tương ứng
  tour_code varchar(50)
  name varchar(255)
  destination text
  duration_tour text
  operation_period varchar(255)
  duration_days int
  duration_nights int
  baseprice text
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
  custom_request_id int [note: 'FK tới tour_custom_requests.id']
  is_shared_to_customer boolean [default: false, note: 'Chỉ Host bật true khi sẵn sàng cho khách xem']
  is_ai_generated boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}



Table tour_pricing_tiers {
  id int [pk, increment]
  tour_id int // FK tham chiếu tới tours.id
  agency_id varchar(36) [not null, note: 'FK tới users.id - ID của công ty báo giá (Cty A, Cty B...)']
  tier_name varchar(100)
  min_age int
  max_age int
  price decimal(12, 2)
  display_order int [default: 0]
}

Ref: tour_pricing_tiers.agency_id > users.id

Table tour_timeline {
  id int [pk, increment]
  tour_id int // FK tham chiếu tới tours.id
  day_number int
  title varchar(255)
  description text
}

Table tourist_attractions {
  id int [pk, increment]
  tour_timeline_id int
  name_location text
  agency_id varchar(36) [note: 'FK tới users.id - Agency phụ trách điểm đến này']
}


// 2. Bữa ăn của tour (Gồm tất cả các options món/nhà hàng của bữa đó)
Table tour_meals {
  id int [pk, increment]
  tour_timeline_id int [not null]
  meal_type varchar(20) [not null, note: 'breakfast, lunch, dinner']
  restaurant_name text [not null]
  description text
  is_default boolean [default: false, note: 'true: Phương án chuẩn theo tour gốc']
  price_difference decimal(12, 2) [default: 0, note: '0đ: Suất chuẩn theo tour | > 0: Option đổi món/nhà hàng']
  agency_id varchar(36)
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

// 1. Chỗ ở của tour (Gồm tất cả các options mà công ty cung cấp)
Table tour_accommodations {
  id int [pk, increment]
  tour_id int [not null]
  destination_name varchar(255) [not null]
  hotel_name varchar(255) [not null]
  star_rating int [default: 3]
  nights_count int [default: 1]
  is_default boolean [default: false, note: 'true: Phương án chuẩn theo tour gốc']
  price_difference decimal(12, 2) [default: 0, note: '0đ: Phương án chuẩn theo giá tour | > 0: Option phụ thu']
  address_notes text
  agency_id varchar(36)
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}


Table tour_custom_requests {
  id int [pk, increment]
  
  // 1. CHỌN CÔNG TY DU LỊCH (Agency/Business Profile nhận yêu cầu)
  user_id varchar(36) // FK trỏ tới users.id (người dùng gửi form, có thể null nếu cho phép khách vãng lai)

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
  status varchar(50) [default: 'PENDING'] // PENDING, CONTACTED, QUOTED, ACCEPTED, CANCELLED
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

// ============================================================================
// LỊCH SỬ PHIÊN BẢN & SAO LƯU TOUR (VERSION CONTROL & ROLLBACK)
// ============================================================================
Table tour_versions {
  id int [pk, increment]
  tour_id int [not null, note: 'FK tới tours.id']
  version int [not null, note: 'Số thứ tự phiên bản: 1, 2, 3...']
  change_note text [note: 'Ghi chú lý do thay đổi: VD: Nâng cấp Terracotta 4 sao và bổ sung Gala Dinner VIP...']
  price decimal(12, 2) [note: 'Giá tour tại thời điểm của phiên bản này']
  tour_snapshot json [not null, note: 'Bản sao snapshot toàn bộ cấu hình tour (lộ trình, khách sạn, ẩm thực, số khách) để khôi phục (rollback)']
  created_by varchar(36) [note: 'FK tới users.id - Nhân viên công ty thực hiện cập nhật/lưu bản sao']
  created_at timestamp [default: `now()`, note: 'Thời điểm tạo bản sao lưu']

  indexes {
    (tour_id, version) [unique, note: 'Mỗi tour chỉ có 1 bản ghi duy nhất cho mỗi số version']
  }
}

Ref: tour_versions.tour_id > tours.id
Ref: tour_versions.created_by > users.id

// 2. Bảng trung gian gán nhiều công ty cho 1 đơn
Table tour_custom_request_agencies {
  id int [pk, increment]
  request_id int [not null]
  agency_id int [not null]
  is_host boolean [default: false]          // true: Công ty chủ trì (Host), false: Đối tác được mời (Invitee)
  
  // Thông tin từ Form mời đối tác liên minh
  stage_area varchar(255)          // Chặng/Khu vực mời đối tác phối hợp
  suggested_budget decimal(12, 2)           // Ngân sách gợi ý cho chặng của đối tác (VNĐ/khách)
  communication_notes text              // Nội dung đã trao đổi ngoài hệ thống (Zalo / Điện thoại)
  
  // Trạng thái & Báo giá
  status varchar(50) [default: 'PENDING']   // PENDING, ACCEPTED, REJECTED, QUOTED
  assigned_at timestamp [default: `now()`]
  responded_at timestamp

  indexes {
    (request_id, agency_id) [unique]        // Mỗi công ty chỉ xuất hiện 1 lần trong 1 yêu cầu tour
  }
}


Table bookings {
  id int [pk, increment]
  booking_code varchar(50) [unique, not null]
  customer_id varchar(36) // FK tới users.id
  tour_id int // FK tới tours.id
  design_request_id int // FK tới tour_custom_requests.id (nếu đặt từ tour thiết kế riêng)
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
}




// ============================================================================
// DANH SÁCH HÀNH KHÁCH THEO TỪNG CHẶNG VÀ CÔNG TY
// ============================================================================
Table booking_participants {
  id int [pk, increment]
  booking_id int [not null, note: 'FK trỏ tới bookings.id']
  agency_id varchar(36) [not null, note: 'FK tới users.id - Công ty du lịch phụ trách khách này']
  participant_index int [not null, note: 'STT khách trong đoàn (1, 2, 3...) để định danh cùng 1 người giữa Cty A & B']
  is_primary boolean [default: true, note: 'true: Dòng hồ sơ gốc hiển thị cho khách xem | false: Dòng chặng phụ của cty đối tác']

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

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (booking_id, agency_id, participant_index) [unique]
  }
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
    (booking_id, guide_id) [unique] // Mỗi HDV chỉ xuất hiện 1 lần trong 1 đơn booking
  }
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
}

// ============================================================================
// 2. ĐIỂM THAM QUAN (Lưu cả điểm gốc & điểm đổi)
// ============================================================================
Table booking_timeline_attractions {
  id int [pk, increment]
  booking_timeline_id int [not null, note: 'FK tới booking_timelines.id']
  agency_id varchar(36)
  // ĐIỂM GỐC THEO TOUR BAN ĐẦU
  original_location_name varchar(255) [not null, note: 'Điểm gốc của tour (VD: Đảo Hòn Mun, Chợ đêm Đà Lạt)']
  
  // ĐIỂM MỚI NẾU KHÁCH ĐỀ XUẤT ĐỔI (NULL nếu đi theo tour)
  customized_location_name varchar(255) [note: 'Điểm mới khách muốn đi (VD: Hòn Tằm & Tắm bùn khoáng)']

  is_customized boolean [default: false, note: 'false: Đi theo tour mặc định | true: Có đổi điểm']
  customer_note text [note: 'Lý do hoặc mong muốn của khách khi đổi']
  price_difference decimal(12, 2) [default: 0, note: 'Phụ thu vé phát sinh (nếu có)']
  status varchar(30) [default: 'approved', note: 'pending (chờ duyệt), approved (đồng ý), rejected (từ chối)']

}

// ============================================================================
// 3. BỮA ĂN (Lưu nhà hàng gốc & nhà hàng mới - Hiển thị chữ "Mặc định")
// ============================================================================
Table booking_timeline_meals {
  id int [pk, increment]
  booking_timeline_id int [not null, note: 'FK tới booking_timelines.id']
  meal_type varchar(20) [not null, note: 'breakfast, lunch, dinner']
  
  // NHÀ HÀNG GỐC THEO TOUR (Hiện ở dòng "Mặc định: ...")
  original_restaurant_name varchar(255) [not null, note: 'VD: Nhà hàng Yến Sào Cam Ranh']
  
  // NHÀ HÀNG MỚI KHÁCH CHỌN ĐỔI (Snapshot tên tại thời điểm đặt)
  customized_restaurant_name varchar(255) [note: 'VD: Nhà hàng Hải Sản Biển Xanh']
  provider_id varchar(36) [note: 'FK tới users.id - Đối tác cung cấp để cty du lịch liên hệ đặt bàn (NULL nếu khách tự đề xuất)']
  
  price_difference decimal(12, 2) [default: 0, note: 'Chênh lệch giá (VD: 0đ nếu theo tour, +60.000đ nếu đổi)']
  is_customized boolean [default: false, note: 'false: Theo tour (0đ) | true: Đã đổi món/nhà hàng']
  customer_note text
  status varchar(30) [default: 'approved', note: 'pending, approved, rejected']
}

Ref: booking_timeline_meals.provider_id > users.id

// ============================================================================
// 4. KHÁCH SẠN LƯU TRÚ (Lưu khách sạn gốc & khách sạn đổi)
// ============================================================================
Table booking_accommodations {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  destination varchar(100) [not null, note: 'Khu vực: Nha Trang, Đà Lạt...']
  
  // KHÁCH SẠN GỐC THEO TOUR
  original_hotel_name varchar(255) [not null, note: 'VD: Vinpearl Resort & Spa Nha Trang Bay']
  original_stars int [default: 5]
  
  // KHÁCH SẠN MỚI NẾU ĐỔI HẠNG / NÂNG CẤP (Snapshot tên tại thời điểm đặt)
  customized_hotel_name varchar(255) [note: 'VD: Khách Sạn Heritage Đà Lạt']
  customized_stars int
  provider_id varchar(36) [note: 'FK tới users.id - Đối tác cung cấp để cty du lịch liên hệ đặt phòng (NULL nếu khách tự đề xuất)']
  
  nights_count int [default: 1]
  price_difference decimal(12, 2) [default: 0, note: 'Chênh lệch (+450.000đ)']
  is_customized boolean [default: false, note: 'false: Theo tour | true: Đổi khách sạn']
  customer_note text
  status varchar(30) [default: 'approved', note: 'pending, approved, rejected']
}

Ref: booking_accommodations.provider_id > users.id

// ============================================================================
    // NHẬT KÝ PHÂN CÔNG & CHECK-IN ĐIỂM THAM QUAN CỦA HƯỚNG DẪN VIÊN
    // ============================================================================
    Table booking_attraction_checkins {
      id int [pk, increment]
      booking_timeline_attraction_id int [not null, note: 'FK tới booking_timeline_attractions.id']
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
    }
    
    // Khóa ngoại liên kết
    Ref: booking_attraction_checkins.booking_timeline_attraction_id > booking_timeline_attractions.id
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
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  description varchar(255) [not null, note: 'Khớp 100% với ô nhập "Nội dung yêu cầu" trên Modal (công ty có thể gõ tự do: "Cọc đợt 1 (50%)", "Thanh toán đợt 2", "Phụ thu đổi khách sạn"...).'] 
  amount decimal(12, 2) [not null, note: 'Số tiền cần thu']
  due_date date [note: 'Hạn chót thanh toán']
  status varchar(30) [default: 'PENDING', note: 'PENDING, PAID, OVERDUE, CANCELLED']
  created_by varchar(36) [note: 'FK tới users.id']
  created_at timestamp [default: `now()`]
  paid_at timestamp
}

// ============================================================================
// 2. LỊCH SỬ GIAO DỊCH TIỀN NỘP VÀO HỆ THỐNG
// ============================================================================
Table payment_transactions {
  id int [pk, increment]
  booking_id int [not null, note: 'FK tới bookings.id']
  payment_request_id int [note: 'FK tới payment_requests.id']
  transaction_code varchar(100) [unique, not null, note: 'Mã GD ngân hàng/cổng thanh toán']
  payment_method varchar(50) [not null, note: 'BANK_TRANSFER, VNPAY, MOMO, CASH']
  amount decimal(12, 2) [not null, note: 'Số tiền thực nộp']
  status varchar(30) [default: 'SUCCESS', note: 'SUCCESS, PENDING, FAILED, REFUNDED']
  payer_name varchar(150)
  payment_proof_url text [note: 'Ảnh chụp bill']
  paid_at timestamp [default: `now()`]
}

// ============================================================================
// 3. NHẬT KÝ ĐIỀU CHỈNH TĂNG / GIẢM GIÁ TOUR DO PHÁT SINH
// ============================================================================
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
    }
    
    Table chat_messages {
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
    Ref: chat_messages.reply_to_message_id - chat_messages.id
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
    }
    
    Table subscription_payment_history {
      id int [pk, increment]
      subscription_id int [not null, note: 'FK tới company_subscriptions.id']
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
    }
    
    // Khóa ngoại Refund:
    Ref: refund_requests.booking_id > bookings.id
    Ref: refund_requests.requested_by > users.id
    Ref: refund_requests.reviewed_by > users.id
    
    
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
Ref: payment_transactions.payment_request_id > payment_requests.id
Ref: booking_price_adjustments.booking_id > bookings.id
Ref: booking_price_adjustments.adjusted_by > users.id



















// ============================================================================
// CÁC KHÓA NGOẠI REFS
// ============================================================================
Ref: booking_timelines.booking_id > bookings.id
Ref: booking_timeline_attractions.booking_timeline_id > booking_timelines.id
Ref: booking_timeline_meals.booking_timeline_id > booking_timelines.id
Ref: booking_accommodations.booking_id > bookings.id

// Các liên kết khóa ngoại (Refs)
Ref: booking_participants.booking_id > bookings.id
Ref: booking_participants.checked_by > users.id

// Các liên kết khóa ngoại (Refs)
Ref: bookings.customer_id > users.id
Ref: bookings.tour_id > tours.id
Ref: bookings.design_request_id > tour_custom_requests.id


























// 1. Nhiều mốc timeline thuộc về 1 tour (tours -> tour_timeline)
Ref: tour_timeline.tour_id > tours.id

// 2. Nhiều mức giá thuộc về 1 tour (tours -> tour_pricing_tiers)
Ref: tour_pricing_tiers.tour_id > tours.id

// 3. Nhiều địa điểm tham quan thuộc về 1 mốc timeline (tour_timeline -> tourist_attractions)
Ref: tourist_attractions.tour_timeline_id > tour_timeline.id

// 4. Nhiều bữa ăn thuộc về 1 mốc timeline (tour_timeline -> tour_meals)
Ref: tour_meals.tour_timeline_id > tour_timeline.id

// 1. Một doanh nghiệp/agency tạo được nhiều tour (business_profiles -> tours)
Ref: tours.agency_id > users.id

// 2. Một user có một hồ sơ doanh nghiệp (users -> business_profiles)
Ref: business_profiles.user_id - users.id


Ref: tour_accommodations.tour_id > tours.id

// 3. Quan hệ (References)
Ref: tour_custom_requests.user_id > users.id
Ref: tour_custom_request_agencies.request_id > tour_custom_requests.id
Ref: tour_custom_request_agencies.agency_id > users.id



Ref: tours.custom_request_id > tour_custom_requests.id





















