import { TourAccommodationSummary } from "@/app/components/common/TourAccommodationSummary";
import { useEffect, useState } from "react";
import { Eye, Plus, RefreshCw, Send } from "lucide-react";
import type { CustomTourRequest, Tour, Service } from "@/app/types";
import { customerRequestPlans } from "@/app/services/customTourRequests";
import { Button } from "@/app/components/ui/button";
import { CustomRequestDetailModal } from "@/app/components/common/CustomRequestDetailModal";
import { DesignRequestMessages } from "@/app/components/common/DesignRequestMessages";
import { StatusBadge } from "@/app/components/customer/StatusBadge";
interface Props { services?: Service[]; requests: CustomTourRequest[]; tours?: Tour[]; onCancelRequest: (id: string) => Promise<void>; onNavigateToCreate: () => void; onViewTour?: (tour: Tour) => void; onBookTour?: (tour: Tour) => void | Promise<void>; }
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN");
const money = (value: number) => value.toLocaleString("vi-VN") + "đ";
export function MyRequestsPage({ requests, onCancelRequest, onNavigateToCreate, onViewTour, onBookTour, services = [] }: Props) {
  const groups=[{id:"pending",label:"Chờ tiếp nhận"},{id:"reviewing",label:"Đang thiết kế"},{id:"designed",label:"Đã chia sẻ"},{id:"closed",label:"Đã hủy / Từ chối"}];
  const [status,setStatus]=useState(()=>requests.some(r=>r.status==="designed") ? "designed" : "pending");
  const inGroup=(request:CustomTourRequest,group:string)=>group==="closed" ? ["cancelled","rejected"].includes(request.status) : group==="designed" ? ["designed","quoted","accepted"].includes(request.status) : request.status===group;
  const rows=requests.filter(request=>inGroup(request,status));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [plan, setPlan] = useState<Tour | null>(null);
  const [reload, setReload] = useState(0); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const selected = requests.find(r => r.id === selectedId);
  useEffect(() => {
    if (!selectedId) return;
    let alive = true; setPlan(null); setLoading(true); setError("");
    customerRequestPlans(selectedId).then(rows => { if (alive) setPlan(rows[0] || null); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : "Không tải được phương án."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedId, reload, selected?.sharedVersion]);
  const book = async () => {
    if (!selected || !plan || busy) return;
    setBusy(true); setError("");
    try { await onBookTour?.({ ...plan, customRequestId: selected.id }); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể đặt tour."); }
    finally { setBusy(false); }
  };
  if (selected) return <div className="mx-auto max-w-5xl space-y-5 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5"><div><Button variant="ghost" onClick={() => setSelectedId(null)}>Quay lại danh sách</Button><h1 className="mt-2 text-xl font-bold text-[#075985]">Yêu cầu thiết kế #{selected.id}</h1><p className="mt-1 text-sm text-slate-500">Agency: {selected.targetCompanyName}</p></div><StatusBadge type="custom_request" status={selected.status}/></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{selected.destinations}</h2><Button size="sm" variant="outline" onClick={() => setViewing(true)}>Xem hồ sơ yêu cầu</Button></div>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-600"><span>{date(selected.departureDate)} – {date(selected.returnDate)}</span><span>{selected.numberOfPeople} khách</span><span>Ngân sách: {selected.budgetPerPerson ? money(Number(selected.budgetPerPerson)) + " / khách" : "Thỏa thuận"}</span></div>
      {selected.additionalInfo && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{selected.additionalInfo}</p>}
      {selected.rejectionReason && <div className="mt-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-800"><strong>Lý do Agency từ chối:</strong><p className="mt-1 whitespace-pre-wrap">{selected.rejectionReason}</p></div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-[#075985]">Phương án được Agency chia sẻ</h2><Button size="sm" variant="outline" disabled={loading} onClick={() => setReload(n => n + 1)}><RefreshCw className={loading ? "animate-spin" : ""}/>Tải lại phương án</Button></div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Đang tải phương án…</p> : plan ? <><div className="flex flex-col gap-4 sm:flex-row">{plan.image && <img src={plan.image} alt={plan.name} className="h-36 w-full rounded-xl object-cover sm:w-52"/>}<div className="flex-1"><span className="text-xs font-semibold text-[#075985]">Phiên bản {plan.version}</span><h3 className="mt-1 text-lg font-bold">{plan.name}</h3><p className="mt-2 text-sm text-slate-500">{plan.duration} · {plan.destination}</p><p className="mt-3 text-lg font-bold text-[#075985]">{money(plan.price)} <span className="text-sm font-normal">/ khách</span></p></div></div>
        <p className="text-sm text-slate-500">Bạn muốn điều chỉnh hoặc dùng lại phiên bản trước? Gửi trao đổi bên dưới để Agency cập nhật và chia sẻ lại.</p>
        <div className="flex flex-wrap justify-end gap-2">{onViewTour && <Button variant="outline" onClick={() => onViewTour(plan)}><Eye/>Xem chi tiết tour</Button>}{onBookTour && <Button className="bg-[#075985] text-white hover:bg-[#0C4A6E]" disabled={busy} onClick={() => void book()}>Đặt tour phiên bản {plan.version}</Button>}</div></> : <p className="text-sm text-slate-500">{selected.status === "rejected" ? "Agency đã từ chối yêu cầu này." : selected.status === "cancelled" ? "Yêu cầu đã được hủy." : "Agency chưa chia sẻ phương án. Bạn có thể trao đổi để bổ sung nhu cầu."}</p>}
    </section>
    {plan && <TourAccommodationSummary tour={plan} services={services}/>}
    <DesignRequestMessages requestId={selected.id} closed={selected.status === "rejected" || selected.status === "cancelled"}/>
    {!selected.designedTourId && (selected.status === "pending" || selected.status === "reviewing") && <div className="flex justify-end"><Button variant="outline" disabled={busy} className="text-rose-700" onClick={async () => { if (!confirm("Hủy yêu cầu thiết kế này?")) return; setBusy(true); try { await onCancelRequest(selected.id); } catch(e) { setError(e instanceof Error ? e.message : "Không thể hủy yêu cầu."); } finally { setBusy(false); } }}>Hủy yêu cầu</Button></div>}
    <CustomRequestDetailModal isOpen={viewing} onClose={() => setViewing(false)} request={selected} matchingTour={plan} userRole="customer" onViewTour={onViewTour}/>
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
          {request.rejectionReason && <p className="mt-3 text-sm text-rose-700">Lý do từ chối: {request.rejectionReason}</p>}
          <div className="mt-3 flex justify-end"><Button variant="outline" onClick={()=>setSelectedId(request.id)}><Eye className="h-4 w-4"/>Xem phương án & trao đổi</Button></div>
        </div>
      </section>)}
    </div>
  </div>;
}
