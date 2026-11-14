import { http } from "@/app/lib/http";

// ---------------------------------------------------------------- Đánh giá (feedback)

export interface ReviewableBooking {
  bookingId: number;
  bookingCode: string;
  tourId?: number | null;
  tourName?: string | null;
  agencyName?: string | null;
  startDate: string;
  completedAt: string;
  deadline: string;
}

export interface MyFeedback {
  id: number;
  bookingId: number;
  bookingCode: string;
  tourId?: number | null;
  tourName?: string | null;
  agencyName?: string | null;
  rating: number;
  comment?: string | null;
  agencyReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

export interface PublicReview {
  id: number;
  customerName: string;
  rating: number;
  comment?: string | null;
  tourName?: string | null;
  agencyReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

/** distribution[0] = số đánh giá 1★ … distribution[4] = số đánh giá 5★. */
export interface TourReviews {
  tourId: number;
  average: number;
  count: number;
  distribution: number[];
  reviews: PublicReview[];
}

/** score: điểm đã điều chỉnh (dùng xếp hạng); average: trung bình thật hiển thị cho khách. */
export interface AgencyRating {
  agencyId: string;
  score: number;
  average: number;
  count: number;
  distribution: number[];
}

export interface AgencyFeedback {
  id: number;
  bookingId: number;
  bookingCode: string;
  tourId?: number | null;
  tourName?: string | null;
  customerName: string;
  rating: number;
  comment?: string | null;
  agencyReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

export const listMyFeedbacks = () => http<MyFeedback[]>("/me/feedbacks");
export const listReviewableBookings = () => http<ReviewableBooking[]>("/me/feedbacks/reviewable-bookings");
export const createFeedback = (bookingId: number, rating: number, comment: string) =>
  http<MyFeedback>("/me/feedbacks", { method: "POST", body: JSON.stringify({ bookingId, rating, comment: comment.trim() || null }) });

export const getTourReviews = (tourId: number | string) => http<TourReviews>(`/tours/${tourId}/reviews`);
export const getAgencyRating = (agencyId: string) => http<AgencyRating>(`/agencies/${encodeURIComponent(agencyId)}/rating`);

export const getAgencyFeedbacks = () => http<{ rating: AgencyRating; items: AgencyFeedback[] }>("/agency/feedbacks");
export const replyToFeedback = (id: number, reply: string) =>
  http<AgencyFeedback>(`/agency/feedbacks/${id}/reply`, { method: "PUT", body: JSON.stringify({ reply }) });

/** Đánh giá 1–2 sao: gợi ý chuyển sang gửi khiếu nại. */
export const isLowRating = (rating: number) => rating > 0 && rating <= 2;

// ---------------------------------------------------------------- Khiếu nại (complaint)

export type ComplaintType = "Trip" | "Platform";
export type ComplaintStatus = "Pending" | "InReview" | "Resolved" | "Rejected";

export interface ComplaintBookingOption {
  bookingId: number;
  bookingCode: string;
  tourName?: string | null;
  agencyName?: string | null;
  startDate: string;
  completedAt: string;
  deadline: string;
  canComplain: boolean;
}

export interface ComplaintSummary {
  id: number;
  type: ComplaintType;
  reasonCode: string;
  title: string;
  status: ComplaintStatus;
  bookingId?: number | null;
  bookingCode?: string | null;
  tourName?: string | null;
  agencyId?: string | null;
  agencyName?: string | null;
  customerId: string;
  customerName: string;
  createdAt: string;
  updatedAt?: string | null;
  resolvedAt?: string | null;
}

export interface ComplaintDetail {
  id: number;
  type: ComplaintType;
  reasonCode: string;
  title: string;
  description: string;
  evidence: string[];
  status: ComplaintStatus;
  bookingId?: number | null;
  bookingCode?: string | null;
  tourName?: string | null;
  startDate?: string | null;
  agencyId?: string | null;
  agencyName?: string | null;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  resolvedAt?: string | null;
}

export interface AgencyComplaintStat {
  agencyId: string;
  agencyName: string;
  total: number;
  open: number;
  upheld: number;
  dismissed: number;
}

export const MAX_EVIDENCE_IMAGES = 5;
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Kiểm tra ảnh trước khi gửi; trả về thông báo lỗi hoặc null. */
export function validateEvidence(files: File[]): string | null {
  if (files.length > MAX_EVIDENCE_IMAGES) return `Tối đa ${MAX_EVIDENCE_IMAGES} ảnh.`;
  if (files.some((f) => !EVIDENCE_TYPES.includes(f.type))) return "Chỉ nhận ảnh JPEG, PNG hoặc WebP.";
  if (files.some((f) => f.size > MAX_EVIDENCE_BYTES)) return "Mỗi ảnh tối đa 5 MB.";
  return null;
}

export const TRIP_REASONS: Record<string, string> = {
  accommodation_food: "Khách sạn / bữa ăn không đúng cam kết",
  schedule_change: "Thay đổi lịch trình / xe đón trễ",
  guide_attitude: "Thái độ hoặc chất lượng hướng dẫn viên",
  service_quality: "Chất lượng dịch vụ tham quan",
  pricing_billing: "Chi phí / yêu cầu thanh toán không hợp lệ",
  other: "Vấn đề khác",
};

export const PLATFORM_REASONS: Record<string, string> = {
  payment_refund: "Thanh toán / hoàn tiền bị lỗi",
  account: "Tài khoản",
  app_error: "Lỗi website / ứng dụng",
  other: "Vấn đề khác",
};

export const reasonLabel = (type: ComplaintType, code: string) =>
  (type === "Trip" ? TRIP_REASONS : PLATFORM_REASONS)[code] ?? code;

export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatus, string> = {
  Pending: "Chờ Admin xem xét",
  InReview: "Chờ Admin xem xét",
  Resolved: "Được chấp nhận",
  Rejected: "Không được chấp nhận",
};

export const COMPLAINT_STATUS_STYLE: Record<ComplaintStatus, string> = {
  Pending: "bg-amber-50 text-amber-800 border-amber-200",
  InReview: "bg-sky-50 text-sky-800 border-sky-200",
  Resolved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-800 border-rose-200",
};

export const isComplaintOpen = (status: ComplaintStatus) => status === "Pending" || status === "InReview";

function complaintForm(fields: Record<string, string | number | null | undefined>, files: File[]) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value !== null && value !== undefined && value !== "") form.append(key, String(value));
  for (const file of files) form.append("Images", file, file.name);
  return form;
}

export const listMyComplaints = () => http<ComplaintSummary[]>("/me/complaints");
export const getMyComplaint = (id: number) => http<ComplaintDetail>(`/me/complaints/${id}`);
export const listComplaintBookingOptions = () => http<ComplaintBookingOption[]>("/me/complaints/booking-options");
export const createComplaint = (input: {
  type: ComplaintType; bookingId?: number | null; reasonCode: string; title: string; description: string; files: File[];
}) => http<ComplaintDetail>("/me/complaints", {
  method: "POST",
  body: complaintForm({ Type: input.type, BookingId: input.type === "Trip" ? input.bookingId : null, ReasonCode: input.reasonCode,
    Title: input.title.trim(), Description: input.description.trim() }, input.files),
});

export const listAdminComplaints = (filter?: { status?: string; type?: string }) => {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.type) params.set("type", filter.type);
  const qs = params.toString();
  return http<ComplaintSummary[]>(`/admin/complaints${qs ? `?${qs}` : ""}`);
};
export const getAdminComplaint = (id: number) => http<ComplaintDetail>(`/admin/complaints/${id}`);
export const resolveComplaint = (id: number, outcome: "Resolved" | "Rejected", note: string) =>
  http<ComplaintDetail>(`/admin/complaints/${id}/resolve`, { method: "POST", body: JSON.stringify({ outcome, note: note.trim() }) });
export const listAgencyComplaintStats = () => http<AgencyComplaintStat[]>("/admin/complaints/agency-stats");

export const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "";
export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
