import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { confirmAction, requestText } from "@/app/lib/notificationDialogs";
import { TourDetailPage } from "@/app/components/user/TourDetailPage";
import { selectCustomerDesignVersion } from "@/app/lib/designVersionSelection";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "@/app/components/ui/alert-dialog";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { DesignVersionSelector } from "./DesignVersionSelector";
import { DesignCollaborationPanel } from "./DesignCollaborationPanel";
import { useMemo, useRef, useState } from "react";
import { toast } from "@/app/lib/notifications";
import { CheckCircle2, Copy, Eye, Handshake, Loader2, Search, Sparkles, XCircle, MoreHorizontal, CalendarDays, Users, MapPin } from "lucide-react";
import { http } from "@/app/lib/http";
import { fromApiTour, type ApiTour, type TourConfiguration } from "@/app/services/wf02Tours";
import { cloneDesignTour, shareDesignTour, saveDesignTour, getDesignVersion, designRequestLifecycle } from "@/app/services/customTourRequests";
import type { CustomTourRequest, Tour, TourCompany, Service } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { TourFormPage } from "@/app/components/agency/AgencyTourManagement";
import { CustomRequestDetailModal } from "@/app/components/common/CustomRequestDetailModal";
import type { DesignRequestDecision } from "./DesignRequestAgencyActions";

interface Props {
  onViewBooking?: (id:string)=>void; services?: Service[]; requests: CustomTourRequest[]; company: TourCompany; tours: Tour[]; allCompanies?: TourCompany[];
  onUpdateRequest: (id: string, update: Partial<CustomTourRequest>) => void | Promise<void>;
  onCreateTour: (tour: Omit<Tour, "id"> & { id?: string }) => Tour | void | Promise<Tour | void>;
  onEditTour: (id: string, tour: Partial<Tour>) => void | Promise<void>;
  onViewTour?: (tour: Tour) => void;
}
const labels: Record<string, string> = { pending: "Chờ xử lý", reviewing: "Đã tiếp nhận", designed: "Khách đang xem", rejected: "Đã từ chối", cancelled: "Đã hủy", booked:"Đã đặt tour", closed:"Đã đóng", archived:"Lưu trữ" };
const money = (value: number) => value.toLocaleString("vi-VN") + "đ";
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN");
export function AgencyCustomRequests({ requests, company, tours, onUpdateRequest, onCreateTour, onViewTour, onViewBooking, services = [] }: Props) {
  const [preview, setPreview] = useState<Tour | null>(null);
  const [collaborating, setCollaborating] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState("all");
  const [historyRequestId, setHistoryRequestId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(()=>new URLSearchParams(window.location.hash.split("?")[1]).get("requestId"));
  const [designing, setDesigning] = useState<CustomTourRequest | null>(null);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [template, setTemplate] = useState<Tour | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Tour>>({});
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [updatingVersion, setUpdatingVersion] = useState<{ requestId: string; version: number } | null>(null);
  const [rejecting, setRejecting] = useState<CustomTourRequest | null>(null); const [reason, setReason] = useState("");
  const [cloning, setCloning] = useState<CustomTourRequest | null>(null); const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState(""); const [revision, setRevision] = useState(0);
  const currentTour = (request: CustomTourRequest) => overrides[request.id] || tours.find(t => t.id === request.designedTourId || t.customRequestId === request.id) || null;
  const active = (request: CustomTourRequest) => request.status === "reviewing" || request.status === "designed";
  const perform = async (fn: () => Promise<void>) => {
    if (lock.current) return false; lock.current = true; setBusy(true); setError("");
    try { await fn(); return true; } catch (e) { const message = e instanceof Error ? e.message : "Không thể thực hiện thao tác. Vui lòng thử lại."; setError(message); toast.error(message); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const decide = async (request: CustomTourRequest, decision: DesignRequestDecision) => {
    if (decision === "rejected") { setViewing(null); setReason(""); setError(""); setRejecting(request); return; }
    await perform(async () => { await onUpdateRequest(request.id, { status: decision }); toast.success("Đã tiếp nhận yêu cầu thiết kế."); });
  };
  const start = async (request: CustomTourRequest, existing?: Tour | null, version?: number) => {
    if (!active(request)) return;
    await perform(async () => {
      setTemplate(null);
      if (existing) {
        const saved=await getDesignVersion(request.id,version ?? overrides[request.id]?.version ?? existing.version ?? 1);
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
    toast.success("Đã lưu tour. Chọn phiên bản khách xem để cập nhật phương án.");
  };
  const openWorkspace = (request: CustomTourRequest) => {
    setError(""); setHistoryRequestId(request.id);
  };
  const chooseVersion = async (request: CustomTourRequest, version: number | null) => perform(async () => {
    setUpdatingVersion({ requestId: request.id, version: version ?? 0 });
    try {
      const saved = version === null ? await shareDesignTour(request.id, (await getDesignVersion(request.id,currentTour(request)?.version || 1)).revision!, null) : await selectCustomerDesignVersion(version,
        selected => getDesignVersion(request.id, selected),
        (freshRevision, selected) => shareDesignTour(request.id, freshRevision, selected));
      setOverrides(previous => ({ ...previous, [request.id]: saved }));
      setRevision(value => value + 1);
      try { await onUpdateRequest(request.id, {}); }
      catch { toast.warning("Đã cập nhật phiên bản cho khách. Danh sách yêu cầu chưa tải lại được, vui lòng tải lại trang khi kết nối ổn định."); }
      toast.success(version === null ? "Đã tạm ẩn tất cả phương án với khách. Các bản đã chia sẻ được giữ lại để mở xem sau." : `Khách hàng có thể xem và đặt phiên bản v${version} cùng các bản đã chia sẻ trước đó.`);
    } finally { setUpdatingVersion(null); }
  });
  const collaborationChanged = async (request: CustomTourRequest) => {
    await onUpdateRequest(request.id, {});
    if (request.designedTourId || currentTour(request)) {
      const fresh = fromApiTour(await http<ApiTour>(`/agency/tour-design-requests/${request.id}/working-tour`));
      setOverrides(previous => ({ ...previous, [request.id]: fresh }));
    }
    setRevision(value => value + 1);
  };
  const matchesTab = (r:CustomTourRequest,tab:string) => tab==="archived" ? !!r.archivedAt : !r.archivedAt && (tab==="all" ? ["pending","reviewing","designed"].includes(r.status) : tab==="closed" ? ["closed","rejected","cancelled"].includes(r.status) : r.status===tab);
  const lifecycle = async (request:CustomTourRequest, action:"archive"|"unarchive"|"close"|"reopen") => {
    let reason:string|undefined;
    if(action==="close") {const input=await requestText("Khách hàng sẽ thấy lý do này và không thể booking mới cho đến khi Agency mở lại.","",{title:"Đóng yêu cầu thiết kế",confirmLabel:"Đóng yêu cầu",tone:"warning"});if(input==null)return;reason=input.trim();if(!reason){toast.warning("Hãy nhập lý do đóng yêu cầu.");return;}}
    if(action==="reopen" && !(await confirmAction("Mở lại yêu cầu để tiếp tục thiết kế và cho khách booking?",{title:"Mở lại yêu cầu",confirmLabel:"Mở lại"})))return;
    await perform(async()=>{await designRequestLifecycle(request.id,action,reason);await onUpdateRequest(request.id,{});toast.success(action==="close"?"Đã đóng yêu cầu.":action==="reopen"?"Đã mở lại yêu cầu.":action==="archive"?"Đã chuyển vào lưu trữ. Phương án khách đang xem vẫn giữ nguyên.":"Đã bỏ lưu trữ.");});
  };
  const rows = useMemo(() => requests.filter(r => r.targetCompanyId === company.id && matchesTab(r,filter) &&
    [r.id,r.destinations,r.contactName,r.contactEmail,r.contactPhone,r.businessName].some(v=>v?.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)),[requests,filter,search,company.id]);
  const collaboration = requests.find(r => r.id === collaborating);
  if (preview) return <div className="space-y-3"><div className="rounded-lg bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">Xem trước phiên bản v{preview.version} · Nội dung này chưa thay đổi phiên bản khách đang xem.</div><TourDetailPage tour={preview} services={services} currentUser={company} previewOnly onBack={() => setPreview(null)}/></div>;
  if (collaboration) return <DesignCollaborationPanel request={collaboration} company={company} onClose={() => setCollaborating(null)} onChanged={() => collaborationChanged(collaboration)}/>;
  if (designing) return <TourFormPage key={`${designing.id}-${editing?.version ?? "new"}`} company={company} tour={editing || template} customRequest={designing} isCustomTour={true} ownershipCollaboration
    designVersions={designing.collaborationVersions} onDesignVersionChange={editing ? async version => { await perform(async () => setEditing(await getDesignVersion(designing.id, version))); } : undefined}
    onManageCoHosts={() => { setCollaborating(designing.id); setDesigning(null); }} onBack={() => setDesigning(null)} onSubmit={save} />;
  const viewed = requests.find(r => r.id === viewing) || null;
  if(viewed && new URLSearchParams(window.location.hash.split("?")[1]).has("requestId")) return <CustomRequestDetailModal embedded isOpen onClose={()=>{setViewing(null);window.location.hash="#/agency/custom-requests";}} request={viewed} matchingTour={currentTour(viewed)} userRole="agency" agencyActionBusy={busy} onAgencyDecision={decide} onStartDesignTour={start} onViewTour={setPreview}/>;
  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4 px-1 pt-1">
      <div><h1 className="text-2xl font-semibold text-slate-900">Yêu cầu thiết kế tour</h1>
        <p className="mt-2 text-sm text-slate-500">Tiếp nhận nhu cầu, xây dựng hành trình và chọn phiên bản khách được xem.</p></div>
      <p className="pt-2 text-sm text-slate-500"><strong className="font-semibold text-slate-800">{requests.filter(r => r.targetCompanyId === company.id).length}</strong> yêu cầu
        <span className="mx-2 text-slate-300">/</span><span className="text-amber-800">{requests.filter(r => r.targetCompanyId === company.id && r.status === "pending").length} chờ tiếp nhận</span></p>
    </header>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Danh sách yêu cầu thiết kế tour">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="relative min-w-[240px] flex-1 sm:max-w-lg"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
          <input aria-label="Tìm yêu cầu thiết kế" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm outline-none focus:border-sky-600 focus:bg-white focus:ring-2 focus:ring-sky-100" placeholder="Tìm khách hàng, điểm đến, mã yêu cầu…" value={search} onChange={e => setSearch(e.target.value)}/></div>
        <p className="flex items-center gap-1.5 text-xs text-slate-500"><Eye className="h-4 w-4 text-sky-700"/>Bản mới giữ riêng tư đến khi bạn cho khách xem</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4" role="tablist" aria-label="Trạng thái yêu cầu">
        {["all", "pending", "reviewing", "designed", "booked", "closed", "archived"].map(status => <button type="button" role="tab" aria-selected={filter === status} aria-controls="agency-design-request-rows" key={status}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors ${filter === status ? "border-sky-700 font-semibold text-sky-800" : "border-transparent text-slate-500 hover:text-slate-900"}`} onClick={() => setFilter(status)}>
          {status === "all" ? "Đang xử lý" : labels[status]}<span className={`rounded-md px-1.5 py-0.5 text-xs ${filter === status ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-500"}`}>{requests.filter(r => r.targetCompanyId === company.id && matchesTab(r,status)).length}</span>
        </button>)}
      </div>
      <div className="overflow-x-auto" id="agency-design-request-rows" role="tabpanel">
        <table className="w-full min-w-[900px] table-fixed text-left text-sm">
          <colgroup><col className="w-[23%]"/><col className="w-[21%]"/><col className="w-[16%]"/><col className="w-[20%]"/><col className="w-[20%]"/></colgroup>
          <thead className="border-b border-slate-100 bg-slate-50/80 text-xs text-slate-500"><tr>{["Khách hàng & yêu cầu", "Hành trình", "Ngân sách dự kiến", "Phương án tour", "Thao tác"].map(t => <th key={t} className="px-4 py-3 font-medium">{t}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map(request => {
            const tour = currentTour(request);
            const sharedVersion = overrides[request.id]?.sharedVersion ?? request.sharedVersion;
            const editable = active(request);
            return <tr key={request.id} className="align-top transition-colors hover:bg-slate-50/50">
              <td className="px-4 py-5"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-500">#{request.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${request.status === "rejected" ? "bg-rose-50 text-rose-700" : request.status === "pending" ? "bg-amber-50 text-amber-800" : request.status === "cancelled" ? "bg-slate-100 text-slate-500" : sharedVersion ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-800"}`}>{labels[request.status] || request.status}</span></div>
                <p className="truncate font-semibold text-slate-900" title={request.contactName}>{request.contactName}</p>
                {request.businessName && <p className="mt-1 truncate text-xs text-slate-600" title={request.businessName}>{request.businessName}</p>}
                <p className="mt-2 text-xs text-slate-500">{request.contactPhone}</p><p className="mt-0.5 truncate text-xs text-slate-500" title={request.contactEmail}>{request.contactEmail}</p>
                <ChatWithButton className="mt-3" userId={request.userId} context={{kind:"design-request",id:Number(request.id),title:`Yêu cầu thiết kế #${request.id}`,subtitle:request.destinations}}>Chat với khách</ChatWithButton>
                <p className="mt-2 text-xs text-slate-400">Gửi {date(request.createdAt)}</p>
              </td>
              <td className="px-4 py-5"><p className="flex items-start gap-1.5 font-semibold text-slate-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"/>{request.destinations}</p>
                <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500"><CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0"/>{date(request.departureDate)} – {date(request.returnDate)}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600"><Users className="h-3.5 w-3.5"/>{request.numberOfPeople} khách</p>
                {(request.closeReason || request.rejectionReason) && <p className="mt-3 text-xs text-rose-700">{request.closeReason || request.rejectionReason}</p>}
              </td>
              <td className="px-4 py-5">{request.budgetPerPerson ? <><p className="font-semibold tabular-nums text-slate-800">{money(Number(request.budgetPerPerson))}</p><p className="mt-0.5 text-xs text-slate-400">mỗi khách</p><p className="mt-3 text-xs text-slate-500">Tổng dự kiến</p><p className="mt-1 text-xs font-medium tabular-nums text-slate-600">{money(Number(request.budgetPerPerson) * Number(request.numberOfPeople))}</p></> : <span className="text-sm text-slate-500">Thỏa thuận</span>}</td>
              <td className="px-4 py-5">{tour ? <DesignVersionSelector requestId={request.id} tour={tour} sharedVersion={sharedVersion} reload={revision} disabled={busy || !editable}
                updatingVersion={updatingVersion?.requestId === request.id ? updatingVersion.version : undefined} onChange={version => void chooseVersion(request,version)}/>
                : <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs leading-relaxed text-slate-400"><p className="font-medium text-slate-500">Chưa có phương án tour</p><p className="mt-1">{request.status === "pending" ? "Tiếp nhận yêu cầu để bắt đầu thiết kế." : editable ? "Thiết kế mới hoặc dùng một tour có sẵn." : "Yêu cầu đã đóng."}</p></div>}</td>
              <td className="px-4 py-5"><div className="flex flex-wrap items-center gap-2">
                {request.status === "pending" ? <Button size="sm" disabled={busy} className="bg-sky-800 text-white hover:bg-sky-900" onClick={() => void decide(request,"reviewing")}><CheckCircle2 className="h-4 w-4"/>Tiếp nhận</Button>
                  : editable ? <Button size="sm" variant="outline" disabled={busy} className="border-sky-200 text-sky-800 hover:bg-sky-50" onClick={() => void start(request,tour,tour?.version)}><Sparkles className="h-3.5 w-3.5"/>Thiết kế tour</Button> : null}
                {request.bookingId && <Button size="sm" onClick={()=>onViewBooking?.(request.bookingId!)}>Xem booking</Button>}
                {tour && editable && <Button size="sm" variant="ghost" disabled={busy} className="text-sky-800" onClick={() => openWorkspace(request)}><Handshake className="h-3.5 w-3.5"/>Mời đối tác</Button>}
                <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-slate-500" disabled={busy} aria-label={`Thao tác yêu cầu ${request.id}`}><MoreHorizontal className="h-5 w-5"/></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-52">
                    <DropdownMenuItem onSelect={()=>void lifecycle(request,request.archivedAt?"unarchive":"archive")}>{request.archivedAt?"Bỏ lưu trữ":"Lưu trữ yêu cầu"}</DropdownMenuItem>
                    {active(request) || request.status==="pending" ? <DropdownMenuItem onSelect={()=>void lifecycle(request,"close")}>Đóng yêu cầu</DropdownMenuItem> : request.status==="closed" ? <DropdownMenuItem onSelect={()=>void lifecycle(request,"reopen")}>Mở lại yêu cầu</DropdownMenuItem> : null}
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem onSelect={() => setViewing(request.id)}><Eye/>Xem hồ sơ yêu cầu</DropdownMenuItem>
                    {editable && !tour && <DropdownMenuItem onSelect={() => { setCloning(request); setSourceId(""); setError(""); }}><Copy/>Dùng tour có sẵn</DropdownMenuItem>}
                    {!tour && (request.status === "pending" || request.status === "reviewing") && <><DropdownMenuSeparator/><DropdownMenuItem className="text-rose-700 focus:text-rose-800" onSelect={() => void decide(request,"rejected")}><XCircle/>Từ chối yêu cầu</DropdownMenuItem></>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div></td>
            </tr>;
          })}</tbody>
        </table>
        {!rows.length && <div className="px-5 py-16 text-center"><Search className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 font-medium text-slate-600">Không tìm thấy yêu cầu</p><p className="mt-1 text-sm text-slate-400">Thử từ khóa khác hoặc đổi bộ lọc trạng thái.</p></div>}
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Hiển thị {rows.length} yêu cầu · Mới nhất trước</p>
    </section>
    <CustomRequestDetailModal isOpen={Boolean(viewed)} onClose={() => setViewing(null)} request={viewed} matchingTour={viewed ? currentTour(viewed) : null} userRole="agency" agencyActionBusy={busy} onAgencyDecision={decide} onStartDesignTour={start} onViewTour={setPreview}/>
    <Dialog open={Boolean(historyRequestId)} onOpenChange={open => { if (!busy && !open) setHistoryRequestId(null); }}><DialogContent className="flex max-h-[88vh] flex-col overflow-hidden bg-white sm:max-w-5xl"><DialogHeader><DialogTitle>Mời và quản lý đối tác · Yêu cầu #{historyRequestId}</DialogTitle><DialogDescription>Chọn phiên bản tour để mời, thu hồi lời mời hoặc gỡ Agency đồng tổ chức.</DialogDescription></DialogHeader>
      <div className="min-h-0 overflow-y-auto pr-1">{requests.filter(r => r.id === historyRequestId).map(request => <DesignCollaborationPanel key={request.id} embedded request={request} company={company} onClose={() => setHistoryRequestId(null)} onChanged={() => collaborationChanged(request)}/>)}</div>
    </DialogContent></Dialog>
    <AlertDialog open={Boolean(rejecting)} onOpenChange={open => { if (!busy && !open) setRejecting(null); }}><AlertDialogContent tone="error" className="bg-white sm:max-w-lg"><AlertDialogHeader><AlertDialogTitle>Từ chối yêu cầu thiết kế #{rejecting?.id}</AlertDialogTitle><AlertDialogDescription>Cho khách biết vì sao Agency chưa thể tổ chức chuyến đi này.</AlertDialogDescription></AlertDialogHeader>
      <label className="space-y-2 text-sm">Lý do từ chối <span className="text-rose-600">*</span><textarea aria-label="Lý do từ chối" maxLength={2000} rows={4} className="mt-2 w-full rounded-lg border p-3" value={reason} onChange={e => setReason(e.target.value)}/></label>{error && <NotificationMessage tone="error" message={error} />}
      <div className="flex justify-end gap-2"><AlertDialogCancel asChild><Button data-slot="alert-dialog-cancel" variant="outline" disabled={busy} onClick={() => setRejecting(null)}>Hủy</Button></AlertDialogCancel><Button data-slot="alert-dialog-action" disabled={busy || !reason.trim()} onClick={() => void perform(async () => { if (!rejecting) return; await onUpdateRequest(rejecting.id, { status: "rejected", rejectionReason: reason.trim() }); setRejecting(null); toast.success("Đã từ chối và gửi lý do cho khách."); })}>{busy && <Loader2 className="animate-spin"/>}Xác nhận từ chối</Button></div>
    </AlertDialogContent></AlertDialog>
    <Dialog open={Boolean(cloning)} onOpenChange={open => { if (!busy && !open) setCloning(null); }}><DialogContent className="bg-white sm:max-w-xl"><DialogHeader><DialogTitle>Clone tour có sẵn</DialogTitle><DialogDescription>Tạo bản sao riêng cho yêu cầu này. Tour nguồn giữ nguyên.</DialogDescription></DialogHeader>
      <label className="text-sm">Tour mẫu<select aria-label="Tour mẫu để clone" value={sourceId} onChange={e => setSourceId(e.target.value)} className="mt-2 w-full rounded-lg border p-3"><option value="">Chọn tour của Agency</option>{tours.filter(t => !t.is_request && t.status !== "deleted").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{error && <NotificationMessage tone="error" message={error} />}
      <Button disabled={busy || !sourceId} onClick={() => void perform(async () => { if (!cloning) return; const saved = await cloneDesignTour(cloning.id, sourceId); setOverrides(prev => ({ ...prev, [cloning.id]: saved })); await onUpdateRequest(cloning.id, {}); setEditing(saved); setTemplate(null); setDesigning(cloning); setCloning(null); toast.success("Đã clone thành tour riêng. Bạn có thể chỉnh sửa ngay."); })}>Clone và chỉnh sửa</Button>
    </DialogContent></Dialog>
  </div>;
}
