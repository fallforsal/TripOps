import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { confirmAction } from "@/app/lib/notificationDialogs";
import { TourAccommodationSummary } from "@/app/components/common/TourAccommodationSummary";
import { useEffect, useState } from "react";
import { Eye, Plus, RefreshCw, Send } from "lucide-react";
import type { CustomTourRequest, Tour, Service } from "@/app/types";
import { customerDesignRequests, customerRequestPlans } from "@/app/services/customTourRequests";
import { Button } from "@/app/components/ui/button";
import { CustomRequestDetailModal } from "@/app/components/common/CustomRequestDetailModal";
import { DesignRequestMessages } from "@/app/components/common/DesignRequestMessages";
import { StatusBadge } from "@/app/components/customer/StatusBadge";
interface Props { onViewBooking?: (id:string)=>void; services?: Service[]; requests: CustomTourRequest[]; tours?: Tour[]; onCancelRequest: (id: string) => Promise<void>; onNavigateToCreate: () => void; onViewTour?: (tour: Tour) => void; onBookTour?: (tour: Tour) => void | Promise<void>; }
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN");
const money = (value: number) => value.toLocaleString("vi-VN") + "đ";
export function MyRequestsPage({ requests: initialRequests, onCancelRequest, onNavigateToCreate, onViewTour, onBookTour, onViewBooking, services = [] }: Props) {
  const [requests, setRequests] = useState(initialRequests);
  useEffect(() => {
    setRequests(initialRequests);
    let alive = true; let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try { const latest = await customerDesignRequests(); if (alive) setRequests(latest); }
      catch { /* Keep the current list during a temporary background connection failure. */ }
      finally { pending = false; }
    };
    const interval = window.setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { alive = false; window.clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [initialRequests]);
  const groups=[{id:"pending",label:"Chờ tiếp nhận"},{id:"reviewing",label:"Đang thiết kế"},{id:"designed",label:"Đang xem phương án"},{id:"booked",label:"Đã đặt tour"},{id:"closed",label:"Đã đóng / Hủy / Từ chối"}];
  const [status,setStatus]=useState(()=>requests.some(r=>r.status==="designed") ? "designed" : "pending");
  const inGroup=(request:CustomTourRequest,group:string)=>group==="closed" ? ["closed","cancelled","rejected"].includes(request.status) : group==="designed" ? ["designed","quoted","accepted"].includes(request.status) : request.status===group;
  const rows=requests.filter(request=>inGroup(request,status));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [plan, setPlan] = useState<Tour | null>(null);
  const [reload, setReload] = useState(0); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const selected = requests.find(r => r.id === selectedId);
  useEffect(() => {
    if (!selectedId) return;
    let alive = true; let pending = false;
    setPlan(null); setLoading(true); setError("");
    const refresh = async (background = false) => {
      if (pending || (background && document.visibilityState === "hidden")) return;
      pending = true;
      try {
        const rows = await customerRequestPlans(selectedId);
        if (alive) setPlan(current => {
          const next = rows[0] || null;
          return current && next && current.version === next.version && current.revision === next.revision ? current : next;
        });
      } catch(e) { if (alive && !background) setError(e instanceof Error ? e.message : "Không tải được phương án."); }
      finally { pending = false; if (alive && !background) setLoading(false); }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(true), 5000);
    const onFocus = () => void refresh(true);
    window.addEventListener("focus", onFocus); document.addEventListener("visibilitychange", onFocus);
    return () => { alive = false; window.clearInterval(interval); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [selectedId, reload, selected?.sharedVersion]);
  const book = async () => {
    if (!selected || !plan || busy) return;
    setBusy(true); setError("");
    try { await onBookTour?.({ ...plan, customRequestId: selected.id }); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể đặt tour."); }
    finally { setBusy(false); }
  };
  if (selected) return <div className="mx-auto max-w-5xl space-y-5 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5"><div><Button variant="ghost" onClick={() => setSelectedId(null)}>Quay lại danh sách</Button><h1 className="mt-2 text-xl font-bold text-[#075985]">Yêu cầu thiết kế #{selected.id}</h1><p className="mt-1 text-sm text-slate-500">Agency: {selected.targetCompanyName}</p></div><div className="flex flex-wrap items-center gap-2"><ChatWithButton userId={selected.targetCompanyId} context={{kind:"design-request",id:Number(selected.id),title:`Yêu cầu thiết kế #${selected.id}`,subtitle:selected.destinations}}>Chat với Agency</ChatWithButton><StatusBadge type="custom_request" status={selected.status}/></div></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{selected.destinations}</h2><Button size="sm" variant="outline" onClick={() => setViewing(true)}>Xem hồ sơ yêu cầu</Button></div>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-600"><span>{date(selected.departureDate)} – {date(selected.returnDate)}</span><span>{selected.numberOfPeople} khách</span><span>Ngân sách: {selected.budgetPerPerson ? money(Number(selected.budgetPerPerson)) + " / khách" : "Thỏa thuận"}</span></div>
      {selected.additionalInfo && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{selected.additionalInfo}</p>}
      {selected.closeReason && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Yêu cầu đã đóng</strong><p className="mt-1 whitespace-pre-wrap">{selected.closeReason}</p><p className="mt-2">Bạn có thể xem lại phương án. Liên hệ Agency nếu muốn mở lại yêu cầu.</p></div>}
      {selected.rejectionReason && <div className="mt-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-800"><strong>Lý do Agency từ chối:</strong><p className="mt-1 whitespace-pre-wrap">{selected.rejectionReason}</p></div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-[#075985]">Phương án Agency chọn cho bạn</h2><Button size="sm" variant="outline" disabled={loading} onClick={() => setReload(n => n + 1)}><RefreshCw className={loading ? "animate-spin" : ""}/>Tải lại phương án</Button></div>
      {error && <NotificationMessage tone="error" message={error} />}
      {loading ? <p className="text-sm text-slate-500">Đang tải phương án…</p> : plan ? <><div className="flex flex-col gap-4 sm:flex-row">{plan.image && <img src={plan.image} alt={plan.name} className="h-36 w-full rounded-xl object-cover sm:w-52"/>}<div className="flex-1"><span className="text-xs font-semibold text-[#075985]">Phiên bản {plan.version}</span><h3 className="mt-1 text-lg font-bold">{plan.name}</h3><p className="mt-2 text-sm text-slate-500">{plan.duration} · {plan.destination}</p><p className="mt-3 text-lg font-bold text-[#075985]">{money(plan.price)} <span className="text-sm font-normal">/ khách</span></p></div></div>
        <p className="text-sm text-slate-500">Phương án tự cập nhật khi Agency đổi phiên bản. Bạn có thể trao đổi bên dưới nếu muốn điều chỉnh hoặc xem lại bản trước.</p>
        <div className="flex flex-wrap justify-end gap-2">{onViewTour && <Button variant="outline" onClick={() => onViewTour({...plan,designReadOnly:selected.status!=="designed"})}><Eye/>Xem chi tiết tour</Button>}{onBookTour && selected.status==="designed" && <Button className="bg-[#075985] text-white hover:bg-[#0C4A6E]" disabled={busy} onClick={() => void book()}>Đặt tour phiên bản {plan.version}</Button>}</div></> : <p className="text-sm text-slate-500">{selected.status === "rejected" ? "Agency đã từ chối yêu cầu này." : selected.status === "cancelled" ? "Yêu cầu đã được hủy." : "Agency chưa chọn phương án cho bạn. Bạn có thể trao đổi để bổ sung nhu cầu."}</p>}
    </section>
    {selected.bookingId && <Button onClick={()=>onViewBooking?.(selected.bookingId!)}>Xem booking #{selected.bookingId}</Button>}
    {plan && <TourAccommodationSummary tour={plan} services={services}/>}
    <DesignRequestMessages requestId={selected.id} closed={["closed","rejected","cancelled"].includes(selected.status)}/>
    {!selected.designedTourId && (selected.status === "pending" || selected.status === "reviewing") && <div className="flex justify-end"><Button variant="outline" disabled={busy} className="text-rose-700" onClick={async () => { if (!(await confirmAction("Hủy yêu cầu thiết kế này?"))) return; setBusy(true); try { await onCancelRequest(selected.id); } catch(e) { setError(e instanceof Error ? e.message : "Không thể hủy yêu cầu."); } finally { setBusy(false); } }}>Hủy yêu cầu</Button></div>}
    <CustomRequestDetailModal isOpen={viewing} onClose={() => setViewing(false)} request={selected} matchingTour={plan} userRole="customer" onViewTour={tour=>onViewTour?.({...tour,designReadOnly:selected.status!=="designed"})}/>
  </div>;
  return <div className="space-y-5 pb-12"><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5"><div><h1 className="text-2xl font-bold text-[#075985]">Yêu cầu thiết kế tour của tôi</h1><p className="mt-1 text-sm text-slate-500">Trao đổi với Agency và chọn phương án phù hợp cho chuyến đi.</p></div><Button className="bg-[#075985] text-white hover:bg-[#0C4A6E]" onClick={onNavigateToCreate}><Plus/>Tạo yêu cầu mới</Button></div>
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2" role="tablist" aria-label="Trạng thái yêu cầu thiết kế">
      {groups.map(group=><button key={group.id} type="button" role="tab" aria-selected={status===group.id} aria-controls="design-request-list" onClick={()=>setStatus(group.id)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${status===group.id ? "bg-[#075985] text-white" : "text-slate-600 hover:bg-slate-50"}`}>{group.label} <span className="ml-1.5 opacity-80">({requests.filter(request=>inGroup(request,group.id)).length})</span></button>)}
    </div>
    <div id="design-request-list" role="tabpanel" className="space-y-4">
      {!rows.length && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{requests.length ? "Chưa có yêu cầu trong trạng thái này." : "Bạn chưa gửi yêu cầu thiết kế tour."}</p>}
      {rows.map(request=><section key={request.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row">
        {request.sharedTourThumbnail && <img src={request.sharedTourThumbnail} alt={request.sharedTourName || request.destinations} className="h-36 w-full shrink-0 rounded-xl object-cover sm:h-32 sm:w-44"/>}
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{request.sharedTourName || request.destinations}</h2><p className="mt-1 text-xs text-slate-500">Yêu cầu #{request.id} · {request.targetCompanyName} · {date(request.createdAt)}</p></div><StatusBadge type="custom_request" status={request.status}/></div>
          <p className="mt-3 text-sm text-slate-600">{request.numberOfPeople} khách · {date(request.departureDate)} – {date(request.returnDate)}</p>
          {request.closeReason && <p className="mt-3 text-sm text-amber-800">Lý do đóng: {request.closeReason}</p>}
          {request.rejectionReason && <p className="mt-3 text-sm text-rose-700">Lý do từ chối: {request.rejectionReason}</p>}
          <div className="mt-3 flex flex-wrap justify-end gap-2"><ChatWithButton userId={request.targetCompanyId} context={{kind:"design-request",id:Number(request.id),title:`Yêu cầu thiết kế #${request.id}`,subtitle:request.destinations}}>Chat với Agency</ChatWithButton><Button variant="outline" onClick={()=>setSelectedId(request.id)}><Eye className="h-4 w-4"/>Xem phương án & trao đổi</Button></div>
        </div>
      </section>)}
    </div>
  </div>;
}
