import { http } from "@/app/lib/http";

/** UC-068/UC-069: Agency chủ trì xem (chỉ đọc) lịch sử và chi tiết hoàn tiền của khách. */
export type AgencyRefundStatus = "Pending" | "Reviewing" | "Approved" | "Rejected" | "Completed";

export interface AgencyRefundDto {
  id: number;
  bookingId: number;
  bookingCode: string;
  tourName?: string | null;
  startDate: string;
  customerName?: string | null;
  reason: string;
  reasonDetail: string;
  status: AgencyRefundStatus;
  requestedByRole: "customer" | "agency";
  paidAmount: number;
  feePercent: number;
  fee: number;
  suggestedRefund: number;
  approvedRefundAmount?: number | null;
  /** Dạng che, ví dụ "Vietcombank ****6789". Không bao giờ là số đầy đủ. */
  refundBankMasked?: string | null;
  adminNote?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  completedAt?: string | null;
  /** Tiền Agency nhận cho booking này; null = booking chưa có khoản quyết toán. */
  agencyNetPayout?: number | null;
  agencySettlementStatus?: string | null;
}

export const listAgencyRefunds = (filter?: { status?: string; from?: string; to?: string; search?: string }) => {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.from) params.set("from", filter.from);
  if (filter?.to) params.set("to", filter.to);
  if (filter?.search) params.set("search", filter.search);
  const qs = params.toString();
  return http<AgencyRefundDto[]>(`/agency/refunds${qs ? `?${qs}` : ""}`);
};

export const getAgencyRefund = (id: number) => http<AgencyRefundDto>(`/agency/refunds/${id}`);

export const REFUND_STATUS_LABEL: Record<AgencyRefundStatus, string> = {
  Pending: "Chờ Admin duyệt",
  Reviewing: "Admin đang xem xét",
  Approved: "Đã duyệt, đang hoàn tiền",
  Rejected: "Bị từ chối",
  Completed: "Đã hoàn tiền",
};

export const REFUND_STATUS_STYLE: Record<AgencyRefundStatus, string> = {
  Pending: "bg-amber-50 text-amber-800 border-amber-200",
  Reviewing: "bg-sky-50 text-sky-800 border-sky-200",
  Approved: "bg-violet-50 text-violet-800 border-violet-200",
  Rejected: "bg-rose-50 text-rose-800 border-rose-200",
  Completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export const REFUND_REASON_LABEL: Record<string, string> = {
  PRICE_REDUCTION: "Hoàn do giảm giá (tour tiếp tục)",
  CUSTOMER_REQUEST: "Khách đổi kế hoạch",
  WEATHER_FORCE_MAJEURE: "Thời tiết / bất khả kháng",
  SERVICE_QUALITY: "Không đồng ý điều chỉnh dịch vụ",
  DUPLICATE_PAYMENT: "Thanh toán trùng lặp",
  TOUR_CANCELLED: "Agency hủy tour",
  PAYMENT_OVERDUE: "Quá hạn thanh toán",
  OTHER: "Lý do khác",
};
