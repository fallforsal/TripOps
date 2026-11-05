import type { Service } from "../types/index.ts";

export type ServicePostState = "pending" | "approved" | "paused" | "hidden" | "rejected";
export type ServicePostFilter = "all" | ServicePostState;

export const servicePostStates = {
  pending: { label: "Chờ duyệt", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  approved: { label: "Đang hiển thị", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused: { label: "Provider tạm ngừng", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  hidden: { label: "Admin đã ẩn", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  rejected: { label: "Từ chối", tone: "bg-red-50 text-red-700 border-red-200" },
} satisfies Record<ServicePostState, { label: string; tone: string }>;

export function servicePostState(service: Pick<Service, "status" | "isPaused">): ServicePostState {
  // Availability only changes the presentation of approved posts. Moderation takes precedence.
  return service.status === "approved" && service.isPaused ? "paused" : service.status;
}

export function matchesServicePostFilter(service: Pick<Service, "status" | "isPaused">, filter: ServicePostFilter): boolean {
  return filter === "all" || servicePostState(service) === filter;
}

export function servicePostCounts(services: Pick<Service, "status" | "isPaused">[]) {
  const counts = { all: services.length, pending: 0, approved: 0, paused: 0, hidden: 0, rejected: 0 };
  for (const service of services) counts[servicePostState(service)]++;
  return counts;
}
