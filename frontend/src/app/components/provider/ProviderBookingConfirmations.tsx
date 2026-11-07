import { useEffect, useState } from "react";
import { http } from "@/app/lib/http";

type Request = { id: number; bookingId: number; serviceId: number; slotKey: string;
  serviceName: string; serviceDateFrom: string | null; serviceDateTo: string | null;
  quantity: number; unit: string; estimatedCost: number; quotedCost: number | null; status: string; note: string | null };
export function ProviderBookingConfirmations({ onPendingChange }: { onPendingChange?: (count: number) => void }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [available, setAvailable] = useState<Record<number, string>>({});
  const [holds, setHolds] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const load = async () => {
    const rows = await http<Request[]>("/provider/booking-requests");
    setRequests(rows);
    onPendingChange?.(rows.filter((r) => r.status === "Pending").length);
  };
  useEffect(() => { void load().catch((e) => setError(e.message)); }, []);
  const respond = async (id: number, decision: "confirm" | "reject" | "counter" | "partial") => {
    setError("");
    try {
      await http(`/provider/booking-requests/${id}/respond`, { method: "POST", body: JSON.stringify({
        decision, availableQuantity: available[id] ? Number(available[id]) : null, holdUntil: holds[id] ? new Date(holds[id]).toISOString() : null, quotedCost: decision !== "reject" ? Number(prices[id]) : null, note: notes[id] || null }) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không gửi được phản hồi."); }
  };
  return <section className="bg-white border rounded-lg p-5 space-y-3">
    <div className="flex justify-between items-center"><h3 className="font-bold text-sky-900">Yêu cầu xác nhận dịch vụ cho booking</h3>
      <button className="border rounded px-3 py-1 text-sm" onClick={() => void load().catch((e) => setError(e.message))}>Làm mới</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!requests.length && <p className="text-sm text-slate-600">Chưa có yêu cầu.</p>}
    {requests.map((r) => <div key={r.id} className="border-t pt-3 text-sm space-y-2">
      <p className="font-semibold">Booking #{r.bookingId} · {r.serviceName} · {r.status}</p>
      <p>Ngày sử dụng: {r.serviceDateFrom?.slice(0, 10) || "Chưa rõ"}
        {r.serviceDateTo && r.serviceDateTo !== r.serviceDateFrom && ` → ${r.serviceDateTo.slice(0, 10)}`}
        {` · ${r.quantity} ${r.unit}`}</p>
      <p>Giá tham khảo: {new Intl.NumberFormat("vi-VN").format(r.estimatedCost)} ₫ (toàn bộ dịch vụ)</p>
      {(r.status === "Pending" || r.status === "Confirmed") && <div className="flex flex-wrap gap-2">
        <input aria-label={`Giá thực tế ${r.serviceName}`} type="number" min="0" className="border rounded p-2"
          placeholder="Giá thực tế toàn bộ" value={prices[r.id] ?? ""}
          onChange={(e) => setPrices({ ...prices, [r.id]: e.target.value })} />
        <input aria-label={`Ghi chú ${r.serviceName}`} className="border rounded p-2" placeholder="Ghi chú/lý do"
          value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
        <button className="bg-sky-800 text-white px-3 rounded" disabled={!prices[r.id]}
          onClick={() => void respond(r.id, "confirm")}>{r.status === "Confirmed" ? "Cập nhật giá" : "Xác nhận và báo giá"}</button>
        {r.status === "Pending" && <>
          <input aria-label="Số lượng có thể cung cấp" type="number" min="0.01" className="border rounded p-2" value={available[r.id] || ""} onChange={(e) => setAvailable({ ...available, [r.id]: e.target.value })} placeholder="Số lượng đáp ứng" />
          <input aria-label="Giữ chỗ đến" type="datetime-local" className="border rounded p-2" value={holds[r.id] || ""} onChange={(e) => setHolds({ ...holds, [r.id]: e.target.value })} />
          <button className="border rounded px-3" disabled={!prices[r.id]} onClick={() => void respond(r.id, "counter")}>Đề nghị giá mới</button>
          <button className="border rounded px-3" disabled={!prices[r.id] || !available[r.id]} onClick={() => void respond(r.id, "partial")}>Chỉ đáp ứng một phần</button>
        </>}
        {r.status === "Pending" && <button className="border border-red-700 text-red-700 px-3 rounded"
          onClick={() => void respond(r.id, "reject")}>Từ chối</button>
        }
      </div>}
      {r.quotedCost != null && <p>Giá xác nhận: {new Intl.NumberFormat("vi-VN").format(r.quotedCost)} ₫</p>}
      {r.note && <p>{r.note}</p>}
    </div>)}
  </section>;
}
