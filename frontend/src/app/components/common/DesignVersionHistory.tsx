import { useEffect, useState } from "react";
import { http } from "@/app/lib/http";
type Version = { tourId: number; version: number; changeNote?: string; createdBy: string; createdAt: string;
  numberOfGuests?: number; configuration: { name: string; basePrice: number; timelines?: { dayNumber: number; title: string; description?: string; activities?: { name: string }[]; meals?: { restaurantName: string }[]; accommodations?: { hotelName: string }[] }[] } };
export function DesignVersionHistory({ requestId, agency = false }: { requestId: string; agency?: boolean }) {
  const [rows, setRows] = useState<Version[]>([]);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(1);
  useEffect(() => { let active = true; setRows([]); setError("");
    void http<Version[]>(`${agency ? "/agency" : ""}/tour-design-requests/${requestId}/history`).then((r) => { if (active) setRows(r); })
      .catch((e) => { if (active) setError(e.status === 404 ? "API chưa đồng bộ với giao diện. Vui lòng khởi động lại backend bản mới." : e.message); }); return () => { active = false; };
  }, [requestId, agency]);
  return <section className="rounded border border-sky-200 bg-sky-50 p-4 space-y-3 text-sm">
    <h3 className="font-bold text-sky-900">Lịch sử phiên bản đã gửi</h3>
    {error && <p role="alert">{error}</p>}
    {!rows.length && !error && <p>Chưa có phiên bản đã gửi.</p>}
    {rows.length > 1 && <div className="flex flex-wrap gap-2 items-center">
      {[left, right].map((value, i) => <select key={i} className="border rounded p-2" aria-label={`Phiên bản so sánh ${i + 1}`} value={value} onChange={(e) => (i === 0 ? setLeft : setRight)(Number(e.target.value))}>
        {rows.map((r, n) => <option key={`${r.tourId}-${r.version}`} value={n}>Plan #{r.tourId} v{r.version}</option>)}
      </select>)}
      <p>Chênh lệch giá bán/người: {((rows[left]?.configuration.basePrice || 0) - (rows[right]?.configuration.basePrice || 0)).toLocaleString("vi-VN")} ₫</p>
    </div>}
    {rows.map((r) => <details key={`${r.tourId}-${r.version}`} className="border rounded bg-white p-3">
      <summary>Plan #{r.tourId} v{r.version} · {r.configuration.name} · {r.configuration.basePrice.toLocaleString("vi-VN")} ₫/khách</summary>
      <p>{r.changeNote} · {r.numberOfGuests} khách · {new Date(r.createdAt).toLocaleString("vi-VN")}</p>
      {r.configuration.timelines?.map((day) => <div key={day.dayNumber} className="mt-2 border-t pt-2">
        <strong>Ngày {day.dayNumber}: {day.title}</strong><p>{day.description}</p>
        <p>{day.activities?.map((a) => a.name).join(" → ")}</p>
        <p>{day.meals?.map((m) => m.restaurantName).join(", ")}</p>
        <p>{day.accommodations?.map((h) => h.hotelName).join(", ")}</p>
      </div>)}
    </details>)}
  </section>;
}
