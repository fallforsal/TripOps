import { http } from "@/app/lib/http";
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

export const saveContractTemplate = (input: {
  tiers: CancellationTier[];
  cancellationNote: string;
  additionalTerms: string;
  /** Mã điều → nội dung; null hoặc trùng bản mặc định thì dùng bản mặc định. */
  clauses: Record<string, string | null>;
}) =>
  http<ContractTemplateDto>("/agency/contract-template", {
    method: "PUT",
    body: JSON.stringify({
      tiers: input.tiers,
      cancellationNote: input.cancellationNote.trim() || null,
      additionalTerms: input.additionalTerms.trim() || null,
      clauses: input.clauses,
    }),
  });
