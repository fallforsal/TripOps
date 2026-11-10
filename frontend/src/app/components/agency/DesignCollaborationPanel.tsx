import { useEffect, useState } from "react";
import { Handshake, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { CustomTourRequest, Tour, TourCoHost, TourCompany } from "@/app/types";
import { http } from "@/app/lib/http";
import { requestAgencies } from "@/app/services/customTourRequests";
import { fromApiTour, toConfiguration, type ApiTour } from "@/app/services/wf02Tours";
import { Button } from "@/app/components/ui/button";
import { TourFormPage } from "./AgencyTourManagement";

type Props = { request: CustomTourRequest; company: TourCompany; onChanged: () => void | Promise<void>; onClose: () => void };
const money = (n?: number) => n == null ? "Chưa báo giá" : `${n.toLocaleString("vi-VN")}đ`;
export function DesignCollaborationPanel({ request, company, onChanged, onClose }: Props) {
  const [hosts, setHosts] = useState<TourCoHost[]>(request.coHosts || []);
  const [agencies, setAgencies] = useState<TourCompany[]>([]);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [partner, setPartner] = useState(""); const [segment, setSegment] = useState("");
  const [budget, setBudget] = useState(""); const [notes, setNotes] = useState("");
  const [working,setWorking] = useState<Tour | null>(null);
  const [reason, setReason] = useState(""); const [rejecting, setRejecting] = useState(false);
  const lead = request.targetCompanyId === company.id;
  const me = hosts.find(h => h.companyId === company.id);
  const root = `/agency/tour-design-requests/${request.id}`;
  const load = async () => {
    if (lead || me?.status === "accepted") setHosts(await http<TourCoHost[]>(`${root}/co-hosts`));
    if (request.designedTourId && (lead || me?.status === "accepted")) {
      const tour = await http<ApiTour>(`${root}/working-tour`);
      setWorking(fromApiTour(tour));
    }
  };
  useEffect(() => { let alive=true; requestAgencies().then(rows => {if(alive)setAgencies(rows);}).catch(e=>{if(alive)setError(e.message);});
    load().catch(e=>{if(alive)setError(e.message);}); return ()=>{alive=false;}; }, [request.id]);
  const action = async (fn: () => Promise<void>) => { if(busy)return;setBusy(true);setError("");try {await fn();await onChanged();} catch(e){setError(e instanceof Error?e.message:"Không thể lưu liên minh.");}finally{setBusy(false);} };
  if (editing) return <TourFormPage company={company} tour={editing} customRequest={request} isCustomTour ownershipCollaboration onBack={()=>setEditing(null)} onManageCoHosts={()=>setEditing(null)} onSubmit={async data => {
    const config=toConfiguration({...editing,...data});
    const saved=fromApiTour(await http<ApiTour>(`${root}/segment`,{method:"PUT",body:JSON.stringify({version:editing.version,
      timelines:config.timelines,pricingTiers:config.pricingTiers})}));
    setEditing(null);await load();await onChanged();toast.success(`Đã lưu chặng thành v${saved.version}. Agency chủ trì sẽ kiểm tra và chia sẻ.`);
  }}/>;
  return <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold text-[#075985]"><Handshake/>Đồng tổ chức tour · Yêu cầu #{request.id}</h2><p className="mt-2 text-sm text-slate-500">{request.destinations} · Chủ trì: {request.targetCompanyName}. Mỗi Agency quản lý nội dung và bảng giá của mình. Thông tin ngày trong lịch trình được cùng chỉnh sửa; Customer xem giá tổng khi chia sẻ.</p></div><Button variant="outline" onClick={onClose}>Quay lại</Button></div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {!lead && me?.status === "pending" && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold">Lời mời tham gia chặng {me.assignedSegments}</h3><p>Ngân sách dự kiến: {money(me.estimatedBudgetPerGuest)} / khách</p><p className="whitespace-pre-wrap text-sm">{me.notes}</p>
      <div className="flex gap-2"><Button disabled={busy} onClick={()=>void action(async()=>{await http(`${root}/co-hosts/decision`,{method:"POST",body:JSON.stringify({action:"accept"})});setHosts(await http<TourCoHost[]>(`${root}/co-hosts`));toast.success("Đã nhận lời mời đồng tổ chức.");})}>Chấp nhận tham gia</Button><Button variant="outline" disabled={busy} onClick={()=>setRejecting(!rejecting)}>Từ chối</Button></div>
      {rejecting && <div className="space-y-2"><textarea aria-label="Lý do từ chối hợp tác" className="w-full rounded-lg border bg-white p-3" maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Lý do chưa thể tham gia…"/><Button disabled={busy || !reason.trim()} onClick={()=>void action(async()=>{await http(`${root}/co-hosts/decision`,{method:"POST",body:JSON.stringify({action:"reject",reason:reason.trim()})});toast.success("Đã từ chối và gửi lý do cho Agency chủ trì.");onClose();})}>Xác nhận từ chối</Button></div>}
    </div>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{["Công ty","Thông tin hợp tác","Trạng thái","Bảng giá riêng / khách","Thao tác"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{hosts.map(host=><tr key={host.companyId}><td className="p-3 font-semibold">{host.companyName}<p className="text-xs font-normal text-slate-500">{host.role==="lead"?"Agency chủ trì":"Đối tác"}</p></td><td className="p-3">{host.assignedSegments || "Điều phối chung"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${host.status==="accepted"?"bg-emerald-50 text-emerald-700":host.status==="rejected"?"bg-rose-50 text-rose-700":"bg-amber-50 text-amber-800"}`}>{host.status==="accepted"?"Đã tham gia":host.status==="rejected"?"Đã từ chối":"Chờ phản hồi"}</span>{host.rejectionReason && <p className="mt-2 max-w-xs text-xs text-rose-600">{host.rejectionReason}</p>}</td><td className="p-3">{working?.agencyPricing?.find(p=>p.agencyId===host.companyId)?.tiers.map((t,i)=><p key={i}>{t.name}: {money(t.pricePerGuest)}</p>) || "Chưa nhập bảng giá"}</td><td className="p-3">{lead && host.role!=="lead" && <Button variant="outline" size="sm" disabled={busy} onClick={()=>{if(confirm(`Thu hồi hợp tác với ${host.companyName}? Các nội dung đã tạo và giá của đối tác cần được xử lý trước; bản đã chia sẻ giữ nguyên.`))void action(async()=>{await http(`${root}/co-hosts/${host.companyId}`,{method:"DELETE"});await load();toast.success("Đã thu hồi hợp tác.");});}}>Thu hồi</Button>}</td></tr>)}</tbody></table></div>
    {!lead && me?.status==="accepted" && <Button disabled={busy || !request.designedTourId} onClick={()=>void action(async()=>{const tour=fromApiTour(await http<ApiTour>(`${root}/working-tour`));setEditing({...tour,coHosts:hosts,isCoHosted:true});})}>Thiết kế nội dung & bảng giá riêng</Button>}
    {!lead && me?.status==="accepted" && !request.designedTourId && <p className="text-sm text-slate-500">Agency chủ trì cần lưu tour đầu tiên trước khi bạn thiết kế chặng.</p>}
    {lead && <form className="space-y-4 border-t pt-5" onSubmit={e=>{e.preventDefault();void action(async()=>{setHosts(await http<TourCoHost[]>(`${root}/co-hosts`,{method:"POST",body:JSON.stringify({agencyId:partner,segment,budget:budget?Number(budget):null,notes})}));setPartner("");setSegment("");toast.success("Đã gửi lời mời đồng tổ chức.");});}}>
      <h3 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4"/>Mời Agency đối tác</h3><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Đối tác<select required aria-label="Agency đối tác" className="w-full rounded-lg border p-2.5" value={partner} onChange={e=>setPartner(e.target.value)}><option value="">Chọn Agency đã được duyệt</option>{agencies.filter(a=>a.id!==company.id && !hosts.some(h=>h.companyId===a.id && h.status!=="rejected")).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="space-y-1 text-sm">Tên chặng (tùy chọn)<input maxLength={255} className="w-full rounded-lg border p-2.5" value={segment} onChange={e=>setSegment(e.target.value)} placeholder="Ví dụ: Chặng Đà Lạt"/></label></div>

      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Ngân sách chặng / khách (tùy chọn)<input type="number" min={0} max={9999999999} className="w-full rounded-lg border p-2.5" value={budget} onChange={e=>setBudget(e.target.value)}/></label><label className="space-y-1 text-sm">Lời nhắn<textarea maxLength={2000} className="w-full rounded-lg border p-2.5" value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><Button disabled={busy || !partner}>Gửi lời mời</Button>
    </form>}
    <Button variant="ghost" size="sm" disabled={busy} onClick={()=>void action(load)}><RefreshCw className="h-4 w-4"/>Tải lại liên minh</Button>
  </div>;
}

export function AgencyDesignCoHosting({requests,company,onChanged}:{requests:CustomTourRequest[];company:TourCompany;onChanged:()=>void|Promise<void>}) {
  const [selected,setSelected]=useState<string|null>(null); const request=requests.find(r=>r.id===selected);
  if(request)return <DesignCollaborationPanel key={request.id} request={request} company={company} onChanged={onChanged} onClose={()=>setSelected(null)}/>;
  const rows=requests.filter(r=>r.coHosts?.some(h=>h.role==="partner") && r.status!=="cancelled" && r.status!=="rejected");
  return <div className="space-y-5"><div className="rounded-2xl border bg-white p-5"><h1 className="flex items-center gap-2 text-2xl font-bold text-[#075985]"><Handshake/>Liên minh lữ hành</h1><p className="mt-2 text-sm text-slate-500">Lời mời đồng tổ chức, nội dung do mỗi bên đóng góp và bảng giá của Agency đối tác.</p></div>{!rows.length && <p className="rounded-xl border bg-white p-8 text-center text-slate-500">Chưa có liên minh. Agency chủ trì có thể mời đối tác từ trang Yêu cầu thiết kế riêng.</p>}{rows.map(r=>{const me=r.coHosts?.find(h=>h.companyId===company.id);return <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5" key={r.id}><div><h2 className="font-semibold">#{r.id} · {r.destinations}</h2><p className="mt-1 text-sm text-slate-500">Chủ trì: {r.targetCompanyName} · {r.numberOfPeople} khách</p><p className="mt-1 text-sm">{me?.role==="lead"?"Bạn là Agency chủ trì":me?.status==="pending"?"Đang chờ bạn phản hồi lời mời":`Nội dung hợp tác: ${me?.assignedSegments || "Cùng thiết kế tour"}`}</p></div><Button variant="outline" onClick={()=>setSelected(r.id)}>Xem liên minh</Button></article>;})}</div>;
}
