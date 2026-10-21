# Schema proposal sau quyết định Q1–Q11

Cập nhật 2026-10-21. **Các quyết định Q1–Q11 đã được người dùng chốt.** Phần mở rộng bên dưới được thống nhất về nhu cầu/phạm vi bởi các quyết định đó; tên bảng, kiểu chi tiết và constraint là thiết kế kỹ thuật để review ở Task 2. Task 1 không tạo entity/migration. Không coi các cột bổ sung là nội dung gốc của ERD.

## Nguồn gốc và naming

[ERD inventory](erd-inventory.md) giữ 27 bảng, 330 dòng cột gốc, 29 edge. Thiết kế triển khai giữ **329 cột gốc phân biệt** sau bỏ visibility trùng theo Q3, rồi bổ sung các trường/bảng dưới đây. Bản ghi nguồn XML/phiếu không bị chỉnh sửa. Dữ liệu cũ trong UseCase/Page-8 không được dùng làm schema.

| Tên ERD | Tên SQL triển khai | C# | Lý do |
|---|---|---|---|
| tours.baseprice | tours.base_price | BasePrice | snake_case nhất quán Q3 |
| tours.diemnoibat | tours.highlights | Highlights | tên tiếng Anh có nghĩa, Q3 |
| tours.duration_tour | tours.duration_description | DurationDescription | giữ nội dung mô tả, duration_days/nights là số lượng chuẩn |
| tours.visibility (hai ô) | tours.visibility (một cột) | Visibility | sửa lỗi trùng, PUBLIC/PRIVATE |
| tourist_attractions.name_location | tourist_attractions.location_name | LocationName | naming nhất quán |

Các tên còn lại giữ snake_case; tên C# PascalCase, JSON camelCase. Không đổi tên XML nguồn. Bảng per-column bên dưới dùng tên gốc để truy vết; mapping trên áp dụng khi triển khai.

## Quy tắc đã thống nhất

PK/FK bigint; PK IDENTITY, role enum ADMIN/TRAVEL_AGENCY/PROVIDER/CUSTOMER/TOUR_GUIDE, một role/user. agency_id/provider_id→users.id, guide_id→users.id (TOUR_GUIDE), business_profiles.user_id UNIQUE. Participant.assigned_guide_id→booking_assigned_guides.id và cùng booking. Role/trạng thái/scope được service kiểm tra; FK không tự kiểm role.

Tiền decimal(19,2), currency VND, làm tròn đến đồng bằng AwayFromZero; fee tổng tính một lần, lệch phân bổ về host. UTC datetime2(3), ngày date, rowversion cho aggregate mutable. NN=NOT NULL, Y=NULL. Enum varchar(40)+CHECK theo state-machines. JSON có CHECK ISJSON và schema_version; không thay quan hệ invitation/tiền bằng notes. FK NO ACTION, không cascade mất lịch sử; index mọi FK (gộp composite có cùng prefix khi hợp lý).

## Cột gốc và kiểu SQL kỹ thuật

Các bảng dưới bao phủ toàn bộ cột ERD phân biệt. Các default/length/NULL là lựa chọn kỹ thuật; guard chốt hợp đồng có thể yêu cầu thêm giá trị khác NULL. Đặc biệt visibility chỉ có một dòng, khác inventory nguyên bản theo Q3.

## users

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `email` | `nvarchar(254)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `phone` | `varchar(32)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `password_hash` | `varchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `role` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `avatar` | `nvarchar(2048)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `is_verified` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## business_profiles

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `user_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `business_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `tax_code` | `nvarchar(64)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `business_address` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `business_license_url` | `nvarchar(2048)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `description` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `rejection_reason` | `nvarchar(2000)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `approved_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## services

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `provider_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `category` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `description` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `price` | `decimal(19,2)` | Y | — | CHECK >= 0 |
| `price_from` | `decimal(19,2)` | Y | — | CHECK >= 0 |
| `price_to` | `decimal(19,2)` | Y | — | CHECK >= 0 |
| `capacity` | `int` | Y | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `star_rating` | `tinyint` | Y | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `amenities` | `nvarchar(max)` | Y | — | CHECK ISJSON khi khác NULL; hợp đồng JSON có version |
| `policies` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `province` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `ward` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `street` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `latitude` | `decimal(10,7)` | Y | — | CHECK -90..90 |
| `longitude` | `decimal(10,7)` | Y | — | CHECK -180..180 |
| `thumbnail_url` | `nvarchar(2048)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `images` | `nvarchar(max)` | Y | — | CHECK ISJSON khi khác NULL; hợp đồng JSON có version |
| `rating` | `decimal(3,2)` | Y | — | CHECK 0..5; review yêu cầu 1..5 |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `rejection_reason` | `nvarchar(2000)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## tour_custom_requests

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `user_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | Y | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `contact_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `contact_email` | `nvarchar(254)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `contact_phone` | `varchar(32)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `destination` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `departure_date` | `date` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `return_date` | `date` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `number_of_participants` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `budget_per_person` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `hotel_rating_requirement` | `tinyint` | Y | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `special_requirements` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## tour_custom_request_agencies

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `request_id` | `bigint` | NN | tour_custom_requests.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `is_host` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `stage_area` | `nvarchar(255)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `suggested_budget` | `decimal(19,2)` | Y | — | CHECK >= 0 |
| `communication_notes` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `assigned_at` | `datetime2(3)` | NN | — | UTC; set bởi backend theo transition |
| `responded_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## tours

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `custom_request_id` | `bigint` | Y | tour_custom_requests.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `tour_code` | `nvarchar(64)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `destination` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `duration_tour` | `nvarchar(255)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `operation_period` | `nvarchar(255)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `duration_days` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `duration_nights` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `baseprice` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `min_participants` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `max_participants` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `diemnoibat` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `inclusions` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `exclusions` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `policies` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `message` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `thumbnail_urls` | `nvarchar(max)` | Y | — | CHECK ISJSON khi khác NULL; hợp đồng JSON có version |
| `image_urls` | `nvarchar(max)` | Y | — | CHECK ISJSON khi khác NULL; hợp đồng JSON có version |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `visibility` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `is_request` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `version` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `change_note` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `is_shared_to_customer` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `is_ai_generated` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
## tour_pricing_tiers

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `tour_id` | `bigint` | NN | tours.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `tier_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `min_age` | `tinyint` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `max_age` | `tinyint` | Y | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `price` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `display_order` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |

## tour_timeline

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `tour_id` | `bigint` | NN | tours.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `day_number` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `title` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `description` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |

## tourist_attractions

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `tour_timeline_id` | `bigint` | NN | tour_timeline.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `name_location` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |

## tour_meals

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `tour_timeline_id` | `bigint` | NN | tour_timeline.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `meal_type` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `restaurant_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `description` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `is_default` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `price_difference` | `decimal(19,2)` | NN | — | Cho phép +/-; backend tính |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## tour_accommodations

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `tour_id` | `bigint` | NN | tours.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `destination_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `hotel_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `star_rating` | `tinyint` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `nights_count` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `is_default` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `price_difference` | `decimal(19,2)` | NN | — | Cho phép +/-; backend tính |
| `address_notes` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## tour_versions

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `tour_id` | `bigint` | NN | tours.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `created_by` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `version` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `change_note` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `price` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `tour_snapshot` | `nvarchar(max)` | NN | — | CHECK ISJSON khi khác NULL; hợp đồng JSON có version |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |

## bookings

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `customer_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `tour_id` | `bigint` | NN | tours.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `design_request_id` | `bigint` | Y | tour_custom_requests.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `booking_code` | `nvarchar(64)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `departure_date` | `date` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `contact_full_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `contact_phone` | `varchar(32)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `contact_email` | `nvarchar(254)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `contact_note` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `payment_status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `has_customization` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `original_total_price` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `total_price` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `cancel_reason` | `nvarchar(2000)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `cancelled_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## booking_agencies

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `is_host` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `original_amount` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `final_amount` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `platform_fee` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `net_payout` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `settlement_status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `payout_transferred_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
| `bank_reference_code` | `nvarchar(64)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## booking_assigned_guides

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `guide_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `role` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `notes` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `assigned_at` | `datetime2(3)` | NN | — | UTC; set bởi backend theo transition |

## booking_participants

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `assigned_guide_id` | `bigint` | Y | booking_assigned_guides.id (Q2 đã chốt; cùng booking) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `checked_by` | `bigint` | Y | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `participant_index` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `is_primary` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `full_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `date_of_birth` | `date` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `gender` | `varchar(40)` | Y | — | CHECK tập giá trị; xem state-machines.md |
| `identity_card_number` | `nvarchar(64)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `phone` | `varchar(32)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `note` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `tier_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `price` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `attendance_status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `checked_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `status_note` | `nvarchar(2000)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## booking_timelines

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `day_number` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `title` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `description` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |

## booking_timeline_attractions

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_timeline_id` | `bigint` | NN | booking_timelines.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `original_location_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `customized_location_name` | `nvarchar(255)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `is_customized` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `customer_note` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `price_difference` | `decimal(19,2)` | NN | — | Cho phép +/-; backend tính |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `attendance_status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `guide_id` | `bigint` | Y | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |

## booking_timeline_meals

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_timeline_id` | `bigint` | NN | booking_timelines.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `provider_id` | `bigint` | Y | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `meal_type` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `original_restaurant_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `customized_restaurant_name` | `nvarchar(255)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `price_difference` | `decimal(19,2)` | NN | — | Cho phép +/-; backend tính |
| `is_customized` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `customer_note` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |

## booking_accommodations

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `provider_id` | `bigint` | Y | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `destination` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `original_hotel_name` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `original_stars` | `tinyint` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `customized_hotel_name` | `nvarchar(255)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `customized_stars` | `tinyint` | Y | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `nights_count` | `int` | NN | — | CHECK >= 0; ràng buộc chéo ở dưới |
| `price_difference` | `decimal(19,2)` | NN | — | Cho phép +/-; backend tính |
| `is_customized` | `bit` | NN | — | DEFAULT 0; xác thực theo nghiệp vụ |
| `customer_note` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |

## payment_transactions

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `payment_request_id` | `bigint` | NN | payment_requests.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `transaction_code` | `nvarchar(64)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `payment_method` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `amount` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `payer_name` | `nvarchar(255)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `payment_proof_url` | `nvarchar(2048)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `paid_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## booking_price_adjustments

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `adjusted_by` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `previous_total_price` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `adjustment_amount` | `decimal(19,2)` | NN | — | Cho phép +/-; backend tính |
| `new_total_price` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `reason` | `nvarchar(max)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |

## feedbacks

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `customer_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `overall_rating` | `decimal(3,2)` | NN | — | CHECK 0..5; review yêu cầu 1..5 |
| `overall_comment` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `agency_rating` | `decimal(3,2)` | Y | — | CHECK 0..5; review yêu cầu 1..5 |
| `agency_comment` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `images` | `nvarchar(max)` | Y | — | CHECK ISJSON khi khác NULL; hợp đồng JSON có version |
| `agency_reply` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `replied_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## complaints

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `customer_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `admin_id` | `bigint` | Y | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `subject` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `description` | `nvarchar(max)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `evidence_urls` | `nvarchar(max)` | Y | — | CHECK ISJSON khi khác NULL; hợp đồng JSON có version |
| `agency_response` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `agency_responded_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
| `admin_notes` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `resolved_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
| `deleted_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## payment_requests

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `created_by` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `description` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `amount` | `decimal(19,2)` | NN | — | CHECK >= 0 |
| `due_date` | `datetime2(3)` | NN | — | UTC; set bởi backend theo transition |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `paid_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## booking_attraction_checkins

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_timeline_attraction_id` | `bigint` | NN | booking_timeline_attractions.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `guide_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `attendance_status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `checked_at` | `datetime2(3)` | NN | — | UTC; set bởi backend theo transition |
| `photo_proof_url` | `nvarchar(2048)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `notes` | `nvarchar(max)` | Y | — | Độ dài/định dạng do backend kiểm tra |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## booking_incidents

| Cột gốc | SQL Server đề xuất | NULL | FK đích đề xuất | Ràng buộc cơ bản đề xuất |
|---|---|---|---|---|
| `id` | `bigint` | NN | — | PK clustered; IDENTITY(1,1) đề xuất |
| `booking_id` | `bigint` | NN | bookings.id | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `agency_id` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `reported_by` | `bigint` | NN | users.id (Q1/Q2 đã chốt; service kiểm tra role) | IX FK; NO ACTION; kiểm tra role + cùng aggregate |
| `incident_type` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `title` | `nvarchar(255)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `description` | `nvarchar(max)` | NN | — | Độ dài/định dạng do backend kiểm tra |
| `status` | `varchar(40)` | NN | — | CHECK tập giá trị; xem state-machines.md |
| `evidence_urls` | `nvarchar(max)` | Y | — | CHECK ISJSON khi khác NULL; hợp đồng JSON có version |
| `resolved_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |
| `created_at` | `datetime2(3)` | NN | — | DEFAULT SYSUTCDATETIME(); immutable |
| `updated_at` | `datetime2(3)` | Y | — | UTC; set bởi backend theo transition |

## UNIQUE và index theo aggregate

Các index/UNIQUE là thiết kế kỹ thuật theo quyết định đã chốt; chưa tạo DDL. `UX` = unique index; filtered UX dùng điều kiện nêu rõ. Mọi bảng đã có PK(id); mọi FK đã có IX theo quy ước trên.

| Bảng | UNIQUE đề xuất | Index truy vấn bổ sung |
|---|---|---|
| users | UX(email), chuẩn hóa trim/case theo collation được chốt | (role,status) |
| business_profiles | UX(user_id); UX(tax_code) chuẩn hóa một mã số thuế/một profile đề xuất kỹ thuật | (status,created_at) |
| services | Không unique theo tên | (provider_id,status), (status,category,province); cân nhắc full text sau đo tải |
| tour_custom_requests | Không unique theo user/ngày | (user_id,status,created_at), (agency_id,status) |
| tour_custom_request_agencies | UX(request_id,agency_id); filtered UX(request_id) WHERE is_host=1 | (agency_id,status) |
| tours | UX(tour_code); không UNIQUE custom_request_id vì Q6 cho nhiều phương án/request | (agency_id,status), (status,visibility,destination) |
| tour_pricing_tiers | UX(tour_id,tier_name) | (tour_id,display_order) |
| tour_timeline | UX(tour_id,day_number) nếu mỗi ngày đúng một timeline | (tour_id,day_number) được UX phục vụ |
| tourist_attractions | Không: có thể lặp điểm tham quan | (tour_timeline_id,agency_id) |
| tour_meals | Không: nhiều lựa chọn cho một bữa | (tour_timeline_id,meal_type,is_default) |
| tour_accommodations | Không: nhiều hotel thay thế mỗi điểm | (tour_id,destination_name,is_default) |
| tour_versions | UX(tour_id,version), sửa ý đồ quan hệ 1:1 thành 1:N | (created_by,created_at) |
| bookings | UX(booking_code); design_request_id không UNIQUE mặc định | (customer_id,created_at), (tour_id,departure_date,status) |
| booking_agencies | UX(booking_id,agency_id); filtered UX(booking_id) WHERE is_host=1 | (agency_id,settlement_status) |
| booking_assigned_guides | UX(booking_id,guide_id,agency_id) ; scope segment lưu liên kết riêng | (guide_id,booking_id) |
| booking_participants | UX(booking_id,participant_index); filtered UX(booking_id) WHERE is_primary=1 | (assigned_guide_id,attendance_status) |
| booking_timelines | UX(booking_id,day_number) với cùng giả định tour_timeline | (booking_id,day_number) được UX phục vụ |
| booking_timeline_attractions | Không unique theo tên | (booking_timeline_id,status), (guide_id,status) |
| booking_timeline_meals | Không unique meal_type trước khi chốt nhiều bữa/ngày | (booking_timeline_id,status) |
| booking_accommodations | Không unique destination trước khi chốt nhiều hotel/điểm | (booking_id,status) |
| payment_transactions | UX(transaction_code), cùng bank_reference UNIQUE và idempotency bổ sung ở dưới | (booking_id,paid_at), (payment_request_id,status) |
| booking_price_adjustments | Append-only, không unique theo reason | (booking_id,created_at) |
| feedbacks | UX(booking_id,customer_id,agency_id), thay quan hệ vẽ 1:1 để hỗ trợ co-host | (agency_id,status,created_at) |
| complaints | Không UNIQUE booking_id: Q8 đã chốt nhiều complaint/booking | (customer_id,status), (agency_id,status), (admin_id,status) |
| payment_requests | Không unique amount/due_date | (booking_id,status,due_date) |
| booking_attraction_checkins | Không UNIQUE attraction_id: giữ lần chụp/check lại | (booking_timeline_attraction_id,checked_at), (guide_id,created_at) |
| booking_incidents | Không unique booking_id | (booking_id,status,created_at), (agency_id,status) |

Filtered UX chỉ bảo đảm **tối đa** một host/primary, không bảo đảm tồn tại một. Service phải bảo đảm đúng một host khi xác nhận booking/request và đúng một đại diện khi chốt danh sách. Không unique identity_card_number toàn hệ thống (trẻ em/khách có nhiều booking).


## Bảng bổ sung theo các quyết định đã thống nhất

**Không thuộc ERD gốc; chưa tạo trong database.** Các field liệt kê là cấu trúc triển khai đề xuất cụ thể, không phải yêu cầu người dùng chốt lại Q1–Q11. Trong bảng: id bigint PK NN; FK cùng bigint; thời điểm datetime2(3); tiền decimal(19,2); state varchar(40); text nvarchar; rv rowversion. Mặc định NN, dấu `?` là NULL. Mọi FK dùng NO ACTION và có index; mỗi bảng mới có created_at UTC, các dòng mutable thêm updated_at/rv; history/snapshot append-only không sửa/xóa. Tên field FK chỉ rõ đích ngay trong mô tả.

| Bảng mới | Các cột cần thêm và FK | UNIQUE/index/guard chính | Căn cứ/lý do |
|---|---|---|---|
| guide_profiles | id; guide_id→users; current_agency_id→users; license_number nvarchar(100)?; license_expires_on date?; certificate_file_id→file_objects?; languages_json nvarchar(max); activated_at?; locked_at?; rv | UNIQUE guide_id; current agency TRAVEL_AGENCY, guide TOUR_GUIDE; state user kiểm tại mọi thao tác | Q2: không suy ownership từ assignment; lưu chứng chỉ/ngôn ngữ |
| guide_agency_history | id; guide_id→users; agency_id→users; valid_from; valid_to?; changed_by→users; reason nvarchar(2000) | filtered UNIQUE(guide_id) WHERE valid_to IS NULL; khóa guide và xử lý future assignments trước chuyển | Q2: một agency tại một thời điểm, bảo toàn lịch sử |
| cohost_invitations | id; tour_id→tours; host_agency_id→users; partner_agency_id→users; invited_by→users; status; expires_at?; responded_at?; response_reason?; rv | index(partner_agency_id,status), chặn self invite; chỉ một invitation active/tour/partner | Q4: cả tour thường/custom, invite/accept/reject rõ ràng |
| tour_segments | id; tour_id→tours; responsible_agency_id→users; sequence int; start_day int; end_day int; area nvarchar(255); service_scope_json; handover_location nvarchar(1000)?; handover_at?; handover_timezone varchar(64)?; lead_guide_id→users?; current_agreement_revision_id→segment_agreement_revisions?; rv | UNIQUE(tour_id,sequence); start_day<=end_day<=duration_days; host/partner accepted; Guide đúng agency | Q4: chặng có trách nhiệm, lịch và bàn giao, không nhét notes |
| segment_agreement_revisions | id; segment_id→tour_segments; revision int; quote_mode; unit_net_amount; lump_sum_amount; billable_guest_rule_json; service_scope_snapshot; handover_snapshot; proposed_by→users; content_hash char(64); status; supersedes_id→cùng bảng? | UNIQUE(segment_id,revision); PER_GUEST xor LUMP_SUM; immutable submitted content; sửa tạo revision mới | Q4/Q5: net hai bên chấp nhận, adult+child mặc định, infant ngoại lệ rõ |
| segment_agreement_acceptances | id; agreement_revision_id→segment_agreement_revisions; agency_id→users; accepted_by→users; accepted_at; content_hash char(64) | UNIQUE(revision,agency_id); chỉ host và responsible partner; đủ cả hai mới effective | Q4: hai Agency đồng ý đúng revision |
| custom_request_quotes | id; request_id→tour_custom_requests; tour_id→tours; tour_version_id→tour_versions; revision int; amount; expires_at?; terms_snapshot; status; shared_at?; accepted_by→users?; accepted_at?; rv | UNIQUE(request_id,tour_id,revision); một request nhiều phương án; không tạo nhiều active booking | Q6: formal quote có version, không dùng suggested_budget |
| booking_revisions | id; booking_id→bookings; revision int; source_tour_version_id→tour_versions; source_quote_id→custom_request_quotes?; snapshot_json; content_hash char(64); total_price; commission_rate decimal(7,6); currency char(3); billable_guests int; reason; created_by→users | UNIQUE(booking_id,revision); append-only, snapshot policy/tiers/options/service/quantity/contacts/manifest; không hồi tố catalogue | Q5/Q6/Q9: snapshot thương mại, passenger change/reprice |
| tour_contracts | id; booking_id→bookings; current_revision_id→tour_contract_revisions?; rv | UNIQUE booking_id; logical contract identity, không chứa nội dung mutable trực tiếp | Q6: hợp đồng có danh tính ổn định |
| tour_contract_revisions | id; contract_id→tour_contracts; booking_revision_id→booking_revisions; revision int; content_snapshot; content_hash char(64); document_file_id→file_objects?; issued_by→users; issued_at; supersedes_id→cùng bảng? | UNIQUE(contract_id,revision); append-only; structured cancellation policy + commission snapshot trong nội dung | Q6/Q8/Q9: mỗi thay đổi nghĩa vụ tạo bản cần chấp nhận lại |
| contract_acceptances | id; contract_revision_id→tour_contract_revisions; accepted_by→users; accepted_at; accepted_content_hash char(64); method varchar(40) | UNIQUE(contract_revision_id,accepted_by); CUSTOMER đúng booking; method ONLINE_CONFIRMATION | Q6: bằng chứng xác nhận online, không tích hợp chữ ký số |
| booking_segments | id; booking_id→bookings; booking_revision_id→booking_revisions; source_segment_id→tour_segments?; agreement_revision_id→segment_agreement_revisions?; agency_id→users; sequence int; segment_snapshot; billable_guests int; net_amount; status; completed_by→users?; completed_at?; rv | UNIQUE(booking_revision_id,sequence); chỉ agency trong booking_agencies; amounts/terms immutable per revision | Q4/Q7: allocation chuyến thực tế, partner chỉ hoàn thành chặng mình |
| tour_wrap_up_reports | id; booking_id→bookings; segment_id→booking_segments?; guide_id→users; report_revision int; satisfaction_summary; service_quality_summary; overall_summary; evidence_refs_json?; submitted_at; reviewed_by→users?; reviewed_at?; status | UNIQUE(booking_id,guide_id,report_revision); guide ASSIGNED; host review; bản đã submit không ghi đè | Q7: báo cáo kết thúc tách completion tài chính |
| refund_requests | id; booking_id→bookings; contract_revision_id→tour_contract_revisions; requested_by→users; requested_amount; policy_snapshot; cancellation_fee; waived_fee; refundable_cap; reserved_amount; approved_amount?; status; agency_proposal?; decided_by→users?; decision_reason?; decided_at?; rv | khóa booking khi giữ chỗ refund; reserved>=0, tổng refund paid+reserved không vượt cap; Admin quyết định | Q8/Q9: penalty, miễn/giảm, partial refund, tránh hai yêu cầu hoàn trùng |
| settlement_runs | id; booking_id→bookings; business_code nvarchar(64); source_booking_revision_id→booking_revisions; retained_revenue; commission_rate decimal(7,6); platform_fee; partner_net_total; host_net; currency char(3); dispute_deadline; authorized_by→users?; override_reason?; status; finalized_at?; rv | UNIQUE business_code; một active/final run/booking; chưa đủ điều kiện thì hold; host_net>=0 | Q4/Q8/Q9: một lần tính fee, final-only, dispute window/override có audit |
| settlement_allocations | id; settlement_run_id→settlement_runs; booking_agency_id→booking_agencies; agency_id→users; agreed_partner_net; platform_fee; net_payout; allocation_snapshot | UNIQUE(run,agency_id); partner fee=0; host chịu toàn fee và phần lệch; append-only lúc chốt | Q9: snapshot phân bổ, booking_agencies chỉ summary |
| settlement_payouts | id; settlement_allocation_id→settlement_allocations; business_code nvarchar(64); amount; status; financial_transaction_id→payment_transactions?; rv | UNIQUE allocation_id và business_code; một payout cuối/agency/run, không partial payout tự do | Q9: retry cùng operation, không tạo lệnh chi mới khi timeout |
| financial_operation_attempts | id; transaction_id→payment_transactions; attempt_number int; idempotency_request_id→idempotency_requests; status; bank_reference nvarchar(128)?; started_at; completed_at?; result_code?; evidence_file_id→file_objects? | UNIQUE(transaction_id,attempt_number); UNKNOWN kết quả cần reconcile trước thử tiếp | Q9: lịch sử từng attempt thu/hoàn/chi, adapter tương lai |
| financial_transaction_events | id; transaction_id→payment_transactions; actor_id→users?; from_status?; to_status; reason?; bank_reference?; evidence_file_id→file_objects?; occurred_at | append-only; actor NN cho đối soát tay; adapter có nguồn hệ thống xác thực | Q9: đối soát/chuyển trạng thái có chứng cứ, không sửa giao dịch chốt |
| financial_ledger_entries | id; booking_id→bookings; transaction_id→payment_transactions; direction; kind; amount; currency char(3); occurred_at; reversal_of_id→cùng bảng? | UNIQUE transaction_id cho một dòng xác nhận tiền thực của operation; amount>0; reversal bút toán mới; ledger không lưu tiền pending | Q9: chứng minh received/refunded/disbursed, không tính tiền hai lần |
| platform_configuration_versions | id; version int; effective_at; changed_by→users; bank_account_snapshot; commission_rate decimal(7,6); pickup_open_minutes int; pickup_close_minutes int; financial_dispute_days int; reason | UNIQUE version; append-only; mặc định 8%,30,60,7; chỉ Admin; không chứa SMTP secret | Q7/Q8/Q9: cấu hình versioned, snapshot vào contract/booking khi chốt |
| refresh_sessions | id; user_id→users; expires_at; revoked_at?; revoke_reason?; rv | index(user_id,revoked_at); session 7 ngày mặc định; logout chỉ session tương ứng, reuse rotation revoke session | Q11: revoke/rotation bền vững |
| auth_tokens | id; user_id→users; purpose; token_hash char(64); refresh_session_id→refresh_sessions?; expires_at; used_at?; revoked_at?; replacement_token_id→cùng bảng? | UNIQUE token_hash; chỉ hash crypto token entropy cao; purpose REFRESH/RESET_PASSWORD/VERIFY_EMAIL; one-time verify/reset, rotate refresh atomic | Q11: không plaintext token, không tạo toàn bộ Identity schema |
| idempotency_requests | id; actor_id→users?; scope varchar(100); business_key nvarchar(128); request_hash char(64); status; response_code int?; response_snapshot?; resource_reference?; completed_at?; rv | UNIQUE(scope,actor_id,business_key) hoặc riêng scope hệ thống; cùng key khác hash409; response không chứa token/PII không cần thiết | Q6/Q9/Q11: create booking/import/thu-hoàn-chi chống xử lý trùng |
| audit_events | id; aggregate_type varchar(100); aggregate_id bigint; actor_id→users?; action varchar(100); old_state?; new_state?; reason?; changed_fields_json?; command_id→idempotency_requests?; occurred_at | index(aggregate_type,aggregate_id,occurred_at); append-only; không log plaintext token/identity card; protected access | Q2/Q6/Q7/Q8/Q9/Q11: chuyển agency/contact typo/ngoài pickup/review/moderation history |
| feedback_revisions | id; feedback_id→feedbacks; version int; edited_by→users; content_snapshot; moderation_state; reason? | UNIQUE(feedback_id,version); không trả PII trong public snapshots | Q8: cập nhật/moderation vẫn giữ lịch sử |
| file_objects | id; owner_user_id→users; purpose; storage_key nvarchar(1024); mime_type varchar(100); byte_size bigint; content_hash char(64); access_scope varchar(40) | UNIQUE storage_key; private evidence/certificates, signed access sau kiểm ownership; index owner/purpose | Q2/Q7/Q11: storage giữ bytes, database lưu reference/metadata |

## Cột bổ sung hoặc thay đổi trên 27 bảng gốc

Tất cả là **thay đổi theo quyết định đã thống nhất**, không có trong ERD nguyên bản. `?` là NULL; field name trong mapping ở trên thay tên khi triển khai.

| Bảng | Cột/thay đổi cần thiết | Lý do |
|---|---|---|
| users | role CHECK đúng 5 giá trị Q1; locked_at?, lock_reason?; row_version rowversion | Q1/Q2/Q11: một role, khóa guide/user và kiểm trạng thái protected API |
| business_profiles | UNIQUE(user_id); province/ward/street nvarchar(255)?; latitude/longitude decimal(10,7)?; operations_phone varchar(32)?; reviewed_by→users?; reviewed_at?; row_version | Q1/Q7 và phạm vi provider legal GPS/address/emergency contact |
| services | menu_json nvarchar(max)?; pricing_unit varchar(40); reviewed_by→users?; reviewed_at?; row_version | Q5: catalogue là thông tin công bố, capacity không realtime; menu theo phiếu |
| tours | visibility một PUBLIC/PRIVATE; status đúng năm Q3; cancellation_policy_json; approved_version_id→tour_versions?; rejection_reason?; reviewed_by→users?; reviewed_at?; deleted_at?; row_version | Q3/Q6/Q8: moderation đúng revision, archive bằng hidden+deleted_at thay thêm ARCHIVED status |
| tour_versions | UNIQUE(tour_id,version); schema_version int; snapshot_hash char(64) | Q3: 1:N append-only, restore tạo version mới |
| tour_pricing_tiers | tier_code varchar(20) ADULT/CHILD/INFANT; pricing_basis varchar(40) | Q5: mặc định adult+child chịu delta, infant không; ngày sinh tính tuổi ngày đi |
| tour_meals/tour_accommodations/tourist_attractions | source_service_id→services?; option_group_key nvarchar(64); is_default bit (attraction thêm); price_difference decimal(19,2) (attraction thêm); delta_unit; billable_guest_rule_json; display_order int | Q5: Agency cấu hình allowed options, default delta0, grouping ổn định; hotel theo khách/đêm, không theo phòng |
| bookings | source_tour_version_id→tour_versions; selected_quote_id→custom_request_quotes?; current_booking_revision_id→booking_revisions?; effective_contract_revision_id→tour_contract_revisions?; agency_approved_by→users?; agency_approved_at?; pickup_at?; pickup_timezone varchar(64)?; pickup_location?; pickup_open_minutes int; pickup_close_minutes int; operations_phone_snapshot varchar(32)?; completed_at?; completed_by→users?; rejection_reason?; is_active bit; row_version | Q6/Q7: approval→contract→deposit, thời gian vận hành, một booking request còn hiệu lực, giữ lịch sử |
| booking_agencies | UNIQUE(booking_id,agency_id); filtered UNIQUE booking_id WHERE is_host=1; current_settlement_run_id→settlement_runs?; row_version | Q4/Q9: đúng một host khi chốt, summary sync từ allocation snapshot |
| booking_assigned_guides | guide_agency_history_id→guide_agency_history; booking_segment_id→booking_segments?; starts_at?; ends_at?; revoked_at?; revoked_by→users?; row_version | Q2/Q4: lịch sử thuộc agency lúc phân công, xử lý future conflict trước chuyển; không viết lại agency_id lịch sử |
| booking_participants | assigned_guide_id→booking_assigned_guides; attendance_override_by→users?; attendance_override_reason?; row_version | Q2/Q7: same-booking assignment, điểm danh đầu chuyến, sửa ngoài cửa sổ có audit |
| booking_timelines | starts_at?; ends_at?; timezone varchar(64)?; booking_segment_id→booking_segments? | Q4/Q7: lịch trình có timing và scope partner |
| booking_timeline_attractions/booking_timeline_meals/booking_accommodations | booking_revision_id→booking_revisions; source_service_id→services?; source_option_id bigint? (tới đúng bảng option cùng loại); service_snapshot; delta_unit; billable_guest_count int; quantity decimal(19,4) | Q5/Q6: source để trace, snapshot độc lập; quantity nights/bữa/lượt theo quy tắc, source_option không FK đa hình |
| payment_requests | kind DEPOSIT/MILESTONE/FINAL; sequence int; contract_revision_id→tour_contract_revisions; supersedes_id→payment_requests?; request_code nvarchar(64); cancelled_at?; row_version | Q6/Q9: revised deposit tạo request mới, amount đã nhận không sửa |
| payment_transactions | transaction_kind RECEIPT/REFUND/PAYOUT/REVERSAL; direction IN/OUT; currency char(3); bank_reference nvarchar(128)?; verified_by→users?; verified_at?; verification_reason?; refund_request_id→refund_requests?; settlement_payout_id→settlement_payouts?; reverses_transaction_id→cùng bảng?; idempotency_request_id→idempotency_requests; created_at; updated_at?; row_version; payment_request_id NULL cho tiền ra | Q8/Q9: mở rộng giao dịch gốc thành nguồn tiền chuẩn duy nhất, 1:N/request, không sửa amount sau chốt |
| booking_price_adjustments | status PROPOSED/ACCEPTED/REJECTED; accepted_by→users?; accepted_at?; booking_revision_id→booking_revisions? | Q5/Q6: chỉ adjustment đã chấp nhận tính vào effective contract, proposed không sửa total đang có hiệu lực |
| booking_attraction_checkins | latitude/longitude decimal(10,7)?; accuracy_m decimal(10,2)?; captured_at?; location_missing_reason?; verification_status; review_reason?; reviewed_by→users? | Q7: accuracy>100m cảnh báo, mất vị trí vẫn gửi NEEDS_REVIEW có lý do, không GPS tuyệt đối |
| booking_incidents | resolution?; resolved_by→users?; row_version | Q7/Q8: escalation/review có lịch sử audit |
| complaints | is_financial bit; claimed_amount?; financial_hold_amount; opened_at; financial_window_deadline; decision_reason?; row_version; bỏ ý đồ UNIQUE booking_id | Q8: nhiều vụ việc, vụ mở đúng hạn được xử lý sau hạn; không payout phần hold |
| feedbacks | UNIQUE(booking_id,customer_id,agency_id); version int; moderated_by→users?; moderation_reason? | Q8: chỉ customer đủ điều kiện, version history khi edit/moderation |
| tour_custom_requests | selected_quote_id→custom_request_quotes?; accepted_at?; cancelled_at?; cancellation_reason?; row_version | Q6: nhiều phương án, một booking còn hiệu lực |
| tour_custom_request_agencies | giữ suggested_budget và stage_area như dữ liệu gốc; status chỉ phân phối request | Q4: không dùng bảng này thay invitation/agreement/segment |

## Invariant và index sau Q1–Q11

- Mọi FK mới indexed, role/trạng thái và cùng aggregate kiểm tại service. business_profiles UNIQUE user_id; guide hiện tại/history phải khớp, không transfer khi còn phân công tương lai xung đột. Mỗi booking chỉ assign guide của agency có booking_agencies. Guide khóa không được thao tác.
- Composite FK participant(assigned_guide_id,booking_id)→booking_assigned_guides(id,booking_id), thêm UNIQUE đích; transaction(payment_request_id,booking_id)→payment_requests(id,booking_id). Các reference revision/quote/contract/segment phải cùng tour/request/booking; foreign key vòng current pointer NULL khi tạo rồi set nguyên tử, không cascade.
- Custom request nhiều tours/quotes. Filtered UNIQUE bookings(design_request_id) WHERE design_request_id IS NOT NULL AND is_active=1. is_active false cho REJECTED/CANCELLED; completed vẫn ngăn một booking thay thế còn hiệu lực trừ quy trình được định nghĩa riêng. Giữ booking đã hủy và acceptance cũ.
- Exactly one host enforced qua filtered UNIQUE tối đa một + service transaction bảo đảm có một trước chốt. tour.agency_id là host; request.agency_id và request_agencies host phải khớp; booking host snapshot từ tour. Partner chỉ dữ liệu segment mình.
- PER_GUEST partner net = unit_net_amount × billable_guest_count snapshot; LUMP_SUM = agreed amount. billable default ADULT+CHILD, INFANT không tính trừ khai báo ngoại lệ snapshot. Acceptance phải đủ host+partner đúng revision/hash trước áp dụng.
- Tour base = tổng passenger tier prices; delta meal = delta_per_guest × billable_guests cho một bữa, hotel = delta_per_guest_per_night × billable_guests × nights, attraction = delta_per_guest × billable_guests cho một lượt; cộng accepted adjustments. Delta âm hợp lệ; default delta0. Không hotel/room allocation hoặc auto Provider reservation. Agency xác nhận cung ứng trước approval.
- Booking nghĩa vụ thay đổi tạo booking_revision + contract_revision cần customer accept lại, tạm chặn xác nhận/thu/khởi hành dựa trên bản stale. Giao dịch đã thu giữ nguyên, đối chiếu tiền thực với revision mới. Contact typo chỉ audit, không bắt ký lại.
- Cancellation policy JSON có bands theo số ngày trước departure: >=14 fee10%, >=7<14 fee30%, >=3<7 fee50%, <3 fee100%; tỷ lệ tính trên effective contract total. Demo policy sửa trước ký, không hồi tố. Điểm cắt tính theo timezone ngày khởi hành snapshot, backend trả calculation breakdown.
- Refund available = max(0, confirmed_received - effective_cancellation_fee) - paid_refunds - active_reserved_refunds, clamp>=0. Transaction khóa booking khi reserve/approve/execute; refund success giải phóng reservation và ghi ledger trong cùng commit, failure chắc chắn mới release. Fee>received không auto collect thêm; Admin xử lý nghĩa vụ còn lại/miễn giảm có lý do.
- Final retained revenue = confirmed_received - confirmed_refunded; fee = RoundVnd(retained_revenue × snapshotted_rate). Partner giữ agreed net; host = retained_revenue - tổng partner net - fee. Host âm chặn chốt/reconcile lại agreement, không âm payout hoặc tính fee partner lần hai. Tỷ lệ chia chỉ derived UI. Nếu refund làm thiếu nguồn trả partner thì đặt hold để Admin giải quyết, không tự giảm net đã chốt.
- Settlement chỉ cuối, không refund pending/reserved/unknown, không obligation hoặc complaint tài chính chưa xử lý, hết dispute7 ngày hoặc Admin override có lý do (override thời hạn không bỏ qua tranh chấp chưa xử lý). Một final payout/agency/run; retry dùng cùng business code/key; UNKNOWN/RECONCILIATION_REQUIRED không blind retry.
- bank_reference filtered UNIQUE với receipt external reference và scope tài khoản ngân hàng, không UNIQUE giá trị rỗng. Bổ sung `bank_account_scope nvarchar(128)?` trên payment_transactions để thực thi UNIQUE(bank_account_scope,bank_reference) cho RECEIPT đã có reference; reference không dùng làm bằng chứng quyền. Idempotency + hash + saved result bảo vệ retries; transaction_code UNIQUE riêng không đủ. Successful transaction/ledger immutable; correction thêm reversal có tham chiếu. CHECK loại giao dịch: RECEIPT IN và payment_request_id bắt buộc; REFUND OUT có refund_request_id; PAYOUT OUT có settlement_payout_id; REVERSAL có giao dịch gốc và direction đối ứng. Một successful operation tạo đúng một ledger entry, không cộng cả transaction và ledger thành hai lần tiền.
- Email password BCrypt; access JWT15 phút, refresh session7 ngày có rotation/revoke, token entropy cao chỉ lưu hash. Không ASP.NET Identity tables tự sinh; không Google subject mapping. Protected API kiểm trạng thái khóa user, logout revoke refresh session, access token hiện tại vẫn giới hạn bởi expiry và current-account check.
- Điểm danh NOT_CHECKED/PRESENT/LATE/ABSENT một lần departure, mở30 phút trước/đóng60 phút sau pickup_at; exception có Agency approval+reason+audit. Attraction completion riêng. GPS >100m warning/retry; thiếu GPS có reason+NEEDS_REVIEW. Wrap-up do guide gửi, host hoàn thành booking; partner chỉ complete segment.

## Bảo toàn lịch sử và phạm vi

FK NO ACTION; immutable tour/booking/contract/agreement revisions và ledger không hard-delete. Tour xóa logical bằng HIDDEN+deleted_at, không thêm ARCHIVED ngoài năm status Q3. Service có archive lifecycle riêng. Tài khoản guide đổi agency không đổi assignment lịch sử. File evidence private, lưu bytes ở storage/reference trong DB, không lộ PII trên list/log. Demo chỉ passenger giả. Production retention chưa kích hoạt auto delete theo Q11.

Không thêm Organizations/OrganizationMembers, subscription, chat, OAuth, room inventory/reservation. DDL/EF configurations/test concurrency/idempotency thuộc Task 2 và các task nghiệp vụ; Task 1 chỉ scaffold. [State machines](state-machines.md), [gaps](gaps.md), [API proposal](../api/endpoints-proposal.md) phản ánh quyết định này.
