import { useEffect, useState } from "react";
import { http } from "@/app/lib/http";
type Notice = { id: number; message: string; createdAt: string; readAt?: string; requestId?: number; bookingId?: number };
export function WorkflowNotifications() {
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { let active = true;
    const load = () => { void http<Notice[]>("/notifications").then((r) => { if (active) { setItems(r); setError(""); } }).catch((e) => { if (active) setError(e.message); }); };
    load(); const timer = window.setInterval(load, 30000); return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <details className="rounded border border-sky-200 bg-white p-3 text-sm">
    <summary className="cursor-pointer text-sky-900 font-semibold">Thông báo ({items.filter((n) => !n.readAt).length} chưa đọc)</summary>
    {error && <p role="alert">{error}</p>}
    {items.slice(0, 20).map((n) => <div key={n.id} className="border-t py-2">
      <p className={n.readAt ? "text-slate-500" : "font-semibold"}>{n.message}</p>
      <small>{new Date(n.createdAt).toLocaleString("vi-VN")}</small>
      {!n.readAt && <button className="ml-3 text-sky-800" onClick={async () => {
        try { await http(`/notifications/${n.id}/read`, { method: "POST" }); setItems((rows) => rows.map((r) => r.id === n.id ? { ...r, readAt: new Date().toISOString() } : r)); }
        catch (e) { setError(e instanceof Error ? e.message : "Không cập nhật được thông báo."); }
      }}>Đánh dấu đã đọc</button>}
    </div>)}
  </details>;
}
