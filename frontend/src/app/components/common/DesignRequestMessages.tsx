import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { useEffect, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { http } from "@/app/lib/http";
import { Button } from "@/app/components/ui/button";
type Message = { actor: string; message: string; at: string; senderName?: string; mine?: boolean };
export function DesignRequestMessages({ requestId, agency = false, closed = false }: { requestId: string; agency?: boolean; closed?: boolean }) {
  const url = `${agency ? "/agency" : ""}/tour-design-requests/${requestId}/messages`;
  const [rows, setRows] = useState<Message[]>([]); const [message, setMessage] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true; const controller = new AbortController(); setRows([]); setError(""); setMessage("");
    const load = async () => { try { const result = await http<Message[]>(url, { signal: controller.signal }); if (active) { setRows(result); setError(""); } }
      catch (e) { if (active) setError(e instanceof Error ? e.message : "Không tải được trao đổi."); } };
    void load(); const timer = setInterval(() => { if (!document.hidden) void load(); }, 10000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [url, reload]);
  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-[#075985]">Trao đổi về yêu cầu thiết kế</h3><Button size="sm" variant="ghost" onClick={() => setReload(n => n + 1)}><RefreshCw/>Tải lại</Button></div>
    <div className="max-h-80 space-y-3 overflow-y-auto" aria-live="polite">{!rows.length && <p className="py-3 text-slate-500">Chưa có trao đổi. Bạn có thể bổ sung nhu cầu hoặc đề nghị điều chỉnh phương án tại đây.</p>}
      {rows.map((row, index) => <div key={`${row.at}-${index}`} className={`max-w-[90%] rounded-xl px-4 py-3 ${row.mine ? "ml-auto bg-sky-50" : "bg-slate-50"}`}><p className="mb-1 text-xs font-semibold text-[#075985]">{row.mine ? "Bạn" : row.senderName || (agency ? "Khách hàng" : "Agency")}</p><p className="whitespace-pre-wrap break-words">{row.message}</p><p className="mt-2 text-xs text-slate-400">{new Date(row.at).toLocaleString("vi-VN")}</p></div>)}
    </div>
    {!closed && <><textarea aria-label="Nội dung trao đổi về yêu cầu thiết kế" maxLength={2000} rows={3} className="w-full rounded-lg border border-slate-200 p-3" value={message} onChange={e => setMessage(e.target.value)} placeholder="Ví dụ: Tôi muốn dùng lại khách sạn và lịch trình ở phiên bản 2…"/>
      <div className="flex justify-end"><Button className="bg-[#075985] text-white hover:bg-[#0C4A6E]" disabled={busy || !message.trim()} onClick={async () => { setBusy(true); setError(""); try { await http(url, { method: "POST", body: JSON.stringify({ message: message.trim() }) }); setMessage(""); setRows(await http<Message[]>(url)); } catch(e) { setError(e instanceof Error ? e.message : "Không gửi được trao đổi."); } finally { setBusy(false); } }}><Send/>{busy ? "Đang gửi…" : "Gửi trao đổi"}</Button></div></>}
    {closed && <p className="text-xs text-slate-500">Yêu cầu đã đóng. Bạn vẫn có thể xem lại các trao đổi.</p>}{error && <NotificationMessage tone="error" message={error} />}
  </section>;
}
