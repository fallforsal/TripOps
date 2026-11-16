import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { useEffect, useState } from "react";
import { http } from "@/app/lib/http";
import type { BookingDto } from "@/app/services/wf05Bookings";
import { Button } from "@/app/components/ui/button";

export function AdminAllianceAllocationLedger() {
  const [rows, setRows] = useState<BookingDto[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); setError(""); try { setRows(await http<BookingDto[]>("/admin/bookings/allocations")); } catch (e) { setError(e instanceof Error ? e.message : "Không tải được phân bổ."); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const [filter, setFilter] = useState("all");
  const tabs = [{ id: "all", label: "Tất cả" }, { id: "pending", label: "Chưa quyết toán" }, { id: "paid", label: "Đã quyết toán" }];
  const allocations = rows.flatMap(booking => (booking.bookingAgencies || []).map(agency => ({ booking, agency })));
  const matchesTab = (status: string, tab: string) => tab === "all" || (tab === "paid" ? status === "Paid" : status !== "Paid");
  const filteredAllocations = allocations.filter(({ agency }) => matchesTab(agency.settlementStatus, filter));
  const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
}
