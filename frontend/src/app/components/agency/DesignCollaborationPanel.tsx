import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { VietnameseMoneyInput } from "@/app/components/ui/VietnameseMoneyInput";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { confirmAction } from "@/app/lib/notificationDialogs";
import { useEffect, useRef, useState } from "react";
import { Handshake, Plus, RefreshCw } from "lucide-react";
import { toast } from "@/app/lib/notifications";
import type { CustomTourRequest, Tour, TourCoHost, TourCompany } from "@/app/types";
import { http } from "@/app/lib/http";
import { designRequestLifecycle, requestAgencies } from "@/app/services/customTourRequests";
import { fromApiTour, toConfiguration, type ApiTour } from "@/app/services/wf02Tours";
import { Button } from "@/app/components/ui/button";
import { TourFormPage } from "./AgencyTourManagement";

type Props = { request: CustomTourRequest; company: TourCompany; onChanged: () => void | Promise<void>; onClose: () => void; embedded?: boolean };
const money = (n?: number) => n == null ? "Chưa báo giá" : `${n.toLocaleString("vi-VN")}đ`;
export function DesignCollaborationPanel({ request, company, onChanged, onClose, embedded = false }: Props) {
  const [version,setVersion] = useState<number|undefined>(()=>request.collaborationVersions?.includes(request.currentVersion||0)?request.currentVersion:request.collaborationVersions?.[0]);
  const [hosts, setHosts] = useState<TourCoHost[]>(request.coHosts || []);
  const [agencies, setAgencies] = useState<TourCompany[]>([]);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [partner, setPartner] = useState(""); const [segment, setSegment] = useState("");
  const [budget, setBudget] = useState(""); const [notes, setNotes] = useState("");
  const loadSequence=useRef(0); const [loading,setLoading]=useState(false);
  const [working,setWorking] = useState<Tour | null>(null);
  const [reason, setReason] = useState(""); const [rejecting, setRejecting] = useState(false);
  const lead = request.targetCompanyId === company.id;
  const mutable = request.status === "reviewing" || request.status === "designed";
  const me = hosts.find(h => h.companyId === company.id);
  useEffect(()=>{if(request.designedTourId && request.collaborationVersions?.length && !request.collaborationVersions.includes(version||0))setVersion(request.collaborationVersions[0]);},[request.collaborationVersions,request.designedTourId,version]);
  const query=version?`?version=${version}`:"";
  const root = `/agency/tour-design-requests/${request.id}`;
  const load = async () => {
    const sequence=++loadSequence.current;setLoading(true);
    try {
      const rows=await http<TourCoHost[]>(`${root}/co-hosts${query}`);
      const tour=request.designedTourId && (lead || rows.some(h=>h.companyId===company.id && h.status==="accepted"))
        ? fromApiTour(await http<ApiTour>(`${root}/working-tour${query}`)) : null;
      if(sequence===loadSequence.current){setHosts(rows);setWorking(tour);}
    }finally{if(sequence===loadSequence.current)setLoading(false);}
  };
  useEffect(()=>{let alive=true;setWorking(null);setError("");requestAgencies().then(rows=>{if(alive)setAgencies(rows);}).catch(e=>{if(alive)setError(e.message);});
    load().catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;loadSequence.current++;};},[request.id,version]);
  const action = async (fn: () => Promise<void>) => { if(busy || loading)return;setBusy(true);setError("");try {await fn();await onChanged();} catch(e){setError(e instanceof Error?e.message:"Không thể lưu liên minh.");}finally{setBusy(false);} };
  if (editing) return <TourFormPage key={`${editing.id}-${editing.version}`} designVersions={request.collaborationVersions}
    onDesignVersionChange={async selected => { await action(async () => { const fresh=fromApiTour(await http<ApiTour>(`${root}/working-tour?version=${selected}`)); setVersion(selected); setEditing(fresh); }); }} company={company} tour={editing} customRequest={request} isCustomTour ownershipCollaboration onBack={()=>setEditing(null)} onManageCoHosts={()=>setEditing(null)} onSubmit={async data => {
    const config=toConfiguration({...editing,...data});
    const saved=fromApiTour(await http<ApiTour>(`${root}/segment`,{method:"PUT",body:JSON.stringify({revision:editing.revision || 1,
      version:editing.version,timelines:config.timelines,pricingTiers:config.pricingTiers})}));
    setEditing(null);await load();await onChanged();toast.success(`Đã lưu nháp chặng trong v${saved.version}. Agency chủ trì sẽ kiểm tra và chọn phiên bản cho khách xem.`);
  }}/>;
  return <div className={embedded ? "space-y-5 bg-white p-1" : "space-y-5 rounded-2xl border border-slate-200 bg-white p-5"}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold text-[#075985]"><Handshake/>Đồng tổ chức tour · Yêu cầu #{request.id}</h2><p className="mt-2 text-sm text-slate-500">{request.destinations} · Chủ trì: {request.targetCompanyName}. Mỗi Agency quản lý nội dung và bảng giá của mình. Thông tin ngày trong lịch trình được cùng chỉnh sửa; Khách hàng xem giá tổng của phiên bản được chọn.</p></div>{!embedded && <Button variant="outline" onClick={onClose}>Quay lại</Button>}</div>
    {request.designedTourId && <label className="flex items-center gap-3 text-sm font-medium">Đang quản lý liên minh của<select aria-label="Phiên bản liên minh" disabled={busy || loading} className="rounded-lg border bg-white px-3 py-2" value={version??""} onChange={e=>setVersion(Number(e.target.value))}>{request.collaborationVersions?.map(n=><option key={n} value={n}>Phiên bản v{n}</option>)}</select></label>}
    <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-800">Bỏ đối tác chỉ ảnh hưởng phiên bản đang chọn. Các phiên bản khác giữ nguyên. Chấm dứt toàn bộ sẽ thu hồi quyền hợp tác trên yêu cầu.</p>
    {loading && <p role="status" className="text-sm text-slate-500">Đang tải liên minh của phiên bản…</p>}
    {error && <NotificationMessage tone="error" message={error} />}
    {!mutable && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Yêu cầu đã đóng. Bạn có thể xem lại thông tin liên minh.</p>}
    {!lead && mutable && me?.status === "pending" && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold">Lời mời tham gia chặng {me.assignedSegments}</h3><p>Ngân sách dự kiến: {money(me.estimatedBudgetPerGuest)} / khách</p><p className="whitespace-pre-wrap text-sm">{me.notes}</p>
      <div className="flex gap-2"><Button disabled={busy || loading} onClick={()=>void action(async()=>{await http(`${root}/co-hosts/decision`,{method:"POST",body:JSON.stringify({action:"accept",version})});await load();toast.success("Đã nhận lời mời đồng tổ chức.");})}>Chấp nhận tham gia</Button><Button variant="outline" disabled={busy || loading} onClick={()=>setRejecting(!rejecting)}>Từ chối</Button></div>
      {rejecting && <div className="space-y-2"><textarea aria-label="Lý do từ chối hợp tác" className="w-full rounded-lg border bg-white p-3" maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Lý do chưa thể tham gia…"/><Button disabled={busy || loading || !reason.trim()} onClick={()=>void action(async()=>{await http(`${root}/co-hosts/decision`,{method:"POST",body:JSON.stringify({action:"reject",reason:reason.trim(),version})});toast.success("Đã từ chối và gửi lý do cho Agency chủ trì.");onClose();})}>Xác nhận từ chối</Button></div>}
    </div>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{["Công ty","Thông tin hợp tác","Trạng thái","Bảng giá riêng / khách","Thao tác"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{hosts.map(host=><tr key={host.companyId}><td className="p-3 font-semibold">{host.companyName}<p className="text-xs font-normal text-slate-500">{host.role==="lead"?"Agency chủ trì":"Đối tác"}</p></td><td className="p-3">{host.assignedSegments || "Điều phối chung"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${host.status==="accepted"?"bg-emerald-50 text-emerald-700":host.status==="rejected"?"bg-rose-50 text-rose-700":"bg-amber-50 text-amber-800"}`}>{host.status==="accepted"?"Đã tham gia":host.status==="rejected"?"Đã từ chối":host.status==="revoked"?"Cần mời lại":"Chờ phản hồi"}</span>{host.rejectionReason && <p className="mt-2 max-w-xs text-xs text-rose-600">{host.rejectionReason}</p>}</td><td className="p-3">{working?.agencyPricing?.find(p=>p.agencyId===host.companyId)?.tiers.map((t,i)=><p key={i}>{t.name}: {money(t.pricePerGuest)}</p>) || "Chưa nhập bảng giá"}</td><td className="p-3"><ChatWithButton userId={host.companyId} context={{kind:"design-request",id:Number(request.id),title:`Yêu cầu thiết kế #${request.id}`,subtitle:request.destinations}}>Chat với đối tác</ChatWithButton>{lead && mutable && host.role!=="lead" && <Button variant="outline" size="sm" className="text-rose-700" disabled={busy || loading} onClick={async ()=>{
        const accepted=host.status==="accepted" || host.status==="revoked";
        const message=accepted
          ? `Bỏ ${host.companyName} khỏi phiên bản v${version}? Nội dung và bảng giá của họ chỉ bị gỡ trong phiên bản này. Những phiên bản khác giữ nguyên. Nếu khách đang xem chính bản này, bạn cần kiểm tra và chọn lại phương án.`
          : `Thu hồi lời mời của ${host.companyName} trong phiên bản v${version || 1}?`;
        if(await confirmAction(message,{title:accepted?"Gỡ Agency khỏi liên minh":"Thu hồi lời mời",confirmLabel:accepted?"Gỡ đối tác":"Thu hồi",tone:"error"})) void action(async()=>{
          await http(`${root}/co-hosts/${host.companyId}?removeContent=${accepted}${version?`&version=${version}`:""}`,{method:"DELETE"});
          await load();toast.success(accepted?"Đã bỏ đối tác khỏi phiên bản này.":"Đã thu hồi lời mời.");
        });
      }}>{host.status==="accepted" || host.status==="revoked"?"Bỏ khỏi phiên bản":"Thu hồi lời mời"}</Button>}
      {lead && mutable && host.role!=="lead" && host.status!=="revoked" && <Button variant="ghost" size="sm" className="mt-2 text-rose-700" disabled={busy || loading} onClick={async()=>{if(await confirmAction(`Chấm dứt hợp tác với ${host.companyName} trên toàn bộ yêu cầu? Các phiên bản cũ vẫn xem lại được, nhưng cần đối tác nhận lời mời lại trước khi cho khách booking phương án có họ.`,{title:"Chấm dứt toàn bộ hợp tác",confirmLabel:"Chấm dứt hợp tác",tone:"error"}))void action(async()=>{await http(`${root}/co-hosts/${host.companyId}?terminate=true`,{method:"DELETE"});await load();toast.success("Đã chấm dứt hợp tác trên toàn yêu cầu.");});}}>Chấm dứt toàn bộ</Button>}
      </td></tr>)}</tbody></table></div>
    {!lead && mutable && me?.status==="accepted" && <Button disabled={busy || loading || !request.designedTourId} onClick={()=>void action(async()=>{const tour=fromApiTour(await http<ApiTour>(`${root}/working-tour${query}`));setEditing({...tour,coHosts:hosts,isCoHosted:true});})}>Thiết kế nội dung & bảng giá riêng</Button>}
    {!lead && me?.status==="accepted" && !request.designedTourId && <p className="text-sm text-slate-500">Agency chủ trì cần lưu tour đầu tiên trước khi bạn thiết kế chặng.</p>}
    {lead && mutable && <form className="space-y-4 border-t pt-5" onSubmit={e=>{e.preventDefault();void action(async()=>{setHosts(await http<TourCoHost[]>(`${root}/co-hosts${query}`,{method:"POST",body:JSON.stringify({agencyId:partner,version,segment,budget:budget?Number(budget):null,notes})}));setPartner("");setSegment("");setBudget("");setNotes("");await load();toast.success("Đã gửi lời mời đồng tổ chức.");});}}>
      <h3 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4"/>Mời Agency đối tác</h3><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Đối tác<select required aria-label="Agency đối tác" className="w-full rounded-lg border p-2.5" value={partner} onChange={e=>setPartner(e.target.value)}><option value="">Chọn Agency đã được duyệt</option>{agencies.filter(a=>a.id!==company.id && !hosts.some(h=>h.companyId===a.id && h.status!=="rejected" && h.status!=="revoked")).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="space-y-1 text-sm">Tên chặng (tùy chọn)<input maxLength={255} className="w-full rounded-lg border p-2.5" value={segment} onChange={e=>setSegment(e.target.value)} placeholder="Ví dụ: Chặng Đà Lạt"/></label></div>

      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Ngân sách chặng / khách (tùy chọn)<VietnameseMoneyInput className="w-full rounded-lg border p-2.5" maxLength={17} value={budget} onValueChange={setBudget} placeholder="Ví dụ: 1.000.000"/></label><label className="space-y-1 text-sm">Lời nhắn<textarea maxLength={2000} className="w-full rounded-lg border p-2.5" value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><Button disabled={busy || loading || !partner}>Gửi lời mời</Button>
    </form>}
    {!lead && <Button variant="outline" size="sm" disabled={busy || loading} onClick={()=>void action(async()=>{await designRequestLifecycle(request.id,request.archivedAt?"unarchive":"archive");toast.success(request.archivedAt?"Đã bỏ lưu trữ.":"Đã lưu trữ yêu cầu cho Agency của bạn.");onClose();})}>{request.archivedAt?"Bỏ lưu trữ":"Lưu trữ yêu cầu"}</Button>}
    <Button variant="ghost" size="sm" disabled={busy || loading} onClick={()=>void action(load)}><RefreshCw className="h-4 w-4"/>Tải lại liên minh</Button>
  </div>;
}

export function AgencyDesignCoHosting({requests,company,onChanged}:{requests:CustomTourRequest[];company:TourCompany;onChanged:()=>void|Promise<void>}) {
  const [selected,setSelected]=useState<string|null>(null); const request=requests.find(r=>r.id===selected);
  const [filter,setFilter]=useState("all");
  const tabs=[{id:"all",label:"Tất cả"},{id:"pending",label:"Chờ phản hồi"},{id:"accepted",label:"Đã tham gia"},{id:"closed",label:"Đã kết thúc / Từ chối"}];
  const collaborations=requests.filter(r=>r.hasCollaborations || r.coHosts?.some(h=>h.role==="partner"));
  const matchesTab=(r:CustomTourRequest,tab:string)=>{
    if(tab==="all")return true;
    const closed=["cancelled","rejected","closed"].includes(r.status);
    const partners=r.coHosts?.filter(h=>h.role==="partner" && (r.targetCompanyId===company.id || h.companyId===company.id)) || [];
    if(tab==="closed")return closed || partners.some(h=>["rejected","revoked"].includes(h.status));
    return !closed && partners.some(h=>h.status===tab);
  };
  if(request)return <DesignCollaborationPanel key={request.id} request={request} company={company} onChanged={onChanged} onClose={()=>setSelected(null)}/>;
  const rows=collaborations.filter(r=>matchesTab(r,filter));
  return <div className="space-y-5"><div className="rounded-2xl border bg-white p-5"><h1 className="flex items-center gap-2 text-2xl font-bold text-[#075985]"><Handshake/>Liên minh lữ hành</h1><p className="mt-2 text-sm text-slate-500">Lời mời đồng tổ chức, nội dung do mỗi bên đóng góp và bảng giá của Agency đối tác.</p></div>
    <div role="tablist" aria-label="Trạng thái liên minh" className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2">
      {tabs.map(tab=><button key={tab.id} type="button" role="tab" aria-selected={filter===tab.id} onClick={()=>setFilter(tab.id)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filter===tab.id?"bg-[#075985] text-white":"text-slate-600 hover:bg-slate-50"}`}>{tab.label} <span className="ml-1.5 opacity-80">({collaborations.filter(r=>matchesTab(r,tab.id)).length})</span></button>)}
    </div>
    {!rows.length && <p className="rounded-xl border bg-white p-8 text-center text-slate-500">{filter==="all"?"Chưa có liên minh. Agency chủ trì có thể mời đối tác từ trang Yêu cầu thiết kế riêng.":"Chưa có liên minh trong trạng thái này."}</p>}{rows.map(r=>{const me=r.coHosts?.find(h=>h.companyId===company.id);return <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5" key={r.id}><div><h2 className="font-semibold">#{r.id} · {r.destinations}</h2><p className="mt-1 text-sm text-slate-500">Chủ trì: {r.targetCompanyName} · {r.numberOfPeople} khách</p><p className="mt-1 text-sm">{me?.role==="lead"?"Bạn là Agency chủ trì":me?.status==="pending"?"Đang chờ bạn phản hồi lời mời":`Nội dung hợp tác: ${me?.assignedSegments || "Cùng thiết kế tour"}`}</p></div><Button variant="outline" onClick={()=>setSelected(r.id)}>Xem liên minh</Button></article>;})}</div>;
}
