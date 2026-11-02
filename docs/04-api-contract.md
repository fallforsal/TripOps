# 04. Đặc Tả Hợp Đồng Giao Tiếp API (Target REST API Contract)

> [!IMPORTANT]
> **Trạng thái triển khai: THIẾT KẾ MỤC TIÊU (TARGET DESIGN — CHƯA IMPLEMENT)**
> Toàn bộ các REST API trong tài liệu này là **thiết kế hợp đồng chuẩn (Contract-First Specification)** để 4 thành viên Backend triển khai và thay thế hoàn toàn tầng Mock Data hiện tại trên Frontend. Hiện tại trong repository chưa có mã nguồn Backend.

---

## 1. Quy Ước Chung Của API (Shared API Conventions)

### 1.1. Base URL, Versioning & Định dạng Dữ liệu
- **Base Path:** `/api/v1`
- **Content-Type:** `application/json; charset=utf-8` (trừ endpoint upload file dùng `multipart/form-data`).
- **Quy ước đặt tên trường JSON:** `camelCase` cho tất cả Request/Response DTO (ánh xạ sang cột `snake_case` trong Database tại [`docs/03-database-design.md`](file:///c:/Users/Admin/Documents/GitHub/TripOpsFE/docs/03-database-design.md)).
- **Quy ước kiểu dữ liệu trên JSON:**
  - **ID:** Chuỗi UUID v4 (`string`).
  - **Tiền tệ (VNĐ):** Số nguyên đồng (`integer` / `long`, ví dụ `160000000`), không có phần thập phân.
  - **Ngày giờ:** Chuỗi chuẩn ISO-8601 UTC (`"2026-11-15T08:30:00Z"`) cho timestamp, và `"YYYY-MM-DD"` cho ngày dương lịch (`departureDate`, `dateOfBirth`).

### 1.2. Xác thực (Authentication) & Phân quyền (RBAC)
- **Header xác thực:** `Authorization: Bearer <access_token>`
- **JWT Claims bắt buộc:** `sub` (`userId`), `role` (`USER` | `AGENCY_ADMIN` | `PROVIDER` | `GUIDE` | `ADMIN`), `businessProfileId` (nếu là `AGENCY_ADMIN` hoặc `PROVIDER`), `guideProfileId` (nếu là `GUIDE`).

### 1.3. Cấu trúc Response & Error Chuẩn
```json
// Thành công (200 OK / 201 Created)
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 42,
    "totalPages": 5
  },
  "timestamp": "2026-11-01T09:00:00Z"
}

// Lỗi (4xx / 5xx)
{
  "success": false,
  "error": {
    "code": "QUOTATION_EXPIRED",
    "message": "Báo giá phiên bản v2 đã hết hạn hiệu lực vào 2026-10-30T17:00:00Z. Vui lòng yêu cầu công ty lữ hành cập nhật phiên bản báo giá mới.",
    "details": [
      { "field": "quotationVersionId", "issue": "Expired at 2026-10-30T17:00:00Z" }
    ]
  },
  "timestamp": "2026-11-01T09:00:00Z"
}
```

### 1.4. Bảng Mã Lỗi Nghiệp Vụ Chuẩn (Standard Business Error Codes)
| HTTP Status | Error Code | Ý nghĩa nghiệp vụ |
| :---: | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Dữ liệu đầu vào không hợp lệ (ví dụ: ngày khởi hành cách hiện tại $< 3$ ngày, số khách vượt `maxGuests`). |
| `401` | `UNAUTHORIZED` | Chưa đăng nhập hoặc JWT hết hạn. |
| `403` | `FORBIDDEN_ROLE` | Vai trò hiện tại không có quyền gọi endpoint này. |
| `403` | `BUSINESS_NOT_APPROVED` | Tài khoản Agency / Platform Partner chưa được Admin duyệt (`approval_status != 'APPROVED'`). |
| `403` | `SUPPLIER_OWNERSHIP_VIOLATION` | Cố tình truy cập hoặc sử dụng `agency_supplier_id` thuộc về một Agency khác. |
| `403` | `NOT_LEAD_AGENCY` | Local Co-Host Agency cố tình thực hiện thao tác chỉ dành cho Lead Agency (ví dụ: chốt Booking với khách, sửa tổng giá bán). |
| `409` | `INVALID_STATUS_TRANSITION` | Chuyển trạng thái sai quy trình (ví dụ: quyết toán khi `booking.status != 'COMPLETED'`). |
| `409` | `PARTNER_RESERVATIONS_UNCONFIRMED` | Lead Agency bấm xác nhận Booking khi vẫn còn phiếu đặt chỗ đối tác chưa được `CONFIRMED`. |
| `409` | `QUOTATION_EXPIRED` | Customer bấm chấp nhận một phiên bản báo giá đã quá hạn `valid_until`. |
| `409` | `SETTLEMENT_ON_HOLD_DISPUTE` | Không thể giải ngân quyết toán cho chặng đang có cờ tranh chấp/vi phạm (`settlement_hold_flag = true`). |
| `422` | `ADVANCE_LIMIT_EXCEEDED` | Số tiền yêu cầu tạm ứng vượt quá hạn mức cho phép ($\le 70\%$ số tiền khách đã nộp thuộc phạm vi chặng). |

---

## 2. Phân Hệ 1 (Member 1): Auth, Hồ Sơ Pháp Nhân, Địa Điểm, Dịch Vụ Partner & Danh Bạ Supplier Riêng

### 2.1. Xác thực & Quản lý Tài khoản (`users`, `business_profiles`, `guide_profiles`)

| Method & Path | Actor / Role | Mô tả & Quy tắc trạng thái |
| :--- | :--- | :--- |
| `POST /api/v1/auth/register` | Public | Đăng ký tài khoản (`USER`, `AGENCY_ADMIN`, `PROVIDER`). Nếu là `USER` $\rightarrow$ `account_status = 'ACTIVE'`; nếu là `AGENCY_ADMIN` / `PROVIDER` $\rightarrow$ yêu cầu nộp hồ sơ pháp nhân. |
| `POST /api/v1/auth/login` | Public | Đăng nhập bằng `email`, `password` $\rightarrow$ trả về `accessToken`, `refreshToken`, `user`, `businessProfile`. Từ chối nếu `is_locked = true`. |
| `GET /api/v1/auth/me` | Authenticated | Lấy thông tin người dùng hiện tại và trạng thái hồ sơ doanh nghiệp/HDV. |
| `POST /api/v1/business-profiles/onboarding` | `AGENCY_ADMIN`, `PROVIDER` | Nộp hoặc nộp lại hồ sơ pháp nhân (`businessName`, `taxCode`, `licenseNumber`, `licenseFileUrl`, `provinceId`, `bankAccountNumber`...). Chuyển `approval_status` $\rightarrow$ `PENDING`. |
| `GET /api/v1/admin/business-profiles` | `ADMIN` | Danh sách hồ sơ đối tác (`type=AGENCY\|PROVIDER`, `status=PENDING\|APPROVED\|REJECTED\|SUSPENDED`, `search`). |
| `PATCH /api/v1/admin/business-profiles/{id}/approve` | `ADMIN` | Phê duyệt pháp nhân: `PENDING` $\rightarrow$ `APPROVED` (lưu `approvalNote`, `approvedAt`). Mở khóa quyền đăng tour/dịch vụ. |
| `PATCH /api/v1/admin/business-profiles/{id}/reject` | `ADMIN` | Từ chối pháp nhân: `PENDING` $\rightarrow$ `REJECTED` (bắt buộc có `rejectionReason`). |
| `GET /api/v1/admin/users` | `ADMIN` | Danh sách tài khoản người dùng trên hệ thống. |
| `PATCH /api/v1/admin/users/{id}/lock-status` | `ADMIN` | Khóa / Mở khóa tài khoản (`{ "isLocked": true, "reason": "..." }`) — lưu bền vững vào `users.is_locked`. |
| `GET /api/v1/agency/guides` | `AGENCY_ADMIN` | Danh sách Hướng dẫn viên thuộc `agency_id` của mình (`guide_profiles`). |
| `POST /api/v1/agency/guides` | `AGENCY_ADMIN` | Tạo tài khoản + hồ sơ HDV nội bộ (`guideCardNumber`, `cardType`, `languages`, `experienceYears`). |
| `PUT /api/v1/agency/guides/{id}` | `AGENCY_ADMIN` | Cập nhật thông tin HDV hoặc đổi `availability_status` (`ACTIVE` $\leftrightarrow$ `INACTIVE`). |

### 2.2. Địa điểm chuẩn hóa & Dịch vụ Platform Partner (`provinces`, `provider_services`, `service_media`)

| Method & Path | Actor / Role | Mô tả & Quy tắc trạng thái |
| :--- | :--- | :--- |
| `GET /api/v1/provinces` | Public | Danh sách 63 Tỉnh/Thành phố chuẩn hóa (`id`, `code`, `name`, `region`, `latitude`, `longitude`). |
| `GET /api/v1/partner-services` | `AGENCY_ADMIN`, `ADMIN`, Public | Tìm kiếm dịch vụ Platform Partner (`provinceId`, `category`, `minPrice`, `maxPrice`, `stars`, `keyword`). Mặc định chỉ trả về `status = 'PUBLISHED'`. |
| `GET /api/v1/partner-services/{id}` | `AGENCY_ADMIN`, `PROVIDER`, `ADMIN`, Public | Xem chi tiết dịch vụ kèm `service_media`, chính sách, tiện ích và tọa độ bản đồ. |
| `POST /api/v1/partner/services` | `PROVIDER` (Approved) | Partner đăng dịch vụ mới. **Quy tắc:** Khi Partner đã `APPROVED`, bài đăng có thể chọn lưu `DRAFT` hoặc đăng ngay `PUBLISHED` (thay vì bị kẹt ở `PENDING` như lỗi FE hiện tại). |
| `PUT /api/v1/partner/services/{id}` | `PROVIDER` | Cập nhật thông tin dịch vụ và danh sách ảnh `service_media`. |
| `PATCH /api/v1/admin/provider-services/{id}/moderation` | `ADMIN` | Hậu kiểm bài đăng dịch vụ: tạm ẩn (`PUBLISHED` $\rightarrow$ `HIDDEN` kèm `hiddenReason`) hoặc khôi phục (`HIDDEN` $\rightarrow$ `PUBLISHED`). |
| `DELETE /api/v1/admin/provider-services/{id}` | `ADMIN` | Xóa/Lưu trữ bài đăng vi phạm nghiêm trọng (`status` $\rightarrow$ `ARCHIVED`). |

### 2.3. Danh bạ Supplier Riêng của Agency (`agency_suppliers`) — Nhập 1 Lần, Tái Sử Dụng Nhiều Lần

#### `POST /api/v1/agency/suppliers` (Và `PUT /api/v1/agency/suppliers/{id}`)
- **Actor:** `AGENCY_ADMIN` (Tự động gán `agency_id` từ JWT của Agency đang đăng nhập).
- **Request Body:**
```json
{
  "provinceId": "prov-lam-dong",
  "supplierType": "HOTEL",
  "supplierName": "Khách sạn Boutique Thông Xanh Đà Lạt",
  "contactName": "Chị Mai (Quản lý Sales)",
  "contactPhone": "0918222333",
  "contactEmail": "sales@thongxanhdalat.vn",
  "address": "18 Trần Hưng Đạo, Phường 10, Đà Lạt, Lâm Đồng",
  "stars": 3,
  "referencePriceFrom": 650000,
  "referencePriceTo": 950000,
  "serviceTags": ["Buffet sáng", "Bãi đỗ xe 45 chỗ", "Gần hồ Xuân Hương"],
  "notes": "Giá hợp đồng đoàn từ 10 phòng trở lên, miễn phí phòng nội bộ cho HDV & tài xế."
}
```
- **Response (`201 Created`):** Trả về bản ghi `AgencySupplierDto` kèm `id`, `status: "ACTIVE"`.
- **Các Endpoint đi kèm:**
  - `GET /api/v1/agency/suppliers?provinceId=...&supplierType=...&status=ACTIVE&q=...`: Tìm kiếm trong danh bạ riêng của đúng Agency đó (phục vụ ô chọn nhanh khi tạo Tour/Báo giá).
  - `PATCH /api/v1/agency/suppliers/{id}/status`: Ngừng sử dụng hoặc kích hoạt lại (`ACTIVE` $\leftrightarrow$ `INACTIVE`). Không làm ảnh hưởng tới các Tour/Booking cũ đã lưu snapshot.

---

## 3. Phân Hệ 2 (Member 2): Tour, Template/Clone, Gợi Ý & Thỏa Thuận Đồng Tổ Chức, Báo Giá

### 3.1. Quản lý Tour, Template & Clone (`tours`, `tour_destinations`, `tour_itinerary_*`, `tour_pricing_tiers`)

| Method & Path | Actor / Role | Mô tả & Quy tắc nghiệp vụ |
| :--- | :--- | :--- |
| `GET /api/v1/public/tours` | Public | Danh sách tour mở bán công khai (`status = 'PUBLISHED' AND visibility = 'PUBLIC'`). Lọc theo `provinceId`, `region`, `minPrice`, `maxPrice`, `days`, `keyword`. |
| `GET /api/v1/public/tours/{id}` | Public | Xem chi tiết tour công khai, lịch trình từng ngày, điểm đến, bảng giá theo độ tuổi. |
| `GET /api/v1/agency/tours` | `AGENCY_ADMIN` | Danh sách tour/template của Agency (`isTemplate=true\|false`, `status=DRAFT\|PUBLISHED\|HIDDEN`). |
| `POST /api/v1/agency/tours` | `AGENCY_ADMIN` (Approved) | Tạo tour mới hoặc template. Cho phép gán dịch vụ ngày/điểm dừng từ `platformServiceId` HOẶC `agencySupplierId` (hoặc tạo nhanh `newAgencySupplier` ngay trong payload để tự động lưu vào `agency_suppliers`). **Agency tự chọn `status: "DRAFT"` hoặc `"PUBLISHED"` (không qua Admin duyệt).** |
| `PUT /api/v1/agency/tours/{id}` | `AGENCY_ADMIN` | Cập nhật cấu hình tour. Nếu là tour đồng tổ chức, Local Co-Host chỉ sửa được các ngày thuộc `responsible_agency_id` của mình. |
| `PATCH /api/v1/agency/tours/{id}/publish` | `AGENCY_ADMIN` | Mở bán công khai trực tiếp (`DRAFT` $\rightarrow$ `PUBLISHED`, `visibility = 'PUBLIC'`) hoặc tạm ẩn nội bộ (`visibility = 'HIDDEN'`). |
| `POST /api/v1/agency/tours/{id}/clone` | `AGENCY_ADMIN` | **Clone Tour theo Allowlist:** Chỉ sao chép mô tả, ảnh, chính sách, danh sách `tour_destinations`, khung `tour_itinerary_days`, `tour_itinerary_items` và `tour_pricing_tiers` sang bản ghi mới (`status = 'DRAFT'`, `visibility = 'HIDDEN'`, `cloned_from_tour_id = id`). Loại bỏ toàn bộ thỏa thuận co-host cũ, đánh giá và dữ liệu vận hành. |
| `PATCH /api/v1/admin/tours/{id}/moderation` | `ADMIN` | Hậu kiểm của Admin: tạm ẩn tour vi phạm (`PUBLISHED` $\rightarrow$ `HIDDEN` kèm `hiddenReason`) hoặc mở lại (`HIDDEN` $\rightarrow$ `PUBLISHED`). |

### 3.2. Gợi ý Ứng viên & Thỏa thuận Đồng Tổ Chức (`tour_co_host_agreements`)

#### `GET /api/v1/agency/co-host-candidates`
- **Actor:** `AGENCY_ADMIN` (Lead Agency).
- **Query Params:** `provinceIds=prov-lam-dong,prov-khanh-hoa` (Danh sách mã tỉnh/thành trong yêu cầu của khách).
- **Logic xử lý Backend:**
  - Truy vấn các Agency có `approval_status = 'APPROVED'`, `users.is_locked = false`, `id != currentAgencyId` và có ít nhất 1 bản ghi trong `tours` (`status = 'PUBLISHED' AND visibility = 'PUBLIC'`) nối với `tour_destinations.province_id`.
  - Khử trùng lặp (`DISTINCT` theo từng tỉnh) để mỗi Agency chỉ xuất hiện 1 lần cho mỗi tỉnh.
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "candidatesByProvince": [
      {
        "provinceId": "prov-khanh-hoa",
        "provinceName": "Khánh Hòa",
        "candidates": [
          {
            "agencyId": "comp-nhatrang-explorer",
            "businessName": "Nha Trang Sea Explorer Travel",
            "headquartersAddress": "78 Trần Phú, Nha Trang, Khánh Hòa",
            "publishedToursInProvinceCount": 4,
            "samplePublishedTours": [
              { "tourId": "tour-nt-1", "name": "Khám Phá Vịnh Nha Trang - Đảo Hoa Lan 3N2Đ" }
            ],
            "averageRating": 4.8,
            "disclaimer": "Ứng viên được gợi ý dựa trên các tour đã công bố tại Khánh Hòa. Vui lòng gửi lời mời để xác nhận lịch trống và thương lượng giá chặng."
          }
        ]
      }
    ]
  }
}
```

#### Các Endpoint Quản lý Thỏa thuận Đồng tổ chức (`tour_co_host_agreements`)
| Method & Path | Actor / Role | Mô tả & Quy tắc bảo mật giá |
| :--- | :--- | :--- |
| `POST /api/v1/agency/co-host-agreements` | `AGENCY_ADMIN` (Lead) | Gửi lời mời đồng tổ chức chặng (`localAgencyId`, `provinceId`, `assignedDays: [3, 4]`, `scopeDescription`, `qualityStandards`, `proposedBudgetPerPax`). Trạng thái khởi tạo: `INVITED`. |
| `GET /api/v1/agency/co-host-agreements` | `AGENCY_ADMIN` | Xem danh sách lời mời/thỏa thuận (`direction=INCOMING\|OUTGOING\|ACTIVE`). **Bảo mật:** Nếu người gọi là `localAgencyId`, DTO trả về **không chứa** `totalSellingPrice` hay `customerBudget` của toàn tour, chỉ chứa thông tin chặng được giao. |
| `PATCH /api/v1/agency/co-host-agreements/{id}/respond` | `AGENCY_ADMIN` (Local) | Phản hồi lời mời:<br>- Chấp nhận ngay: `INVITED` $\rightarrow$ `ACCEPTED` (`acceptedAt = now()`).<br>- Từ chối: `INVITED` $\rightarrow$ `REJECTED` (kèm `rejectionReason`).<br>- Đề xuất lại giá/phạm vi: `INVITED` $\rightarrow$ `NEGOTIATING` (cập nhật `agreedNetPricePerPax`, `pricingTiersNetJson`, tăng `agreementVersion`). |
| `PATCH /api/v1/agency/co-host-agreements/{id}/finalize` | `AGENCY_ADMIN` (Lead) | Lead Agency chốt chấp nhận mức giá thương lượng của Local Agency: `NEGOTIATING` $\rightarrow$ `ACCEPTED`. |

### 3.3. Yêu cầu Thiết kế Tour Riêng & Phiên bản Báo giá (`custom_tour_requests`, `quotation_versions`)

| Method & Path | Actor / Role | Mô tả & Quy tắc phiên bản / khóa giá |
| :--- | :--- | :--- |
| `POST /api/v1/customer/custom-requests` | `USER` (Customer) | Gửi yêu cầu thiết kế tour riêng (`leadAgencyId`, `destinationProvinces`, `startDate`, `endDate`, `expectedGuests`, `customerBudget`, `customerRequirements`). Trạng thái: `PENDING`. |
| `GET /api/v1/customer/custom-requests` | `USER` | Xem danh sách yêu cầu của mình kèm thời hạn hiệu lực báo giá (`quoteExpiresAt`, `priceLockedUntil`). |
| `GET /api/v1/agency/custom-requests` | `AGENCY_ADMIN` | Xem toàn bộ yêu cầu gửi tới Agency mình (bao gồm cả `REJECTED` và `CANCELLED`). |
| `POST /api/v1/agency/custom-requests/{id}/quotations` | `AGENCY_ADMIN` (Lead) | **Phát hành phiên bản Báo giá mới (`quotation_versions`):**<br>- Tự động tăng `version_number = current + 1` (không bao giờ ghi đè bản cũ; bản cũ chuyển sang `SUPERSEDED`).<br>- Bắt buộc truyền `priceLockedUntil` và `validUntil`.<br>- Lưu snapshot `itinerarySnapshotJson` và `pricingSnapshotJson`.<br>- Chuyển trạng thái request $\rightarrow$ `PROPOSAL_SENT`. |
| `GET /api/v1/custom-requests/{id}/quotations` | `USER`, `AGENCY_ADMIN` | Xem lịch sử tất cả các phiên bản báo giá (`v1, v2, v3...`) và so sánh thay đổi (`changeSummary`). |
| `PATCH /api/v1/customer/custom-requests/{id}/request-revision` | `USER` | Khách hàng gửi phản hồi yêu cầu chỉnh sửa (`customerFeedback`): `PROPOSAL_SENT` $\rightarrow$ `NEGOTIATING`. |
| `POST /api/v1/customer/custom-requests/{id}/accept` | `USER` | Khách hàng chấp nhận phiên bản báo giá hiện hành (`versionNumber`):<br>- Kiểm tra `now() <= valid_until` (nếu quá hạn trả lỗi `409 QUOTATION_EXPIRED`).<br>- Chuyển `quotation_versions.status = 'ACCEPTED'` và `custom_tour_requests.status = 'ACCEPTED'`. |

---

## 4. Phân Hệ 3 (Member 3): Booking, Hợp Đồng, Đặt Chỗ Partner, Phụ Lục Thay Đổi & Điều Hành Thực Địa

### 4.1. Khởi tạo Booking, Hợp đồng & Phân quyền Hiển thị (`bookings`, `booking_contracts`, `booking_agency_shares`)

#### `POST /api/v1/customer/bookings`
- **Actor:** `USER` (Customer).
- **Mô tả:** Đặt tour từ một Tour công khai hoặc từ một `quotationVersionId` đã `ACCEPTED`.
- **Logic xử lý Backend:**
  1. Validate ngày khởi hành ($\ge 3$ ngày), số lượng khách (`min_guests <= total_guests <= max_guests`) và quy tắc đi kèm người lớn.
  2. Chụp snapshot bất biến toàn bộ cấu hình tour/báo giá vào `bookings.tour_snapshot_json`.
  3. Sinh bản ghi Hợp đồng `booking_contracts` (`status = 'ACTIVE'` nếu khách tích chấp nhận điều khoản kèm lưu `customer_accepted_at`, `customer_accept_ip`).
  4. Sinh các bản ghi phân công `booking_agency_shares` cho Lead Agency (và các Local Co-Host đã `ACCEPTED`).
  5. Sinh đợt thanh toán đầu tiên (`payment_requests` với `milestone_type = 'DEPOSIT'`).
  6. Trạng thái khởi tạo của Booking: `PENDING_RECONFIRM`.

#### `GET /api/v1/agency/bookings/{id}` (Phân quyền DTO nghiêm ngặt giữa Lead Agency và Local Co-Host)
- **Actor:** `AGENCY_ADMIN`.
- **Quy tắc lọc dữ liệu nhạy cảm trên Response DTO:**
```json
// 1. Khi người gọi là LEAD AGENCY (roleType = "LEAD"): Thấy toàn bộ bức tranh tài chính
{
  "bookingId": "bk-101",
  "bookingCode": "BK-2026-101",
  "viewerRoleType": "LEAD",
  "totalSellingPrice": 160000000,
  "committedCostAmount": 107000000,
  "expectedLeadMargin": 26000000,
  "agencyShares": [
    { "agencyId": "comp-lead-a", "roleType": "LEAD", "assignedDays": [1, 2], "agreedNetAmount": 100000000 },
    { "agencyId": "comp-local-b", "roleType": "LOCAL_COHOST", "assignedDays": [3, 4], "agreedNetAmount": 60000000 }
  ]
}

// 2. Khi người gọi là LOCAL CO-HOST AGENCY (roleType = "LOCAL_COHOST"):
// Backend BẮT BUỘC ẩn totalSellingPrice, expectedLeadMargin và phần chia của Lead Agency!
{
  "bookingId": "bk-101",
  "bookingCode": "BK-2026-101",
  "viewerRoleType": "LOCAL_COHOST",
  "totalSellingPrice": null,
  "committedCostAmount": null,
  "expectedLeadMargin": null,
  "myStageShare": {
    "agencyShareId": "share-b",
    "agencyId": "comp-local-b",
    "roleType": "LOCAL_COHOST",
    "assignedDays": [3, 4],
    "stageDescription": "Chặng Nha Trang (Ngày 3 - Ngày 4)",
    "agreedNetAmount": 60000000,
    "platformFeeAmount": 1200000,
    "penaltyDeductionAmount": 0,
    "finalPayoutAmount": 58800000,
    "executionStatus": "ASSIGNED",
    "settlementStatus": "UNSETTLED"
  }
}
```

#### Các Endpoint Điều hành Booking & Đặt chỗ Dịch vụ Đoàn
| Method & Path | Actor / Role | Mô tả & Quy tắc kiểm tra |
| :--- | :--- | :--- |
| `POST /api/v1/agency/bookings/{id}/partner-reservations` | `AGENCY_ADMIN` | Tạo và gửi phiếu yêu cầu đặt chỗ đoàn (`partner_service_reservations`) tới Platform Partner (`sourceType = 'PLATFORM_PARTNER'`, `status = 'PENDING'`) hoặc ghi nhận đặt chỗ Supplier riêng (`sourceType = 'AGENCY_SUPPLIER'`). |
| `GET /api/v1/partner/reservations` | `PROVIDER` | Platform Partner xem danh sách phiếu yêu cầu đặt chỗ đoàn gửi tới dịch vụ của mình. |
| `GET /api/v1/partner/reservations/{id}` | `PROVIDER` | Xem chi tiết phiếu đặt chỗ & danh sách đoàn. **Bảo mật thông tin hành khách:** Nếu `serviceCategory == 'FNB'`, ẩn `idCardOrPassport` và `roommateNotes`, chỉ trả về `fullName`, `ageCategory`, `dietaryNotes`. |
| `PATCH /api/v1/partner/reservations/{id}/respond` | `PROVIDER` | Partner phản hồi phiếu đặt chỗ:<br>- Báo giá/Xác nhận: `PENDING` $\rightarrow$ `QUOTED` hoặc `CONFIRMED` (nhập `quotedFinalPrice`, `committedNonRefundable`, `providerResponseNote`).<br>- Từ chối: `PENDING` $\rightarrow$ `REJECTED` (nhập lý do). |
| `PATCH /api/v1/agency/bookings/{id}/confirm` | `AGENCY_ADMIN` (Lead) | **Xác nhận Booking chính thức (`PENDING_RECONFIRM` $\rightarrow$ `CONFIRMED`):**<br>- Bắt buộc người gọi là `lead_agency_id` (nếu không trả lỗi `403 NOT_LEAD_AGENCY`).<br>- Bắt buộc tất cả `partner_service_reservations` bắt buộc của Booking đã ở trạng thái `CONFIRMED` (nếu không trả lỗi `409 PARTNER_RESERVATIONS_UNCONFIRMED`). |
| `POST /api/v1/agency/bookings/{id}/extract-template` | `AGENCY_ADMIN` | Trích xuất cấu hình lịch trình đã lọc sạch dữ liệu khách hàng từ một Booking đã `COMPLETED` để tạo một `Tour` mới (`is_template = true`, `status = 'DRAFT'`). **Không clone Booking.** |

### 4.2. Quản lý Hành khách & Phụ lục Thay đổi Sau Khi Đặt (`booking_passengers`, `booking_amendments`)

| Method & Path | Actor / Role | Mô tả & Quy tắc nghiệp vụ |
| :--- | :--- | :--- |
| `PUT /api/v1/bookings/{id}/passengers` | `USER`, `AGENCY_ADMIN` | Cập nhật thông tin cá nhân/ăn kiêng/xếp phòng của hành khách (cho phép sửa thông tin định danh trước ngày khởi hành $\ge 3$ ngày). |
| `POST /api/v1/bookings/{id}/amendments` | `USER`, `AGENCY_ADMIN` | **Yêu cầu thay đổi sau khi đặt (`GUEST_COUNT_CHANGE`, `HOTEL_CHANGE`, `MEAL_CHANGE`, `ITINERARY_CHANGE`, `STAGE_REPLACEMENT`):**<br>- Không cho phép tự ý cộng/trừ khách mà không tính lại giá.<br>- Tạo bản ghi `booking_amendments` (`status = 'PENDING_RECHECK'`). |
| `PATCH /api/v1/agency/bookings/{id}/amendments/{amendId}/quote` | `AGENCY_ADMIN` (Lead) | Sau khi kiểm tra lại chỗ trống & giá với Partner, Lead Agency cập nhật `committedSunkCost`, `recoverableCost`, `priceDelta`, `newTotalPrice` $\rightarrow$ chuyển sang `QUOTED`. |
| `POST /api/v1/bookings/{id}/amendments/{amendId}/approve` | `USER`, `AGENCY_ADMIN` | Chấp nhận phụ lục thay đổi (`QUOTED` $\rightarrow$ `APPLIED`):<br>- Cập nhật `bookings.total_selling_price = new_total_price`.<br>- Nếu `price_delta > 0`, tự động sinh thêm 1 đợt `payment_requests` (`milestone_type = 'AMENDMENT_SURCHARGE'`). |

### 4.3. Phân công Hướng dẫn viên & Vận hành Thực địa (`guide_assignments`, `booking_location_checkins`)

| Method & Path | Actor / Role | Mô tả & Quy tắc trạng thái |
| :--- | :--- | :--- |
| `POST /api/v1/agency/bookings/{id}/guide-assignments` | `AGENCY_ADMIN` | Phân công HDV thuộc Agency của mình cho đoàn/chặng (`SINGLE`, `CO_GUIDE`, `CUSTOM_STAGE`) và khởi tạo danh sách điểm check-in `booking_location_checkins`. |
| `GET /api/v1/guide/assignments` | `GUIDE` | HDV xem danh sách các lịch trình đoàn được phân công trên ứng dụng Mobile. |
| `PUT /api/v1/guide/assignments/{id}/roll-call` | `GUIDE` | Điểm danh hành khách khi khởi hành (`PRESENT` / `ABSENT`, cập nhật `checked_in_at`). Khi chốt điểm danh ngày 1, chuyển `bookings.status = 'IN_PROGRESS'`. |
| `POST /api/v1/guide/assignments/{id}/checkins/{checkinId}` | `GUIDE` | Check-in tại điểm đến (`PENDING` $\rightarrow$ `CHECKED_IN`, lưu `proofImageUrl`, `checkinNote`, `checkedInAt`). |
| `PUT /api/v1/guide/assignments/{id}/notes` | `GUIDE` | Lưu sổ tay ghi chép điều hành nhanh (`guide_freeform_notes`). |
| `POST /api/v1/guide/assignments/{id}/wrap-up` | `GUIDE` | Nộp báo cáo hoàn thành chuyến đi (`wrapUpSummary`, `wrapUpRating`) khi đã check-in đủ các điểm trong lộ trình $\rightarrow$ chuyển `guide_assignments.status = 'COMPLETED'` và `bookings.status = 'COMPLETED'`. |

---

## 5. Phân Hệ 4 (Member 4): Thanh Toán Nhiều Đợt, Tạm Ứng Vận Hành, Sự Cố/Tranh Chấp, Hoàn Tiền & Quyết Toán

### 5.1. Cấu hình Ngân hàng Sàn & Thanh toán Theo Đợt (`system_bank_configs`, `payment_requests`, `payment_transactions`)

| Method & Path | Actor / Role | Mô tả & Quy tắc trạng thái |
| :--- | :--- | :--- |
| `GET /api/v1/system-bank-config` | Authenticated | Lấy thông tin STK ngân hàng thu hộ của sàn và tạo mã VietQR thanh toán. |
| `PUT /api/v1/admin/system-bank-config` | `ADMIN` | Admin cập nhật STK ngân hàng sàn & `defaultCommissionRate`. |
| `POST /api/v1/agency/bookings/{id}/payment-requests` | `AGENCY_ADMIN` (Lead) | Tạo lịch thanh toán nhiều đợt (`DEPOSIT`, `SECOND_INSTALLMENT`, `FINAL_BALANCE`) cho Booking. Tổng `amount_due` của các đợt `PENDING`/`PAID` không vượt quá `total_selling_price`. |
| `POST /api/v1/customer/payment-requests/{reqId}/transactions` | `USER` (Customer) | Khách hàng xác nhận đã chuyển khoản cho đợt thanh toán `reqId` (`transactionCode`, `amountPaid`, `proofImageUrl`). Cập nhật `payment_requests.status = 'PAID'` và tính lại `bookings.payment_status` (`DEPOSIT_PAID` / `PARTIALLY_PAID` / `PAID`). |

### 5.2. Tạm ứng Chi phí Vận hành (`operational_advances`)

| Method & Path | Actor / Role | Mô tả & Quy tắc kiểm soát hạn mức |
| :--- | :--- | :--- |
| `POST /api/v1/agency/bookings/{id}/operational-advances` | `AGENCY_ADMIN` | Lead Agency hoặc Local Co-Host gửi yêu cầu tạm ứng vận hành (`agencyShareId`, `requestedAmount`, `purposeDescription`).<br>**Điều kiện:** Booking đã `CONFIRMED`, khách đã thanh toán ít nhất đợt cọc, và tổng số tiền xin tạm ứng $\le 70\%$ phần doanh thu tương ứng với số tiền khách đã nộp. |
| `GET /api/v1/admin/operational-advances` | `ADMIN` | Admin xem danh sách yêu cầu tạm ứng (`status=REQUESTED\|APPROVED\|DISBURSED`). |
| `PATCH /api/v1/admin/operational-advances/{id}/disburse` | `ADMIN` | Admin duyệt và xác nhận đã chuyển khoản tạm ứng (`approvedAmount`, `bankReferenceCode`) $\rightarrow$ `status = 'DISBURSED'`. Khoản này sẽ tự động trừ vào `advance_deducted_amount` khi quyết toán cuối. |

### 5.3. Sự cố Hiện trường, Vi phạm Đồng tổ chức & Khiếu nại (`incident_and_disputes`)

| Method & Path | Actor / Role | Mô tả & Quy tắc khóa quyết toán |
| :--- | :--- | :--- |
| `POST /api/v1/bookings/{id}/incidents` | `GUIDE`, `USER`, `AGENCY_ADMIN` | Báo cáo sự cố hiện trường (`MEDICAL`, `VEHICLE`, `WEATHER`, `SERVICE_QUALITY`), vi phạm đồng tổ chức (`COHOST_BREACH` kèm `remedyDeadline`, `evidenceUrls`) hoặc khiếu nại của khách (`CUSTOMER_COMPLAINT`).<br>**Quy tắc:** Nếu `incidentType` là `COHOST_BREACH` hoặc `CUSTOMER_COMPLAINT` có yêu cầu bồi hoàn, tự động bật `settlement_hold_flag = true` và chuyển `booking_agency_shares.settlement_status = 'DISPUTED'`. |
| `GET /api/v1/bookings/{id}/incidents` | `GUIDE`, `USER`, `AGENCY_ADMIN`, `ADMIN` | Xem danh sách sự cố & tranh chấp của đoàn. |
| `PATCH /api/v1/bookings/{id}/incidents/{incId}/resolve` | `AGENCY_ADMIN`, `ADMIN` | Cập nhật tiến độ xử lý (`INVESTIGATING` $\rightarrow$ `REMEDIED` / `RESOLVED`), ghi nhận chi phí thay thế (`replacementCostIncurred`) và khoản phạt khấu trừ (`penaltyDeductionAmount`) vào chặng vi phạm, sau đó gỡ cờ `settlement_hold_flag = false`. |

### 5.4. Yêu cầu Hoàn tiền & Quyết toán Giải ngân (`refund_requests`, `financial_settlements`)

| Method & Path | Actor / Role | Mô tả & Quy tắc đối soát không cộng trùng |
| :--- | :--- | :--- |
| `POST /api/v1/customer/bookings/{id}/refund-requests` | `USER` (Customer) | Gửi yêu cầu hủy tour & hoàn tiền (`reasonType`, `reasonDetail`, `refundBankName`, `refundAccountNumber`, `refundAccountHolder`). Hệ thống tự tính tỷ lệ hoàn theo ngày khởi hành và chi phí đã cam kết (`committed_non_recoverable`). Trạng thái: `PENDING`. |
| `PATCH /api/v1/admin/refund-requests/{id}/review` | `ADMIN` | Chuyển trạng thái đơn hoàn tiền từ `PENDING` $\rightarrow$ `REVIEWING` (khắc phục lỗi thiếu nút chuyển `REVIEWING` trên FE hiện tại). |
| `PATCH /api/v1/admin/refund-requests/{id}/approve` | `ADMIN` | Duyệt chi hoàn tiền (`REVIEWING`/`PENDING` $\rightarrow$ `COMPLETED`), bắt buộc nhập `bankTransactionCode` và `adminNote`. Cập nhật `bookings.payment_status = 'REFUNDED'`. |
| `PATCH /api/v1/admin/refund-requests/{id}/reject` | `ADMIN` | Từ chối yêu cầu hoàn tiền (`status` $\rightarrow$ `REJECTED`, bắt buộc có `adminNote`). |
| `GET /api/v1/admin/settlements` | `ADMIN` | Xem danh sách các khoản quyết toán theo từng Booking và từng Agency (`booking_agency_shares`). Hiển thị rõ: `grossAllocatedAmount`, `platformFeeAmount`, `advanceDeductedAmount`, `penaltyOrRefundDeducted`, và `netPayoutAmount`. |
| `POST /api/v1/admin/settlements/{agencyShareId}/disburse` | `ADMIN` | **Giải ngân quyết toán cuối cùng cho một Agency (`READY` $\rightarrow$ `SETTLED`):**<br>- Kiểm tra `bookings.status == 'COMPLETED'`.<br>- Kiểm tra không có sự cố/tranh chấp nào đang giữ cờ `settlement_hold_flag = true` (nếu có trả lỗi `409 SETTLEMENT_ON_HOLD_DISPUTE`).<br>- Tính đúng công thức chuẩn (không trừ phí sàn 2 lần):<br>  `netPayoutAmount = grossAllocatedAmount - platformFeeAmount - advanceDeductedAmount - penaltyOrRefundDeducted`<br>- Lưu `bankTransactionCode`, `settlementNote` (khắc phục lỗi bỏ rơi `settlementNote` trên FE) và đánh dấu các `operational_advances` liên quan thành `DEDUCTED_AT_SETTLEMENT`. |

