import { ApiError, http } from "@/app/lib/http";
import type { CancellationTier, PolicyRow } from "@/app/lib/contractTemplate";

export interface ContractTemplateDto {
  tiers: CancellationTier[];
  cancellationNote?: string | null;
  additionalTerms?: string | null;
  /** true = Agency chưa soạn mẫu, đang dùng chính sách mặc định của TripOps. */
  isDefault: boolean;
  updatedAt?: string | null;
  preview: PolicyRow[];
  /** Đủ các điều của hợp đồng theo thứ tự in (trừ điều khoản bổ sung). */
  clauses: ContractClauseDto[];
}

/** Một điều của hợp đồng: nội dung đang dùng và bản mặc định của TripOps để khôi phục. */
export interface ContractClauseDto {
  key: string;
  title: string;
  /** Phần hệ thống tự điền từ đơn đặt (bảng lịch trình, bảng giá…), in trước nội dung chữ. */
  autoContent?: string | null;
  text: string;
  defaultText: string;
  isCustom: boolean;
}

/** Chính sách hủy hiển thị cho khách (trang tour, báo giá hủy). */
export interface CancellationPolicyDto {
  rows: PolicyRow[];
  note?: string | null;
  isDefault: boolean;
}

export const getContractTemplate = () => http<ContractTemplateDto>("/agency/contract-template");

export interface ContractTemplateInput {
  tiers: CancellationTier[];
  cancellationNote: string;
  additionalTerms: string;
  /** Mã điều → nội dung; null hoặc trùng bản mặc định thì dùng bản mặc định. */
  clauses: Record<string, string | null>;
}

const body = (input: ContractTemplateInput) => JSON.stringify({
  tiers: input.tiers,
  cancellationNote: input.cancellationNote.trim() || null,
  additionalTerms: input.additionalTerms.trim() || null,
  clauses: input.clauses,
});

export const saveContractTemplate = (input: ContractTemplateInput) =>
  http<ContractTemplateDto>("/agency/contract-template", { method: "PUT", body: body(input) });

const apiBase = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

/** PDF hợp đồng mẫu theo nội dung đang soạn (chưa lưu), cùng cách trình bày với hợp đồng khách nhận. */
export async function previewContractTemplate(input: ContractTemplateInput): Promise<Blob> {
  const response = await fetch(`${apiBase}/api/v1/files/contract-template/preview`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: body(input),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const errors = data?.errors ? Object.values(data.errors).flat().join(" ") : "";
    throw new ApiError(response.status, errors || data?.title || data?.detail || `Không tạo được bản xem trước (${response.status})`);
  }
  return response.blob();
}

/** Hợp đồng mẫu của tour công khai theo mẫu Agency đã lưu (khách xem trước khi đặt). */
export const contractSampleUrl = (tourId: number | string) => `${apiBase}/api/v1/files/tours/${tourId}/contract-sample`;
