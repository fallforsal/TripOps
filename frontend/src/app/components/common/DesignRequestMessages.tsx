import { useEffect, useState } from "react";
import { http } from "@/app/lib/http";
type Message = { actor: string; message: string; at: string };
export function DesignRequestMessages({ requestId, agency = false }: { requestId: string; agency?: boolean }) {
  const url = `${agency ? "/agency" : ""}/tour-design-requests/${requestId}/messages`;
  const [rows, setRows] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; setRows([]); void http<Message[]>(url).then((r) => { if (active) setRows(r); }).catch((e) => { if (active) setError(e.status === 404 ? "API chưa đồng bộ với giao diện. Vui lòng khởi động lại backend bản mới." : e.message); }); return () => { active = false; }; }, [url]);
  return <section className="rounded border border-sky-200 bg-white p-4 space-y-2 text-sm">
    <h3 className="font-bold text-sky-900">Trao đổi / Bổ sung thông tin</h3>
    {rows.map((r, i) => <p key={i} className="border-b py-2">{r.message} <small className="text-slate-500">· {new Date(r.at).toLocaleString("vi-VN")}</small></p>)}
    <textarea aria-label="Thông tin trao đổi với Agency/Customer" maxLength={2000} className="w-full border rounded p-2" value={message} onChange={(e) => setMessage(e.target.value)} />
    <button type="button" disabled={busy || !message.trim()} className="rounded bg-sky-800 text-white px-3 py-2" onClick={async () => {
      setBusy(true); setError(""); try { await http(url, { method: "POST", body: JSON.stringify({ message }) }); setMessage(""); setRows(await http<Message[]>(url)); }
      catch (e) { setError(e instanceof Error ? e.message : "Không gửi được trao đổi."); } finally { setBusy(false); }
    }}>Gửi trao đổi</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
