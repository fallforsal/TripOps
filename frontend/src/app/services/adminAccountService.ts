import { http } from "@/app/lib/http";

export type AccountStatus = "active" | "inactive" | "banned";
export type AccountRole = "user" | "agency" | "provider" | "guide";

export interface AccountBusiness {
  profileId: number;
  businessName: string;
  logoUrl?: string | null;
  address?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: AccountRole;
  status: AccountStatus;
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  banReason?: string | null;
  bannedAt?: string | null;
  business?: AccountBusiness | null;
}

export interface AccountCounts {
  all: number;
  customer: number;
  agency: number;
  provider: number;
}

export interface CreateAdminAccountInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: AccountRole;
  businessName?: string;
  taxCode?: string;
  businessAddress?: string;
  businessLicenseUrl?: string;
  description?: string;
  agencyId?: string;
}

export interface AdminAccountPage {
  items: AdminAccount[];
  total: number;
  page: number;
  pageSize: number;
  counts: AccountCounts;
}

export const adminAccountService = {
  create: (input: CreateAdminAccountInput) =>
    http<AdminAccount>("/admin/accounts", { method: "POST", body: JSON.stringify(input) }),
  list: (query: URLSearchParams, signal?: AbortSignal) =>
    http<AdminAccountPage>(`/admin/accounts?${query}`, { signal }),
  ban: (id: string, reason: string) =>
    http<AdminAccount>(`/admin/accounts/${encodeURIComponent(id)}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  unban: (id: string) =>
    http<AdminAccount>(`/admin/accounts/${encodeURIComponent(id)}/unban`, {
      method: "POST",
    }),
};
