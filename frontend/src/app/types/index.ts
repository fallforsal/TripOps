export type UserRole = "user" | "guide" | "admin" | "provider" | "agency" | "company_admin";

export type ProviderType =
  | "accommodation" // Dịch vụ lưu trú
  | "guide" // Cung cấp hướng dẫn viên
  | "fnb" // Dịch vụ ăn uống (Food & Beverage)
  | "attraction" // Điểm tham quan và giải trí
  | "adventure" // Hoạt động trải nghiệm
  | "support"; // Dịch vụ hỗ trợ

export interface TourCompany {
  id: string;
  name: string;
  description: string;
  logo?: string;
  coverImage?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  taxCode: string;
  licenseNumber?: string; // Số giấy phép kinh doanh lữ hành
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  adminId: string; // ID of the company_admin user
  createdAt: string;
  rating?: number;
  totalTours?: number;
  totalBookings?: number;
}


export interface BusinessProfile {
  id?: number | string;
  userId: string;
  businessName: string;
  taxCode: string;
  businessAddress: string;
  businessLicenseUrl?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  businessProfile?: BusinessProfile;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  aliasEmails?: string[]; // Danh sách email đăng nhập tương đương (Gmail, domain company, etc.)
  // Company admin / guide specific fields
  companyId?: string; // Belongs to which tour company
  companyName?: string;
  // Provider specific fields
  providerType?: ProviderType;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxCode?: string;
  province?: string; // Tỉnh/Thành phố
  ward?: string; // Phường/Xã
  street?: string; // Số nhà, đường
  latitude?: number; // Vĩ độ
  longitude?: number; // Kinh độ
  businessDescription?: string;
  accountStatus?: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  // Guide specific fields
  licenseNumber?: string;
  licenseExpiryDate?: string;
  guideType?: "domestic" | "international";
  languages?: string[];
  specialties?: string[];
  experienceYears?: number;
  guideStatus?: "active" | "inactive" | "on_tour";
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  time?: string;
  checkedIn?: boolean;
  checkInTime?: string;
  checkInImage?: string;
  checkInNote?: string;
  createdByCompanyId?: string; // ID công ty khởi tạo điểm tham quan này
  createdByCompanyName?: string; // Tên công ty khởi tạo điểm tham quan này
}

export interface TourAlternativeMeal {
  id: string;
  restaurantName: string;
  priceDifference: number; // e.g. +50000, +180000, -30000
  description?: string;
  address?: string;
}

export interface TourMeal {
  id?: string;
  type: "breakfast" | "lunch" | "dinner";
  serviceId?: string;
  serviceName?: string;
  description?: string;
  pricePerPerson?: number;
  allowCustomMealRequest?: boolean; // Cho phép khách tự đề xuất nhà hàng ngoài danh sách
  alternativeMeals?: TourAlternativeMeal[]; // Danh sách nhà hàng đổi món/nâng cấp cho khách chọn
  createdByCompanyId?: string; // ID công ty thiết lập bữa ăn này
  createdByCompanyName?: string; // Tên công ty thiết lập bữa ăn này
}

export interface TourAlternativeHotel {
  id: string;
  name: string;
  priceDifference: number; // e.g. +400000 or -350000
  stars?: number;
  description?: string;
  address?: string;
}

export interface TourHotel {
  id?: string;
  serviceId?: string;
  name: string;
  destination?: string; // e.g. "Đà Lạt", "Nha Trang"
  nights?: number; // e.g. 2
  stars?: number;
  pricePerNight: number;
  description?: string;
  address?: string;
  image?: string;
  allowCustomHotelRequest?: boolean; // Cho phép khách tự đề xuất khách sạn ngoài danh sách
  alternativeHotels?: TourAlternativeHotel[]; // Danh sách khách sạn nâng cấp/đổi hạng cho khách hàng chọn kèm giá chênh lệch
  createdByCompanyId?: string; // ID công ty thiết lập khách sạn này
  createdByCompanyName?: string; // Tên công ty thiết lập khách sạn này
}

export interface DailyItinerary {
  id: string;
  day: number;
  date: string;
  title: string;
  description: string;
  locations: Location[];
  destinationCity?: string; // e.g. "Đà Lạt", "Nha Trang" — for multi-destination tours
  // Hotel & meals for this day (set by company)
  hotel?: TourHotel;
  meals?: TourMeal[];
  createdByCompanyId?: string; // Công ty khởi tạo/phụ trách chính ngày này
  createdByCompanyName?: string;
  // Handover support for transit/transfer days (e.g. Nha Trang -> Da Lat)
  isHandoverDay?: boolean; // Đánh dấu ngày chuyển giao giữa 2 công ty
  handoverInfo?: {
    time?: string; // Giờ chuyển giao đoàn, VD: "12:30"
    location?: string; // Điểm hẹn bàn giao đoàn, VD: "Trạm dừng chân Đèo Khánh Lê"
    note?: string; // Ghi chú bàn giao HDV & hành khách
  };
}

export interface TourDepartureDate {
  date: string;
  price: number;
  label?: string;
  seatsAvailable?: number;
}

export interface TourPriceRow {
  ageGroup: "adult" | "child_2_11" | "child_under_2" | string;
  ageGroupLabel: string; // e.g. "Người lớn"
  ageRange?: string; // e.g. "Từ 12 tuổi"
  hotelType?: string;
  minAge?: number; // min_age in tour_pricing_tiers
  maxAge?: number; // max_age in tour_pricing_tiers
  price: number;
}

export interface BookingPassenger {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  ageGroup: "adult" | "child_2_11" | "child_under_2";
  price: number;
  phone?: string;
  email?: string;
  idNumber?: string; // CCCD / Passport
  notes?: string;
  // Alliance / Co-Host stage & multi-agency mapping (booking_participants schema)
  participantIndex?: number;
  agencyId?: string; // ID của công ty du lịch phụ trách chặng của khách này
  agencyName?: string;
  isPrimary?: boolean; // true: Dòng đại diện hiển thị cho khách xem
  tierName?: string; // Tên phân khúc: Người lớn, Trẻ em, Em bé...
  status?: "ACTIVE" | "INACTIVE"; // ACTIVE: Tham gia chặng, INACTIVE: Đã hủy/xoá khỏi chặng
  statusNote?: string;
  assignedGuideId?: string;
  assignedGuideName?: string;
  attendanceStatus?: "PENDING" | "CHECKED_IN" | "ABSENT";
  checkedBy?: string;
  checkedAt?: string;
  // Roll call status at departure
  departureAttendance?: "present" | "late" | "absent";
  departureCheckInTime?: string;
  // Stage participation & Stage roll call for Co-hosted tours
  participatingStages?: number[]; // e.g. [0, 1, 2] for all 3 stages, or [0] for only stage 1, or [2] for stage 3
  stageAttendance?: Record<number, "pending" | "present" | "late" | "absent">; // stageIndex -> status
  stageNotes?: Record<number, string>;
}

export interface CustomLocationChange {
  dayId: string;
  dayNumber: number;
  locationId?: string;
  originalLocationName?: string;
  originalLocations?: string[];
  requestedLocations: string;
  note?: string;
}

export interface CustomHotelChange {
  destination: string;
  originalHotelName?: string;
  originalPricePerNight?: number;
  newHotelName: string;
  mode: "system" | "custom" | "provider";
  newPricePerNight?: number;
  stars?: number;
  address?: string;
  note?: string;
  // Platform provider service metadata
  isProviderService?: boolean;
  serviceId?: string;
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerAddress?: string;
  providerRepresentative?: string;
  serviceImage?: string;
  latitude?: number;
  longitude?: number;
}

export interface CustomMealChange {
  dayNumber: number;
  mealType: "breakfast" | "lunch" | "dinner";
  originalMealName?: string;
  newMealName: string;
  mode: "system" | "custom" | "provider";
  pricePerPerson?: number;
  priceDifference?: number;
  note?: string;
  // Platform provider service metadata
  isProviderService?: boolean;
  serviceId?: string;
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerAddress?: string;
  providerRepresentative?: string;
  serviceImage?: string;
  latitude?: number;
  longitude?: number;
}

export interface PaymentRequest {
  id: string;
  bookingId: string;
  amount: number;
  description: string;
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  createdAt: string;
  paidAt?: string;
}

export interface BookingPriceAdjustment {
  id: string;
  bookingId: string;
  adjustedBy: string; // Tên nhân viên hoặc công ty thực hiện
  agencyId?: string; // ID công ty phát sinh điều chỉnh giá (Cty A, Cty B...)
  agencyName?: string;
  previousTotalPrice: number; // Giá cũ trước khi đổi
  adjustmentAmount: number; // Chênh lệch (+ tăng, - giảm)
  newTotalPrice: number; // Giá mới chốt lại
  reason: string; // Lý do điều chỉnh
  createdAt: string;
  paymentRequestId?: string; // Mã đợt thanh toán tương ứng nếu có tạo
}

// Bảng booking_agencies: Quản lý phân chia chặng, doanh thu và giải ngân cho từng công ty
export interface BookingAgencyShare {
  id?: string;
  bookingId: string;
  agencyId: string;
  agencyName: string;
  isHost: boolean;
  originalAmount: number;
  finalAmount: number;
  // Đã bỏ khỏi DB schema (lưu vết chi tiết nằm trong booking_price_adjustments)
  adjustmentReason?: string;
  adjustedAt?: string;
  // Đã bỏ khỏi DB schema (trạng thái duyệt toàn đơn nằm ở bookings.status)
  confirmationStatus?: "pending" | "confirmed" | "rejected";
  confirmedAt?: string;
  platformFee?: number;
  netPayout?: number;
  settlementStatus: "unpaid" | "ready" | "paid";
  payoutTransferredAt?: string;
  bankReferenceCode?: string;
}

export interface SystemBankAccount {
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountHolder: string;
  branch: string;
  defaultCommissionRate: number; // e.g. 8 for 8%
  notes?: string;
  qrCodeUrl?: string;
}

export interface TourContract {
  id: string;
  bookingId: string;
  contractNumber: string;
  createdAt: string;
  signedByCustomer?: boolean;
}

export interface TourReview {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  tourDate?: string;
}

export interface Tour {
  id: string;
  tourCode: string;
  name: string;
  destination: string;
  duration: string;
  numberOfDays?: number;
  numberOfNights?: number;
  price: number;
  description: string;
  image: string;
  images?: string[];
  rating: number;
  minGuests: number;
  maxGuests: number;
  highlights: string[];
  hotels?: TourHotel[]; // List of hotels for this tour
  itinerary: DailyItinerary[];
  // Operation period (replaces departure dates for group bookings)
  operationPeriod?: string; // e.g. "Tháng 1 – Tháng 6 hàng năm"
  departureLocation?: string; // Điểm khởi hành (e.g. "TP. Hồ Chí Minh")
  departureCity?: string; // e.g. "TP. Hồ Chí Minh"
  departureDates?: TourDepartureDate[];
  priceTable?: TourPriceRow[];
  // Regulations
  inclusions?: string[];
  exclusions?: string[];
  regulations?: string[];
  companyNote?: string;
  // Reviews
  reviews?: TourReview[];
  // Company info
  companyId?: string;
  companyName?: string;
  companyLogo?: string;
  companyPhone?: string;
  companyEmail?: string;
  // Creator info
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  bookings?: number;
  // Custom tour design fields (Thiết kế tour riêng theo yêu cầu)
  tourType?: "public" | "custom_request";
  customRequestId?: string; // ID của CustomTourRequest
  targetUserId?: string; // ID khách hàng yêu cầu
  targetCustomerName?: string;
  targetCustomerPhone?: string;
  targetCustomerEmail?: string;
  version?: number; // Phiên bản hiện tại, e.g. 1, 2, 3
  changeNote?: string; // Ghi chú thay đổi của phiên bản hiện tại
  versionHistory?: TourVersion[]; // Lịch sử các version để backup / restore
  // Multi-company co-hosting / B2B partnership (Phối hợp nhiều công ty cùng dẫn tour)
  isCoHosted?: boolean;
  coHosts?: TourCoHost[];
  platformFeeRate?: number; // Tỷ lệ phí sàn ký quỹ Escrow (mặc định 8%)
  pricingStatus?: "draft" | "pending_partner_quote" | "quoted" | "approved_by_customer";
  // Database schema alignment (tours table: status, visibility, is_request)
  status?: "draft" | "completed" | "published" | "deleted" | "pending_approval" | "rejected" | "hidden";
  visibility?: "public" | "hidden";
  is_request?: boolean;
  rejectionReason?: string;
  hiddenReason?: string; // Lý do Admin tạm ẩn tour (thông tin sai lệch, nhảm nhí...)
}

export interface TourCoHost {
  id?: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  companyPhone?: string;
  companyEmail?: string;
  role: "lead" | "partner"; // 'lead': Công ty chủ trì, 'partner': Công ty đối tác
  status: "pending" | "accepted" | "rejected"; // Trạng thái lời mời
  rejectionReason?: string;
  assignedDays?: number[]; // Ngày phụ trách trong lịch trình (tự động nhận diện từ các ngày có đóng góp)
  assignedSegments?: string; // Tên chặng (ví dụ: "Chặng Đà Lạt - Nha Trang")
  // Cơ chế Báo giá chi phí chặng (Cost per segment / Net Price):
  estimatedBudgetPerGuest?: number; // Ngân sách dự kiến/khách trao đổi ban đầu (VNĐ)
  quotePerGuest?: number; // Báo giá chi phí thực tế phần công ty phụ trách (VNĐ/khách)
  quoteAdult?: number; // Báo giá người lớn của chặng
  quoteChild?: number; // Báo giá trẻ em (2-11 tuổi) của chặng
  quoteInfant?: number; // Báo giá em bé (<2 tuổi) của chặng
  quoteStatus?: "draft" | "submitted"; // Trạng thái báo giá
  quoteNote?: string; // Diễn giải các dịch vụ bao gồm trong báo giá
  quotedAt?: string; // Thời điểm xác nhận báo giá
  revenueSharePercentage?: number; // % chia sẻ doanh thu (tự động tính từ tỷ lệ báo giá thực tế)
  fixedPayoutAmount?: number; // Hoặc số tiền khoán chặng
  notes?: string; // Thỏa thuận/lời nhắn hợp tác
  invitedAt?: string;
  respondedAt?: string;
  settlementStatus?: "pending" | "settled"; // Trạng thái quyết toán từ Sàn
  settledAmount?: number;
}

export interface TourVersion {
  version: number;
  createdAt: string;
  createdByName?: string;
  changeNote?: string;
  tourSnapshot: Tour; // Toàn bộ dữ liệu snapshot của version này
}

export interface BookingAssignedGuide {
  id: string; // ID phân công duy nhất
  guideId: string;
  guideName: string;
  guidePhone?: string;
  guideAvatar?: string;
  companyId: string; // ID công ty phân công HDV này (chỉ công ty này mới được sửa/xoá)
  companyName: string; // Tên công ty phân công
  role?: "lead_guide" | "support_guide" | "stage_guide" | string; // Vai trò HDV
  notes?: string; // Ghi chú nhiệm vụ (VD: MC Gala, Dẫn chặng Đà Lạt, Xe 1...)
  assignedAt?: string;
}

export interface Booking {
  id: string;
  tourId: string;
  tour: Tour;
  userId: string;
  userName: string;
  userEmail: string;
  numberOfGuests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "rejected";
  bookingDate: string;
  tourStartDate: string;
  companyId?: string;
  companyName?: string;
  guideId?: string;
  guideName?: string;
  guideAvatar?: string;
  guidePhone?: string;
  assignedGuides?: BookingAssignedGuide[]; // Danh sách nhiều HDV cho tour đoàn đông hoặc tour liên minh
  // Payment
  paymentStatus?: "unpaid" | "paid" | "refunded";
  depositAmount?: number;
  depositPaid?: boolean;
  remainingAmount?: number;
  paymentRequests?: PaymentRequest[];
  // Price adjustments by company
  originalTotalPrice?: number;
  priceAdjustmentNote?: string;
  priceAdjustedAt?: string;
  priceAdjustments?: BookingPriceAdjustment[];
  // Financial settlement with platform admin
  settlementStatus?: "pending" | "settled";
  settledAmount?: number;
  settledAt?: string;
  platformFeeRate?: number;
  platformFeeAmount?: number;
  // Passenger list
  passengers?: BookingPassenger[];
  contactName?: string;
  contactAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  bookingNotes?: string;
  // Customization
  hasLocationCustomization?: boolean;
  locationChanges?: CustomLocationChange[];
  customHotels?: Record<string, TourHotel>;
  customMeals?: Record<string, TourMeal[]>;
  customHotelChanges?: CustomHotelChange[];
  customMealChanges?: CustomMealChange[];
  // Contract
  contract?: TourContract;
  // Rejection / cancellation
  rejectionReason?: string;
  cancellationReason?: string;
  rejectedBy?: "admin" | "customer";
  rejectedGuideName?: string;
  rejectedGuideReason?: string;
  rejectedGuideAvatar?: string;
  // Multi-company co-hosting / B2B partnership
  isCoHosted?: boolean;
  coHosts?: TourCoHost[];
  bookingAgencies?: BookingAgencyShare[];
  // Guide Attraction Check-ins & Incidents
  attractionCheckins?: BookingAttractionCheckin[];
  incidents?: BookingIncident[];
}

export interface IncidentReport {
  id: string;
  bookingId: string;
  tourId: string;
  tourName: string;
  guideId: string;
  guideName: string;
  title: string;
  category: "vehicle" | "weather" | "medical" | "schedule" | "service" | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  images?: string[];
  reportedAt: string;
  location?: string;
  status: "reported" | "acknowledged" | "resolved";
  resolvedNote?: string;
}

export interface GuideSchedule {
  id: string;
  booking: Booking;
  currentDay?: number;
  completedLocations: string[];
  departureRollCallCompleted?: boolean;
  departureRollCallTime?: string;
  wrapUpReport?: {
    rating?: number;
    notes?: string;
    completedAt?: string;
  };
  incidents?: IncidentReport[];
  personalNotes?: string;
  guideNotesList?: {
    id: string;
    title: string;
    content: string;
    isCompleted?: boolean;
    category?: "important" | "transport" | "hotel_food" | "time" | "general";
    createdAt?: string;
  }[];
}

export type AttractionAttendanceStatus = "PENDING" | "CHECKED_IN" | "SKIPPED";

export interface BookingAttractionCheckin {
  id: string;
  bookingId: string;
  bookingTimelineAttractionId: string;
  locationName: string;
  dayNumber: number;
  scheduledTime?: string;
  agencyId: string;
  agencyName?: string;
  guideId: string;
  guideName: string;
  guidePhone?: string;
  guideAvatar?: string;
  attendanceStatus: AttractionAttendanceStatus;
  checkedAt?: string;
  photoProofUrl?: string;
  notes?: string;
  createdAt?: string;
}

export type IncidentCategory = "HEALTH" | "VEHICLE" | "WEATHER" | "CUSTOMER" | "SECURITY" | "SCHEDULE" | "OTHER";
export type IncidentStatus = "REPORTED" | "IN_PROGRESS" | "RESOLVED";

export interface BookingIncident {
  id: string;
  bookingId: string;
  agencyId: string;
  agencyName?: string;
  reportedById: string;
  reportedByName: string;
  incidentType: IncidentCategory;
  title: string;
  description: string;
  evidenceUrls?: string[];
  status: IncidentStatus;
  reportedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface Service {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  category:
    | "hotel"
    | "fnb"
    | "restaurant"
    | "attraction"
    | "activity"
    | "transportation";
  subCategory?: string; // Sub-category cho FnB: "restaurant", "cafe", "streetfood"
  description: string;
  price: number;
  priceFrom?: number; // Khoảng giá từ (VNĐ/người)
  priceTo?: number; // Khoảng giá đến (VNĐ/người)
  pricePerPerson?: number; // Giá cho một người
  location: string;
  // Địa chỉ chuẩn 2 cấp (Tỉnh/Thành phố & Phường/Xã)
  province?: string; // Tỉnh/Thành phố
  ward?: string; // Phường/Xã
  district?: string; // Giữ để tương thích dữ liệu cũ
  street?: string; // Số nhà, đường
  latitude?: number; // Vĩ độ GPS
  longitude?: number; // Kinh độ GPS
  image: string;
  images?: string[]; // Nhiều ảnh cho bài đăng
  thumbnailIndex?: number; // Vị trí ảnh làm thumbnail
  rating: number;
  capacity?: number;
  status: "pending" | "approved" | "rejected" | "hidden";
  rejectionReason?: string; // Lý do từ chối bài đăng
  hiddenReason?: string; // Lý do Admin tạm ẩn bài đăng
  createdAt: string;
  // Hotel specific fields
  stars?: number;
  totalRooms?: number; // Tổng số lượng phòng ở cơ sở lưu trú
  policies?: string[] | string; // Các chính sách đi kèm (dạng mảng string[])
  amenities?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  roomType?: string;
  // FnB specific fields (Restaurant/Cafe)
  openingHours?: string;
  cuisineType?: string;
  dietaryOptions?: string[];
  // Attraction specific fields
  childPrice?: number;
  ticketIncludes?: string;
  // Transportation specific fields
  vehicleType?: string;
  seats?: number;
  // Activity specific fields
  duration?: string;
  ageRestriction?: string;
  difficultyLevel?: string;
  safetyGear?: string;
}

// Room booking for accommodation providers
export interface RoomBooking {
  id: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  numberOfRooms: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  bookingDate: string;
  specialRequests?: string;
  rejectionReason?: string;
}
export interface CustomTourRequest {
  id: string;
  userId?: string;
  // Business / contact info
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  // Tour design
  destinations: string;
  departureDate: string;
  returnDate: string;
  numberOfPeople: string;
  budgetPerPerson?: string;
  hotelStars?: string;
  additionalInfo?: string;
  // Target company
  targetCompanyId: string;
  targetCompanyName: string;
  // Lifecycle
  status: "pending" | "reviewing" | "designed" | "quoted" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
  // Company response & Designed tour
  companyNote?: string;
  quotedPricePerPerson?: number;
  responseAt?: string;
  designedTourId?: string; // ID của Tour được thiết kế riêng cho yêu cầu này
  currentVersion?: number; // Phiên bản tour hiện tại
  // Multi-company co-hosting / B2B partnership
  isCoHosted?: boolean;
  coHosts?: TourCoHost[];
}
