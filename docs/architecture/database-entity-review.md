# Đối chiếu backend/database.md với toàn bộ entity và mapping EF

> Đây là báo cáo chênh lệch **trước cập nhật entity**. Ngày 26/10/2026 đã bổ sung đủ thiết kế và loại bỏ 95 cột ngoài thiết kế theo lựa chọn của người dùng. Trạng thái hiện tại: [database-exact-alignment.md](database-exact-alignment.md).

Ngày kiểm tra: 25/10/2026. Chỉ đọc; không sửa entity, database.md, migration hoặc SQL.
Nguồn chuẩn theo yêu cầu: backend/database.md (36 bảng). Đối chiếu metadata thực tế của EF Core từ TripOpsDbContext và 36 entity, gồm cả cột kế thừa BaseEntity, FK, index và nullable. Không tính navigation property là cột.

## Kết quả tổng thể

- Thiết kế: **36 bảng**. BE: **36 bảng**. Không thiếu/thừa bảng.
- Sau khi tách 38 cặp tên gần tương ứng để kiểm tra riêng: **129 trường thiết kế chưa có đối ứng**, **95 property BE ngoài thiết kế**. Đây là số lượt trường trên từng bảng, không phải số loại trường duy nhất.
- “Ngoài thiết kế” không mặc nhiên là sai hoặc nên xóa: bao gồm timestamps kế thừa, soft delete, kiểm duyệt, thông tin liên hệ và các cấu trúc BE đã bổ sung.
- “Gần tương ứng” là suy luận để đọc thiết kế, không phải HasColumnName trong EF, không chứng minh hai trường có cùng nghiệp vụ.
- Không coi PascalCase/snake_case là thiếu trường. Tên cột vật lý SQL hiện chủ yếu PascalCase; nếu cần đúng tên snake_case phải cấu hình mapping và migration riêng.
- Quy đổi kỹ thuật khi đọc kiểu: boolean ↔ bit; timestamp (nghĩa thời điểm trong tài liệu) ↔ datetime2; text/json ↔ nvarchar(max). Riêng SQL Server timestamp là rowversion, không phải thời gian. JSON dạng chuỗi không tự bảo đảm JSON hợp lệ.

## Thiếu/thừa và tên gần tương ứng — đủ 36 bảng

### users — User

Nguồn: [database.md](../../backend/database.md:1).

**Thiết kế có, BE chưa có đối ứng:** Không.

**BE có thêm ngoài thiết kế:** `DeletedAt`, `IsDeleted`.

### business_profiles — BusinessProfile

Nguồn: [database.md](../../backend/database.md:15).

**Thiết kế có, BE chưa có đối ứng:** Không.

**BE có thêm ngoài thiết kế:** Không.

### services — Service

Nguồn: [database.md](../../backend/database.md:33).

**Thiết kế có, BE chưa có đối ứng:** `star_rating`, `province`, `ward`, `street`, `thumbnail_url`, `rating`, `rejection_reason`.

**BE có thêm ngoài thiết kế:** `Address`, `City`, `ContactEmail`, `ContactPhone`, `Country`, `DeletedAt`, `IsDeleted`.

**Lưu ý:** Province/ward/street không tương đương đầy đủ với City/Address/Country. Thiếu cấu trúc địa chỉ, thumbnail và moderation riêng theo thiết kế.

### tours — Tour

Nguồn: [database.md](../../backend/database.md:79).

**Thiết kế có, BE chưa có đối ứng:** `duration_tour`, `thumbnail_urls`, `change_note`, `custom_request_id`, `is_shared_to_customer`.

**BE có thêm ngoài thiết kế:** `ApprovalStatus`, `ApprovedVersion`, `DeletedAt`, `Description`, `IsDeleted`, `RejectionReason`, `ReviewedAt`, `ReviewedBy`, `SubmittedVersion`.

**Tên gần tương ứng, cần thống nhất:** `tour_code` → `Code`; `min_participants` → `MinGuests`; `max_participants` → `MaxGuests`; `policies` → `CancellationPolicy`; `image_urls` → `Images`.

**Lưu ý:** policies → CancellationPolicy chỉ bao phủ chính sách hủy, chưa chắc bao phủ toàn bộ chính sách. Thumbnail có thể được suy ra từ Images[0] trong service/FE nhưng không có cột riêng. DurationTour có thể được suy ra từ số ngày/đêm. ApprovalStatus/SubmittedVersion/ApprovedVersion/ReviewedBy/ReviewedAt/RejectionReason là metadata kiểm duyệt bổ sung.

### tour_pricing_tiers — TourPricingTier

Nguồn: [database.md](../../backend/database.md:114).

**Thiết kế có, BE chưa có đối ứng:** `agency_id`.

**BE có thêm ngoài thiết kế:** `CreatedAt`, `MaxGuests`, `MinGuests`, `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `tier_name` → `Name`; `price` → `PricePerGuest`.

**Lưu ý:** Thiếu AgencyId nên chưa lưu công ty báo giá theo từng nhóm tuổi. MinGuests/MaxGuests trong entity là trường bổ sung, không phải MinAge/MaxAge.

### tour_timeline — TourTimeline

Nguồn: [database.md](../../backend/database.md:127).

**Thiết kế có, BE chưa có đối ứng:** Không.

**BE có thêm ngoài thiết kế:** `CreatedAt`, `UpdatedAt`.

### tourist_attractions — TouristAttraction

Nguồn: [database.md](../../backend/database.md:135).

**Thiết kế có, BE chưa có đối ứng:** `agency_id`.

**BE có thêm ngoài thiết kế:** `CreatedAt`, `Description`, `EstimatedTime`, `OrderIndex`, `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `name_location` → `Name`.

### tour_meals — TourMeal

Nguồn: [database.md](../../backend/database.md:144).

**Thiết kế có, BE chưa có đối ứng:** `agency_id`.

**BE có thêm ngoài thiết kế:** Không.

### tour_accommodations — TourAccommodation

Nguồn: [database.md](../../backend/database.md:158).

**Thiết kế có, BE chưa có đối ứng:** `tour_id`, `agency_id`.

**BE có thêm ngoài thiết kế:** `RoomType`, `TourTimelineId`.

**Lưu ý:** Khác mô hình quan hệ: thiết kế gắn trực tiếp tour_id → tours; BE gắn TourTimelineId → tour_timeline. Không coi hai FK là đổi tên tương đương.

### tour_custom_requests — TourCustomRequest

Nguồn: [database.md](../../backend/database.md:174).

**Thiết kế có, BE chưa có đối ứng:** `contact_name`, `contact_email`, `contact_phone`, `budget_per_person`, `hotel_rating_requirement`.

**BE có thêm ngoài thiết kế:** `DeletedAt`, `ExpectedBudget`, `IsDeleted`, `Title`.

**Tên gần tương ứng, cần thống nhất:** `user_id` → `CustomerId`; `departure_date` → `StartDate`; `return_date` → `EndDate`; `number_of_participants` → `NumberOfGuests`.

**Lưu ý:** budget_per_person là ngân sách mỗi người; ExpectedBudget trong entity chưa thể khẳng định cùng đơn vị. Vì vậy vẫn liệt kê cả hai, cần chốt nghĩa trước khi chuyển dữ liệu.

### tour_versions — TourVersion

Nguồn: [database.md](../../backend/database.md:205).

**Thiết kế có, BE chưa có đối ứng:** Không.

**BE có thêm ngoài thiết kế:** `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `version` → `VersionNumber`; `change_note` → `ChangeLog`; `tour_snapshot` → `SnapshotData`.

### tour_custom_request_agencies — TourCustomRequestAgency

Nguồn: [database.md](../../backend/database.md:224).

**Thiết kế có, BE chưa có đối ứng:** `is_host`, `stage_area`, `suggested_budget`, `communication_notes`, `assigned_at`, `responded_at`.

**BE có thêm ngoài thiết kế:** `CreatedAt`, `ProposalNotes`, `QuotedPrice`, `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `request_id` → `TourCustomRequestId`.

**Lưu ý:** SuggestedBudget (ngân sách gợi ý), QuotedPrice (báo giá), CommunicationNotes và ProposalNotes khác mục đích; không tự coi là đổi tên.

### bookings — Booking

Nguồn: [database.md](../../backend/database.md:246).

**Thiết kế có, BE chưa có đối ứng:** `design_request_id`, `has_customization`, `original_total_price`, `cancel_reason`, `cancelled_at`.

**BE có thêm ngoài thiết kế:** `DeletedAt`, `DepositAmount`, `EndDate`, `IsDeleted`, `PaidAmount`, `TotalGuests`.

**Tên gần tương ứng, cần thống nhất:** `departure_date` → `StartDate`; `contact_full_name` → `ContactName`; `contact_note` → `SpecialRequests`; `total_price` → `TotalAmount`.

**Lưu ý:** DepositAmount/PaidAmount lưu tổng tiền cọc/đã trả nhưng không thay thế original_total_price hoặc snapshot giá. SpecialRequests được coi là trường gần với contact_note, cần thống nhất hợp đồng API.

### booking_participants — BookingParticipant

Nguồn: [database.md](../../backend/database.md:277).

**Thiết kế có, BE chưa có đối ứng:** `agency_id`, `participant_index`, `is_primary`, `note`, `tier_name`, `price`, `checked_by`, `checked_at`.

**BE có thêm ngoài thiết kế:** `PhoneNumber`.

**Tên gần tương ứng, cần thống nhất:** `identity_card_number` → `IdentityNumber`.

**Lưu ý:** assigned_guide_id trong thiết kế là varchar(36), ghi chú trỏ users.id; BE AssignedGuideId là int? trỏ booking_assigned_guides.Id. Thiếu cả giá chốt từng người và agency/chặng. StatusNote không thay thế note (ăn chay/dị ứng).

### booking_assigned_guides — BookingAssignedGuide

Nguồn: [database.md](../../backend/database.md:313).

**Thiết kế có, BE chưa có đối ứng:** `agency_id`, `assigned_at`.

**BE có thêm ngoài thiết kế:** `CreatedAt`, `Status`, `UpdatedAt`.

**Lưu ý:** AssignedAt chưa được biểu diễn riêng; CreatedAt có thể phản ánh lúc tạo bản ghi nhưng không tự coi là cùng trường nghiệp vụ. BE thêm Status. Thiếu AgencyId để lưu công ty phân công.

### booking_timelines — BookingTimeline

Nguồn: [database.md](../../backend/database.md:337).

**Thiết kế có, BE chưa có đối ứng:** Không.

**BE có thêm ngoài thiết kế:** `Date`, `UpdatedAt`.

### booking_timeline_attractions — BookingTimelineAttraction

Nguồn: [database.md](../../backend/database.md:349).

**Thiết kế có, BE chưa có đối ứng:** `agency_id`, `original_location_name`, `customized_location_name`, `is_customized`, `customer_note`, `price_difference`.

**BE có thêm ngoài thiết kế:** `CreatedAt`, `EstimatedTime`, `Name`, `OrderIndex`, `ServiceId`, `UpdatedAt`.

**Lưu ý:** Name chỉ là một tên, không thể thay đồng thời original_location_name và customized_location_name. ServiceId không thay thế AgencyId.

### booking_timeline_meals — BookingTimelineMeal

Nguồn: [database.md](../../backend/database.md:369).

**Thiết kế có, BE chưa có đối ứng:** `original_restaurant_name`, `customized_restaurant_name`, `provider_id`, `price_difference`, `is_customized`, `customer_note`.

**BE có thêm ngoài thiết kế:** `Cost`, `CreatedAt`, `ServiceId`, `UpdatedAt`.

**Lưu ý:** Cost không tương đương price_difference; ServiceId không tương đương provider_id. Thiếu snapshot nhà hàng gốc và nhà hàng thay thế.

### booking_accommodations — BookingAccommodation

Nguồn: [database.md](../../backend/database.md:392).

**Thiết kế có, BE chưa có đối ứng:** `destination`, `original_hotel_name`, `original_stars`, `customized_hotel_name`, `customized_stars`, `provider_id`, `nights_count`, `price_difference`, `is_customized`, `customer_note`.

**BE có thêm ngoài thiết kế:** `CheckInDate`, `CheckOutDate`, `CreatedAt`, `HotelName`, `ServiceId`, `UpdatedAt`.

**Lưu ý:** HotelName chỉ là một tên, không thể thay đồng thời original_hotel_name và customized_hotel_name. CheckInDate/CheckOutDate không thay thế snapshot số đêm, giá chênh lệch và thông tin tùy biến.

### booking_attraction_checkins — BookingAttractionCheckin

Nguồn: [database.md](../../backend/database.md:418).

**Thiết kế có, BE chưa có đối ứng:** Không.

**BE có thêm ngoài thiết kế:** `Latitude`, `Longitude`.

**Tên gần tương ứng, cần thống nhất:** `checked_at` → `CheckinTime`; `photo_proof_url` → `PhotoUrl`; `notes` → `Note`.

### booking_incidents — BookingIncident

Nguồn: [database.md](../../backend/database.md:446).

**Thiết kế có, BE chưa có đối ứng:** `agency_id`, `incident_type`, `evidence_urls`, `resolved_at`.

**BE có thêm ngoài thiết kế:** `ResolutionNotes`.

**Lưu ý:** ResolutionNotes là ghi chú xử lý, không thay incident_type, evidence_urls hoặc resolved_at.

### payment_requests — PaymentRequest

Nguồn: [database.md](../../backend/database.md:471).

**Thiết kế có, BE chưa có đối ứng:** `description`, `created_by`, `paid_at`.

**BE có thêm ngoài thiết kế:** `Type`, `UpdatedAt`.

### payment_transactions — PaymentTransaction

Nguồn: [database.md](../../backend/database.md:486).

**Thiết kế có, BE chưa có đối ứng:** `payer_name`, `paid_at`.

**BE có thêm ngoài thiết kế:** `BankReference`, `ConfirmedBy`, `CreatedAt`, `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `payment_proof_url` → `ProofImageUrl`.

### booking_price_adjustments — BookingPriceAdjustment

Nguồn: [database.md](../../backend/database.md:502).

**Thiết kế có, BE chưa có đối ứng:** `agency_id`, `previous_total_price`, `new_total_price`.

**BE có thêm ngoài thiết kế:** `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `adjustment_amount` → `Amount`.

**Lưu ý:** Amount gần với adjustment_amount; không có previous_total_price/new_total_price để giữ toàn bộ trước/sau.

### booking_agencies — BookingAgency

Nguồn: [database.md](../../backend/database.md:517).

**Thiết kế có, BE chưa có đối ứng:** `is_host`, `original_amount`, `final_amount`, `payout_transferred_at`, `bank_reference_code`.

**BE có thêm ngoài thiết kế:** `AgreedAmount`, `Role`.

**Lưu ý:** Role có thể diễn tả chủ trì/đối tác nhưng không phải cột is_host; AgreedAmount chưa thể thay cả original_amount và final_amount.

### feedbacks — Feedback

Nguồn: [database.md](../../backend/database.md:545).

**Thiết kế có, BE chưa có đối ứng:** `agency_rating`, `agency_comment`, `images`, `agency_reply`, `replied_at`.

**BE có thêm ngoài thiết kế:** `DeletedAt`, `IsDeleted`.

**Tên gần tương ứng, cần thống nhất:** `overall_rating` → `Rating`; `overall_comment` → `Comment`.

**Lưu ý:** Rating/Comment gần với đánh giá chung; không thay được đánh giá riêng Agency. Entity cho nhiều feedback/booking nếu không có unique BookingId.

### complaints — Complaint

Nguồn: [database.md](../../backend/database.md:577).

**Thiết kế có, BE chưa có đối ứng:** `evidence_urls`, `agency_response`, `agency_responded_at`.

**BE có thêm ngoài thiết kế:** `IsDeleted`.

**Tên gần tương ứng, cần thống nhất:** `customer_id` → `ComplainantId`; `agency_id` → `TargetId`; `subject` → `Title`.

**Lưu ý:** ComplainantId gần với customer_id; TargetId có nghĩa rộng hơn agency_id (Agency/Guide/Provider), cần chốt phạm vi trước khi đổi tên.

### chat_conversations — ChatConversation

Nguồn: [database.md](../../backend/database.md:607).

**Thiết kế có, BE chưa có đối ứng:** Không.

**BE có thêm ngoài thiết kế:** Không.

### chat_messages — ChatMessage

Nguồn: [database.md](../../backend/database.md:622).

**Thiết kế có, BE chưa có đối ứng:** Không.

**BE có thêm ngoài thiết kế:** Không.

### chat_attachments — ChatAttachment

Nguồn: [database.md](../../backend/database.md:642).

**Thiết kế có, BE chưa có đối ứng:** `thumbnail_url`.

**BE có thêm ngoài thiết kế:** `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `file_type` → `ContentType`.

### subscription_plans — SubscriptionPlan

Nguồn: [database.md](../../backend/database.md:668).

**Thiết kế có, BE chưa có đối ứng:** `slug`, `price_monthly`, `price_yearly`, `is_popular`, `sort_order`.

**BE có thêm ngoài thiết kế:** `DurationMonths`, `Features`, `Price`.

**Lưu ý:** Price/DurationMonths chưa biểu diễn đầy đủ hai mức price_monthly/price_yearly.

### agency_subscriptions — AgencySubscription

Nguồn: [database.md](../../backend/database.md:687).

**Thiết kế có, BE chưa có đối ứng:** `billing_cycle`, `price`, `auto_renew`, `cancelled_at`, `cancel_reason`, `last_payment_date`, `next_payment_date`.

**BE có thêm ngoài thiết kế:** Không.

**Tên gần tương ứng, cần thống nhất:** `plan_id` → `SubscriptionPlanId`.

### subscription_payment_history — SubscriptionPaymentHistory

Nguồn: [database.md](../../backend/database.md:711).

**Thiết kế có, BE chưa có đối ứng:** `company_id`, `plan_id`, `payment_method`, `billing_period_start`, `billing_period_end`, `admin_note`.

**BE có thêm ngoài thiết kế:** `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `subscription_id` → `AgencySubscriptionId`; `paid_at` → `PaymentDate`.

**Lưu ý:** PaymentDate gần với paid_at nhưng BE là DateTime không nullable và có giá trị mặc định; thiết kế cho paid_at nullable.

### refund_requests — RefundRequest

Nguồn: [database.md](../../backend/database.md:743).

**Thiết kế có, BE chưa có đối ứng:** `reason_detail`, `evidence_urls`, `original_paid_amount`, `approved_refund_amount`, `refund_fee`, `refund_bank_name`, `refund_account_number`, `refund_account_holder`, `rejection_reason`, `reviewed_at`, `completed_at`.

**BE có thêm ngoài thiết kế:** `Amount`, `ProcessedAt`, `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `review_note` → `AdminNote`.

**Lưu ý:** Amount và ProcessedAt không tự tương đương approved_refund_amount/completed_at; cần chốt nghĩa thời điểm và trạng thái. Reason hiện là chuỗi tự do, thiết kế mô tả mã nguyên nhân + reason_detail riêng.

### system_bank_accounts — SystemBankAccount

Nguồn: [database.md](../../backend/database.md:785).

**Thiết kế có, BE chưa có đối ứng:** `bank_code`, `branch`, `is_default`, `status`, `notes`, `updated_by`.

**BE có thêm ngoài thiết kế:** `IsActive`, `QrTemplate`.

**Tên gần tương ứng, cần thống nhất:** `account_holder` → `AccountHolderName`.

**Lưu ý:** IsActive chỉ là trạng thái bật/tắt; không thay thế is_default (tài khoản ưu tiên). QrTemplate là trường bổ sung.

### system_commission_configs — SystemCommissionConfig

Nguồn: [database.md](../../backend/database.md:805).

**Thiết kế có, BE chưa có đối ứng:** `note`, `applied_from`, `created_by`.

**BE có thêm ngoài thiết kế:** `Name`, `UpdatedAt`.

**Tên gần tương ứng, cần thống nhất:** `commission_rate` → `Percentage`.

**Lưu ý:** Percentage gần với commission_rate; Name không thay note hoặc applied_from.

## Khác biệt kiểu dữ liệu và độ dài

Bao gồm varchar/nvarchar: Unicode là lựa chọn kỹ thuật, không nhất thiết là lỗi. Các khác biệt int/string, text/decimal, date/datetime2 hoặc độ dài mới cần được quyết định rõ. Không tự đổi schema theo bảng này.

| Bảng | Cột thiết kế | Kiểu thiết kế | Property BE | Kiểu SQL từ EF |
|---|---|---|---|---|
| `users` | `id` | `varchar(36)` | `Id` | `nvarchar(36)` |
| `users` | `name` | `varchar(150)` | `Name` | `nvarchar(150)` |
| `users` | `email` | `varchar(191)` | `Email` | `nvarchar(191)` |
| `users` | `phone` | `varchar(30)` | `Phone` | `nvarchar(30)` |
| `users` | `password_hash` | `varchar(255)` | `PasswordHash` | `nvarchar(255)` |
| `users` | `role` | `user_role_enum` | `Role` | `nvarchar(50)` |
| `users` | `avatar` | `varchar(500)` | `Avatar` | `nvarchar(500)` |
| `users` | `status` | `varchar(30)` | `Status` | `nvarchar(30)` |
| `business_profiles` | `user_id` | `int` | `UserId` | `nvarchar(36)` |
| `business_profiles` | `business_name` | `varchar(255)` | `BusinessName` | `nvarchar(255)` |
| `business_profiles` | `tax_code` | `varchar(50)` | `TaxCode` | `nvarchar(50)` |
| `business_profiles` | `status` | `varchar(50)` | `Status` | `nvarchar(50)` |
| `services` | `provider_id` | `varchar(36)` | `ProviderId` | `nvarchar(36)` |
| `services` | `category` | `varchar(50)` | `Category` | `nvarchar(50)` |
| `services` | `sub_category` | `varchar(100)` | `SubCategory` | `nvarchar(100)` |
| `services` | `name` | `varchar(255)` | `Name` | `nvarchar(255)` |
| `services` | `latitude` | `decimal(10,8)` | `Latitude` | `decimal(18,2)` |
| `services` | `longitude` | `decimal(11,8)` | `Longitude` | `decimal(18,2)` |
| `services` | `status` | `varchar(30)` | `Status` | `nvarchar(30)` |
| `tours` | `agency_id` | `int` | `AgencyId` | `nvarchar(36)` |
| `tours` | `tour_code` | `varchar(50)` | `Code` | `nvarchar(50)` |
| `tours` | `name` | `varchar(255)` | `Name` | `nvarchar(255)` |
| `tours` | `destination` | `text` | `Destination` | `nvarchar(255)` |
| `tours` | `departure_location` | `text` | `DepartureLocation` | `nvarchar(255)` |
| `tours` | `operation_period` | `varchar(255)` | `OperationPeriod` | `nvarchar(255)` |
| `tours` | `baseprice` | `text` | `BasePrice` | `decimal(12,2)` |
| `tours` | `status` | `varchar(50)` | `Status` | `nvarchar(50)` |
| `tours` | `visibility` | `varchar(50)` | `Visibility` | `nvarchar(20)` |
| `tour_pricing_tiers` | `tier_name` | `varchar(100)` | `Name` | `nvarchar(100)` |
| `tour_timeline` | `title` | `varchar(255)` | `Title` | `nvarchar(255)` |
| `tourist_attractions` | `name_location` | `text` | `Name` | `nvarchar(255)` |
| `tour_meals` | `meal_type` | `varchar(20)` | `MealType` | `nvarchar(50)` |
| `tour_meals` | `restaurant_name` | `text` | `RestaurantName` | `nvarchar(255)` |
| `tour_meals` | `price_difference` | `decimal(12,2)` | `PriceDifference` | `decimal(19,2)` |
| `tour_accommodations` | `destination_name` | `varchar(255)` | `DestinationName` | `nvarchar(255)` |
| `tour_accommodations` | `hotel_name` | `varchar(255)` | `HotelName` | `nvarchar(255)` |
| `tour_accommodations` | `price_difference` | `decimal(12,2)` | `PriceDifference` | `decimal(19,2)` |
| `tour_custom_requests` | `user_id` | `varchar(36)` | `CustomerId` | `nvarchar(36)` |
| `tour_custom_requests` | `destination` | `varchar(255)` | `Destination` | `nvarchar(max)` |
| `tour_custom_requests` | `departure_date` | `date` | `StartDate` | `datetime2` |
| `tour_custom_requests` | `return_date` | `date` | `EndDate` | `datetime2` |
| `tour_custom_requests` | `status` | `varchar(50)` | `Status` | `nvarchar(50)` |
| `tour_versions` | `price` | `decimal(12,2)` | `Price` | `decimal(19,2)` |
| `tour_versions` | `created_by` | `varchar(36)` | `CreatedBy` | `nvarchar(36)` |
| `tour_custom_request_agencies` | `agency_id` | `int` | `AgencyId` | `nvarchar(36)` |
| `tour_custom_request_agencies` | `status` | `varchar(50)` | `Status` | `nvarchar(max)` |
| `bookings` | `booking_code` | `varchar(50)` | `BookingCode` | `nvarchar(50)` |
| `bookings` | `customer_id` | `varchar(36)` | `CustomerId` | `nvarchar(36)` |
| `bookings` | `departure_date` | `date` | `StartDate` | `datetime2` |
| `bookings` | `contact_full_name` | `varchar(150)` | `ContactName` | `nvarchar(max)` |
| `bookings` | `contact_phone` | `varchar(30)` | `ContactPhone` | `nvarchar(max)` |
| `bookings` | `contact_email` | `varchar(191)` | `ContactEmail` | `nvarchar(max)` |
| `bookings` | `payment_status` | `varchar(30)` | `PaymentStatus` | `nvarchar(30)` |
| `bookings` | `status` | `varchar(20)` | `Status` | `nvarchar(30)` |
| `booking_participants` | `full_name` | `varchar(150)` | `FullName` | `nvarchar(150)` |
| `booking_participants` | `date_of_birth` | `date` | `DateOfBirth` | `datetime2` |
| `booking_participants` | `gender` | `varchar(20)` | `Gender` | `nvarchar(max)` |
| `booking_participants` | `identity_card_number` | `varchar(50)` | `IdentityNumber` | `nvarchar(max)` |
| `booking_participants` | `assigned_guide_id` | `varchar(36)` | `AssignedGuideId` | `int` |
| `booking_participants` | `attendance_status` | `varchar(50)` | `AttendanceStatus` | `nvarchar(50)` |
| `booking_participants` | `status` | `varchar(20)` | `Status` | `nvarchar(max)` |
| `booking_assigned_guides` | `guide_id` | `varchar(36)` | `GuideId` | `nvarchar(36)` |
| `booking_assigned_guides` | `role` | `varchar(50)` | `Role` | `nvarchar(max)` |
| `booking_timelines` | `title` | `varchar(255)` | `Title` | `nvarchar(max)` |
| `booking_timeline_attractions` | `status` | `varchar(30)` | `Status` | `nvarchar(max)` |
| `booking_timeline_meals` | `meal_type` | `varchar(20)` | `MealType` | `nvarchar(50)` |
| `booking_timeline_meals` | `status` | `varchar(30)` | `Status` | `nvarchar(max)` |
| `booking_accommodations` | `status` | `varchar(30)` | `Status` | `nvarchar(max)` |
| `booking_attraction_checkins` | `guide_id` | `varchar(36)` | `GuideId` | `nvarchar(36)` |
| `booking_attraction_checkins` | `agency_id` | `varchar(36)` | `AgencyId` | `nvarchar(max)` |
| `booking_attraction_checkins` | `attendance_status` | `varchar(30)` | `AttendanceStatus` | `nvarchar(30)` |
| `booking_incidents` | `reported_by` | `varchar(36)` | `ReportedBy` | `nvarchar(36)` |
| `booking_incidents` | `title` | `varchar(255)` | `Title` | `nvarchar(255)` |
| `booking_incidents` | `status` | `varchar(30)` | `Status` | `nvarchar(30)` |
| `payment_requests` | `due_date` | `date` | `DueDate` | `datetime2` |
| `payment_requests` | `status` | `varchar(30)` | `Status` | `nvarchar(30)` |
| `payment_transactions` | `transaction_code` | `varchar(100)` | `TransactionCode` | `nvarchar(100)` |
| `payment_transactions` | `payment_method` | `varchar(50)` | `PaymentMethod` | `nvarchar(max)` |
| `payment_transactions` | `status` | `varchar(30)` | `Status` | `nvarchar(30)` |
| `booking_price_adjustments` | `adjusted_by` | `varchar(36)` | `AdjustedBy` | `nvarchar(36)` |
| `booking_agencies` | `agency_id` | `varchar(36)` | `AgencyId` | `nvarchar(36)` |
| `booking_agencies` | `settlement_status` | `varchar(30)` | `SettlementStatus` | `nvarchar(30)` |
| `feedbacks` | `customer_id` | `varchar(36)` | `CustomerId` | `nvarchar(36)` |
| `feedbacks` | `agency_id` | `varchar(36)` | `AgencyId` | `nvarchar(36)` |
| `feedbacks` | `status` | `varchar(30)` | `Status` | `nvarchar(30)` |
| `complaints` | `customer_id` | `varchar(36)` | `ComplainantId` | `nvarchar(36)` |
| `complaints` | `agency_id` | `varchar(36)` | `TargetId` | `nvarchar(36)` |
| `complaints` | `subject` | `varchar(255)` | `Title` | `nvarchar(255)` |
| `complaints` | `admin_id` | `varchar(36)` | `AdminId` | `nvarchar(36)` |
| `complaints` | `status` | `varchar(30)` | `Status` | `nvarchar(30)` |
| `chat_conversations` | `user_one_id` | `varchar(36)` | `UserOneId` | `nvarchar(36)` |
| `chat_conversations` | `user_two_id` | `varchar(36)` | `UserTwoId` | `nvarchar(36)` |
| `chat_conversations` | `last_message_sender_id` | `varchar(36)` | `LastMessageSenderId` | `nvarchar(max)` |
| `chat_conversations` | `status` | `varchar(20)` | `Status` | `nvarchar(20)` |
| `chat_messages` | `sender_id` | `varchar(36)` | `SenderId` | `nvarchar(36)` |
| `chat_messages` | `content_type` | `varchar(20)` | `ContentType` | `nvarchar(20)` |
| `chat_attachments` | `file_name` | `varchar(255)` | `FileName` | `nvarchar(max)` |
| `chat_attachments` | `file_url` | `text` | `FileUrl` | `nvarchar(500)` |
| `chat_attachments` | `file_type` | `varchar(50)` | `ContentType` | `nvarchar(max)` |
| `chat_attachments` | `file_size` | `int` | `FileSize` | `bigint` |
| `subscription_plans` | `name` | `varchar(100)` | `Name` | `nvarchar(100)` |
| `subscription_plans` | `status` | `varchar(20)` | `Status` | `nvarchar(max)` |
| `agency_subscriptions` | `agency_id` | `varchar(36)` | `AgencyId` | `nvarchar(36)` |
| `agency_subscriptions` | `start_date` | `date` | `StartDate` | `datetime2` |
| `agency_subscriptions` | `end_date` | `date` | `EndDate` | `datetime2` |
| `agency_subscriptions` | `status` | `varchar(30)` | `Status` | `nvarchar(30)` |
| `subscription_payment_history` | `transaction_code` | `varchar(100)` | `TransactionCode` | `nvarchar(max)` |
| `subscription_payment_history` | `status` | `varchar(30)` | `Status` | `nvarchar(max)` |
| `refund_requests` | `requested_by` | `varchar(36)` | `RequestedBy` | `nvarchar(36)` |
| `refund_requests` | `reason` | `varchar(50)` | `Reason` | `nvarchar(max)` |
| `refund_requests` | `status` | `varchar(30)` | `Status` | `nvarchar(30)` |
| `refund_requests` | `reviewed_by` | `varchar(36)` | `ReviewedBy` | `nvarchar(36)` |
| `system_bank_accounts` | `bank_name` | `varchar(150)` | `BankName` | `nvarchar(100)` |
| `system_bank_accounts` | `account_number` | `varchar(50)` | `AccountNumber` | `nvarchar(50)` |
| `system_bank_accounts` | `account_holder` | `varchar(150)` | `AccountHolderName` | `nvarchar(150)` |

## Khác biệt NULL/NOT NULL

Tài liệu không ghi `[not null]` được đọc là nullable. Vì nhiều cột tài liệu chưa ghi rõ ràng buộc, đây là khác biệt cần chốt, không kết luận tất cả là lỗi.

| Bảng | Cột thiết kế | Thiết kế | Property BE | EF |
|---|---|---|---|---|
| `business_profiles` | `user_id` | `NULL` | `UserId` | `NOT NULL` |
| `business_profiles` | `status` | `NULL` | `Status` | `NOT NULL` |
| `business_profiles` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `business_profiles` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `services` | `status` | `NULL` | `Status` | `NOT NULL` |
| `services` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `services` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `tours` | `agency_id` | `NULL` | `AgencyId` | `NOT NULL` |
| `tours` | `name` | `NULL` | `Name` | `NOT NULL` |
| `tours` | `duration_days` | `NULL` | `DurationDays` | `NOT NULL` |
| `tours` | `duration_nights` | `NULL` | `DurationNights` | `NOT NULL` |
| `tours` | `baseprice` | `NULL` | `BasePrice` | `NOT NULL` |
| `tours` | `status` | `NULL` | `Status` | `NOT NULL` |
| `tours` | `visibility` | `NULL` | `Visibility` | `NOT NULL` |
| `tours` | `is_request` | `NULL` | `IsRequest` | `NOT NULL` |
| `tours` | `version` | `NULL` | `Version` | `NOT NULL` |
| `tours` | `is_ai_generated` | `NULL` | `IsAiGenerated` | `NOT NULL` |
| `tours` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `tours` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `tour_pricing_tiers` | `tour_id` | `NULL` | `TourId` | `NOT NULL` |
| `tour_pricing_tiers` | `tier_name` | `NULL` | `Name` | `NOT NULL` |
| `tour_pricing_tiers` | `price` | `NULL` | `PricePerGuest` | `NOT NULL` |
| `tour_pricing_tiers` | `display_order` | `NULL` | `DisplayOrder` | `NOT NULL` |
| `tour_timeline` | `tour_id` | `NULL` | `TourId` | `NOT NULL` |
| `tour_timeline` | `day_number` | `NULL` | `DayNumber` | `NOT NULL` |
| `tourist_attractions` | `tour_timeline_id` | `NULL` | `TourTimelineId` | `NOT NULL` |
| `tourist_attractions` | `name_location` | `NULL` | `Name` | `NOT NULL` |
| `tour_meals` | `restaurant_name` | `NOT NULL` | `RestaurantName` | `NULL` |
| `tour_meals` | `is_default` | `NULL` | `IsDefault` | `NOT NULL` |
| `tour_meals` | `price_difference` | `NULL` | `PriceDifference` | `NOT NULL` |
| `tour_meals` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `tour_meals` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `tour_accommodations` | `destination_name` | `NOT NULL` | `DestinationName` | `NULL` |
| `tour_accommodations` | `hotel_name` | `NOT NULL` | `HotelName` | `NULL` |
| `tour_accommodations` | `star_rating` | `NULL` | `StarRating` | `NOT NULL` |
| `tour_accommodations` | `nights_count` | `NULL` | `NightsCount` | `NOT NULL` |
| `tour_accommodations` | `is_default` | `NULL` | `IsDefault` | `NOT NULL` |
| `tour_accommodations` | `price_difference` | `NULL` | `PriceDifference` | `NOT NULL` |
| `tour_accommodations` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `tour_accommodations` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `tour_custom_requests` | `user_id` | `NULL` | `CustomerId` | `NOT NULL` |
| `tour_custom_requests` | `destination` | `NOT NULL` | `Destination` | `NULL` |
| `tour_custom_requests` | `departure_date` | `NOT NULL` | `StartDate` | `NULL` |
| `tour_custom_requests` | `number_of_participants` | `NULL` | `NumberOfGuests` | `NOT NULL` |
| `tour_custom_requests` | `status` | `NULL` | `Status` | `NOT NULL` |
| `tour_custom_requests` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `tour_custom_requests` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `tour_versions` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `tour_custom_request_agencies` | `status` | `NULL` | `Status` | `NOT NULL` |
| `bookings` | `customer_id` | `NULL` | `CustomerId` | `NOT NULL` |
| `bookings` | `contact_full_name` | `NOT NULL` | `ContactName` | `NULL` |
| `bookings` | `contact_phone` | `NOT NULL` | `ContactPhone` | `NULL` |
| `bookings` | `contact_email` | `NOT NULL` | `ContactEmail` | `NULL` |
| `bookings` | `payment_status` | `NULL` | `PaymentStatus` | `NOT NULL` |
| `bookings` | `status` | `NULL` | `Status` | `NOT NULL` |
| `bookings` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `bookings` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `booking_participants` | `attendance_status` | `NULL` | `AttendanceStatus` | `NOT NULL` |
| `booking_participants` | `status` | `NULL` | `Status` | `NOT NULL` |
| `booking_participants` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `booking_participants` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `booking_timelines` | `title` | `NOT NULL` | `Title` | `NULL` |
| `booking_timelines` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `booking_timeline_attractions` | `status` | `NULL` | `Status` | `NOT NULL` |
| `booking_timeline_meals` | `status` | `NULL` | `Status` | `NOT NULL` |
| `booking_accommodations` | `status` | `NULL` | `Status` | `NOT NULL` |
| `booking_attraction_checkins` | `agency_id` | `NOT NULL` | `AgencyId` | `NULL` |
| `booking_attraction_checkins` | `attendance_status` | `NULL` | `AttendanceStatus` | `NOT NULL` |
| `booking_attraction_checkins` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `booking_attraction_checkins` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `booking_incidents` | `status` | `NULL` | `Status` | `NOT NULL` |
| `booking_incidents` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `booking_incidents` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `payment_requests` | `status` | `NULL` | `Status` | `NOT NULL` |
| `payment_requests` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `payment_transactions` | `status` | `NULL` | `Status` | `NOT NULL` |
| `booking_price_adjustments` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `booking_agencies` | `platform_fee` | `NULL` | `PlatformFee` | `NOT NULL` |
| `booking_agencies` | `net_payout` | `NULL` | `NetPayout` | `NOT NULL` |
| `booking_agencies` | `settlement_status` | `NULL` | `SettlementStatus` | `NOT NULL` |
| `booking_agencies` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `booking_agencies` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `feedbacks` | `status` | `NULL` | `Status` | `NOT NULL` |
| `feedbacks` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `feedbacks` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `complaints` | `status` | `NULL` | `Status` | `NOT NULL` |
| `complaints` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `complaints` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `chat_conversations` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `chat_conversations` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `chat_messages` | `is_read` | `NULL` | `IsRead` | `NOT NULL` |
| `chat_messages` | `is_edited` | `NULL` | `IsEdited` | `NOT NULL` |
| `chat_messages` | `is_deleted` | `NULL` | `IsDeleted` | `NOT NULL` |
| `chat_messages` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `chat_messages` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `chat_attachments` | `file_name` | `NOT NULL` | `FileName` | `NULL` |
| `chat_attachments` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `subscription_plans` | `status` | `NULL` | `Status` | `NOT NULL` |
| `subscription_plans` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `subscription_plans` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `agency_subscriptions` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `agency_subscriptions` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `subscription_payment_history` | `paid_at` | `NULL` | `PaymentDate` | `NOT NULL` |
| `subscription_payment_history` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `refund_requests` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `system_bank_accounts` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |
| `system_bank_accounts` | `updated_at` | `NULL` | `UpdatedAt` | `NOT NULL` |
| `system_commission_configs` | `is_active` | `NULL` | `IsActive` | `NOT NULL` |
| `system_commission_configs` | `created_at` | `NULL` | `CreatedAt` | `NOT NULL` |

## UNIQUE/index được khai báo trong thiết kế nhưng EF thiếu hoặc khác

| Bảng | Cột | Yêu cầu | Kết quả |
|---|---|---|---|
| tour_custom_request_agencies | request_id, agency_id | UNIQUE | Không có ràng buộc tương ứng trong EF |
| booking_participants | booking_id, agency_id, participant_index | UNIQUE | Không có ràng buộc tương ứng trong EF |
| booking_assigned_guides | booking_id, guide_id | UNIQUE | Không có ràng buộc tương ứng trong EF |
| booking_attraction_checkins | booking_timeline_attraction_id, guide_id | UNIQUE | Không có ràng buộc tương ứng trong EF |
| payment_transactions | transaction_code | UNIQUE | Không có ràng buộc tương ứng trong EF |
| booking_agencies | booking_id, agency_id | UNIQUE | Không có ràng buộc tương ứng trong EF |
| feedbacks | booking_id | UNIQUE | Không có ràng buộc tương ứng trong EF |
| subscription_plans | slug | UNIQUE | Không có ràng buộc tương ứng trong EF |

## Quan hệ Ref trong thiết kế chưa khớp mapping EF

Chỉ kiểm Ref được khai báo rõ ràng trong file, không tự suy diễn mọi ghi chú FK là Ref. Quan hệ thiếu do thiếu cột vẫn được liệt kê để truy vết.

| Nguồn | Đích | Kết quả |
|---|---|---|
| tour_pricing_tiers.agency_id | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| booking_assigned_guides.agency_id | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| booking_timeline_meals.provider_id | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| booking_accommodations.provider_id | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| booking_attraction_checkins.agency_id | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| booking_incidents.agency_id | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| chat_conversations.last_message_sender_id | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| chat_messages.reply_to_message_id | chat_messages.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| subscription_payment_history.company_id | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| subscription_payment_history.plan_id | subscription_plans.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| system_bank_accounts.updated_by | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| system_commission_configs.created_by | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| payment_requests.created_by | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| booking_participants.checked_by | users.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| bookings.design_request_id | tour_custom_requests.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| tour_accommodations.tour_id | tours.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |
| tours.custom_request_id | tour_custom_requests.id | Thiếu cột hoặc chưa có FK tương ứng trong EF |

## Tất cả FK hiện có trong EF (kể cả quan hệ ngoài thiết kế)

| Bảng | Property FK | Bảng đích | Cột đích | Delete behavior |
|---|---|---|---|---|
| agency_subscriptions | AgencyId | users | Id | Restrict |
| agency_subscriptions | SubscriptionPlanId | subscription_plans | Id | Restrict |
| bookings | CustomerId | users | Id | Restrict |
| bookings | TourId | tours | Id | SetNull |
| booking_accommodations | BookingId | bookings | Id | Cascade |
| booking_accommodations | ServiceId | services | Id | SetNull |
| booking_agencies | AgencyId | users | Id | Restrict |
| booking_agencies | BookingId | bookings | Id | Cascade |
| booking_assigned_guides | BookingId | bookings | Id | Cascade |
| booking_assigned_guides | GuideId | users | Id | Restrict |
| booking_attraction_checkins | BookingTimelineAttractionId | booking_timeline_attractions | Id | Cascade |
| booking_attraction_checkins | GuideId | users | Id | Restrict |
| booking_incidents | BookingId | bookings | Id | Cascade |
| booking_incidents | ReportedBy | users | Id | Restrict |
| booking_participants | AssignedGuideId | booking_assigned_guides | Id | NoAction |
| booking_participants | BookingId | bookings | Id | Cascade |
| booking_price_adjustments | AdjustedBy | users | Id | Restrict |
| booking_price_adjustments | BookingId | bookings | Id | Cascade |
| booking_timelines | BookingId | bookings | Id | Cascade |
| booking_timeline_attractions | BookingTimelineId | booking_timelines | Id | Cascade |
| booking_timeline_attractions | ServiceId | services | Id | SetNull |
| booking_timeline_meals | BookingTimelineId | booking_timelines | Id | Cascade |
| booking_timeline_meals | ServiceId | services | Id | SetNull |
| business_profiles | UserId | users | Id | Cascade |
| chat_attachments | MessageId | chat_messages | Id | Cascade |
| chat_conversations | UserOneId | users | Id | Restrict |
| chat_conversations | UserTwoId | users | Id | Restrict |
| chat_messages | ConversationId | chat_conversations | Id | Cascade |
| chat_messages | SenderId | users | Id | Restrict |
| complaints | AdminId | users | Id | SetNull |
| complaints | BookingId | bookings | Id | Cascade |
| complaints | ComplainantId | users | Id | Restrict |
| complaints | TargetId | users | Id | Restrict |
| feedbacks | AgencyId | users | Id | Restrict |
| feedbacks | BookingId | bookings | Id | Cascade |
| feedbacks | CustomerId | users | Id | Restrict |
| payment_requests | BookingId | bookings | Id | Cascade |
| payment_transactions | BookingId | bookings | Id | Cascade |
| payment_transactions | ConfirmedBy | users | Id | SetNull |
| payment_transactions | PaymentRequestId | payment_requests | Id | NoAction |
| refund_requests | BookingId | bookings | Id | Cascade |
| refund_requests | RequestedBy | users | Id | Restrict |
| refund_requests | ReviewedBy | users | Id | SetNull |
| services | ProviderId | users | Id | Restrict |
| subscription_payment_history | AgencySubscriptionId | agency_subscriptions | Id | Cascade |
| tours | AgencyId | users | Id | Restrict |
| tours | ReviewedBy | users | Id | Restrict |
| tour_accommodations | TourTimelineId | tour_timeline | Id | Cascade |
| tour_custom_requests | CustomerId | users | Id | Restrict |
| tour_custom_request_agencies | AgencyId | users | Id | Restrict |
| tour_custom_request_agencies | TourCustomRequestId | tour_custom_requests | Id | Cascade |
| tour_meals | TourTimelineId | tour_timeline | Id | Cascade |
| tour_pricing_tiers | TourId | tours | Id | Cascade |
| tour_timeline | TourId | tours | Id | Cascade |
| tour_versions | CreatedBy | users | Id | Restrict |
| tour_versions | TourId | tours | Id | Cascade |
| tourist_attractions | TourTimelineId | tour_timeline | Id | Cascade |

## Những điểm cần chốt trong chính database.md

- `business_profiles.user_id`, `tours.agency_id`, `tour_custom_request_agencies.agency_id` là `int` nhưng Ref tới `users.id varchar(36)`. BE dùng string cho các user ID này; không nên đổi BE sang int theo tài liệu khi chưa sửa tính nhất quán của thiết kế.
- `tours.baseprice` là `text`, trong khi BE là `decimal(12,2)`. Đây là dữ liệu tiền, cần thống nhất kiểu số.
- `booking_participants.assigned_guide_id` ghi chú trỏ `users.id`, nhưng không có Ref tương ứng trong file; BE trỏ `booking_assigned_guides.Id`. Hai mô hình khác nhau.
- `user_role_enum` được dùng nhưng file không định nghĩa Enum tương ứng. Các miền status/role và hoa/thường trong ghi chú chưa được đối chiếu như enum máy đọc được.
- `subscription_payment_history.subscription_id` ghi chú tới `company_subscriptions`, trong khi Ref và tên bảng thực tế dùng `agency_subscriptions`.
- Default trong DBML không đồng nghĩa default constraint của EF. Nhiều mặc định BE nằm trong initializer C# hoặc SaveChanges; cần thống nhất nếu có ghi SQL trực tiếp. Báo cáo này chưa kết luận đầy đủ tương đương về default/check constraint hoặc toàn bộ validation service.

## Hướng xử lý

1. Chốt các mâu thuẫn ngay trong database.md và bảng ánh xạ tên/nghĩa.
2. Ưu tiên BookingParticipant, BookingAssignedGuide, snapshot tùy biến booking và liên minh trước khi mở rộng luồng vận hành.
3. Sau đó đồng bộ tài chính, đánh giá/khiếu nại, chat/subscription theo phạm vi nhóm thống nhất.
4. Khi đã chốt mới sửa entity/mapping, DTO/service/FE và tạo migration mới; không sửa lại migration đã chạy chỉ để che khác biệt.
5. Chạy lại kiểm tra schema và test nghiệp vụ sau triển khai. Hiện báo cáo không thực hiện các thay đổi đó.

## Miền trạng thái cần đồng bộ

- `services.status`: thiết kế mô tả PENDING/APPROVED/REJECTED/HIDDEN; BE ServiceStatus là Active/Draft/Hidden/Suspended/Approved, thiếu Pending/Rejected và có thêm Active/Draft/Suspended.
- `bookings.status`: ghi chú thiết kế liệt kê pending/confirmed/completed/cancelled/rejected; BE còn có Deposited/Paid/InProgress. Cần cập nhật thiết kế hoặc quyết định lại state machine, không tự xóa trạng thái đang được service sử dụng.
- `booking_assigned_guides.role`: thiết kế mô tả lead_guide/stage_guide/support_guide/logistics; entity là string mặc định Lead, luồng phân công hiện tại dùng Lead/Assistant. Cần bảng ánh xạ thống nhất.

## Tất cả index hiện có trong EF

| Bảng | Property | UNIQUE | Filter |
|---|---|---|---|
| agency_subscriptions | AgencyId | Không | — |
| agency_subscriptions | SubscriptionPlanId | Không | — |
| bookings | BookingCode | Có | — |
| bookings | CustomerId | Không | — |
| bookings | TourId | Không | — |
| booking_accommodations | BookingId | Không | — |
| booking_accommodations | ServiceId | Không | — |
| booking_agencies | AgencyId | Không | — |
| booking_agencies | BookingId | Không | — |
| booking_assigned_guides | BookingId | Không | — |
| booking_assigned_guides | GuideId | Không | — |
| booking_attraction_checkins | BookingTimelineAttractionId | Không | — |
| booking_attraction_checkins | GuideId | Không | — |
| booking_incidents | BookingId | Không | — |
| booking_incidents | ReportedBy | Không | — |
| booking_participants | AssignedGuideId | Không | — |
| booking_participants | BookingId | Không | — |
| booking_price_adjustments | AdjustedBy | Không | — |
| booking_price_adjustments | BookingId | Không | — |
| booking_timelines | BookingId | Không | — |
| booking_timeline_attractions | BookingTimelineId | Không | — |
| booking_timeline_attractions | ServiceId | Không | — |
| booking_timeline_meals | BookingTimelineId | Không | — |
| booking_timeline_meals | ServiceId | Không | — |
| business_profiles | UserId | Có | — |
| chat_attachments | MessageId | Không | — |
| chat_conversations | UserOneId | Không | — |
| chat_conversations | UserTwoId | Không | — |
| chat_messages | ConversationId | Không | — |
| chat_messages | SenderId | Không | — |
| complaints | AdminId | Không | — |
| complaints | BookingId | Không | — |
| complaints | ComplainantId | Không | — |
| complaints | TargetId | Không | — |
| feedbacks | AgencyId | Không | — |
| feedbacks | BookingId | Không | — |
| feedbacks | CustomerId | Không | — |
| payment_requests | BookingId | Không | — |
| payment_transactions | BookingId | Không | — |
| payment_transactions | ConfirmedBy | Không | — |
| payment_transactions | PaymentRequestId | Không | — |
| refund_requests | BookingId | Không | — |
| refund_requests | RequestedBy | Không | — |
| refund_requests | ReviewedBy | Không | — |
| services | ProviderId | Không | — |
| subscription_payment_history | AgencySubscriptionId | Không | — |
| tours | AgencyId | Không | — |
| tours | ReviewedBy | Không | — |
| tour_accommodations | TourTimelineId | Không | — |
| tour_custom_requests | CustomerId | Không | — |
| tour_custom_request_agencies | AgencyId | Không | — |
| tour_custom_request_agencies | TourCustomRequestId | Không | — |
| tour_meals | TourTimelineId | Không | — |
| tour_pricing_tiers | TourId | Không | — |
| tour_timeline | TourId | Không | — |
| tour_versions | CreatedBy | Không | — |
| tour_versions | TourId, VersionNumber | Có | — |
| tourist_attractions | TourTimelineId | Không | — |
| users | Email | Có | — |
