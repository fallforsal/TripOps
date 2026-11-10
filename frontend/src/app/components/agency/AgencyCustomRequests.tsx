import { DesignVersionSelector } from "./DesignVersionSelector";
import { DesignCollaborationPanel } from "./DesignCollaborationPanel";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Copy, Eye, History, Handshake, Loader2, Search, Send, Sparkles, XCircle } from "lucide-react";
import { http } from "@/app/lib/http";
import { fromApiTour, type ApiTour, type TourConfiguration } from "@/app/services/wf02Tours";
import { cloneDesignTour, shareDesignTour, saveDesignTour, getDesignVersion } from "@/app/services/customTourRequests";
import type { CustomTourRequest, Tour, TourCompany } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { TourFormPage } from "@/app/components/agency/AgencyTourManagement";
import { CustomRequestDetailModal } from "@/app/components/common/CustomRequestDetailModal";
import { DesignRequestMessages } from "@/app/components/common/DesignRequestMessages";
import { DesignVersionHistory } from "@/app/components/common/DesignVersionHistory";
import type { DesignRequestDecision } from "./DesignRequestAgencyActions";

interface Props {
  requests: CustomTourRequest[]; company: TourCompany; tours: Tour[]; allCompanies?: TourCompany[];
  onUpdateRequest: (id: string, update: Partial<CustomTourRequest>) => void | Promise<void>;
  onCreateTour: (tour: Omit<Tour, "id"> & { id?: string }) => Tour | void | Promise<Tour | void>;
  onEditTour: (id: string, tour: Partial<Tour>) => void | Promise<void>;
  onViewTour?: (tour: Tour) => void;
}
const labels: Record<string, string> = { pending: "Chờ xử lý", reviewing: "Đã tiếp nhận", designed: "Đã chia sẻ", rejected: "Đã từ chối", cancelled: "Đã hủy" };
const money = (value: number) => value.toLocaleString("vi-VN") + "đ";
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN");
export function AgencyCustomRequests({ requests, company, tours, onUpdateRequest, onCreateTour, onViewTour }: Props) {
  const [collaborating, setCollaborating] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyRequestId, setHistoryRequestId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [designing, setDesigning] = useState<CustomTourRequest | null>(null);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [template, setTemplate] = useState<Tour | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Tour>>({});
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [rejecting, setRejecting] = useState<CustomTourRequest | null>(null); const [reason, setReason] = useState("");
  const [cloning, setCloning] = useState<CustomTourRequest | null>(null); const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState(""); const [revision, setRevision] = useState(0);
  const currentTour = (request: CustomTourRequest) => overrides[request.id] || tours.find(t => t.id === request.designedTourId || t.customRequestId === request.id) || null;
  const active = (request: CustomTourRequest) => request.status === "reviewing" || request.status === "designed";
  const perform = async (fn: () => Promise<void>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { await fn(); } catch (e) { const message = e instanceof Error ? e.message : "Không thể thực hiện thao tác. Vui lòng thử lại."; setError(message); toast.error(message); }
    finally { lock.current = false; setBusy(false); }
  };
  const decide = async (request: CustomTourRequest, decision: DesignRequestDecision) => {
    if (decision === "rejected") { setViewing(null); setReason(""); setError(""); setRejecting(request); return; }
    await perform(async () => { await onUpdateRequest(request.id, { status: decision }); toast.success("Đã tiếp nhận yêu cầu thiết kế."); });
  };
  const start = async (request: CustomTourRequest, existing?: Tour | null) => {
    if (!active(request)) return;
    await perform(async () => {
      setTemplate(null);
      if (existing) {
        const saved=await getDesignVersion(request.id,overrides[request.id]?.version ?? existing.sharedVersion ?? existing.version ?? 1);
        setEditing(saved);
      }
      else {
        setEditing(null);
        const source = await http<TourConfiguration | null>(`/agency/tour-design-requests/${request.id}/source`);
        if (source) {
          const base = fromApiTour({ id: 0, agencyId: company.id, code: null, status: "draft", visibility: "hidden", isRequest: true, isAiGenerated: false, version: 1, configuration: { ...source, code: null }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
          const initial = await http<CustomTourRequest["initialChanges"] | null>(`/agency/tour-design-requests/${request.id}/initial-changes`);
          setTemplate(initial ? { ...base, itinerary: initial.itinerary, hotels: initial.hotels } : base);
        }
      }
      setDesigning(request);
    });
  };
  const save = async (data: Partial<Tour>) => {
    if (!designing) return;
    const saved = await saveDesignTour(designing.id, { ...(editing || template), ...data, is_request: true }, editing?.revision);
    setOverrides(prev => ({ ...prev, [designing.id]: saved }));
    await onUpdateRequest(designing.id, {}); setDesigning(null); setEditing(null); setRevision(n => n + 1);
    toast.success("Đã lưu tour. Chia sẻ riêng khi bạn sẵn sàng gửi cho khách.");
  };
  const share = async (request: CustomTourRequest, tour: Tour) => perform(async () => {
    const selected = overrides[request.id]?.version ?? tour.sharedVersion ?? tour.version ?? 1;
    const fresh = await getDesignVersion(request.id, selected);
    const saved = await shareDesignTour(request.id, fresh.revision || 1, selected);
    setOverrides(prev => ({ ...prev, [request.id]: saved })); await onUpdateRequest(request.id, {}); setRevision(n => n + 1);
    toast.success("Đã chia sẻ phương án cho khách.");
  });
  const chooseVersion = async (request: CustomTourRequest, version: number) => perform(async () => {
    const selected = await getDesignVersion(request.id,version);
    setOverrides(prev=>({...prev,[request.id]:selected}));
  });
  const rows = useMemo(() => requests.filter(r => r.targetCompanyId === company.id && (filter === "all" || r.status === filter) &&
    [r.id, r.destinations, r.contactName, r.contactEmail, r.contactPhone, r.businessName].some(v => v?.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [requests, filter, search]);
  const collaboration = requests.find(r => r.id === collaborating);
  if (collaboration) return <DesignCollaborationPanel request={collaboration} company={company} onClose={() => setCollaborating(null)} onChanged={async () => { setOverrides({}); await onUpdateRequest(collaboration.id, {}); setRevision(n=>n+1); }}/>;
  if (designing) return <TourFormPage company={company} tour={editing || template} customRequest={designing} isCustomTour={true} ownershipCollaboration
    onManageCoHosts={() => { setCollaborating(designing.id); setDesigning(null); }} onBack={() => setDesigning(null)} onSubmit={save} />;
  const viewed = requests.find(r => r.id === viewing) || null;
  const expandedRequest = requests.find(r => r.id === expanded);
  return <div className="space-y-5">
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><h1 className="text-2xl font-bold text-[#075985]">Yêu cầu thiết kế tour từ khách hàng</h1><p className="mt-1 text-sm text-slate-500">Tiếp nhận yêu cầu, thiết kế và chia sẻ phương án riêng cho khách.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="relative flex-1 min-w-[240px] max-w-xl"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input aria-label="Tìm yêu cầu thiết kế" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" placeholder="Tìm mã yêu cầu, khách hàng, điểm đến…" value={search} onChange={e => setSearch(e.target.value)}/></div>
      <div className="flex flex-wrap gap-1">{["all", "pending", "reviewing", "designed", "rejected", "cancelled"].map(status => <Button key={status} size="sm" variant="ghost" className={filter === status ? "bg-[#075985] text-white hover:bg-[#0C4A6E] hover:text-white" : "text-slate-600"} onClick={() => setFilter(status)}>{status === "all" ? "Tất cả" : labels[status]} ({requests.filter(r => status === "all" || r.status === status).length})</Button>)}</div>
    </div>
    {error && !rejecting && !cloning && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[1280px] text-left text-sm"><thead className="bg-sky-50 text-xs text-slate-600"><tr>{["Mã & ngày gửi", "Khách hàng", "Điểm đến & lịch trình", "Ngân sách", "Trạng thái", "Phương án tour", "Thao tác"].map(t => <th key={t} className="px-4 py-4 font-semibold">{t}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.map(request => {
        const tour = currentTour(request); const sharedVersion = request.sharedVersion;
        return <tr key={request.id} className="align-top hover:bg-slate-50/60"><td className="px-4 py-4"><strong>#{request.id}</strong><p className="mt-1 text-xs text-slate-500">{date(request.createdAt)}</p></td>
          <td className="px-4 py-4"><strong>{request.contactName}</strong><p className="mt-1 text-xs text-slate-500">{request.contactPhone}</p><p className="max-w-[210px] truncate text-xs text-slate-500" title={request.contactEmail}>{request.contactEmail}</p>{request.businessName && <p className="mt-1 text-xs text-[#075985]">{request.businessName}</p>}</td>
          <td className="px-4 py-4"><strong>{request.destinations}</strong><p className="mt-1 whitespace-nowrap text-xs text-slate-500">{date(request.departureDate)} – {date(request.returnDate)}</p><p className="mt-1 text-xs">{request.numberOfPeople} khách</p></td>
          <td className="px-4 py-4 whitespace-nowrap">{request.budgetPerPerson ? <><strong>{money(Number(request.budgetPerPerson))}</strong><span className="text-xs text-slate-500"> / khách</span><p className="mt-1 text-xs text-slate-500">Tổng: {money(Number(request.budgetPerPerson) * Number(request.numberOfPeople))}</p></> : "Thỏa thuận"}</td>
          <td className="px-4 py-4"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${request.status === "rejected" ? "bg-rose-50 text-rose-700" : request.status === "pending" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>{labels[request.status] || request.status}</span>{request.rejectionReason && <p className="mt-2 max-w-[220px] text-xs text-rose-700">{request.rejectionReason}</p>}</td>
          <td className="px-4 py-4 min-w-[230px]">{tour ? <DesignVersionSelector requestId={request.id} tour={tour} value={overrides[request.id]?.version ?? sharedVersion ?? tour.version ?? 1} sharedVersion={sharedVersion} reload={revision} disabled={busy} onChange={version=>void chooseVersion(request,version)}/> : <p className="text-xs text-slate-400">Chưa tạo tour</p>}</td>
          <td className="min-w-[280px] px-4 py-4"><div className="ml-auto flex min-w-[248px] max-w-[320px] flex-wrap justify-end gap-1.5">
            {request.status === "pending" && <Button size="sm" className="bg-[#075985] text-white hover:bg-[#0C4A6E]" disabled={busy} onClick={() => void decide(request,"reviewing")}><CheckCircle2/>Tiếp nhận</Button>}
            {!tour && (request.status === "pending" || request.status === "reviewing") && <Button aria-label={`Từ chối yêu cầu ${request.id}`} title="Từ chối yêu cầu" size="icon" variant="outline" disabled={busy} className="h-8 w-8 text-rose-600" onClick={() => void decide(request,"rejected")}><XCircle/></Button>}
            <Button size="sm" variant="outline" onClick={() => setViewing(request.id)}><Eye/>Xem chi tiết</Button>
            {active(request) && <><Button size="sm" variant="outline" disabled={busy} onClick={() => setCollaborating(request.id)}><Handshake/>Đồng tổ chức</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void start(request,tour)}><Sparkles/>{tour ? "Sửa tour" : "Thiết kế"}</Button>
              {tour && <Button size="sm" variant="outline" disabled={busy} onClick={() => { setError(""); setHistoryRequestId(request.id); }}><History/>Các phiên bản</Button>}
              {!tour && <Button size="sm" variant="outline" disabled={busy} onClick={() => { setCloning(request); setSourceId(""); setError(""); }}><Copy/>Clone tour</Button>}
              {tour && <Button size="sm" className="bg-[#075985] text-white hover:bg-[#0C4A6E]" disabled={busy} onClick={() => void share(request,tour)}><Send/>Chia sẻ v{overrides[request.id]?.version ?? sharedVersion ?? tour.version}</Button>}
            </>}
            <Button size="icon" variant="outline" className="h-8 w-8" aria-label={`Trao đổi và lịch sử yêu cầu ${request.id}`} title="Trao đổi và lịch sử phiên bản" onClick={() => setExpanded(expanded === request.id ? null : request.id)}><ChevronDown/></Button>
          </div></td></tr>;
      })}</tbody></table>{!rows.length && <p className="p-8 text-center text-sm text-slate-500">Không tìm thấy yêu cầu phù hợp.</p>}<p className="border-t border-slate-100 p-4 text-xs text-slate-500">Hiển thị {rows.length} / {requests.length} yêu cầu</p></div>
    {expandedRequest && <div className="space-y-4"><h2 className="font-semibold text-[#075985]">Trao đổi và lịch sử yêu cầu #{expandedRequest.id}</h2>
      <DesignRequestMessages requestId={expandedRequest.id} agency closed={!active(expandedRequest) && expandedRequest.status !== "pending"}/>
      <DesignVersionHistory key={`${expandedRequest.id}-${revision}`} requestId={expandedRequest.id} agency currentVersion={currentTour(expandedRequest)?.version} onSelect={version => chooseVersion(expandedRequest,version)}/></div>}
    <CustomRequestDetailModal isOpen={Boolean(viewed)} onClose={() => setViewing(null)} request={viewed} matchingTour={viewed ? currentTour(viewed) : null} userRole="agency" agencyActionBusy={busy} onAgencyDecision={decide} onStartDesignTour={start} onViewTour={onViewTour}/>
    <Dialog open={Boolean(historyRequestId)} onOpenChange={open => { if (!busy && !open) setHistoryRequestId(null); }}><DialogContent className="bg-white sm:max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Các phương án tour theo phiên bản</DialogTitle><DialogDescription>Chọn phiên bản để chỉnh sửa hoặc chia sẻ trực tiếp cho khách. Chọn lại phiên bản cũ không tạo thêm phiên bản.</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {requests.filter(r => r.id === historyRequestId).map(request => <DesignVersionHistory key={`${request.id}-${revision}`} requestId={request.id} agency currentVersion={currentTour(request)?.version} onSelect={async version => { await chooseVersion(request,version); setHistoryRequestId(null); }}/>)}
    </DialogContent></Dialog>
    <Dialog open={Boolean(rejecting)} onOpenChange={open => { if (!busy && !open) setRejecting(null); }}><DialogContent className="bg-white sm:max-w-lg"><DialogHeader><DialogTitle>Từ chối yêu cầu thiết kế #{rejecting?.id}</DialogTitle><DialogDescription>Cho khách biết vì sao Agency chưa thể tổ chức chuyến đi này.</DialogDescription></DialogHeader>
      <label className="space-y-2 text-sm">Lý do từ chối <span className="text-rose-600">*</span><textarea aria-label="Lý do từ chối" maxLength={2000} rows={4} className="mt-2 w-full rounded-lg border p-3" value={reason} onChange={e => setReason(e.target.value)}/></label>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setRejecting(null)}>Hủy</Button><Button disabled={busy || !reason.trim()} onClick={() => void perform(async () => { if (!rejecting) return; await onUpdateRequest(rejecting.id, { status: "rejected", rejectionReason: reason.trim() }); setRejecting(null); toast.success("Đã từ chối và gửi lý do cho khách."); })}>{busy && <Loader2 className="animate-spin"/>}Xác nhận từ chối</Button></div>
    </DialogContent></Dialog>
    <Dialog open={Boolean(cloning)} onOpenChange={open => { if (!busy && !open) setCloning(null); }}><DialogContent className="bg-white sm:max-w-xl"><DialogHeader><DialogTitle>Clone tour có sẵn</DialogTitle><DialogDescription>Tạo bản sao riêng cho yêu cầu này. Tour nguồn giữ nguyên.</DialogDescription></DialogHeader>
      <label className="text-sm">Tour mẫu<select aria-label="Tour mẫu để clone" value={sourceId} onChange={e => setSourceId(e.target.value)} className="mt-2 w-full rounded-lg border p-3"><option value="">Chọn tour của Agency</option>{tours.filter(t => !t.is_request && t.status !== "deleted").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <Button disabled={busy || !sourceId} onClick={() => void perform(async () => { if (!cloning) return; const saved = await cloneDesignTour(cloning.id, sourceId); setOverrides(prev => ({ ...prev, [cloning.id]: saved })); await onUpdateRequest(cloning.id, {}); setEditing(saved); setTemplate(null); setDesigning(cloning); setCloning(null); toast.success("Đã clone thành tour riêng. Bạn có thể chỉnh sửa ngay."); })}>Clone và chỉnh sửa</Button>
    </DialogContent></Dialog>
  </div>;
}
