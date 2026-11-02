import type { User } from "@/app/types";

// Agency cấp tài khoản trực tiếp; không sử dụng lời mời kích hoạt qua email.
export type GuideMobileAccountStatus = "active" | "suspended";
export type GuideWorkStatus = "available" | "on_tour" | "unavailable";

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
  role: "lead_guide" | "support_guide" | "stage_guide" | "logistics";
  stageName?: string;
  status: "in_progress" | "upcoming" | "completed" | "cancelled";
  notes?: string;
}

export interface AgencyGuideProfile extends User {
  assignments?: GuideAssignedTourItem[];
  canDelete?: boolean;
  canReactivate?: boolean;
  workStatus?: GuideWorkStatus;
  languages: string[];
  routes: string[];
  specialties: string[];
  experienceYears: number;
  mobileAccountStatus: GuideMobileAccountStatus;
  lastLoginAt?: string;
  suspendedAt?: string;
  suspendedReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Hợp đồng API quản lý HDV nội bộ Agency.
export interface ListAgencyGuidesQuery {
  search?: string;
  mobileAccountStatus?: GuideMobileAccountStatus | "all";
  workStatus?: GuideWorkStatus | "all";
  page?: number;
  pageSize?: number;
}
export interface AgencyGuideListResponse {
  items: AgencyGuideProfile[];
  total: number;
  page: number;
  pageSize: number;
  summary: { totalGuides: number; availableCount: number; onTourCount: number; suspendedCount: number };
}
export interface AgencyGuideDetailResponse {
  guide: AgencyGuideProfile;
  assignments: GuideAssignedTourItem[];
  eligibility: GuideAssignmentEligibility;
}
export interface CreateAgencyGuideRequest {
  name: string;
  email: string;
  phone: string;
  password: string; // Chỉ gửi lúc tạo, không lưu trong hồ sơ hoặc trả về API.
  avatar?: string;
  languages: string[];
  routes: string[];
  specialties: string[];
  experienceYears: number;
  bio?: string;
}
export type CreateAgencyGuideResponse = AgencyGuideProfile;
export type UpdateAgencyGuideRequest = Omit<CreateAgencyGuideRequest, "password">;
// PUT /api/v1/agency/guides/:guideId/password
export interface ChangeGuidePasswordRequest { newPassword: string; confirmPassword: string }
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
export interface GetGuideAssignmentsQuery {
  guideId: string;
  status?: "all" | "in_progress" | "upcoming" | "completed" | "cancelled";
}
export interface GetGuideAssignmentsResponse { guideId: string; items: GuideAssignedTourItem[] }

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
// 4. HELPER NGHIỆP VỤ: TRẠNG THÁI CÔNG VIỆC, ĐIỀU KIỆN PHÂN CÔNG
// ============================================================================

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

export interface GuideAssignmentEligibility {
  canAssign: boolean;
  reasons: string[];
  primaryBlocker?: string;
}

/** Điều kiện nhận phân công: tài khoản do Agency cấp đang hoạt động. */
export function evaluateGuideEligibility(guide: AgencyGuideProfile): GuideAssignmentEligibility {
  const reasons = guide.mobileAccountStatus === "suspended" || guide.guideStatus === "inactive"
    ? ["Tài khoản HDV đang bị tạm khóa bởi Agency."] : [];
  return { canAssign: reasons.length === 0, reasons, primaryBlocker: reasons[0] };
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
 * Trạng thái công việc được suy ra từ lịch phân công và trạng thái tài khoản.
 * Phân biệt rõ:
 * - "Đang dẫn đoàn" (on_tour): suy ra từ lịch phân công đang chạy (in_progress)
 * Tài khoản tạm khóa không được nhận phân công mới.
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

  if (guide.mobileAccountStatus === "suspended" || guide.guideStatus === "inactive") {
    return {
      workStatus: "unavailable",
      workLabel: "Ngừng phân công",
      workSubLabel: "Do tài khoản đang tạm khóa",
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
        ? `Có ${upcomingAssignments.length} lịch sắp tới`
        : "Sẵn sàng nhận đoàn ngay",
    activeAssignment: null,
    upcomingAssignments,
    completedAssignments,
  };
}
