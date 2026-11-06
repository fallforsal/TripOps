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
// Kết quả của GET /auth/me và PUT /me/business-profile (AccountDto ở backend).
export interface BusinessAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "agency" | "provider";
  businessProfile?: (BusinessProfile & { id: number }) | null;
}
export const partnerService = {
  submit: (form: FormData) =>
    http<BusinessProfile>("/me/business-profile/submit", {
      method: "POST",
      body: form,
    }),
  me: (signal?: AbortSignal) => http<BusinessAccount>("/auth/me", { signal }),
  updateMine: (form: FormData) =>
    http<BusinessAccount>("/me/business-profile", {
      method: "PUT",
      body: form,
    }),
  list: (query: URLSearchParams, signal?: AbortSignal) =>
    http<PartnerPage>(`/admin/partner-applications?${query}`, { signal }),
  byUserId: async (userId: string, signal?: AbortSignal): Promise<PartnerApplication> => {
    const query = new URLSearchParams({ userId, role: "provider", page: "1", pageSize: "1" });
    const result = await http<PartnerPage>(`/admin/partner-applications?${query}`, { signal });
    const partner = result.items.find(item => item.profile.userId === userId);
    if (!partner) throw new Error("Nhà cung cấp chưa có hồ sơ doanh nghiệp trên hệ thống.");
    return partner;
  },
  approve: (id: number) =>
    http<BusinessProfile>(`/admin/partner-applications/${id}/approve`, {
      method: "POST",
    }),
  reject: (id: number, reason: string) =>
    http<BusinessProfile>(`/admin/partner-applications/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  suspend: (id: number) =>
    http<BusinessProfile>(`/admin/partner-applications/${id}/suspend`, {
      method: "POST",
    }),
  activate: (id: number) =>
    http<BusinessProfile>(`/admin/partner-applications/${id}/activate`, {
      method: "POST",
    }),
};