import { http } from "@/app/lib/http";

/** Thông tin tài khoản của khách (email chỉ để xem). */
export interface CustomerProfile {
  name: string;
  organizationName: string | null;
  email: string;
  phone: string | null;
  addressLine: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  wardCode: string | null;
  wardName: string | null;
  updatedAt: string;
}

export interface CustomerProfileInput {
  name: string;
  organizationName: string | null;
  phone: string;
  addressLine: string | null;
  provinceCode: string | null;
  wardCode: string | null;
}

export const getCustomerProfile = () => http<CustomerProfile>("/me/profile");

export const saveCustomerProfile = (input: CustomerProfileInput) =>
  http<CustomerProfile>("/me/profile", { method: "PUT", body: JSON.stringify(input) });

/** "12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh" */
export const formatCustomerAddress = (p: Pick<CustomerProfile, "addressLine" | "wardName" | "provinceName">) =>
  [p.addressLine, p.wardName, p.provinceName].filter((x) => x && x.trim()).join(", ");
