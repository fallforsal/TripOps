import { http } from "@/app/lib/http";
import type { Service } from "@/app/types";

interface ServicePage { items: Service[]; total: number; page: number; pageSize: number }
interface ModerationResponse { message: string; service: Service }

export async function fetchServicePosts(role?: string): Promise<Service[]> {
  if (role !== "admin" && role !== "provider") return http<Service[]>("/catalogue");
  const path = role === "admin" ? "/admin/services" : "/provider/services";
  const result: Service[] = [];
  for (let page = 1; ; page++) {
    const response = await http<ServicePage>(`${path}?page=${page}&pageSize=100`);
    result.push(...response.items);
    if (result.length >= response.total || !response.items.length) return result;
  }
}

export function servicePayload(service: Omit<Service, "id">) {
  return {
    name: service.name, category: service.category, subCategory: service.subCategory,
    description: service.description, price: service.price,
    priceFrom: service.priceFrom, priceTo: service.priceTo, capacity: service.capacity, stars: service.stars,
    province: service.province, ward: service.ward, street: service.street, fullAddress: service.fullAddress,
    latitude: service.latitude, longitude: service.longitude, operatingHours: service.operatingHours,
    thumbnailUrl: service.thumbnailUrl || service.image,
    images: service.images || [], amenities: service.amenities || [],
    policies: Array.isArray(service.policies) ? service.policies : service.policies ? [service.policies] : [],
  };
}

export const createServicePost = (service: Omit<Service, "id">) =>
  http<Service>("/provider/services", { method: "POST", body: JSON.stringify(servicePayload(service)) });
export const updateServicePost = (id: string, service: Omit<Service, "id">) =>
  http<Service>(`/provider/services/${id}`, { method: "PUT", body: JSON.stringify(servicePayload(service)) });
export const deleteServicePost = (id: string) => http<void>(`/provider/services/${id}`, { method: "DELETE" });
export const setServiceAvailability = (id: string, isPaused: boolean) =>
  http<Service>(`/provider/services/${id}/availability`, { method: "POST", body: JSON.stringify({ isPaused }) });
export const approveServicePost = (id: string) => http<ModerationResponse>(`/admin/services/${id}/approve`, { method: "POST" });
export const rejectServicePost = (id: string, rejectionReason: string) =>
  http<ModerationResponse>(`/admin/services/${id}/reject`, { method: "POST", body: JSON.stringify({ rejectionReason }) });
export const toggleServicePost = (id: string, action: "hide" | "unhide", hiddenReason?: string) =>
  http<ModerationResponse>(`/admin/services/${id}/toggle-hide`, { method: "POST", body: JSON.stringify({ action, hiddenReason }) });

export async function uploadServiceImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error("Chỉ nhận ảnh PNG/JPEG tối đa 5 MB.");
  const form = new FormData(); form.append("image", file);
  return (await http<{ url: string }>("/provider/services/images", { method: "POST", body: form })).url;
}
