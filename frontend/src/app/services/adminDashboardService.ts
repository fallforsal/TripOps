import { http } from "@/app/lib/http";

export type AdminDashboardPeriod = "7d" | "30d" | "90d" | "365d" | "all";

export interface AdminBookingTrendPoint {
  label: string;
  count: number;
}

export interface AdminBookingStatusCounts {
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
}

/** Platform-wide Booking metrics, never scoped to the signed-in Admin's own Bookings. */
export interface AdminBookingOverview {
  period: AdminDashboardPeriod;
  bookingCount: number;
  bookingValue: number;
  chartBookingCount: number;
  trend: AdminBookingTrendPoint[];
  statusBreakdown: AdminBookingStatusCounts;
}

export const getAdminBookingOverview = (period: AdminDashboardPeriod, signal?: AbortSignal) =>
  http<AdminBookingOverview>(`/admin/dashboard/overview?period=${period}`, { signal });
