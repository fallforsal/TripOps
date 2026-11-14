# 03. Thiết Kế Cơ Sở Dữ Liệu Chuẩn Hóa (Database Design & ERD Specification)

> **Liên kết trực tiếp tới file ERD chuẩn hóa (Draw.io):**
> - File sơ đồ gốc tại thư mục gốc repository: [`ERDdrawio.xml`](file:///c:/Users/Admin/Documents/GitHub/TripOpsFE/ERDdrawio.xml)
> - Định dạng: XML chuẩn của `app.diagrams.net` (Draw.io), 1 sheet duy nhất (`TripOps Core ERD`), bố cục phân cụm theo **4 Phân hệ Nghiệp vụ (4 màu)** tương ứng với **4 Thành viên Backend** trong [`docs/05-backend-task-allocation.md`](file:///c:/Users/Admin/Documents/GitHub/TripOpsFE/docs/05-backend-task-allocation.md).

---

## 1. Tổng Quan Chuẩn Hóa & Các Lỗi Đã Khắc Phục Từ Bản Nháp Cũ

Khi kiểm tra bản nháp cũ (`ERDdrawio.xml` cũ và `DATABASE_SCHEMA.md` cũ), chúng tôi phát hiện và đã **khắc phục triệt để** các vấn đề sau trong bản thiết kế mới:

1. **Bổ sung đầy đủ nhãn `PK` và `FK` ở cột trái của mọi bảng trên Draw.io:** Bản ERD cũ chỉ đánh dấu `PK` mà bỏ trống toàn bộ `FK` ở cột trái. Trong [`ERDdrawio.xml`](file:///c:/Users/Admin/Documents/GitHub/TripOpsFE/ERDdrawio.xml) mới, 100% khóa chính (`PK`) và khóa ngoại (`FK`) đều được hiển thị tường minh ở cột đầu tiên.
2. **Xóa đường nối treo (Dangling Edge) & Đường nối trùng lặp:**
   - Bản cũ có cạnh lỗi `i8IDv60cwcrwSPCYD2tw-7` không có bảng nguồn (`source=""` nối vào `booking_accommodations`) và có 2 đường nối trùng nhau giữa `users` và `chat_conversations`.
   - Bản mới đảm bảo **mọi đường quan hệ đều có `source` và `target` hợp lệ**, và **giữa bất kỳ cặp 2 bảng nào chỉ có tối đa 1 đường quan hệ duy nhất** (74 đường kết nối độc lập giữa 30 bảng Core).
3. **Sửa các quan hệ bị ngược chiều hoặc sai bản số (`1–1` vs `1–N`):**
   - Sửa lại chiều Crow's Foot bị ngược ở `tours -> tour_pricing_tiers`; sửa các quan hệ từ `1–1` sai thành `1–N` chuẩn ở `bookings -> incident_and_disputes`, `bookings -> refund_requests`, `payment_requests -> payment_transactions`.
4. **Bổ sung 9 bảng Core bắt buộc cho luồng chính từng bị thiếu trong bản cũ:**
   - `provinces` & `tour_destinations` (Chuẩn hóa tỉnh/thành để gợi ý Agency đồng tổ chức).
   - `agency_suppliers` (Danh bạ Supplier riêng của từng Agency, nhập 1 lần dùng lại nhiều lần).
   - `quotation_versions` (Lịch sử phiên bản báo giá, thời hạn giữ giá `price_locked_until`).
   - `booking_contracts` (Hợp đồng dịch vụ lữ hành & bằng chứng chấp nhận của Customer).
   - `partner_service_reservations` (Phiếu đặt chỗ & Reconfirm dịch vụ đoàn với Platform Partner / Supplier riêng).
   - `booking_amendments` (Phụ lục thay đổi sau khi đặt tour, chi phí đã cam kết/thu hồi được).
   - `operational_advances` (Tạm ứng chi phí vận hành tour cho Agency).
   - `financial_settlements` (Quyết toán & giải ngân cuối cùng theo từng chặng/Agency).
5. **Tách biệt Bảng Luồng Chính (30 Core Tables trên ERD) và Bảng Giai Đoạn 2 (6 Phase-2 Tables):**
   - Loại bỏ các bảng phụ trợ Phase-2 (`chat_*`, `subscription_*`) ra khỏi sơ đồ [`ERDdrawio.xml`](file:///c:/Users/Admin/Documents/GitHub/TripOpsFE/ERDdrawio.xml) để sơ đồ tập trung 100% vào luồng vận hành cốt lõi, không bị rối ("spaghetti"). Các bảng Phase-2 vẫn được đặc tả đầy đủ tại Mục 3 của tài liệu này.

---

## 2. Đặc Tả Chi Tiết 30 Bảng Core (Hiển Thị Trên `ERDdrawio.xml`)

> **Quy ước kiểu dữ liệu chung:**
> - **Khóa chính / Khóa ngoại (`id`, `*_id`):** `VARCHAR(36)` (UUID v4).
> - **Tiền tệ VNĐ (`*_price`, `*_amount`, `*_cost`, `*_budget`):** `BIGINT` (số nguyên đồng VNĐ, không dùng `FLOAT`, bắt buộc `CHECK >= 0`, trừ `price_delta` của `booking_amendments` có thể âm khi giảm giá).
> - **Thời gian (`*_at`):** `TIMESTAMP WITH TIME ZONE` (lưu chuẩn UTC).

---

### Phân Hệ 1 (Màu Xanh Dương `#dae8fc` — Member 1): Định Danh, Hồ Sơ Pháp Nhân, Địa Điểm Chuẩn Hóa, Dịch Vụ Partner & Danh Bạ Supplier Riêng (7 Bảng)

#### 1. Bảng `users`
Quản lý toàn bộ tài khoản đăng nhập hệ thống.
- **PK:** `id VARCHAR(36)`
- **Cột dữ liệu:**
  - `email VARCHAR(255) NOT NULL UNIQUE`
  - `password_hash VARCHAR(255) NOT NULL`
  - `full_name VARCHAR(150) NOT NULL`
  - `phone VARCHAR(30)`
  - `role VARCHAR(30) NOT NULL` — `CHECK (role IN ('USER', 'AGENCY_ADMIN', 'PROVIDER', 'GUIDE', 'ADMIN'))`
  - `avatar_url TEXT`
  - `account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'` — `CHECK (account_status IN ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'))`
  - `is_locked BOOLEAN NOT NULL DEFAULT FALSE`
  - `created_at TIMESTAMP NOT NULL`, `updated_at TIMESTAMP NOT NULL`
- **Index:** `idx_users_role_status (role, account_status, is_locked)`

#### 2. Bảng `business_profiles`
Hồ sơ pháp nhân của Công ty Lữ hành (`AGENCY`) và Nhà cung cấp dịch vụ trên nền tảng (`PROVIDER` / Platform Partner).
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `user_id VARCHAR(36) NOT NULL UNIQUE` $\rightarrow$ `users(id)` (Quan hệ `1–1`)
  - `province_id VARCHAR(36) NOT NULL` $\rightarrow$ `provinces(id)` (Quan hệ `N–1`)
- **Cột dữ liệu:**
  - `business_type VARCHAR(20) NOT NULL` — `CHECK (business_type IN ('AGENCY', 'PROVIDER'))`
  - `business_name VARCHAR(255) NOT NULL`
  - `tax_code VARCHAR(50) NOT NULL UNIQUE`
  - `license_number VARCHAR(100)` (Số Giấy phép kinh doanh lữ hành đối với `AGENCY`)
  - `license_file_url TEXT`
  - `representative_name VARCHAR(150) NOT NULL`
  - `contact_email VARCHAR(255) NOT NULL`, `contact_phone VARCHAR(30) NOT NULL`
  - `headquarters_address TEXT NOT NULL`
  - `bank_name VARCHAR(150)`, `bank_account_number VARCHAR(50)`, `bank_account_holder VARCHAR(150)` (Tài khoản nhận tạm ứng & quyết toán)
  - `approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'` — `CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'))`
  - `rejection_reason TEXT`, `approved_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL`
- **Index:** `idx_bp_type_status_province (business_type, approval_status, province_id)`

#### 3. Bảng `guide_profiles`
Hồ sơ chuyên môn Hướng dẫn viên thuộc quản lý của một Agency.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `user_id VARCHAR(36) NOT NULL UNIQUE` $\rightarrow$ `users(id)` (`1–1`)
  - `agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
- **Cột dữ liệu:**
  - `guide_card_number VARCHAR(50) NOT NULL UNIQUE`
  - `card_type VARCHAR(30) NOT NULL` — `CHECK (card_type IN ('DOMESTIC', 'INTERNATIONAL'))`
  - `languages_json JSON NOT NULL` (Ví dụ: `["Tiếng Việt", "Tiếng Anh"]`)
  - `specialties_json JSON`
  - `experience_years INT NOT NULL DEFAULT 0 CHECK (experience_years >= 0)`
  - `rating DECIMAL(3,2) DEFAULT 5.00`, `total_tours_completed INT DEFAULT 0`
  - `availability_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'` — `CHECK (availability_status IN ('ACTIVE', 'ON_TOUR', 'INACTIVE'))`
  - `created_at TIMESTAMP NOT NULL`

#### 4. Bảng `provinces`
Danh mục Tỉnh/Thành phố chuẩn hóa trên toàn hệ thống.
- **PK:** `id VARCHAR(36)`
- **Cột dữ liệu:**
  - `code VARCHAR(30) NOT NULL UNIQUE` (Mã chuẩn, ví dụ: `VN-LAM-DONG`, `VN-KHANH-HOA`)
  - `name VARCHAR(120) NOT NULL`
  - `region VARCHAR(30) NOT NULL` — `CHECK (region IN ('NORTH', 'CENTRAL', 'SOUTH', 'HIGHLANDS'))`
  - `latitude DECIMAL(10,7)`, `longitude DECIMAL(10,7)`
  - `is_active BOOLEAN NOT NULL DEFAULT TRUE`

#### 5. Bảng `provider_services`
Bài đăng dịch vụ do Platform Partner đăng tải công khai trên sàn B2B.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `provider_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `province_id VARCHAR(36) NOT NULL` $\rightarrow$ `provinces(id)` (`N–1`)
- **Cột dữ liệu:**
  - `category VARCHAR(30) NOT NULL` — `CHECK (category IN ('HOTEL', 'FNB', 'TRANSPORT', 'ATTRACTION'))`
  - `sub_category VARCHAR(100)`
  - `name VARCHAR(255) NOT NULL`, `description TEXT`
  - `price_from BIGINT NOT NULL CHECK (price_from >= 0)`, `price_to BIGINT NOT NULL CHECK (price_to >= price_from)`
  - `capacity VARCHAR(100)`, `stars INT CHECK (stars BETWEEN 1 AND 5)`
  - `amenities_json JSON`, `policies_json JSON`
  - `ward_name VARCHAR(120)`, `street_address TEXT`
  - `latitude DECIMAL(10,7)`, `longitude DECIMAL(10,7)`
  - `status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED'` — `CHECK (status IN ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'))`
  - `hidden_reason TEXT`, `created_at TIMESTAMP NOT NULL`
- **Index:** `idx_ps_province_category_status (province_id, category, status)`

#### 6. Bảng `service_media`
Thư viện hình ảnh của dịch vụ Platform Partner.
- **PK:** `id VARCHAR(36)`
- **FK:** `service_id VARCHAR(36) NOT NULL` $\rightarrow$ `provider_services(id)` (`N–1`, `ON DELETE CASCADE`)
- **Cột dữ liệu:** `image_url TEXT NOT NULL`, `is_thumbnail BOOLEAN DEFAULT FALSE`, `sort_order INT DEFAULT 0`, `created_at TIMESTAMP NOT NULL`

#### 7. Bảng `agency_suppliers`
**Danh bạ Supplier riêng của từng Agency** (nhập 1 lần, tái sử dụng cho nhiều tour/báo giá của riêng Agency đó; không cần `service_id` của Platform Partner).
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `province_id VARCHAR(36) NOT NULL` $\rightarrow$ `provinces(id)` (`N–1`)
- **Cột dữ liệu:**
  - `supplier_type VARCHAR(30) NOT NULL` — `CHECK (supplier_type IN ('HOTEL', 'FNB', 'TRANSPORT', 'ATTRACTION', 'OTHER'))`
  - `supplier_name VARCHAR(255) NOT NULL`
  - `contact_name VARCHAR(150)`, `contact_phone VARCHAR(30)`, `contact_email VARCHAR(255)`
  - `address TEXT`, `stars INT CHECK (stars BETWEEN 1 AND 5)`
  - `reference_price_from BIGINT CHECK (reference_price_from >= 0)`, `reference_price_to BIGINT CHECK (reference_price_to >= 0)`
  - `service_tags_json JSON`, `notes TEXT`
  - `status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'` — `CHECK (status IN ('ACTIVE', 'INACTIVE'))`
  - `created_at TIMESTAMP NOT NULL`, `updated_at TIMESTAMP NOT NULL`
- **Index:** `idx_agency_suppliers_lookup (agency_id, status, province_id, supplier_type)`

---

### Phân Hệ 2 (Màu Xanh Lá `#d5e8d4` — Member 2): Sản Phẩm Tour, Template/Clone, Điểm Đến Chuẩn Hóa, Đồng Tổ Chức & Báo Giá (8 Bảng)

#### 8. Bảng `tours`
Lưu trữ cấu hình sản phẩm Tour mở bán và đóng vai trò **Tour Template** tái sử dụng.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `lead_agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `cloned_from_tour_id VARCHAR(36) NULL` $\rightarrow$ `tours(id)` (Tham chiếu nguồn khi Clone Tour)
- **Cột dữ liệu:**
  - `tour_code VARCHAR(50) NOT NULL UNIQUE`
  - `name VARCHAR(255) NOT NULL`, `description TEXT`
  - `duration_text VARCHAR(50) NOT NULL`, `number_of_days INT NOT NULL CHECK (number_of_days >= 1)`, `number_of_nights INT NOT NULL CHECK (number_of_nights >= 0)`
  - `departure_location VARCHAR(255) NOT NULL`, `transportation_type VARCHAR(150)`
  - `base_price BIGINT NOT NULL CHECK (base_price >= 0)`
  - `min_guests INT NOT NULL DEFAULT 1`, `max_guests INT NOT NULL CHECK (max_guests >= min_guests)`
  - `thumbnail_url TEXT`, `images_json JSON`, `highlights_json JSON`
  - `included_services TEXT`, `excluded_services TEXT`, `cancellation_policy TEXT`
  - `is_template BOOLEAN NOT NULL DEFAULT FALSE`
  - `is_co_hosted BOOLEAN NOT NULL DEFAULT FALSE`
  - `status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'` — `CHECK (status IN ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'))` *(Agency tự publish `DRAFT -> PUBLISHED`, không có `PENDING_APPROVAL`)*
  - `visibility VARCHAR(30) NOT NULL DEFAULT 'HIDDEN'` — `CHECK (visibility IN ('PUBLIC', 'PRIVATE', 'HIDDEN'))`
  - `hidden_reason TEXT`, `created_at TIMESTAMP NOT NULL`, `updated_at TIMESTAMP NOT NULL`
- **Index:** `idx_tours_agency_status (lead_agency_id, status, visibility)`

#### 9. Bảng `tour_destinations`
Bảng nối chuẩn hóa Tỉnh/Thành phố của từng Tour (căn cứ để truy vấn gợi ý Agency đồng tổ chức theo địa điểm).
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `tour_id VARCHAR(36) NOT NULL` $\rightarrow$ `tours(id)` (`N–1`, `ON DELETE CASCADE`)
  - `province_id VARCHAR(36) NOT NULL` $\rightarrow$ `provinces(id)` (`N–1`)
  - `assigned_agency_id VARCHAR(36) NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
- **Cột dữ liệu:** `stage_order INT NOT NULL DEFAULT 1`, `stage_name VARCHAR(150)`, `notes TEXT`
- **Constraint & Index:** `UNIQUE (tour_id, province_id, stage_order)`, `idx_td_province_tour (province_id, tour_id)`

#### 10. Bảng `tour_itinerary_days`
Cấu hình lịch trình từng ngày và khách sạn lưu trú của ngày đó trong Tour.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `tour_id VARCHAR(36) NOT NULL` $\rightarrow$ `tours(id)` (`N–1`, `ON DELETE CASCADE`)
  - `responsible_agency_id VARCHAR(36) NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `platform_hotel_service_id VARCHAR(36) NULL` $\rightarrow$ `provider_services(id)` (`N–1`)
  - `agency_hotel_supplier_id VARCHAR(36) NULL` $\rightarrow$ `agency_suppliers(id)` (`N–1`)
- **Cột dữ liệu:**
  - `day_number INT NOT NULL CHECK (day_number >= 1)`
  - `title VARCHAR(255) NOT NULL`, `description TEXT`
  - `hotel_source_type VARCHAR(30) NOT NULL DEFAULT 'NONE'` — `CHECK (hotel_source_type IN ('PLATFORM_PARTNER', 'AGENCY_SUPPLIER', 'NONE'))`
  - `hotel_snapshot_json JSON` (Lưu snapshot tên KS, hạng sao, giá, địa chỉ tại thời điểm thiết kế)
  - `alternative_hotels_json JSON` (Danh sách khách sạn nâng cấp tùy chọn)
- **Constraint:** `UNIQUE (tour_id, day_number)`

#### 11. Bảng `tour_itinerary_items`
Các điểm dừng tham quan, bữa ăn và hoạt động trong từng ngày của Tour.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `itinerary_day_id VARCHAR(36) NOT NULL` $\rightarrow$ `tour_itinerary_days(id)` (`N–1`, `ON DELETE CASCADE`)
  - `platform_service_id VARCHAR(36) NULL` $\rightarrow$ `provider_services(id)` (`N–1`)
  - `agency_supplier_id VARCHAR(36) NULL` $\rightarrow$ `agency_suppliers(id)` (`N–1`)
- **Cột dữ liệu:**
  - `item_type VARCHAR(30) NOT NULL` — `CHECK (item_type IN ('ATTRACTION', 'MEAL', 'TRANSPORT', 'OTHER'))`
  - `sort_order INT NOT NULL DEFAULT 1`, `time_slot VARCHAR(30)`
  - `title VARCHAR(255) NOT NULL`, `address TEXT`
  - `source_type VARCHAR(30) NOT NULL` — `CHECK (source_type IN ('PLATFORM_PARTNER', 'AGENCY_SUPPLIER', 'INTERNAL'))`
  - `estimated_unit_price BIGINT DEFAULT 0`, `item_snapshot_json JSON`

#### 12. Bảng `tour_pricing_tiers`
Đơn giá bán theo phân khúc độ tuổi/loại khách của Tour.
- **PK:** `id VARCHAR(36)`
- **FK:** `tour_id VARCHAR(36) NOT NULL` $\rightarrow$ `tours(id)` (`N–1`, `ON DELETE CASCADE`)
- **Cột dữ liệu:**
  - `tier_code VARCHAR(30) NOT NULL` (`ADULT`, `CHILD_5_10`, `CHILD_UNDER_5`)
  - `label VARCHAR(100) NOT NULL`, `age_description VARCHAR(100)`
  - `selling_price_per_pax BIGINT NOT NULL CHECK (selling_price_per_pax >= 0)`
  - `is_mandatory BOOLEAN DEFAULT FALSE`, `sort_order INT DEFAULT 1`
- **Constraint:** `UNIQUE (tour_id, tier_code)`

#### 13. Bảng `tour_co_host_agreements`
Lời mời, thương lượng và thỏa thuận đồng tổ chức giữa Lead Agency và Local Co-Host Agency.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `tour_id VARCHAR(36) NULL` $\rightarrow$ `tours(id)` (`N–1`)
  - `custom_request_id VARCHAR(36) NULL` $\rightarrow$ `custom_tour_requests(id)` (`N–1`)
  - `lead_agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `local_agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `province_id VARCHAR(36) NOT NULL` $\rightarrow$ `provinces(id)` (`N–1`)
- **Cột dữ liệu:**
  - `assigned_days_json JSON NOT NULL` (Ví dụ: `[3, 4]`)
  - `scope_description TEXT NOT NULL`, `quality_standards TEXT`
  - `proposed_budget_per_pax BIGINT CHECK (proposed_budget_per_pax >= 0)`
  - `agreed_net_price_per_pax BIGINT CHECK (agreed_net_price_per_pax >= 0)`
  - `pricing_tiers_net_json JSON` (Đơn giá net người lớn/trẻ em của riêng chặng Local Agency)
  - `agreement_version INT NOT NULL DEFAULT 1`
  - `status VARCHAR(30) NOT NULL DEFAULT 'INVITED'` — `CHECK (status IN ('INVITED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'BREACHED', 'TERMINATED'))`
  - `rejection_reason TEXT`, `accepted_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL`

#### 14. Bảng `custom_tour_requests`
Yêu cầu thiết kế tour riêng của Customer và trạng thái thương lượng báo giá hiện tại.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `customer_id VARCHAR(36) NOT NULL` $\rightarrow$ `users(id)` (`N–1`)
  - `lead_agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `proposal_tour_id VARCHAR(36) NULL` $\rightarrow$ `tours(id)` (`N–1`)
- **Cột dữ liệu:**
  - `request_code VARCHAR(50) NOT NULL UNIQUE`
  - `destination_provinces_json JSON NOT NULL`
  - `departure_location VARCHAR(255)`, `start_date DATE NOT NULL`, `end_date DATE NOT NULL`
  - `expected_guests INT NOT NULL CHECK (expected_guests >= 1)`
  - `customer_budget BIGINT CHECK (customer_budget >= 0)`
  - `current_version_number INT NOT NULL DEFAULT 0`
  - `quoted_total_price BIGINT CHECK (quoted_total_price >= 0)`
  - `price_locked_until TIMESTAMP`, `quote_expires_at TIMESTAMP`
  - `customer_requirements TEXT`, `customer_feedback TEXT`
  - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING'` — `CHECK (status IN ('PENDING', 'PROPOSAL_SENT', 'NEGOTIATING', 'RECONFIRMING', 'ACCEPTED', 'EXPIRED', 'REJECTED', 'CANCELLED'))`
  - `created_at TIMESTAMP NOT NULL`

#### 15. Bảng `quotation_versions`
Lịch sử phiên bản Báo giá (`Quotation`) gửi cho Customer — không bao giờ ghi đè khi đổi giá mà luôn sinh `version_number` mới.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `custom_request_id VARCHAR(36) NOT NULL` $\rightarrow$ `custom_tour_requests(id)` (`N–1`, `ON DELETE CASCADE`)
  - `tour_id VARCHAR(36) NOT NULL` $\rightarrow$ `tours(id)` (`N–1`)
  - `created_by_user_id VARCHAR(36) NOT NULL` $\rightarrow$ `users(id)` (`N–1`)
- **Cột dữ liệu:**
  - `version_number INT NOT NULL CHECK (version_number >= 1)`
  - `quoted_total_price BIGINT NOT NULL CHECK (quoted_total_price >= 0)`
  - `adult_unit_price BIGINT NOT NULL CHECK (adult_unit_price >= 0)`
  - `price_locked_until TIMESTAMP NOT NULL`, `valid_until TIMESTAMP NOT NULL`
  - `itinerary_snapshot_json JSON NOT NULL`, `pricing_snapshot_json JSON NOT NULL`
  - `change_summary TEXT`
  - `status VARCHAR(30) NOT NULL DEFAULT 'SENT'` — `CHECK (status IN ('SENT', 'ACCEPTED', 'SUPERSEDED', 'EXPIRED'))`
  - `created_at TIMESTAMP NOT NULL`
- **Constraint:** `UNIQUE (custom_request_id, version_number)`

---

### Phân Hệ 3 (Màu Vàng Cam `#ffe6cc` — Member 3): Booking, Hợp Đồng, Đặt Chỗ Partner, Phụ Lục Thay Đổi & Điều Hành Thực Địa (8 Bảng)

#### 16. Bảng `bookings`
Chuyến đi đã được khách chốt kèm Snapshot vận hành độc lập.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `tour_id VARCHAR(36) NOT NULL` $\rightarrow$ `tours(id)` (`N–1`)
  - `custom_request_id VARCHAR(36) NULL UNIQUE` $\rightarrow$ `custom_tour_requests(id)` (`1–1`)
  - `quotation_version_id VARCHAR(36) NULL` $\rightarrow$ `quotation_versions(id)` (`N–1`)
  - `customer_id VARCHAR(36) NOT NULL` $\rightarrow$ `users(id)` (`N–1`)
  - `lead_agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
- **Cột dữ liệu:**
  - `booking_code VARCHAR(50) NOT NULL UNIQUE`
  - `contact_name VARCHAR(150) NOT NULL`, `contact_email VARCHAR(255) NOT NULL`, `contact_phone VARCHAR(30) NOT NULL`
  - `departure_date DATE NOT NULL`, `return_date DATE NOT NULL`
  - `total_guests INT NOT NULL CHECK (total_guests >= 1)`
  - `total_selling_price BIGINT NOT NULL CHECK (total_selling_price >= 0)` *(Ẩn với Local Co-Host Agency)*
  - `committed_cost_amount BIGINT NOT NULL DEFAULT 0`
  - `platform_fee_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00`
  - `is_co_hosted BOOLEAN NOT NULL DEFAULT FALSE`
  - `tour_snapshot_json JSON NOT NULL` (Snapshot toàn bộ lịch trình, KS, bữa ăn, chính sách lúc đặt)
  - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING_RECONFIRM'` — `CHECK (status IN ('PENDING_RECONFIRM', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'))`
  - `payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID'` — `CHECK (payment_status IN ('UNPAID', 'DEPOSIT_PAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'))`
  - `settlement_status VARCHAR(30) NOT NULL DEFAULT 'UNSETTLED'` — `CHECK (settlement_status IN ('UNSETTLED', 'READY_FOR_SETTLEMENT', 'PARTIALLY_SETTLED', 'SETTLED', 'DISPUTED'))`
  - `rejection_reason TEXT`, `created_at TIMESTAMP NOT NULL`, `updated_at TIMESTAMP NOT NULL`

#### 17. Bảng `booking_contracts`
Hợp đồng dịch vụ lữ hành điện tử và lưu vết chấp nhận của Customer.
- **PK:** `id VARCHAR(36)`
- **FK:** `booking_id VARCHAR(36) NOT NULL UNIQUE` $\rightarrow$ `bookings(id)` (`1–1`, `ON DELETE CASCADE`)
- **Cột dữ liệu:**
  - `contract_number VARCHAR(50) NOT NULL UNIQUE`
  - `version_number INT NOT NULL DEFAULT 1`
  - `total_contract_value BIGINT NOT NULL CHECK (total_contract_value >= 0)`
  - `contract_terms_snapshot TEXT NOT NULL`, `cancellation_policy_snapshot TEXT NOT NULL`
  - `customer_accepted_at TIMESTAMP`, `customer_accept_ip VARCHAR(64)`
  - `agency_confirmed_at TIMESTAMP`
  - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING_CUSTOMER_ACCEPT'` — `CHECK (status IN ('DRAFT', 'PENDING_CUSTOMER_ACCEPT', 'ACTIVE', 'AMENDED', 'TERMINATED'))`
  - `created_at TIMESTAMP NOT NULL`

#### 18. Bảng `booking_agency_shares`
Phân công trách nhiệm thực hiện và phần doanh thu Net theo chặng của từng Agency trong Booking.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`, `ON DELETE CASCADE`)
  - `agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `co_host_agreement_id VARCHAR(36) NULL` $\rightarrow$ `tour_co_host_agreements(id)` (`N–1`)
- **Cột dữ liệu:**
  - `role_type VARCHAR(30) NOT NULL` — `CHECK (role_type IN ('LEAD', 'LOCAL_COHOST'))`
  - `assigned_days_json JSON NOT NULL`
  - `stage_description TEXT`
  - `agreed_net_amount BIGINT NOT NULL CHECK (agreed_net_amount >= 0)`
  - `platform_fee_amount BIGINT NOT NULL DEFAULT 0`
  - `penalty_deduction_amount BIGINT NOT NULL DEFAULT 0`
  - `final_payout_amount BIGINT NOT NULL DEFAULT 0`
  - `execution_status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED'` — `CHECK (execution_status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'BREACHED', 'REPLACED'))`
  - `settlement_status VARCHAR(30) NOT NULL DEFAULT 'UNSETTLED'` — `CHECK (settlement_status IN ('UNSETTLED', 'APPROVED', 'DISPUTED', 'SETTLED'))`
  - `created_at TIMESTAMP NOT NULL`
- **Constraint:** `UNIQUE (booking_id, agency_id)`

#### 19. Bảng `booking_passengers`
Danh sách hành khách đi đoàn, thông tin xếp phòng/ăn kiêng và điểm danh khởi hành.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`, `ON DELETE CASCADE`)
  - `agency_share_id VARCHAR(36) NULL` $\rightarrow$ `booking_agency_shares(id)` (`N–1`)
- **Cột dữ liệu:**
  - `full_name VARCHAR(150) NOT NULL`, `gender VARCHAR(20)`, `date_of_birth DATE`
  - `age_category VARCHAR(30) NOT NULL` — `CHECK (age_category IN ('ADULT', 'CHILD_5_10', 'CHILD_UNDER_5'))`
  - `id_card_or_passport VARCHAR(50)`, `phone VARCHAR(30)`
  - `dietary_notes TEXT` (Ghi chú ăn chay / dị ứng thực phẩm gửi cho Nhà hàng)
  - `roommate_notes TEXT` (Ghi chú xếp phòng gửi cho Khách sạn)
  - `unit_price_snapshot BIGINT NOT NULL CHECK (unit_price_snapshot >= 0)`
  - `departure_attendance VARCHAR(20) NOT NULL DEFAULT 'UNMARKED'` — `CHECK (departure_attendance IN ('UNMARKED', 'PRESENT', 'ABSENT'))`
  - `checked_in_at TIMESTAMP`
  - `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'` — `CHECK (status IN ('ACTIVE', 'CANCELLED'))`

#### 20. Bảng `partner_service_reservations`
Phiếu yêu cầu đặt chỗ & Reconfirm dịch vụ đoàn với Platform Partner hoặc ghi nhận đặt chỗ Supplier riêng.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`, `ON DELETE CASCADE`)
  - `agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `provider_service_id VARCHAR(36) NULL` $\rightarrow$ `provider_services(id)` (`N–1`)
  - `agency_supplier_id VARCHAR(36) NULL` $\rightarrow$ `agency_suppliers(id)` (`N–1`)
- **Cột dữ liệu:**
  - `reservation_code VARCHAR(50) NOT NULL UNIQUE`
  - `source_type VARCHAR(30) NOT NULL` — `CHECK (source_type IN ('PLATFORM_PARTNER', 'AGENCY_SUPPLIER'))`
  - `service_category VARCHAR(30) NOT NULL` — `CHECK (service_category IN ('HOTEL', 'FNB', 'TRANSPORT', 'ATTRACTION'))`
  - `service_date_from DATE NOT NULL`, `service_date_to DATE NOT NULL`
  - `guest_count INT NOT NULL CHECK (guest_count >= 1)`
  - `requested_details_json JSON` (Số lượng từng loại phòng hoặc thực đơn bữa ăn)
  - `service_snapshot_json JSON NOT NULL`
  - `quoted_final_price BIGINT CHECK (quoted_final_price >= 0)`
  - `committed_non_refundable BIGINT NOT NULL DEFAULT 0` (Chi phí cam kết không hoàn lại một khi đã `CONFIRMED`)
  - `provider_response_note TEXT`
  - `status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'` — `CHECK (status IN ('DRAFT', 'PENDING', 'QUOTED', 'CONFIRMED', 'REJECTED', 'CANCELLED'))`
  - `responded_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL`

#### 21. Bảng `booking_amendments`
Phụ lục thay đổi sau khi đặt tour (thêm/bớt khách, đổi khách sạn/bữa ăn/lịch trình, thay thế chặng vi phạm).
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`, `ON DELETE CASCADE`)
  - `requested_by_user_id VARCHAR(36) NOT NULL` $\rightarrow$ `users(id)` (`N–1`)
- **Cột dữ liệu:**
  - `amendment_type VARCHAR(40) NOT NULL` — `CHECK (amendment_type IN ('GUEST_COUNT_CHANGE', 'HOTEL_CHANGE', 'MEAL_CHANGE', 'ITINERARY_CHANGE', 'STAGE_REPLACEMENT'))`
  - `description TEXT NOT NULL`
  - `previous_total_price BIGINT NOT NULL`, `price_delta BIGINT NOT NULL`, `new_total_price BIGINT NOT NULL`
  - `committed_sunk_cost BIGINT NOT NULL DEFAULT 0`, `recoverable_cost BIGINT NOT NULL DEFAULT 0`
  - `change_payload_json JSON`
  - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING_RECHECK'` — `CHECK (status IN ('PENDING_RECHECK', 'QUOTED', 'APPROVED', 'REJECTED', 'APPLIED'))`
  - `approved_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL`

#### 22. Bảng `guide_assignments`
Phân công Hướng dẫn viên phụ trách đoàn (hoặc chặng) và sổ tay điều hành tour.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`, `ON DELETE CASCADE`)
  - `agency_share_id VARCHAR(36) NOT NULL` $\rightarrow$ `booking_agency_shares(id)` (`N–1`)
  - `guide_profile_id VARCHAR(36) NOT NULL` $\rightarrow$ `guide_profiles(id)` (`N–1`)
- **Cột dữ liệu:**
  - `assigned_from_date DATE NOT NULL`, `assigned_to_date DATE NOT NULL`
  - `assignment_mode VARCHAR(30) NOT NULL DEFAULT 'SINGLE'` — `CHECK (assignment_mode IN ('SINGLE', 'CO_GUIDE', 'CUSTOM_STAGE'))`
  - `guide_freeform_notes TEXT`, `wrap_up_summary TEXT`, `wrap_up_rating INT CHECK (wrap_up_rating BETWEEN 1 AND 5)`
  - `status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED'` — `CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))`
  - `assigned_at TIMESTAMP NOT NULL`

#### 23. Bảng `booking_location_checkins`
Tiến độ check-in từng điểm đến trên timeline vận hành thực địa của Hướng dẫn viên.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`, `ON DELETE CASCADE`)
  - `guide_assignment_id VARCHAR(36) NULL` $\rightarrow$ `guide_assignments(id)` (`N–1`)
- **Cột dữ liệu:**
  - `day_number INT NOT NULL CHECK (day_number >= 1)`, `sort_order INT NOT NULL DEFAULT 1`
  - `location_name VARCHAR(255) NOT NULL`, `address TEXT`, `scheduled_time VARCHAR(30)`
  - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING'` — `CHECK (status IN ('PENDING', 'CHECKED_IN', 'SKIPPED'))`
  - `checked_in_at TIMESTAMP`, `proof_image_url TEXT`, `checkin_note TEXT`

---

### Phân Hệ 4 (Màu Tím `#e1d5e7` — Member 4): Thanh Toán Nhiều Đợt, Tạm Ứng Vận Hành, Sự Cố/Tranh Chấp, Hoàn Tiền & Quyết Toán (7 Bảng)

#### 24. Bảng `system_bank_configs`
Cấu hình tài khoản ngân hàng thu hộ của nền tảng và tỷ lệ hoa hồng mặc định.
- **PK:** `id VARCHAR(36)`
- **FK:** `updated_by_admin_id VARCHAR(36) NOT NULL` $\rightarrow$ `users(id)` (`N–1`)
- **Cột dữ liệu:**
  - `bank_name VARCHAR(150) NOT NULL`, `bank_code VARCHAR(30) NOT NULL`
  - `account_number VARCHAR(50) NOT NULL`, `account_holder VARCHAR(150) NOT NULL`, `branch VARCHAR(150)`
  - `default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (default_commission_rate BETWEEN 0 AND 50)`
  - `transfer_instruction_note TEXT`, `is_active BOOLEAN NOT NULL DEFAULT TRUE`, `updated_at TIMESTAMP NOT NULL`

#### 25. Bảng `payment_requests`
Các đợt yêu cầu thanh toán của một Booking (Đặt cọc đợt 1, Thanh toán đợt 2, Phụ thu Amendment).
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`, `ON DELETE CASCADE`)
  - `amendment_id VARCHAR(36) NULL` $\rightarrow$ `booking_amendments(id)` (`N–1`)
  - `created_by_user_id VARCHAR(36) NOT NULL` $\rightarrow$ `users(id)` (`N–1`)
- **Cột dữ liệu:**
  - `installment_number INT NOT NULL CHECK (installment_number >= 1)`
  - `milestone_type VARCHAR(30) NOT NULL` — `CHECK (milestone_type IN ('DEPOSIT', 'SECOND_INSTALLMENT', 'FINAL_BALANCE', 'AMENDMENT_SURCHARGE'))`
  - `title VARCHAR(255) NOT NULL`
  - `amount_due BIGINT NOT NULL CHECK (amount_due > 0)`
  - `due_date DATE NOT NULL`
  - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING'` — `CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED'))`
  - `created_at TIMESTAMP NOT NULL`

#### 26. Bảng `payment_transactions`
Giao dịch chuyển khoản thực tế của Customer cho từng đợt `payment_requests`.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `payment_request_id VARCHAR(36) NOT NULL` $\rightarrow$ `payment_requests(id)` (`N–1`)
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`)
  - `customer_id VARCHAR(36) NOT NULL` $\rightarrow$ `users(id)` (`N–1`)
- **Cột dữ liệu:**
  - `transaction_code VARCHAR(100) NOT NULL UNIQUE`
  - `payment_method VARCHAR(30) NOT NULL` — `CHECK (payment_method IN ('VIETQR_TRANSFER', 'BANK_TRANSFER', 'GATEWAY'))`
  - `amount_paid BIGINT NOT NULL CHECK (amount_paid > 0)`
  - `proof_image_url TEXT`
  - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION'` — `CHECK (status IN ('PENDING_VERIFICATION', 'SUCCESS', 'FAILED'))`
  - `paid_at TIMESTAMP NOT NULL`, `verified_at TIMESTAMP`

#### 27. Bảng `operational_advances`
Yêu cầu tạm ứng chi phí vận hành tour cho Agency trước/trong chuyến đi (sẽ được khấu trừ khi quyết toán cuối).
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`)
  - `agency_share_id VARCHAR(36) NOT NULL` $\rightarrow$ `booking_agency_shares(id)` (`N–1`)
  - `agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `approved_by_admin_id VARCHAR(36) NULL` $\rightarrow$ `users(id)` (`N–1`)
- **Cột dữ liệu:**
  - `requested_amount BIGINT NOT NULL CHECK (requested_amount > 0)`
  - `approved_amount BIGINT NOT NULL DEFAULT 0 CHECK (approved_amount >= 0)`
  - `max_allowed_rate DECIMAL(5,2) NOT NULL DEFAULT 70.00`
  - `purpose_description TEXT NOT NULL`
  - `bank_reference_code VARCHAR(100)`
  - `status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED'` — `CHECK (status IN ('REQUESTED', 'APPROVED', 'DISBURSED', 'REJECTED', 'DEDUCTED_AT_SETTLEMENT'))`
  - `disbursed_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL`

#### 28. Bảng `incident_and_disputes`
Báo cáo sự cố hiện trường của HDV, vi phạm thỏa thuận đồng tổ chức và khiếu nại của Customer.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`)
  - `agency_share_id VARCHAR(36) NULL` $\rightarrow$ `booking_agency_shares(id)` (`N–1`)
  - `reported_by_user_id VARCHAR(36) NOT NULL` $\rightarrow$ `users(id)` (`N–1`)
  - `responsible_agency_id VARCHAR(36) NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
- **Cột dữ liệu:**
  - `reporter_role VARCHAR(30) NOT NULL` — `CHECK (reporter_role IN ('GUIDE', 'CUSTOMER', 'LEAD_AGENCY', 'LOCAL_AGENCY'))`
  - `incident_type VARCHAR(40) NOT NULL` — `CHECK (incident_type IN ('MEDICAL', 'VEHICLE', 'WEATHER', 'SERVICE_QUALITY', 'COHOST_BREACH', 'CUSTOMER_COMPLAINT'))`
  - `location_name VARCHAR(255)`, `title VARCHAR(255) NOT NULL`, `description TEXT NOT NULL`
  - `evidence_urls_json JSON`
  - `remedy_deadline TIMESTAMP` (Thời hạn yêu cầu khắc phục đối với vi phạm chặng)
  - `replacement_cost_incurred BIGINT NOT NULL DEFAULT 0`
  - `settlement_hold_flag BOOLEAN NOT NULL DEFAULT FALSE` (Cờ khóa tự động quyết toán khi đang tranh chấp)
  - `status VARCHAR(30) NOT NULL DEFAULT 'OPEN'` — `CHECK (status IN ('OPEN', 'INVESTIGATING', 'REMEDIED', 'ESCALATED', 'RESOLVED', 'REJECTED'))`
  - `resolution_note TEXT`, `resolved_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL`

#### 29. Bảng `refund_requests`
Yêu cầu hoàn tiền khi hủy tour hoặc bồi hoàn chất lượng dịch vụ.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`)
  - `customer_id VARCHAR(36) NOT NULL` $\rightarrow$ `users(id)` (`N–1`)
  - `processed_by_admin_id VARCHAR(36) NULL` $\rightarrow$ `users(id)` (`N–1`)
- **Cột dữ liệu:**
  - `reason_type VARCHAR(40) NOT NULL` — `CHECK (reason_type IN ('CUSTOMER_REQUEST', 'WEATHER_FORCE_MAJEURE', 'SERVICE_QUALITY', 'DUPLICATE_PAYMENT', 'TOUR_CANCELLED', 'OTHER'))`
  - `reason_detail TEXT NOT NULL`
  - `total_paid_amount BIGINT NOT NULL`, `committed_non_recoverable BIGINT NOT NULL DEFAULT 0`
  - `refund_percentage INT NOT NULL CHECK (refund_percentage BETWEEN 0 AND 100)`
  - `cancellation_fee_amount BIGINT NOT NULL DEFAULT 0`
  - `approved_refund_amount BIGINT NOT NULL CHECK (approved_refund_amount >= 0)`
  - `refund_bank_name VARCHAR(150) NOT NULL`, `refund_account_number VARCHAR(50) NOT NULL`, `refund_account_holder VARCHAR(150) NOT NULL`
  - `bank_transaction_code VARCHAR(100)`, `admin_note TEXT`
  - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING'` — `CHECK (status IN ('PENDING', 'REVIEWING', 'COMPLETED', 'REJECTED'))`
  - `processed_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL`

#### 30. Bảng `financial_settlements`
Quyết toán và giải ngân cuối cùng sau khi kết thúc tour cho từng phần việc của Lead Agency và Local Co-Host Agency.
- **PK:** `id VARCHAR(36)`
- **FK:**
  - `booking_id VARCHAR(36) NOT NULL` $\rightarrow$ `bookings(id)` (`N–1`)
  - `agency_share_id VARCHAR(36) NOT NULL UNIQUE` $\rightarrow$ `booking_agency_shares(id)` (`1–1`)
  - `beneficiary_agency_id VARCHAR(36) NOT NULL` $\rightarrow$ `business_profiles(id)` (`N–1`)
  - `settled_by_admin_id VARCHAR(36) NULL` $\rightarrow$ `users(id)` (`N–1`)
- **Cột dữ liệu:**
  - `settlement_code VARCHAR(50) NOT NULL UNIQUE`
  - `gross_allocated_amount BIGINT NOT NULL CHECK (gross_allocated_amount >= 0)`
  - `platform_fee_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00`
  - `platform_fee_amount BIGINT NOT NULL DEFAULT 0`
  - `advance_deducted_amount BIGINT NOT NULL DEFAULT 0` (Tổng tạm ứng `operational_advances` đã giải ngân bị khấu trừ)
  - `penalty_or_refund_deducted BIGINT NOT NULL DEFAULT 0` (Khấu trừ phạt vi phạm chặng hoặc hoàn tiền)
  - `net_payout_amount BIGINT NOT NULL CHECK (net_payout_amount >= 0)` (`gross - fee - advance - penalty`)
  - `beneficiary_bank_snapshot JSON NOT NULL`
  - `bank_transaction_code VARCHAR(100)`, `settlement_note TEXT`
  - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING'` — `CHECK (status IN ('PENDING', 'ON_HOLD_DISPUTE', 'READY', 'SETTLED'))`
  - `settled_at TIMESTAMP`, `created_at TIMESTAMP NOT NULL`

---

## 3. Các Bảng Giai Đoạn 2 (Phase-2 Tables — Không Vẽ Lên ERD Chính Để Tránh Rối)

6 bảng dưới đây phục vụ các tính năng bổ trợ (Chat trực tuyến, Gói thuê bao SaaS của Agency, Đánh giá & Wishlist). Chúng được tách sang Phase-2 để giữ cho sơ đồ [`ERDdrawio.xml`](file:///c:/Users/Admin/Documents/GitHub/TripOpsFE/ERDdrawio.xml) tập trung 100% vào luồng vận hành & tài chính cốt lõi:

| Tên bảng Phase-2 | Khóa chính & Khóa ngoại | Các cột chính & Mục đích |
| :--- | :--- | :--- |
| `chat_conversations` | `PK: id`<br>`FK: custom_request_id -> custom_tour_requests(id)`<br>`FK: customer_id -> users(id)`<br>`FK: agency_id -> business_profiles(id)` | `last_message_text`, `unread_customer_count`, `unread_agency_count`, `updated_at`. Quản lý phòng chat thương lượng tour thiết kế riêng. |
| `chat_messages` | `PK: id`<br>`FK: conversation_id -> chat_conversations(id)`<br>`FK: sender_user_id -> users(id)` | `sender_role`, `message_type` (`TEXT`, `PROPOSAL_LINK`, `SYSTEM`), `content_text`, `is_read`, `created_at`. |
| `chat_attachments` | `PK: id`<br>`FK: message_id -> chat_messages(id)` | `file_name`, `file_url`, `file_type`, `file_size_bytes`. |
| `subscription_plans` | `PK: id` | `plan_code`, `plan_name`, `monthly_price`, `max_published_tours`, `features_json`, `is_active`. |
| `agency_subscriptions` | `PK: id`<br>`FK: agency_id -> business_profiles(id)`<br>`FK: plan_id -> subscription_plans(id)` | `start_date`, `end_date`, `amount_paid`, `payment_reference`, `status` (`ACTIVE`, `EXPIRED`, `CANCELLED`). |
| `tour_reviews_and_wishlists` | `PK: id`<br>`FK: tour_id -> tours(id)`<br>`FK: booking_id -> bookings(id)`<br>`FK: user_id -> users(id)` | `record_type` (`REVIEW` \| `WISHLIST`), `rating` (`1..5`), `comment_text`, `created_at`. |

---

## 4. Chiến Lược Snapshot & Kiểm Soát Truy Cập Dữ Liệu (Access Control Matrix)

### 4.1. Chiến lược Snapshot (Đảm bảo tính bất biến của Báo giá & Booking)
| Thời điểm | Cột Snapshot lưu trữ | Lý do nghiệp vụ |
| :--- | :--- | :--- |
| **Khi thêm KS/Nhà hàng vào Tour** | `tour_itinerary_days.hotel_snapshot_json`<br>`tour_itinerary_items.item_snapshot_json` | Nếu Platform Partner đổi giá bài đăng hoặc Agency sửa danh bạ `agency_suppliers`, cấu hình mẫu trong tour không bị nhảy giá ngoài ý muốn. |
| **Khi gửi Báo giá (Quotation) cho khách** | `quotation_versions.itinerary_snapshot_json`<br>`quotation_versions.pricing_snapshot_json` | Lưu nguyên trạng từng phiên bản `v1, v2, v3` để đối chiếu lịch sử thương lượng và khóa giá tới `price_locked_until`. |
| **Khi tạo Booking & Hợp đồng** | `bookings.tour_snapshot_json`<br>`booking_contracts.contract_terms_snapshot`<br>`booking_passengers.unit_price_snapshot` | Hợp đồng đã ký với khách là bất biến; mọi thay đổi sau đó phải đi qua `booking_amendments`. |
| **Khi Quyết toán giải ngân** | `financial_settlements.beneficiary_bank_snapshot` | Lưu STK ngân hàng của Agency tại đúng thời điểm chuyển khoản UNC để phục vụ kiểm toán. |

### 4.2. Ma trận phân quyền truy cập cấp Dòng & Trường (Row & Field-Level Security)
1. **Cô lập Danh bạ Supplier riêng (`agency_suppliers`):**
   - Mọi truy vấn `SELECT / INSERT / UPDATE / DELETE` trên `agency_suppliers` bắt buộc có điều kiện `WHERE agency_id = :currentUserAgencyId`.
2. **Bảo mật Giá bán & Biên lợi nhuận của Lead Agency trong Tour Đồng Tổ Chức:**
   - Khi người dùng thuộc **Local Co-Host Agency** (`booking_agency_shares.role_type = 'LOCAL_COHOST'`) gọi API xem Tour, Báo giá hoặc Booking:
     - **Được xem:** Các ngày trong `assigned_days_json` của mình, hành khách thuộc chặng mình, và bản ghi `booking_agency_shares` / `financial_settlements` của riêng `agency_id` mình.
     - **Bị ẩn (Nullify/Omit trên Response DTO):** `bookings.total_selling_price`, `tours.base_price`, `custom_tour_requests.quoted_total_price`, `custom_tour_requests.customer_budget`, và các dòng `booking_agency_shares` của Lead Agency hay các Co-Host khác.
3. **Bảo mật thông tin cá nhân Hành khách (`booking_passengers`) đối với Platform Partner:**
   - Khi gửi phiếu `partner_service_reservations` cho **Nhà hàng (`service_category = 'FNB'`)**: API chỉ trả về họ tên, phân loại tuổi (`age_category`) và ghi chú ăn chay/dị ứng (`dietary_notes`); **ẩn** số CCCD/Hộ chiếu (`id_card_or_passport`), SĐT cá nhân và ghi chú xếp phòng (`roommate_notes`).
   - Khi gửi cho **Khách sạn (`service_category = 'HOTEL'`)**: Trả về họ tên, giới tính, năm sinh, CCCD/Hộ chiếu và `roommate_notes` để làm thủ tục lưu trú.

