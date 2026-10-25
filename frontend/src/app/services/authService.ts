import { http } from "@/app/lib/http";
import type { User, TourCompany } from "@/app/types";
export function mapAccount(user: User): User {
  const p = user.businessProfile;
  return {
    ...user,
    companyId: user.role === "agency" ? user.id : undefined,
    companyName: p?.businessName,
    businessName: p?.businessName,
    taxCode: p?.taxCode,
    businessAddress: p?.businessAddress,
    businessDescription: p?.description,
    accountStatus: p?.status,
    rejectionReason: p?.rejectionReason,
  };
}
export function companyFromUser(user: User): TourCompany {
  const p = user.businessProfile;
  return {
    id: user.id,
    adminId: user.id,
    name: p?.businessName || user.name,
    description: p?.description || "",
    email: user.email,
    phone: user.phone || "",
    address: p?.businessAddress || "",
    taxCode: p?.taxCode || "",
    status: p?.status || "pending",
    rejectionReason: p?.rejectionReason,
    createdAt: p?.createdAt || "",
  };
}
export async function login(data: { email: string; password: string }) {
  try {
    const user = mapAccount(
      await http<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    );
    return { success: true, data: { user }, error: undefined };
  } catch (e) {
    return {
      success: false,
      data: undefined,
      error: e instanceof Error ? e.message : "Login failed",
    };
  }
}
export async function register(data: {
  name: string;
  email: string;
  password: string;
  role: string;
  acceptedTerms: boolean;
}) {
  return mapAccount(
    await http<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );
}
export async function getCurrentUser() {
  return mapAccount(await http<User>("/auth/me"));
}
export function logout() {
  return http<void>("/auth/logout", { method: "POST" });
}
