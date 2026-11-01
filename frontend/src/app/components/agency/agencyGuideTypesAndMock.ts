import { Booking, GuideSchedule, Tour, User } from "@/app/types";

// ============================================================================
// 1. FRONTEND TYPES CHO QUẢN LÝ HƯỚNG DẪN VIÊN NỘI BỘ AGENCY
// ============================================================================

/**
 * Trạng thái tài khoản ứng dụng Mobile dành cho Tour Guide (do Agency quản lý & hệ thống xác thực)
 * - not_invited: Đã tạo hồ sơ nhân sự nhưng chưa gửi email mời kích hoạt
 * - pending_activation: Đã gửi liên kết kích hoạt có hạn qua email, chờ HDV tự đặt mật khẩu
 * - active: HDV đã kích hoạt tài khoản và có thể đăng nhập ứng dụng Mobile Tour Guide
 * - suspended: Agency chủ động tạm khóa quyền đăng nhập và chặn phân công tour mới
 */
export type GuideMobileAccountStatus =
  | "not_invited"
  | "pending_activation"
  | "active"
  | "suspended";

/**
 * Trạng thái công việc của HDV (được suy ra từ lịch phân công và điều kiện hành nghề)
 * - on_tour: Đang dẫn đoàn (có lịch phân công tour đang diễn ra)
 * - available: Sẵn sàng nhận đoàn (không đang dẫn đoàn, tài khoản đã kích hoạt, thẻ còn hạn)
 * - unavailable: Tạm ngưng / Không khả dụng (do tài khoản tạm khóa, chưa kích hoạt hoặc thẻ hết hạn)
 */
export type GuideWorkStatus = "available" | "on_tour" | "unavailable";

/**
 * Trạng thái thời hạn thẻ hành nghề HDV
 * - valid: Còn hạn (> 60 ngày)
 * - expiring_soon: Sắp hết hạn (còn từ 0 đến 60 ngày)
 * - expired: Đã hết hạn (< 0 ngày)
 */
export type LicenseExpiryStatus = "valid" | "expiring_soon" | "expired";

/**
 * Thông tin lịch tour được phân công cho HDV
 */
export interface GuideAssignedTourItem {
  id: string;
  bookingId: string;
  bookingCode: string;
  tourId: string;
  tourCode: string;
  tourName: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  guestCount: number;
  customerName: string;
  customerPhone?: string;
  role: "lead_guide" | "support_guide" | "stage_guide";
  stageName?: string;
  status: "in_progress" | "upcoming" | "completed" | "cancelled";
  notes?: string;
}

/**
 * Hồ sơ nhân sự & tài khoản Mobile của Hướng dẫn viên thuộc Agency
 * Mở rộng từ User dùng chung của hệ thống TripOps
 */
export interface AgencyGuideProfile extends User {
  guideType: "domestic" | "international";
  licenseNumber: string;
  licenseExpiryDate: string; // YYYY-MM-DD
  issuingAuthority?: string;
  languages: string[];
  routes: string[]; // Tuyến / địa bàn hoạt động
  specialties: string[]; // Kỹ năng sở trường
  experienceYears: number;
  mobileAccountStatus: GuideMobileAccountStatus;
  previousAccountStatus?: Exclude<GuideMobileAccountStatus, "suspended">;
  invitationSentAt?: string;
  invitationExpiresAt?: string;
  invitationCount?: number;
  activatedAt?: string;
  lastLoginAt?: string;
  suspendedAt?: string;
  suspendedReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// 2. BACKEND API CONTRACTS (CHƯA TRIỂN KHAI BACKEND - ĐỊNH NGHĨA ĐỂ TÍCH HỢP SAU)
// ============================================================================

/**
 * [API 1] GET /api/agency/guides
 * Lấy danh sách HDV thuộc agency đang đăng nhập (tự động lọc theo agencyId từ JWT token)
 */
export interface ListAgencyGuidesQuery {
  search?: string;
  mobileAccountStatus?: GuideMobileAccountStatus | "all";
  workStatus?: GuideWorkStatus | "all";
  guideType?: "domestic" | "international" | "all";
  licenseAlert?: "all" | "expiring_or_expired";
  page?: number;
  pageSize?: number;
}

export interface AgencyGuideListResponse {
  items: AgencyGuideProfile[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalGuides: number;
    availableCount: number;
    onTourCount: number;
    pendingActivationCount: number;
    suspendedCount: number;
    expiringOrExpiredLicenseCount: number;
  };
}

/**
 * [API 2] GET /api/agency/guides/:guideId
 * Lấy chi tiết hồ sơ nhân sự, trạng thái tài khoản mobile và tóm tắt lịch phân công của 1 HDV
 */
export interface AgencyGuideDetailResponse {
  guide: AgencyGuideProfile;
  assignments: GuideAssignedTourItem[];
  eligibility: GuideAssignmentEligibility;
}

/**
 * [API 3] POST /api/agency/guides
 * Tạo hồ sơ HDV mới thuộc đội ngũ Agency và tùy chọn gửi email mời kích hoạt tài khoản Mobile App.
 * LƯU Ý BẢO MẬT: Không gửi hoặc nhận mật khẩu. Backend tạo one-time activation token (hạn 48h)
 * và gửi đường dẫn đặt mật khẩu tới email của HDV.
 */
export interface CreateAgencyGuideRequest {
  name: string;
  email: string;
  phone: string;
  guideType: "domestic" | "international";
  licenseNumber: string;
  licenseExpiryDate: string; // YYYY-MM-DD
  issuingAuthority?: string;
  languages: string[];
  routes: string[];
  specialties: string[];
  experienceYears: number;
  bio?: string;
  sendActivationInviteImmediately: boolean;
}

export interface CreateAgencyGuideResponse {
  guide: AgencyGuideProfile;
  invitationSent: boolean;
  invitationExpiresAt?: string;
}

/**
 * [API 4] PUT /api/agency/guides/:guideId
 * Cập nhật hồ sơ nhân sự & nghiệp vụ của HDV.
 * Không tự động ghi đè hay làm thay đổi dữ liệu các tour/booking đã phân công trước đó.
 */
export interface UpdateAgencyGuideRequest {
  name: string;
  email: string;
  phone: string;
  guideType: "domestic" | "international";
  licenseNumber: string;
  licenseExpiryDate: string;
  issuingAuthority?: string;
  languages: string[];
  routes: string[];
  specialties: string[];
  experienceYears: number;
  bio?: string;
}

/**
 * [API 5] POST /api/agency/guides/:guideId/send-invitation
 * Gửi lần đầu hoặc gửi lại lời mời kích hoạt tài khoản ứng dụng Mobile cho HDV chưa kích hoạt.
 * Thu hồi token cũ (nếu có) và phát hành liên kết kích hoạt mới có hạn 48 giờ.
 */
export interface SendGuideInvitationRequest {
  guideId: string;
  customMessage?: string;
}

export interface SendGuideInvitationResponse {
  guideId: string;
  email: string;
  mobileAccountStatus: "pending_activation";
  invitationSentAt: string;
  invitationExpiresAt: string;
  invitationCount: number;
}

/**
 * [API 6] PATCH /api/agency/guides/:guideId/account-status
 * Khóa (suspended) hoặc mở khóa tài khoản Mobile của HDV.
 * Nếu HDV đang có lịch tour sắp khởi hành, FE cần hiển thị cảnh báo và gửi cờ confirmWithUpcomingTours = true.
 */
export interface UpdateGuideAccountStatusRequest {
  guideId: string;
  action: "suspend" | "reactivate";
  reason?: string;
  confirmWithUpcomingTours?: boolean;
}

export interface UpdateGuideAccountStatusResponse {
  guide: AgencyGuideProfile;
  affectedUpcomingTourCount: number;
}

/**
 * [API 7] GET /api/agency/guides/:guideId/assignments
 * Lấy danh sách lịch phân công dẫn đoàn của HDV (đang dẫn, sắp khởi hành, lịch sử đã hoàn thành)
 */
export interface GetGuideAssignmentsQuery {
  guideId: string;
  status?: "all" | "in_progress" | "upcoming" | "completed";
}

export interface GetGuideAssignmentsResponse {
  guideId: string;
  items: GuideAssignedTourItem[];
}

// ============================================================================
// 3. DANH MỤC GỢI Ý CHO MULTI-SELECT / TAG INPUT
// ============================================================================

export const COMMON_GUIDE_LANGUAGES: string[] = [
  "Tiếng Việt",
  "Tiếng Anh",
  "Tiếng Pháp",
  "Tiếng Trung",
  "Tiếng Hàn",
  "Tiếng Nhật",
  "Tiếng Đức",
  "Tiếng Nga",
  "Tiếng Tây Ban Nha",
  "Tiếng Mông",
  "Tiếng Thái",
];

export const COMMON_GUIDE_ROUTES: string[] = [
  "Đà Lạt – Tây Nguyên",
  "Nha Trang – Nam Trung Bộ",
  "Đà Nẵng – Huế – Hội An",
  "Hà Nội – Hạ Long – Ninh Bình",
  "Hà Giang – Đông Tây Bắc",
  "Phú Quốc – Miền Tây sông nước",
  "TP.HCM – Củ Chi – Cần Giờ",
  "Xuyên Việt Inbound",
];

export const COMMON_GUIDE_SPECIALTIES: string[] = [
  "Văn hóa – Lịch sử",
  "Khách đoàn doanh nghiệp (MICE)",
  "MC Gala Dinner & Teambuilding",
  "Trekking & Khám phá thiên nhiên",
  "Ẩm thực & Nghỉ dưỡng cao cấp",
  "Tour gia đình & Người cao tuổi",
  "Nhiếp ảnh & Thuyết minh di sản",
];

// ============================================================================
// 4. HELPER NGHIỆP VỤ: HẠN THẺ, TRẠNG THÁI CÔNG VIỆC, ĐIỀU KIỆN PHÂN CÔNG
// ============================================================================

function formatRelativeDateString(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRelativeDateTimeISO(offsetHours: number): string {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  return d.toISOString();
}

export function formatDateVN(dateStr?: string): string {
  if (!dateStr) return "Chưa cập nhật";
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatDateTimeVN(isoStr?: string): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export interface LicenseCheckResult {
  status: LicenseExpiryStatus;
  daysRemaining: number;
  label: string;
  shortLabel: string;
}

/**
 * Kiểm tra hạn thẻ hành nghề HDV so với ngày hiện tại
 * Cảnh báo sắp hết hạn khi còn <= 60 ngày, đã hết hạn khi < 0 ngày.
 */
export function evaluateLicenseExpiry(expiryDateStr?: string): LicenseCheckResult {
  if (!expiryDateStr) {
    return {
      status: "expired",
      daysRemaining: -1,
      label: "Chưa có hạn thẻ",
      shortLabel: "Thiếu hạn thẻ",
    };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = expiryDateStr.slice(0, 10).split("-").map(Number);
  const expiry = new Date(y, (m || 1) - 1, d || 1);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: "expired",
      daysRemaining,
      label: `Đã hết hạn ${Math.abs(daysRemaining)} ngày`,
      shortLabel: "Đã hết hạn",
    };
  }

  if (daysRemaining <= 60) {
    return {
      status: "expiring_soon",
      daysRemaining,
      label: daysRemaining === 0 ? "Hết hạn hôm nay" : `Sắp hết hạn (còn ${daysRemaining} ngày)`,
      shortLabel: `Còn ${daysRemaining} ngày`,
    };
  }

  return {
    status: "valid",
    daysRemaining,
    label: "Thẻ còn hiệu lực",
    shortLabel: "Còn hạn",
  };
}

export interface GuideAssignmentEligibility {
  canAssign: boolean;
  reasons: string[];
  primaryBlocker?: string;
}

/**
 * Kiểm tra HDV có đủ điều kiện được phân công dẫn tour mới hay không.
 * Quy tắc nghiệp vụ:
 * - Không cho phân công người có tài khoản bị khóa (suspended)
 * - Không cho phân công người có thẻ đã hết hạn (expired)
 * - Không cho phân công người chưa kích hoạt tài khoản ứng dụng Mobile (not_invited / pending_activation)
 */
export function evaluateGuideEligibility(
  guide: AgencyGuideProfile
): GuideAssignmentEligibility {
  const reasons: string[] = [];
  const licenseCheck = evaluateLicenseExpiry(guide.licenseExpiryDate);

  if (guide.mobileAccountStatus === "suspended") {
    reasons.push("Tài khoản ứng dụng Mobile đang bị tạm khóa bởi Agency.");
  } else if (guide.mobileAccountStatus === "not_invited") {
    reasons.push("Chưa gửi lời mời kích hoạt tài khoản ứng dụng Mobile.");
  } else if (guide.mobileAccountStatus === "pending_activation") {
    reasons.push("Hướng dẫn viên chưa hoàn tất kích hoạt tài khoản qua email.");
  }

  if (licenseCheck.status === "expired") {
    reasons.push(
      `Thẻ hành nghề ${guide.licenseNumber} đã hết hạn vào ngày ${formatDateVN(
        guide.licenseExpiryDate
      )}.`
    );
  }

  return {
    canAssign: reasons.length === 0,
    reasons,
    primaryBlocker: reasons[0],
  };
}

export interface DerivedGuideWorkInfo {
  workStatus: GuideWorkStatus;
  workLabel: string;
  workSubLabel: string;
  activeAssignment: GuideAssignedTourItem | null;
  upcomingAssignments: GuideAssignedTourItem[];
  completedAssignments: GuideAssignedTourItem[];
}

/**
 * Suy ra trạng thái công việc của HDV từ lịch phân công và trạng thái thẻ/tài khoản.
 * Phân biệt rõ:
 * - "Đang dẫn đoàn" (on_tour): suy ra từ lịch phân công đang chạy (in_progress)
 * - "Tạm ngưng / Không khả dụng" (unavailable): do tạm khóa tài khoản, chưa kích hoạt hoặc thẻ hết hạn
 * - "Sẵn sàng" (available): đủ điều kiện nhận đoàn và hiện không đang trong chuyến đi
 */
export function deriveGuideWorkInfo(
  guide: AgencyGuideProfile,
  assignments: GuideAssignedTourItem[]
): DerivedGuideWorkInfo {
  const activeAssignment =
    assignments.find((a) => a.status === "in_progress") || null;
  const upcomingAssignments = assignments
    .filter((a) => a.status === "upcoming")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const completedAssignments = assignments
    .filter((a) => a.status === "completed")
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const licenseCheck = evaluateLicenseExpiry(guide.licenseExpiryDate);

  if (activeAssignment) {
    return {
      workStatus: "on_tour",
      workLabel: "Đang dẫn đoàn",
      workSubLabel:
        upcomingAssignments.length > 0
          ? `+${upcomingAssignments.length} lịch sắp tới`
          : `Đến ${formatDateVN(activeAssignment.endDate)}`,
      activeAssignment,
      upcomingAssignments,
      completedAssignments,
    };
  }

  if (guide.mobileAccountStatus === "suspended") {
    return {
      workStatus: "unavailable",
      workLabel: "Ngừng phân công",
      workSubLabel: "Do tài khoản đang tạm khóa",
      activeAssignment: null,
      upcomingAssignments,
      completedAssignments,
    };
  }

  if (licenseCheck.status === "expired") {
    return {
      workStatus: "unavailable",
      workLabel: "Ngừng phân công",
      workSubLabel: "Do thẻ HDV đã hết hạn",
      activeAssignment: null,
      upcomingAssignments,
      completedAssignments,
    };
  }

  if (
    guide.mobileAccountStatus === "not_invited" ||
    guide.mobileAccountStatus === "pending_activation"
  ) {
    return {
      workStatus: "unavailable",
      workLabel: "Chờ kích hoạt App",
      workSubLabel:
        guide.mobileAccountStatus === "not_invited"
          ? "Chưa gửi email kích hoạt"
          : "Chờ HDV đặt mật khẩu",
      activeAssignment: null,
      upcomingAssignments,
      completedAssignments,
    };
  }

  return {
    workStatus: "available",
    workLabel: "Sẵn sàng",
    workSubLabel:
      upcomingAssignments.length > 0
        ? `Có ${upcomingAssignments.length} lịch sắp khởi hành`
        : "Đủ điều kiện nhận đoàn ngay",
    activeAssignment: null,
    upcomingAssignments,
    completedAssignments,
  };
}

// ============================================================================
// 5. DỮ LIỆU MẪU (MOCK DATA) ĐẦY ĐỦ CÁC TRƯỜNG HỢP NGHIỆP VỤ
// ============================================================================

export function createSeedAgencyGuides(
  companyId: string,
  companyName: string
): AgencyGuideProfile[] {
  const domain =
    companyId === "company-4"
      ? "hagiangdiscovery.vn"
      : companyId === "company-2"
      ? "saigontourist.net"
      : companyId === "company-3"
      ? "fiditour.com"
      : "viettravel.com.vn";

  return [
    {
      id: "guide-1",
      name: "Trần Thị Bích",
      email: `bich.tran@${domain}`,
      role: "guide",
      companyId,
      companyName,
      phone: "0908112233",
      guideType: "international",
      licenseNumber: "HDV-QT-2024-0012",
      licenseExpiryDate: formatRelativeDateString(680),
      issuingAuthority: "Cục Du lịch Quốc gia Việt Nam",
      languages: ["Tiếng Việt", "Tiếng Anh", "Tiếng Pháp"],
      routes: ["Đà Lạt – Tây Nguyên", "Nha Trang – Nam Trung Bộ", "Xuyên Việt Inbound"],
      specialties: [
        "Văn hóa – Lịch sử",
        "Khách đoàn doanh nghiệp (MICE)",
        "Thuyết minh di sản",
      ],
      experienceYears: 6,
      guideStatus: "on_tour",
      mobileAccountStatus: "active",
      invitationSentAt: formatRelativeDateTimeISO(-24 * 120),
      activatedAt: formatRelativeDateTimeISO(-24 * 119),
      lastLoginAt: formatRelativeDateTimeISO(-2),
      bio: "Hướng dẫn viên quốc tế kỳ cựu chuyên đoàn doanh nghiệp và khách Pháp – Anh tuyến Miền Trung & Tây Nguyên.",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    },
    {
      id: "guide-2",
      name: "Nguyễn Minh Khoa",
      email: `khoa.nguyen@${domain}`,
      role: "guide",
      companyId,
      companyName,
      phone: "0912345678",
      guideType: "domestic",
      licenseNumber: "HDV-ND-2023-0456",
      licenseExpiryDate: formatRelativeDateString(420),
      issuingAuthority: "Sở Du lịch TP. Hồ Chí Minh",
      languages: ["Tiếng Việt", "Tiếng Anh"],
      routes: ["Hà Giang – Đông Tây Bắc", "Đà Lạt – Tây Nguyên"],
      specialties: [
        "Trekking & Khám phá thiên nhiên",
        "MC Gala Dinner & Teambuilding",
      ],
      experienceYears: 4,
      guideStatus: "active",
      mobileAccountStatus: "active",
      invitationSentAt: formatRelativeDateTimeISO(-24 * 90),
      activatedAt: formatRelativeDateTimeISO(-24 * 89),
      lastLoginAt: formatRelativeDateTimeISO(-6),
      bio: "Chuyên dẫn tour trải nghiệm thiên nhiên, trekking săn mây và hoạt náo teambuilding cho đoàn trẻ.",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    },
    {
      id: "guide-6",
      name: "Lý Hoàng Nam",
      email: `nam.ly@${domain}`,
      role: "guide",
      companyId,
      companyName,
      phone: "0934567890",
      guideType: "international",
      licenseNumber: "HDV-QT-2021-0321",
      licenseExpiryDate: formatRelativeDateString(21),
      issuingAuthority: "Cục Du lịch Quốc gia Việt Nam",
      languages: ["Tiếng Việt", "Tiếng Anh", "Tiếng Hàn"],
      routes: ["Phú Quốc – Miền Tây sông nước", "Đà Nẵng – Huế – Hội An"],
      specialties: [
        "Khách đoàn doanh nghiệp (MICE)",
        "MC Gala Dinner & Teambuilding",
        "Ẩm thực & Nghỉ dưỡng cao cấp",
      ],
      experienceYears: 7,
      guideStatus: "active",
      mobileAccountStatus: "active",
      invitationSentAt: formatRelativeDateTimeISO(-24 * 200),
      activatedAt: formatRelativeDateTimeISO(-24 * 199),
      lastLoginAt: formatRelativeDateTimeISO(-18),
      bio: "HDV chuyên khách đoàn VIP và sự kiện Gala Dinner. Đang chuẩn bị hồ sơ gia hạn thẻ quốc tế.",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    },
    {
      id: "guide-7",
      name: "Phạm Quốc Khánh",
      email: `khanh.pham@${domain}`,
      role: "guide",
      companyId,
      companyName,
      phone: "0977889900",
      guideType: "international",
      licenseNumber: "HDV-QT-2025-0789",
      licenseExpiryDate: formatRelativeDateString(850),
      issuingAuthority: "Cục Du lịch Quốc gia Việt Nam",
      languages: ["Tiếng Việt", "Tiếng Anh", "Tiếng Nhật"],
      routes: ["Hà Nội – Hạ Long – Ninh Bình", "Đà Nẵng – Huế – Hội An"],
      specialties: [
        "Văn hóa – Lịch sử",
        "Nhiếp ảnh & Thuyết minh di sản",
      ],
      experienceYears: 5,
      guideStatus: "active",
      mobileAccountStatus: "pending_activation",
      invitationSentAt: formatRelativeDateTimeISO(-5),
      invitationExpiresAt: formatRelativeDateTimeISO(43),
      invitationCount: 1,
      bio: "HDV tiếng Nhật & tiếng Anh mới gia nhập đội ngũ, đã gửi email mời kích hoạt ứng dụng Mobile.",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
    },
    {
      id: "guide-8",
      name: "Đỗ Ngọc Mai",
      email: `mai.do@${domain}`,
      role: "guide",
      companyId,
      companyName,
      phone: "0945612390",
      guideType: "domestic",
      licenseNumber: "HDV-ND-2025-0915",
      licenseExpiryDate: formatRelativeDateString(910),
      issuingAuthority: "Sở Du lịch TP. Hồ Chí Minh",
      languages: ["Tiếng Việt", "Tiếng Trung"],
      routes: ["TP.HCM – Củ Chi – Cần Giờ", "Phú Quốc – Miền Tây sông nước"],
      specialties: ["Tour gia đình & Người cao tuổi", "Ẩm thực & Nghỉ dưỡng cao cấp"],
      experienceYears: 2,
      guideStatus: "active",
      mobileAccountStatus: "not_invited",
      invitationCount: 0,
      bio: "Nhân sự mới hoàn tất hồ sơ tại phòng điều hành, chờ cấp quyền đăng nhập ứng dụng Tour Guide.",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    },
    {
      id: "guide-9",
      name: "Vũ Đình Trọng",
      email: `trong.vu@${domain}`,
      role: "guide",
      companyId,
      companyName,
      phone: "0983456712",
      guideType: "domestic",
      licenseNumber: "HDV-ND-2022-0114",
      licenseExpiryDate: formatRelativeDateString(310),
      issuingAuthority: "Sở Du lịch Lâm Đồng",
      languages: ["Tiếng Việt"],
      routes: ["Đà Lạt – Tây Nguyên", "Nha Trang – Nam Trung Bộ"],
      specialties: ["Văn hóa – Lịch sử", "Tour gia đình & Người cao tuổi"],
      experienceYears: 5,
      guideStatus: "inactive",
      mobileAccountStatus: "suspended",
      previousAccountStatus: "active",
      activatedAt: formatRelativeDateTimeISO(-24 * 300),
      suspendedAt: formatRelativeDateTimeISO(-24 * 10),
      suspendedReason: "Nghỉ phép cá nhân dài hạn 1 tháng theo đơn xin phép.",
      bio: "Hướng dẫn viên tuyến Đà Lạt – Nha Trang. Hiện đang tạm khóa tài khoản trong thời gian nghỉ phép.",
      avatar:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200",
    },
    {
      id: "guide-10",
      name: "Hoàng Thanh Tùng",
      email: `tung.hoang@${domain}`,
      role: "guide",
      companyId,
      companyName,
      phone: "0962114488",
      guideType: "international",
      licenseNumber: "HDV-QT-2020-0205",
      licenseExpiryDate: formatRelativeDateString(-18),
      issuingAuthority: "Cục Du lịch Quốc gia Việt Nam",
      languages: ["Tiếng Việt", "Tiếng Anh", "Tiếng Đức"],
      routes: ["Xuyên Việt Inbound", "Hà Nội – Hạ Long – Ninh Bình"],
      specialties: ["Văn hóa – Lịch sử", "Nhiếp ảnh & Thuyết minh di sản"],
      experienceYears: 9,
      guideStatus: "active",
      mobileAccountStatus: "active",
      activatedAt: formatRelativeDateTimeISO(-24 * 400),
      lastLoginAt: formatRelativeDateTimeISO(-24 * 4),
      bio: "HDV kỳ cựu chuyên thị trường nói tiếng Đức. Đang chờ cấp lại thẻ HDV Quốc tế mới.",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
    },
  ];
}

export function createSeedGuideAssignments(
  companyName: string
): Record<string, GuideAssignedTourItem[]> {
  return {
    "guide-1": [
      {
        id: "asg-101",
        bookingId: "booking-dl-01",
        bookingCode: "BK-DL2601",
        tourId: "tour-1",
        tourCode: "T001",
        tourName: "Đà Lạt Romantic – Săn Mây Cầu Đất 3N2Đ",
        destination: "Đà Lạt, Lâm Đồng",
        startDate: formatRelativeDateString(-1),
        endDate: formatRelativeDateString(1),
        guestCount: 24,
        customerName: "Đoàn Tập đoàn FPT Telecom",
        customerPhone: "0933 888 999",
        role: "lead_guide",
        status: "in_progress",
        notes: "Đoàn VIP có Gala Dinner tối ngày 2 tại Terracotta Resort.",
      },
      {
        id: "asg-102",
        bookingId: "booking-nt-04",
        bookingCode: "BK-NT2604",
        tourId: "tour-2",
        tourCode: "T002",
        tourName: "Đà Lạt – Nha Trang Biển Hoa Liên Tuyến 5N4Đ",
        destination: "Đà Lạt – Nha Trang",
        startDate: formatRelativeDateString(12),
        endDate: formatRelativeDateString(16),
        guestCount: 30,
        customerName: "Công ty CP Minh Long",
        customerPhone: "0909 234 567",
        role: "lead_guide",
        stageName: "Chặng 1: TP.HCM – Đà Lạt",
        status: "upcoming",
        notes: "Tour liên minh, bàn giao đoàn tại trạm dừng chân Đèo Khánh Lê ngày 3.",
      },
      {
        id: "asg-103",
        bookingId: "booking-old-01",
        bookingCode: "BK-DL2588",
        tourId: "tour-1",
        tourCode: "T001",
        tourName: "Khám Phá Cao Nguyên Lâm Viên 3N2Đ",
        destination: "Đà Lạt",
        startDate: formatRelativeDateString(-25),
        endDate: formatRelativeDateString(-23),
        guestCount: 18,
        customerName: "Gia đình anh Nguyễn Hoàng",
        customerPhone: "0918 765 432",
        role: "lead_guide",
        status: "completed",
        notes: "Hoàn thành tốt, khách đánh giá 5 sao trên hệ thống.",
      },
    ],
    "guide-2": [
      {
        id: "asg-201",
        bookingId: "booking-hg-02",
        bookingCode: "BK-HG2590",
        tourId: "tour-3",
        tourCode: "T003",
        tourName: "Hà Giang – Mã Pí Lèng – Sông Nho Quế 4N3Đ",
        destination: "Hà Giang",
        startDate: formatRelativeDateString(-14),
        endDate: formatRelativeDateString(-11),
        guestCount: 16,
        customerName: "CLB Nhiếp ảnh Trẻ Sài Gòn",
        customerPhone: "0988 112 334",
        role: "lead_guide",
        status: "completed",
        notes: "Đã hoàn tất nghiệm thu và nhật ký điểm danh.",
      },
    ],
    "guide-6": [
      {
        id: "asg-601",
        bookingId: "booking-pq-09",
        bookingCode: "BK-PQ2609",
        tourId: "tour-custom-solo-1",
        tourCode: "T009",
        tourName: `Phú Quốc Sunset Town – Cáp Treo Hòn Thơm 3N2Đ (${companyName})`,
        destination: "Phú Quốc, Kiên Giang",
        startDate: formatRelativeDateString(6),
        endDate: formatRelativeDateString(8),
        guestCount: 15,
        customerName: "Đoàn Chuyên Gia FPT Software",
        customerPhone: "0933 888 999",
        role: "lead_guide",
        status: "upcoming",
        notes: "Đoàn nghỉ dưỡng 5 sao, đón sân bay Phú Quốc chuyến VN1823.",
      },
      {
        id: "asg-602",
        bookingId: "booking-dn-03",
        bookingCode: "BK-DN2570",
        tourId: "tour-4",
        tourCode: "T004",
        tourName: "Hành Trình Di Sản Miền Trung: Huế – Hội An – Đà Nẵng 4N3Đ",
        destination: "Đà Nẵng – Hội An – Huế",
        startDate: formatRelativeDateString(-40),
        endDate: formatRelativeDateString(-37),
        guestCount: 35,
        customerName: "Ngân hàng Á Châu (ACB) Chi nhánh Q3",
        customerPhone: "0903 445 566",
        role: "lead_guide",
        status: "completed",
      },
    ],
    "guide-9": [
      {
        id: "asg-901",
        bookingId: "booking-dl-05",
        bookingCode: "BK-DL2540",
        tourId: "tour-1",
        tourCode: "T001",
        tourName: "Đà Lạt Ngàn Hoa – Làng Cù Lần 3N2Đ",
        destination: "Đà Lạt",
        startDate: formatRelativeDateString(-50),
        endDate: formatRelativeDateString(-48),
        guestCount: 22,
        customerName: "Đoàn Giáo viên Trường THPT Lê Quý Đôn",
        customerPhone: "0913 223 344",
        role: "lead_guide",
        status: "completed",
      },
    ],
    "guide-10": [
      {
        id: "asg-1001",
        bookingId: "booking-hl-01",
        bookingCode: "BK-HL2512",
        tourId: "tour-5",
        tourCode: "T005",
        tourName: "Di Sản Vịnh Hạ Long – Ninh Bình Tràng An 4N3Đ",
        destination: "Quảng Ninh – Ninh Bình",
        startDate: formatRelativeDateString(-65),
        endDate: formatRelativeDateString(-62),
        guestCount: 20,
        customerName: "Đoàn Du khách Đức (Inbound)",
        customerPhone: "0902 998 877",
        role: "lead_guide",
        status: "completed",
      },
    ],
  };
}

export function normalizeToAgencyGuideProfile(
  user: User & Partial<AgencyGuideProfile>,
  companyId: string,
  companyName: string
): AgencyGuideProfile {
  const mobileAccountStatus: GuideMobileAccountStatus =
    user.mobileAccountStatus ||
    (user.guideStatus === "inactive" ? "suspended" : "active");

  return {
    ...user,
    companyId: user.companyId || companyId,
    companyName: user.companyName || companyName,
    phone: user.phone || "0908112233",
    guideType: user.guideType || "domestic",
    licenseNumber: user.licenseNumber || "HDV-ND-2024-0001",
    licenseExpiryDate: user.licenseExpiryDate || formatRelativeDateString(365),
    issuingAuthority: user.issuingAuthority || "Sở Du lịch TP. Hồ Chí Minh",
    languages:
      user.languages && user.languages.length > 0
        ? user.languages
        : ["Tiếng Việt"],
    routes:
      user.routes && user.routes.length > 0
        ? user.routes
        : ["Đà Lạt – Tây Nguyên"],
    specialties:
      user.specialties && user.specialties.length > 0
        ? user.specialties
        : ["Văn hóa – Lịch sử"],
    experienceYears:
      typeof user.experienceYears === "number" ? user.experienceYears : 3,
    mobileAccountStatus,
  };
}

export function mergeGuideAssignments(
  seedMap: Record<string, GuideAssignedTourItem[]>,
  guideSchedules: GuideSchedule[],
  bookings: Booking[],
  tours: Tour[]
): Record<string, GuideAssignedTourItem[]> {
  const result: Record<string, GuideAssignedTourItem[]> = {};
  for (const [k, v] of Object.entries(seedMap)) {
    result[k] = [...v];
  }

  const mapBookingStatus = (
    bStatus: Booking["status"],
    startDateStr: string,
    endDateStr?: string
  ): GuideAssignedTourItem["status"] => {
    if (bStatus === "cancelled" || bStatus === "rejected") return "cancelled";
    if (bStatus === "completed") return "completed";
    if (bStatus === "in_progress") return "in_progress";

    const today = formatRelativeDateString(0);
    const start = (startDateStr || "").slice(0, 10);
    const end = (endDateStr || startDateStr || "").slice(0, 10);
    if (start && start <= today && end >= today) {
      return "in_progress";
    }
    return "upcoming";
  };

  for (const sched of guideSchedules) {
    const b = sched.booking;
    if (!b || !b.guideId) continue;
    const list = result[b.guideId] || [];
    if (list.some((item) => item.bookingId === b.id)) continue;

    list.push({
      id: sched.id,
      bookingId: b.id,
      bookingCode: b.bookingCode || b.id.toUpperCase(),
      tourId: b.tourId,
      tourCode: b.tour?.tourCode || "TOUR",
      tourName: b.tour?.name || "Chuyến du lịch theo đoàn",
      destination: b.tour?.destination || "Việt Nam",
      startDate: b.tourStartDate,
      endDate: b.tourEndDate || b.tourStartDate,
      guestCount: b.numberOfGuests,
      customerName: b.contactName || b.userName,
      customerPhone: b.contactPhone,
      role: "lead_guide",
      status: mapBookingStatus(b.status, b.tourStartDate, b.tourEndDate),
    });
    result[b.guideId] = list;
  }

  for (const b of bookings) {
    const matchedTour = tours.find((t) => t.id === b.tourId) || b.tour;
    const guideEntries: Array<{
      guideId: string;
      role: "lead_guide" | "support_guide" | "stage_guide";
      notes?: string;
    }> = [];

    if (b.guideId) {
      guideEntries.push({ guideId: b.guideId, role: "lead_guide" });
    }
    if (b.assignedGuides && b.assignedGuides.length > 0) {
      for (const ag of b.assignedGuides) {
        if (!guideEntries.some((e) => e.guideId === ag.guideId)) {
          guideEntries.push({
            guideId: ag.guideId,
            role:
              ag.role === "support_guide" || ag.role === "stage_guide"
                ? ag.role
                : "lead_guide",
            notes: ag.notes,
          });
        }
      }
    }

    for (const entry of guideEntries) {
      const list = result[entry.guideId] || [];
      if (list.some((item) => item.bookingId === b.id)) continue;
      list.push({
        id: `bk-asg-${b.id}-${entry.guideId}`,
        bookingId: b.id,
        bookingCode: b.bookingCode || b.id.toUpperCase(),
        tourId: b.tourId,
        tourCode: matchedTour?.tourCode || "TOUR",
        tourName: matchedTour?.name || "Tour đoàn",
        destination: matchedTour?.destination || "Việt Nam",
        startDate: b.tourStartDate,
        endDate: b.tourEndDate || b.tourStartDate,
        guestCount: b.numberOfGuests,
        customerName: b.contactName || b.userName,
        customerPhone: b.contactPhone,
        role: entry.role,
        status: mapBookingStatus(b.status, b.tourStartDate, b.tourEndDate),
        notes: entry.notes,
      });
      result[entry.guideId] = list;
    }
  }

  return result;
}
