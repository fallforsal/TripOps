import { http } from "@/app/lib/http";
import type { BusinessProfile } from "@/app/types";
export interface PartnerApplication {
  profile: BusinessProfile & { id: number };
  name: string;
  email: string;
  phone?: string;
  role: "agency" | "provider";
}
export interface PartnerPage {
  items: PartnerApplication[];
  total: number;
  page: number;
  pageSize: number;
}
export const partnerService = {
  submit: (form: FormData) =>
    http<BusinessProfile>("/me/business-profile/submit", {
      method: "POST",
      body: form,
    }),
  list: (query: URLSearchParams, signal?: AbortSignal) =>
    http<PartnerPage>(`/admin/partner-applications?${query}`, { signal }),
  approve: (id: number) =>
    http<BusinessProfile>(`/admin/partner-applications/${id}/approve`, {
      method: "POST",
    }),
  reject: (id: number, reason: string) =>
    http<BusinessProfile>(`/admin/partner-applications/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
