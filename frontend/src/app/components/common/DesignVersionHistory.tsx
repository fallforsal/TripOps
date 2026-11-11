import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { useEffect, useState } from "react";
import { History, RefreshCw, CheckCircle2, Pencil, Eye } from "lucide-react";
import { http } from "@/app/lib/http";
import { Button } from "@/app/components/ui/button";

type Version = { tourId: number; version: number; changeNote?: string; createdAt?: string; sharedAt?: string; numberOfGuests?: number; configuration: { name: string; basePrice: number; timelines?: { dayNumber: number; title: string; description?: string; activities?: { name: string }[]; meals?: { restaurantName: string }[]; accommodations?: { hotelName: string }[] }[] } };
export function DesignVersionHistory({ requestId, agency = false, onSelect, onEdit, onView, currentVersion, sharedVersion, disabled = false, readOnly = false }: {
  requestId: string; agency?: boolean; currentVersion?: number; sharedVersion?: number; disabled?: boolean; readOnly?: boolean;
  onView?: (version: number) => Promise<void>;
  onSelect?: (version: number) => Promise<void>; onEdit?: (version: number) => Promise<void>;
}) {
  const [rows, setRows] = useState<Version[]>([]); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true; setError(""); setRows([]); setLoading(true);
    http<Version[]>(`${agency ? "/agency" : ""}/tour-design-requests/${requestId}/history`)
      .then(result => { if (alive) setRows(result.sort((a,b) => b.version - a.version)); })
      .catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [requestId, agency, reload]);
  const act = async (action: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await action(); } catch(e) { setError(e instanceof Error ? e.message : "Không thể chọn phiên bản."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold text-sky-800"><History className="h-4 w-4"/>Các phiên bản tour</h3>
      <Button size="sm" variant="ghost" disabled={busy || disabled || loading} onClick={() => setReload(n => n + 1)}><RefreshCw className={loading ? "animate-spin" : ""}/>Tải lại</Button></div>
    {error && <NotificationMessage message={error} />}
    {loading ? <p className="text-sm text-slate-500">Đang tải phiên bản…</p> : !rows.length && !error && <p className="text-sm text-slate-500">Chưa có phiên bản đã lưu.</p>}
    {rows.map(row => <article key={`${row.tourId}-${row.version}`} className={`rounded-xl border p-4 ${row.version === sharedVersion ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">v{row.version}</span>
        {row.version === sharedVersion && <span className="flex items-center gap-1 text-xs font-medium text-emerald-700"><Eye className="h-3.5 w-3.5"/>Khách đang xem</span>}
        {row.version === currentVersion && <span className="text-xs text-slate-400">Bản đang soạn</span>}</div>
      <details><summary className="cursor-pointer text-sm font-semibold text-slate-800">{row.configuration.name}<span className="ml-2 font-normal text-slate-500">{row.configuration.basePrice.toLocaleString("vi-VN")}đ/khách</span></summary>
        {row.createdAt && <p className="mt-2 text-xs text-slate-400">Lưu ngày {new Date(row.createdAt).toLocaleString("vi-VN")}</p>}
        {row.changeNote && <p className="mt-2 text-sm text-slate-600">{row.changeNote}</p>}
        {row.configuration.timelines?.map(day => <div key={day.dayNumber} className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600"><strong className="text-slate-800">{day.title || "Chưa nhập tiêu đề"}</strong><p>{day.description}</p><p>{day.activities?.map(a => a.name).join(" → ")}</p><p>{day.meals?.map(m => m.restaurantName).join(", ")}</p><p>{day.accommodations?.map(h => h.hotelName).join(", ")}</p></div>)}
      </details>
      {agency && <div className="mt-4 flex flex-wrap justify-end gap-2">
        {onView && <Button size="sm" variant="outline" disabled={busy || disabled} onClick={() => void act(() => onView(row.version))}><Eye className="h-3.5 w-3.5"/>Xem chi tiết</Button>}
        {onEdit && !readOnly && <Button size="sm" variant="outline" disabled={busy || disabled} onClick={() => void act(() => onEdit(row.version))}><Pencil className="h-3.5 w-3.5"/>Chỉnh sửa</Button>}
        {onSelect && !readOnly && <Button size="sm" variant={row.version === sharedVersion ? "outline" : "default"} disabled={busy || disabled || row.version === sharedVersion}
          className={row.version === sharedVersion ? "text-emerald-700" : "bg-sky-800 text-white hover:bg-sky-900"} onClick={() => void act(() => onSelect(row.version))}><CheckCircle2 className="h-3.5 w-3.5"/>{row.version === sharedVersion ? "Đang hiển thị cho khách" : "Hiển thị cho khách"}</Button>}
      </div>}
    </article>)}
  </section>;
}
