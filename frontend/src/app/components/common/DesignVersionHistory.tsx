import { useEffect, useState } from "react";
import { History, RefreshCw, CheckCircle2 } from "lucide-react";
import { http } from "@/app/lib/http";
import { Button } from "@/app/components/ui/button";
type Version = { tourId: number; version: number; changeNote?: string; createdAt?: string; sharedAt?: string; numberOfGuests?: number; configuration: { name: string; basePrice: number; timelines?: { dayNumber: number; title: string; description?: string; activities?: { name: string }[]; meals?: { restaurantName: string }[]; accommodations?: { hotelName: string }[] }[] } };
export function DesignVersionHistory({ requestId, agency = false, onSelect, currentVersion }: { requestId: string; agency?: boolean; currentVersion?: number; onSelect?: (version: number) => Promise<void> }) {
  const [rows, setRows] = useState<Version[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  useEffect(() => { let alive = true; setError(""); setRows([]); http<Version[]>(`${agency ? "/agency" : ""}/tour-design-requests/${requestId}/history`).then(r => { if (alive) setRows(r); }).catch(e => { if (alive) setError(e.message); }); return () => { alive = false; }; }, [requestId, agency, reload]);
  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold text-[#075985]"><History className="h-4 w-4"/>Các phiên bản tour</h3><Button size="sm" variant="ghost" onClick={() => setReload(n => n + 1)}><RefreshCw/>Tải lại</Button></div>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{!rows.length && !error && <p className="text-sm text-slate-500">{agency ? "Chưa có phiên bản đã lưu." : "Chưa có phiên bản được chia sẻ."}</p>}
    {!agency && rows.length > 0 && <p className="text-sm text-slate-500">Muốn dùng lại một phiên bản trước? Nhắn Agency số phiên bản để được chọn và chia sẻ lại.</p>}
    {rows.map(row => <article key={`${row.tourId}-${row.version}`} className="rounded-xl border border-slate-200 p-3"><details><summary className="cursor-pointer text-sm font-semibold">Phiên bản {row.version} · {row.configuration.name} · {row.configuration.basePrice.toLocaleString("vi-VN")}đ/khách</summary>
      <p className="mt-2 text-xs text-slate-500">{row.createdAt && new Date(row.createdAt).toLocaleString("vi-VN")} · {row.sharedAt ? "Đã chia sẻ" : "Nội bộ Agency"}</p><p className="mt-1 text-sm text-slate-600">{row.changeNote}</p>
      {row.configuration.timelines?.map(day => <div key={day.dayNumber} className="mt-3 border-t pt-2 text-sm"><strong>{day.title || "Chưa nhập tiêu đề"}</strong><p>{day.description}</p><p>{day.activities?.map(a => a.name).join(" → ")}</p><p>{day.meals?.map(m => m.restaurantName).join(", ")}</p><p>{day.accommodations?.map(h => h.hotelName).join(", ")}</p></div>)}
      </details>
      {agency && onSelect && <Button size="sm" variant="outline" className="mt-3" disabled={busy} onClick={async () => { setBusy(true); try { await onSelect(row.version); } catch(e) { setError(e instanceof Error ? e.message : "Không thể chọn phiên bản."); } finally { setBusy(false); } }}><CheckCircle2/>Chọn phiên bản này</Button>}
      {agency && row.version === currentVersion && <p className="mt-2 text-xs font-semibold text-[#075985]">Phiên bản đang chọn</p>}
    </article>)}
  </section>;
}
