import { http } from "@/app/lib/http";

/** Trạng thái một khoản quyết toán (một Agency trong một booking). */
export type SettlementStatus = "Unpaid" | "Ready" | "Processing" | "Paid" | "Failed" | "OnHold";

export interface SettlementDto {
  id: number;
  bookingId: number;
  bookingCode: string;
  tourName?: string | null;
  startDate: string;
  agencyId: string;
  agencyName: string;
  isHost: boolean;
  bookingStatus: string;
  paymentStatus?: string | null;
  bookingTotal: number;
  /** Tiền khách đã trả (trừ phần đã hoàn). */
  customerPaid: number;
  /** Phần tiền thuộc Agency này. */
  grossAmount: number;
  feePercent: number;
  platformFee: number;
  /** Agency nhận = grossAmount − platformFee (hoặc số đã chuyển thực tế). */
  netPayout: number;
  status: SettlementStatus;
  tourCompletedAt?: string | null;
  autoPayoutAt?: string | null;
  payoutMethod?: "PAYOS" | "MANUAL" | null;
  payoutReference?: string | null;
  payoutAttempts: number;
  transferredAt?: string | null;
  bankReferenceCode?: string | null;
  payoutNote?: string | null;
  settledBy?: string | null;
  bankName?: string | null;
  bankBin?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  openComplaints: number;
  hasOpenRefund: boolean;
  /** Lý do chưa chuyển được kể cả thủ công. */
  payoutBlockers: string[];
  /** Lý do chưa chuyển TỰ ĐỘNG (rỗng = lượt quét kế tiếp sẽ chuyển). */
  autoBlockers: string[];
}

export interface SettlementRunResult {
  configured: boolean;
  started: number;
  synced: number;
  waiting: number;
  errors: string[];
}

export interface AgencyPayoutAccountDto {
  bankName?: string | null;
  bankBin?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  updatedAt?: string | null;
  configured: boolean;
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

// ------------------------------------------------------------ Admin

export const listSettlements = (status?: SettlementStatus) =>
  http<SettlementDto[]>(`/admin/settlements${status ? `?status=${status}` : ""}`);

/** Chuyển ngay qua chi hộ payOS (tiền thật). amount bỏ trống = đúng số Agency được nhận. */
export const payoutSettlement = (id: number, amount?: number | null, note?: string | null) =>
  http<SettlementDto>(`/admin/settlements/${id}/payout`, json({ amount: amount ?? null, note: note || null }));

export const syncSettlement = (id: number) =>
  http<SettlementDto>(`/admin/settlements/${id}/payout/sync`, { method: "POST" });

/** Admin đã tự chuyển khoản: ghi nhận mã giao dịch ngân hàng. */
export const recordManualSettlement = (id: number, transactionCode: string, amount?: number | null, note?: string | null) =>
  http<SettlementDto>(`/admin/settlements/${id}/manual`, json({ transactionCode, amount: amount ?? null, note: note || null }));

export const holdSettlement = (id: number, reason: string) =>
  http<SettlementDto>(`/admin/settlements/${id}/hold`, json({ reason }));

export const releaseSettlement = (id: number) =>
  http<SettlementDto>(`/admin/settlements/${id}/release`, { method: "POST" });

/** Chạy lượt chuyển tự động ngay (cùng điều kiện với tác vụ chạy ngầm). */
export const runSettlements = () => http<SettlementRunResult>(`/admin/settlements/run`, { method: "POST" });

// ------------------------------------------------------------ Admin: STK sàn + phí sàn

export interface PlatformBankAccountDto {
  bankName?: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  branch?: string | null;
  notes?: string | null;
  /** Phí sàn (%) áp dụng cho tour hoàn thành từ bây giờ. */
  commissionPercent: number;
  updatedAt?: string | null;
  configured: boolean;
}

export const getPlatformBankAccount = () => http<PlatformBankAccountDto>(`/admin/platform-bank-account`);

export const savePlatformBankAccount = (input: {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  notes?: string;
  commissionPercent: number;
}) => http<PlatformBankAccountDto>(`/admin/platform-bank-account`, { method: "PUT", body: JSON.stringify(input) });

// ------------------------------------------------------------ Agency

export const getAgencyPayoutAccount = () => http<AgencyPayoutAccountDto>(`/agency/payout-account`);

export const saveAgencyPayoutAccount = (bankName: string, accountNumber: string, accountHolder: string) =>
  http<AgencyPayoutAccountDto>(`/agency/payout-account`, {
    method: "PUT",
    body: JSON.stringify({ bankName, accountNumber, accountHolder }),
  });

export const listAgencySettlements = () => http<SettlementDto[]>(`/agency/settlements`);

// ------------------------------------------------------------ hiển thị

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  Unpaid: "Tour chưa xong",
  Ready: "Chờ chuyển",
  Processing: "Đang chuyển",
  Paid: "Đã chuyển",
  Failed: "Chuyển lỗi",
  OnHold: "Tạm giữ",
};

export const SETTLEMENT_STATUS_STYLE: Record<SettlementStatus, string> = {
  Unpaid: "bg-gray-100 text-gray-700 border-gray-200",
  Ready: "bg-amber-50 text-amber-800 border-amber-200",
  Processing: "bg-sky-50 text-sky-800 border-sky-200",
  Paid: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Failed: "bg-rose-50 text-rose-800 border-rose-200",
  OnHold: "bg-violet-50 text-violet-800 border-violet-200",
};

export const formatVND = (n: number | null | undefined) => `${Math.round(n ?? 0).toLocaleString("vi-VN")}đ`;
