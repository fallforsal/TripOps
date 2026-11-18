import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { confirmAction, requestText } from "@/app/lib/notificationDialogs";
import { TourDetailPage } from "@/app/components/user/TourDetailPage";
import { selectCustomerDesignVersion } from "@/app/lib/designVersionSelection";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "@/app/components/ui/alert-dialog";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { DesignVersionSelector } from "./DesignVersionSelector";
import { DesignCollaborationPanel } from "./DesignCollaborationPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/app/lib/notifications";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Handshake,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
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
  embedded?: boolean;
  onDetailChange?: (open: boolean) => void;
  onViewBooking?: (id: string) => void;
  services?: Service[];
  requests: CustomTourRequest[];
  company: TourCompany;
  tours: Tour[];
  allCompanies?: TourCompany[];
  onUpdateRequest: (id: string, update: Partial<CustomTourRequest>) => void | Promise<void>;
  onCreateTour: (tour: Omit<Tour, "id"> & { id?: string }) => Tour | void | Promise<Tour | void>;
  onEditTour: (id: string, tour: Partial<Tour>) => void | Promise<void>;
  onViewTour?: (tour: Tour) => void;
}

const labels: Record<string, string> = {
  pending: "Chờ xử lý",
  reviewing: "Đã tiếp nhận",
  designed: "Khách đang xem",
  rejected: "Đã từ chối",
  cancelled: "Đã hủy",
  booked: "Đã đặt tour",
  closed: "Đã đóng",
  archived: "Lưu trữ",
};

const statusPillStyle = (status: string, sharedVersion?: number) => {
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "cancelled" || status === "closed") return "border-slate-200 bg-slate-100 text-slate-600";
  if (status === "booked") return "border-teal-200 bg-teal-50 text-teal-800";
  if (sharedVersion) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-sky-200 bg-sky-50 text-[#075985]";
};

const money = (value: number) => value.toLocaleString("vi-VN") + "đ";
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN");

export function AgencyCustomRequests({
  requests,
  company,
  tours,
  onUpdateRequest,
  onViewBooking,
  services = [],
  embedded = false,
  onDetailChange,
}: Props) {
  const [preview, setPreview] = useState<Tour | null>(null);
  const [collaborating, setCollaborating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [historyRequestId, setHistoryRequestId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(() => new URLSearchParams(window.location.hash.split("?")[1]).get("requestId"));
  const [designing, setDesigning] = useState<CustomTourRequest | null>(null);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [template, setTemplate] = useState<Tour | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Tour>>({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [updatingVersion, setUpdatingVersion] = useState<{ requestId: string; version: number | "all" } | null>(null);
  const [rejecting, setRejecting] = useState<CustomTourRequest | null>(null);
  const [reason, setReason] = useState("");
  const [cloning, setCloning] = useState<CustomTourRequest | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  const currentTour = (request: CustomTourRequest) =>
    overrides[request.id] || tours.find(t => t.id === request.designedTourId || t.customRequestId === request.id) || null;
  const active = (request: CustomTourRequest) => request.status === "reviewing" || request.status === "designed";

  const perform = async (fn: () => Promise<void>) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Không thể thực hiện thao tác. Vui lòng thử lại.";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const decide = async (request: CustomTourRequest, decision: DesignRequestDecision) => {
    if (decision === "rejected") {
      if (request.status !== "pending") return;
      setViewing(null);
      setReason("");
      setError("");
      setRejecting(request);
      return;
    }
    await perform(async () => {
      await onUpdateRequest(request.id, { status: decision });
      toast.success("Đã tiếp nhận yêu cầu thiết kế.");
    });
  };

  const beginDesign = (request: CustomTourRequest, existing?: Tour | null, version?: number) => {
    if (!active(request)) return;
    if (!existing) {
      setSourceId("");
      setError("");
      setCloning(request);
      return;
    }
    void start(request, existing, version);
  };

  const start = async (request: CustomTourRequest, existing?: Tour | null, version?: number) => {
    if (!active(request)) return;
    await perform(async () => {
      setTemplate(null);
      if (existing) {
        const saved = await getDesignVersion(request.id, version ?? overrides[request.id]?.version ?? existing.version ?? 1);
        setEditing(saved);
      } else {
        setEditing(null);
        const source = await http<TourConfiguration | null>(`/agency/tour-design-requests/${request.id}/source`);
        if (source) {
          const base = fromApiTour({
            id: 0,
            agencyId: company.id,
            code: null,
            status: "draft",
            visibility: "hidden",
            isRequest: true,
            isAiGenerated: false,
            version: 1,
            configuration: { ...source, code: null },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
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
    await onUpdateRequest(designing.id, {});
    setDesigning(null);
    setEditing(null);
    setRevision(n => n + 1);
    toast.success("Đã lưu tour. Chọn phiên bản khách xem để cập nhật phương án.");
  };

  const openWorkspace = (request: CustomTourRequest) => {
    setError("");
    setCollaborating(request.id);
  };

  const chooseVersion = async (request: CustomTourRequest, selection: number | "all" | null) =>
    perform(async () => {
      setUpdatingVersion({ requestId: request.id, version: selection ?? 0 });
      try {
        const shareAll = selection === "all";
        const targetVersion = shareAll ? currentTour(request)?.version || 1 : selection;
        const saved =
          targetVersion === null
            ? await shareDesignTour(request.id, (await getDesignVersion(request.id, currentTour(request)?.version || 1)).revision!, null, false)
            : await selectCustomerDesignVersion(
                targetVersion,
                selected => getDesignVersion(request.id, selected),
                (freshRevision, selected) => shareDesignTour(request.id, freshRevision, selected, shareAll),
              );
        setOverrides(previous => ({ ...previous, [request.id]: saved }));
        setRevision(value => value + 1);
        try {
          await onUpdateRequest(request.id, {});
        } catch {
          toast.warning("Đã cập nhật phiên bản cho khách. Danh sách yêu cầu chưa tải lại được, vui lòng tải lại trang khi kết nối ổn định.");
        }
        toast.success(
          selection === null
            ? "Đã ẩn tất cả phương án với khách."
            : shareAll
              ? "Khách hàng có thể xem và đặt toàn bộ các phiên bản của tour."
              : `Khách hàng chỉ được xem và đặt phiên bản v${selection}.`,
        );
      } finally {
        setUpdatingVersion(null);
      }
    });

  const collaborationChanged = async (request: CustomTourRequest) => {
    await onUpdateRequest(request.id, {});
    if (request.designedTourId || currentTour(request)) {
      const fresh = fromApiTour(await http<ApiTour>(`/agency/tour-design-requests/${request.id}/working-tour`));
      setOverrides(previous => ({ ...previous, [request.id]: fresh }));
    }
    setRevision(value => value + 1);
  };

  const matchesTab = (r: CustomTourRequest, tab: string) =>
    tab === "all" || (tab === "closed" ? ["closed", "rejected", "cancelled"].includes(r.status) : r.status === tab);

  const lifecycle = async (request: CustomTourRequest, action: "archive" | "unarchive" | "close" | "reopen") => {
    let closeReasonInput: string | undefined;
    if (action === "close") {
      const input = await requestText("Khách hàng sẽ thấy lý do này và không thể booking mới cho đến khi Agency mở lại.", "", {
        title: "Đóng yêu cầu thiết kế",
        confirmLabel: "Đóng yêu cầu",
        tone: "warning",
      });
      if (input == null) return;
      closeReasonInput = input.trim();
      if (!closeReasonInput) {
        toast.warning("Hãy nhập lý do đóng yêu cầu.");
        return;
      }
    }
    if (action === "reopen" && !(await confirmAction("Mở lại yêu cầu để tiếp tục thiết kế và cho khách booking?", { title: "Mở lại yêu cầu", confirmLabel: "Mở lại" }))) {
      return;
    }
    await perform(async () => {
      await designRequestLifecycle(request.id, action, closeReasonInput);
      await onUpdateRequest(request.id, {});
      toast.success(
        action === "close"
          ? "Đã đóng yêu cầu."
          : action === "reopen"
            ? "Đã mở lại yêu cầu."
            : action === "archive"
              ? "Đã chuyển vào lưu trữ. Phương án khách đang xem vẫn giữ nguyên."
              : "Đã bỏ lưu trữ.",
      );
    });
  };

  const rows = useMemo(
    () =>
      requests
        .filter(
          r =>
            r.targetCompanyId === company.id &&
            matchesTab(r, filter) &&
            [r.id, r.destinations, r.contactName, r.contactEmail, r.contactPhone, r.businessName].some(v =>
              v?.toLowerCase().includes(search.toLowerCase()),
            ),
        )
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [requests, filter, search, company.id],
  );

  const collaboration = requests.find(r => r.id === collaborating);
  const detailOpen = !!(
    preview ||
    collaboration ||
    designing ||
    (viewing && requests.some(r => r.id === viewing) && new URLSearchParams(window.location.hash.split("?")[1]).has("requestId"))
  );
  useEffect(() => {
    onDetailChange?.(detailOpen);
  }, [detailOpen, onDetailChange]);
  useEffect(() => () => onDetailChange?.(false), [onDetailChange]);

  if (preview) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-[#075985]">
          Xem trước phiên bản v{preview.version} · Nội dung này chưa thay đổi phiên bản khách đang xem.
        </div>
        <TourDetailPage tour={preview} services={services} currentUser={company} previewOnly onBack={() => setPreview(null)} />
      </div>
    );
  }
  if (collaboration) {
    return <DesignCollaborationPanel request={collaboration} company={company} onClose={() => setCollaborating(null)} onChanged={() => collaborationChanged(collaboration)} />;
  }
  if (designing) {
    return (
      <TourFormPage
        key={`${designing.id}-${editing?.version ?? "new"}`}
        company={company}
        tour={editing || template}
        customRequest={designing}
        isCustomTour={true}
        ownershipCollaboration
        designVersions={designing.collaborationVersions}
        onDesignVersionChange={editing ? async version => { await perform(async () => setEditing(await getDesignVersion(designing.id, version))); } : undefined}
        onManageCoHosts={() => {
          setCollaborating(designing.id);
          setDesigning(null);
        }}
        onBack={() => setDesigning(null)}
        onSubmit={save}
      />
    );
  }

  const viewed = requests.find(r => r.id === viewing) || null;
  if (viewed && new URLSearchParams(window.location.hash.split("?")[1]).has("requestId")) {
    return (
      <CustomRequestDetailModal
        embedded
        isOpen
        onClose={() => {
          setViewing(null);
          window.location.hash = "#/agency/custom-requests";
        }}
        request={viewed}
        matchingTour={currentTour(viewed)}
        userRole="agency"
        agencyActionBusy={busy}
        onAgencyDecision={decide}
        onStartDesignTour={beginDesign}
        onViewTour={setPreview}
      />
    );
  }

  return (
    <div className="space-y-5">
      {!embedded && (
        <header className="flex flex-wrap items-start justify-between gap-4 px-1 pt-1">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Yêu cầu thiết kế tour</h1>
            <p className="mt-1.5 text-sm text-slate-500">Tiếp nhận nhu cầu, xây dựng hành trình và chọn phiên bản khách được xem.</p>
          </div>
          <p className="pt-2 text-sm text-slate-500">
            <strong className="font-semibold text-slate-800">{requests.filter(r => r.targetCompanyId === company.id).length}</strong> yêu cầu
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-amber-800">{requests.filter(r => r.targetCompanyId === company.id && r.status === "pending").length} chờ tiếp nhận</span>
          </p>
        </header>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 border-t-4 border-t-[#075985] bg-white shadow-2xs" aria-label="Danh sách yêu cầu thiết kế tour">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative min-w-[240px] flex-1 sm:max-w-lg">
            <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              aria-label="Tìm yêu cầu thiết kế"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm outline-none transition focus:border-[#075985] focus:bg-white focus:ring-2 focus:ring-sky-100"
              placeholder="Tìm khách hàng, điểm đến, mã yêu cầu…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Eye className="h-4 w-4 text-[#075985]" />
            Bản mới giữ riêng tư đến khi bạn cho khách xem
          </p>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/40 px-4" role="tablist" aria-label="Trạng thái yêu cầu">
          {["all", "pending", "reviewing", "designed", "booked", "closed"].map(status => (
            <button
              type="button"
              role="tab"
              aria-selected={filter === status}
              aria-controls="agency-design-request-rows"
              key={status}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm transition-colors ${
                filter === status ? "border-[#075985] font-semibold text-[#075985]" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => setFilter(status)}
            >
              {status === "all" ? "Tất cả" : labels[status]}
              <span
                className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                  filter === status ? "bg-sky-100 text-[#075985]" : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {requests.filter(r => r.targetCompanyId === company.id && matchesTab(r, status)).length}
              </span>
            </button>
          ))}
        </div>

        <div id="agency-design-request-rows" role="tabpanel" className="divide-y divide-slate-100">
          {rows.map(request => {
            const tour = currentTour(request);
            const sharedVersion = overrides[request.id]?.sharedVersion ?? request.sharedVersion;
            const shareAllVersions = overrides[request.id]?.shareAllVersions ?? request.shareAllVersions;
            const editable = active(request);
            const budget = Number(request.budgetPerPerson);
            const partnerCount = request.coHosts?.filter(h => h.role === "partner" && h.status === "accepted").length || 0;

            return (
              <article key={request.id} className="p-5 transition-colors hover:bg-slate-50/60">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(240px,1.15fr)_minmax(230px,1.1fr)_minmax(290px,1.15fr)]">
                  {/* Cột 1: Khách hàng & Liên hệ */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">
                        #{request.id}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusPillStyle(request.status, sharedVersion)}`}>
                        {request.status === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
                        {labels[request.status] || request.status}
                      </span>
                      {(request.hasCollaborations || partnerCount > 0) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                          <Handshake className="h-3 w-3" />
                          Liên minh{partnerCount > 0 ? ` (${partnerCount + 1})` : ""}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">Gửi {date(request.createdAt)}</span>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900" title={request.contactName}>
                        {request.contactName}
                      </p>
                      {request.businessName && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-600" title={request.businessName}>
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {request.businessName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{request.contactPhone}</p>
                      <p className="flex items-center gap-1.5 truncate" title={request.contactEmail}>
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />{request.contactEmail}
                      </p>
                    </div>

                    <div>
                      <ChatWithButton
                        userId={request.userId}
                        context={{ kind: "design-request", id: Number(request.id), title: `Yêu cầu thiết kế #${request.id}`, subtitle: request.destinations }}
                      >
                        Chat với khách
                      </ChatWithButton>
                    </div>
                  </div>

                  {/* Cột 2: Hành trình & Ngân sách */}
                  <div className="space-y-3">
                    <div>
                      <p className="flex items-start gap-1.5 text-base font-semibold text-slate-900">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#075985]" />
                        <span>{request.destinations}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                          {date(request.departureDate)} – {date(request.returnDate)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {request.numberOfPeople} khách
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5">
                      {budget > 0 ? (
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <span className="block text-[11px] font-medium text-slate-500">Ngân sách dự kiến</span>
                            <span className="text-sm font-bold tabular-nums text-slate-900">
                              {money(budget)} <span className="text-xs font-normal text-slate-500">/ khách</span>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[11px] text-slate-400">Tổng đoàn</span>
                            <span className="text-xs font-semibold tabular-nums text-slate-700">
                              {money(budget * Number(request.numberOfPeople))}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Ngân sách dự kiến</span>
                          <span className="font-semibold text-slate-700">Thỏa thuận</span>
                        </div>
                      )}
                    </div>

                    {(request.closeReason || request.rejectionReason) && (
                      <p className="rounded-lg border border-rose-200/70 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {request.closeReason || request.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Cột 3: Phương án & Thao tác */}
                  <div className="flex flex-col justify-start gap-2.5 self-start">
                    {tour ? (
                      <DesignVersionSelector
                        requestId={request.id}
                        tour={tour}
                        sharedVersion={sharedVersion}
                        shareAllVersions={shareAllVersions}
                        reload={revision}
                        disabled={busy || !editable}
                        updatingVersion={updatingVersion?.requestId === request.id ? updatingVersion.version : undefined}
                        onChange={version => void chooseVersion(request, version)}
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-3.5 text-xs leading-relaxed text-slate-500">
                        <p className="font-semibold text-slate-700">Chưa có phương án tour</p>
                        <p className="mt-1">
                          {request.status === "pending"
                            ? "Tiếp nhận yêu cầu để bắt đầu thiết kế hành trình cho khách."
                            : editable
                              ? "Nhấn Thiết kế tour để soạn mới hoặc chọn Dùng tour có sẵn."
                              : "Yêu cầu đã đóng."}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        onClick={() => setViewing(request.id)}
                      >
                        <FileText className="h-3.5 w-3.5 text-[#075985]" />
                        Hồ sơ
                      </Button>

                      {request.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            disabled={busy}
                            className="bg-[#075985] text-white hover:bg-[#0369a1]"
                            onClick={() => void decide(request, "reviewing")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Tiếp nhận
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                            onClick={() => void decide(request, "rejected")}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Từ chối
                          </Button>
                        </>
                      ) : editable ? (
                        <Button
                          size="sm"
                          disabled={busy}
                          className="bg-[#075985] text-white hover:bg-[#0369a1]"
                          onClick={() => beginDesign(request, tour, tour?.version)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Thiết kế tour
                        </Button>
                      ) : null}

                      {request.bookingId && (
                        <Button size="sm" variant="outline" className="border-teal-200 bg-teal-50/70 text-teal-800 hover:bg-teal-100" onClick={() => onViewBooking?.(request.bookingId!)}>
                          Xem booking
                        </Button>
                      )}

                      {tour && editable && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          className="border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => openWorkspace(request)}
                        >
                          <Handshake className="h-3.5 w-3.5 text-teal-700" />
                          Mời đối tác
                        </Button>
                      )}

                      {(active(request) || request.status === "pending") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                          onClick={() => void lifecycle(request, "close")}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Đóng yêu cầu
                        </Button>
                      )}

                      {request.status === "closed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          className="border-sky-200 bg-white text-[#075985] hover:bg-sky-50"
                          onClick={() => void lifecycle(request, "reopen")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mở lại yêu cầu
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!rows.length && (
            <div className="px-5 py-16 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Không tìm thấy yêu cầu</p>
              <p className="mt-1 text-xs text-slate-500">Thử từ khóa khác hoặc đổi bộ lọc trạng thái.</p>
            </div>
          )}
        </div>

        <p className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          Hiển thị {rows.length} yêu cầu · Mới nhất trước
        </p>
      </section>

      <CustomRequestDetailModal
        isOpen={Boolean(viewed)}
        onClose={() => setViewing(null)}
        request={viewed}
        matchingTour={viewed ? currentTour(viewed) : null}
        userRole="agency"
        agencyActionBusy={busy}
        onAgencyDecision={decide}
        onStartDesignTour={beginDesign}
        onViewTour={setPreview}
      />

      <Dialog open={Boolean(historyRequestId)} onOpenChange={open => { if (!busy && !open) setHistoryRequestId(null); }}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden bg-white sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#075985]">
              <Handshake className="h-5 w-5" />
              Mời và quản lý đối tác · Yêu cầu #{historyRequestId}
            </DialogTitle>
            <DialogDescription>
              Chọn phiên bản tour để mời hoặc gỡ Agency đối tác. Quyền chỉnh sửa chỉ áp dụng cho phiên bản được mời.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto pr-1">
            {requests
              .filter(r => r.id === historyRequestId)
              .map(request => (
                <DesignCollaborationPanel
                  key={request.id}
                  embedded
                  request={request}
                  company={company}
                  onClose={() => setHistoryRequestId(null)}
                  onChanged={() => collaborationChanged(request)}
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(rejecting)} onOpenChange={open => { if (!busy && !open) setRejecting(null); }}>
        <AlertDialogContent tone="error" className="bg-white sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Từ chối yêu cầu thiết kế #{rejecting?.id}</AlertDialogTitle>
            <AlertDialogDescription>Cho khách biết vì sao Agency chưa thể tổ chức chuyến đi này.</AlertDialogDescription>
          </AlertDialogHeader>
          <label className="space-y-2 text-sm">
            Lý do từ chối <span className="text-rose-600">*</span>
            <textarea
              aria-label="Lý do từ chối"
              maxLength={2000}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#075985] focus:ring-2 focus:ring-sky-100"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </label>
          {error && <NotificationMessage tone="error" message={error} />}
          <div className="flex justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button data-slot="alert-dialog-cancel" variant="outline" disabled={busy} onClick={() => setRejecting(null)}>
                Hủy
              </Button>
            </AlertDialogCancel>
            <Button
              data-slot="alert-dialog-action"
              disabled={busy || !reason.trim()}
              onClick={() =>
                void perform(async () => {
                  if (!rejecting) return;
                  await onUpdateRequest(rejecting.id, { status: "rejected", rejectionReason: reason.trim() });
                  setRejecting(null);
                  toast.success("Đã từ chối và gửi lý do cho khách.");
                })
              }
            >
              {busy && <Loader2 className="animate-spin" />}
              Xác nhận từ chối
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(cloning)} onOpenChange={open => { if (!busy && !open) setCloning(null); }}>
        <DialogContent className="bg-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#075985]">
              <Sparkles className="h-5 w-5" />
              Bắt đầu thiết kế tour · Yêu cầu #{cloning?.id}
            </DialogTitle>
            <DialogDescription>
              Bạn muốn dùng một tour có sẵn của Agency làm mẫu hay thiết kế mới hoàn toàn từ đầu?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Copy className="h-4 w-4 text-[#075985]" />
                Dùng tour có sẵn làm mẫu
              </div>
              <p className="text-xs text-slate-500">
                Tạo bản sao riêng cho yêu cầu này để chỉnh sửa nhanh. Tour gốc không bị thay đổi.
              </p>
              <select
                aria-label="Tour mẫu để clone"
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-[#075985] focus:ring-2 focus:ring-sky-100"
              >
                <option value="">— Chọn tour của Agency —</option>
                {tours
                  .filter(t => !t.is_request && t.status !== "deleted")
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
              {error && <NotificationMessage tone="error" message={error} />}
              <div className="flex justify-end">
                <Button
                  disabled={busy || !sourceId}
                  className="bg-[#075985] text-white hover:bg-[#0369a1]"
                  onClick={() =>
                    void perform(async () => {
                      if (!cloning) return;
                      const saved = await cloneDesignTour(cloning.id, sourceId);
                      setOverrides(prev => ({ ...prev, [cloning.id]: saved }));
                      await onUpdateRequest(cloning.id, {});
                      setEditing(saved);
                      setTemplate(null);
                      setDesigning(cloning);
                      setCloning(null);
                      toast.success("Đã tạo bản sao thành tour riêng. Bạn có thể chỉnh sửa ngay.");
                    })
                  }
                >
                  <Copy className="h-4 w-4" />
                  Dùng tour đã chọn &amp; Thiết kế
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Không dùng tour mẫu?</p>
                <p className="text-xs text-slate-500">Tự thiết kế lịch trình và bảng giá mới hoàn toàn từ đầu.</p>
              </div>
              <Button
                variant="outline"
                disabled={busy}
                className="border-sky-200 text-[#075985] hover:bg-sky-50"
                onClick={() => {
                  const target = cloning;
                  setCloning(null);
                  if (target) void start(target, null);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Thiết kế mới từ đầu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
