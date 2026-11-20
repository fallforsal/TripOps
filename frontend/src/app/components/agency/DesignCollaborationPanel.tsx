import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { VietnameseMoneyInput } from "@/app/components/ui/VietnameseMoneyInput";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Eye,
  Handshake,
  Info,
  Mail,
  MessageSquareText,
  PenSquare,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "@/app/lib/notifications";
import type { CustomTourRequest, Tour, TourCoHost, TourCompany } from "@/app/types";
import { http } from "@/app/lib/http";
import { tourSaveBody } from "@/app/lib/tourSaveBody";
import { designPartnerStatusLabel } from "@/app/lib/designAlliance";
import { AgencyDiscoveryPicker } from "@/app/components/common/AgencyDiscoveryPicker";
import { fromApiTour, toConfiguration, type ApiTour } from "@/app/services/wf02Tours";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { TourFormPage } from "./AgencyTourManagement";
import { PartnerInvitationTable } from "./PartnerInvitationTable";

type Props = {
  request: CustomTourRequest;
  company: TourCompany;
  onChanged: () => void | Promise<void>;
  onClose: () => void;
  embedded?: boolean;
  autoEdit?: boolean;
};

const money = (n?: number) => (n == null ? "Chưa đề xuất" : `${n.toLocaleString("vi-VN")}đ`);
const dateTime = (v?: string) =>
  v
    ? new Date(v).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

function CompanyAvatar({ name, logo }: { name: string; logo?: string }) {
  const clean = name.replace(/^\[[^\]]+\]\s*/g, "").trim();
  const initials = clean.slice(0, 2).toUpperCase() || "AG";
  return logo ? (
    <img src={logo} alt={name} className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover bg-white" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-xs font-bold text-[#075985]">
      {initials}
    </span>
  );
}

export function DesignCollaborationPanel({ request, company, onChanged, onClose, embedded = false, autoEdit = false }: Props) {
  const [version, setVersion] = useState<number | undefined>(() =>
    request.collaborationVersions?.includes(request.currentVersion || 0) ? request.currentVersion : request.collaborationVersions?.[0],
  );
  const [hosts, setHosts] = useState<TourCoHost[]>(request.coHosts || []);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "invite">("members");
  const [inspectingHost, setInspectingHost] = useState<TourCoHost | null>(null);
  const [removingHost, setRemovingHost] = useState<TourCoHost | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [partner, setPartner] = useState("");
  const [partnerPreview, setPartnerPreview] = useState<TourCompany | null>(null);
  const [segment, setSegment] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const loadSequence = useRef(0);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<Tour | null>(null);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const lead = request.targetCompanyId === company.id;
  const mutable = request.status === "reviewing" || request.status === "designed";
  const me = hosts.find(h => h.companyId === company.id);
  const leadHost = hosts.find(h => h.role === "lead" || h.companyId === request.targetCompanyId);

  useEffect(() => {
    if (request.designedTourId && request.collaborationVersions?.length && !request.collaborationVersions.includes(version || 0)) {
      setVersion(request.collaborationVersions[0]);
    }
  }, [request.collaborationVersions, request.designedTourId, version]);

  const query = version ? `?version=${version}` : "";
  const root = `/agency/tour-design-requests/${request.id}`;

  const load = async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const rows = await http<TourCoHost[]>(`${root}/co-hosts${query}`);
      const tour =
        request.designedTourId && (lead || rows.some(h => h.companyId === company.id && h.status === "accepted"))
          ? fromApiTour(await http<ApiTour>(`${root}/working-tour${query}`))
          : null;
      if (sequence === loadSequence.current) {
        setHosts(rows);
        setWorking(tour);
        if (autoEdit && tour && !lead && mutable && rows.some(h => h.companyId === company.id && h.status === "accepted")) {
          setEditing({ ...tour, coHosts: rows, isCoHosted: true });
        }
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setWorking(null);
    setError("");
    setPartner("");
    setPartnerPreview(null);
    load().catch(e => {
      if (alive) setError(e.message);
    });
    return () => {
      alive = false;
      loadSequence.current++;
    };
  }, [request.id, version]);

  const action = async (fn: () => Promise<void>) => {
    if (busy || loading) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu liên minh.");
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <TourFormPage
        key={`${editing.id}-${editing.version}`}
        designVersions={request.collaborationVersions}
        onDesignVersionChange={async selected => {
          await action(async () => {
            const fresh = fromApiTour(await http<ApiTour>(`${root}/working-tour?version=${selected}`));
            setVersion(selected);
            setEditing(fresh);
          });
        }}
        company={company}
        tour={editing}
        customRequest={request}
        isCustomTour
        ownershipCollaboration
        onBack={() => setEditing(null)}
        onManageCoHosts={() => setEditing(null)}
        onSubmit={async data => {
          const config = toConfiguration({ ...editing, ...data });
          const body = tourSaveBody(
            {
              revision: editing.revision || 1,
              version: editing.version,
              timelines: config.timelines,
              pricingTiers: config.pricingTiers,
              ownedHighlights: config.ownedHighlights,
              ownedInclusions: config.ownedInclusions,
              ownedExclusions: config.ownedExclusions,
              ownedCancellationPolicy: config.ownedCancellationPolicy,
              ownedImages: config.ownedImages,
            },
            data,
          );
          const saved = fromApiTour(
            await http<ApiTour>(body instanceof FormData ? `${root}/segment/with-images` : `${root}/segment`, { method: "PUT", body }),
          );
          setEditing(null);
          await load();
          await onChanged();
          toast.success(`Đã lưu nháp chặng trong v${saved.version}. Agency chủ trì sẽ kiểm tra và chọn phiên bản cho khách xem.`);
        }}
      />
    );
  }

  return (
    <div className={embedded ? "space-y-5 bg-white p-1" : "space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1.5">
          {!embedded && (
            <button
              type="button"
              onClick={onClose}
              className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-[#075985]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại danh sách
            </button>
          )}
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#075985]">
            <Handshake className="h-5 w-5" />
            Đồng tổ chức &amp; Quản lý đối tác · Yêu cầu #{request.id}
          </h2>
          <p className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-800">{request.destinations}</strong>
            <span className="mx-2 text-slate-300">·</span>
            {request.numberOfPeople} khách
            <span className="mx-2 text-slate-300">·</span>
            Chủ trì: <strong className="font-semibold text-slate-800">{request.targetCompanyName}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {request.designedTourId && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Phiên bản:</span>
              <div className="relative">
                <select
                  aria-label="Phiên bản liên minh"
                  disabled={busy || loading}
                  className="h-9 appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-9 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition hover:border-slate-300 focus:border-[#075985] focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:opacity-60"
                  value={version ?? ""}
                  onChange={e => setVersion(Number(e.target.value))}
                >
                  {request.collaborationVersions?.map(n => (
                    <option key={n} value={n}>
                      v{n}
                      {!lead && request.collaborationInvitations?.find(i => i.version === n)
                        ? ` · ${designPartnerStatusLabel(request.collaborationInvitations.find(i => i.version === n)!.status)}`
                        : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}
          <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 px-3.5 text-xs font-semibold shadow-2xs" disabled={busy || loading} onClick={() => void action(load)}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </Button>
        </div>
      </div>

      {/* Scope explanation */}
      <div className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 p-3.5 text-xs leading-relaxed text-[#075985]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Lời mời và quyền chỉnh sửa áp dụng riêng cho <strong>phiên bản đang chọn (v{version || 1})</strong>. Gỡ đối tác sẽ xóa nội dung và bảng giá của họ trong bản này; các phiên bản khác giữ nguyên.
        </p>
      </div>

      {loading && <p role="status" className="text-sm text-slate-500">Đang tải thông tin liên minh…</p>}
      {error && <NotificationMessage tone="error" message={error} />}
      {!mutable && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-600">
          Yêu cầu đã đóng. Bạn có thể xem lại lịch sử liên minh và chi tiết lời mời của phiên bản.
        </div>
      )}
      {lead && mutable && !request.designedTourId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
          Hãy lưu phiên bản tour đầu tiên để bắt đầu mời đối tác đồng tổ chức.
        </div>
      )}

      {/* KHỐI DÀNH CHO ĐỐI TÁC: CHI TIẾT LỜI MỜI LUÔN HIỂN THỊ */}
      {!lead && me && (
        <section
          aria-label="Chi tiết lời mời từ Agency chủ trì"
          className={`space-y-4 rounded-2xl border p-5 ${
            me.status === "pending"
              ? "border-amber-200 bg-amber-50/50"
              : me.status === "removed" || me.status === "revoked" || me.status === "rejected"
                ? "border-rose-200 bg-rose-50/40"
                : "border-emerald-200 bg-emerald-50/40"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CompanyAvatar name={leadHost?.companyName || request.targetCompanyName} logo={leadHost?.companyLogo} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Chi tiết lời mời · v{version || 1}</span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      me.status === "accepted"
                        ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                        : me.status === "pending"
                          ? "border-amber-200 bg-amber-100 text-amber-800"
                          : "border-rose-200 bg-rose-100 text-rose-800"
                    }`}
                  >
                    {designPartnerStatusLabel(me.status)}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  Mời bởi {leadHost?.companyName || request.targetCompanyName}
                </h3>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {leadHost?.companyPhone && (
                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{leadHost.companyPhone}</span>
                  )}
                  {leadHost?.companyEmail && (
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{leadHost.companyEmail}</span>
                  )}
                </div>
              </div>
            </div>

            {mutable && me.status === "accepted" && (
              <Button
                disabled={busy || loading || !request.designedTourId}
                className="bg-[#075985] text-white hover:bg-[#0369a1]"
                onClick={() =>
                  void action(async () => {
                    const tour = fromApiTour(await http<ApiTour>(`${root}/working-tour${query}`));
                    setEditing({ ...tour, coHosts: hosts, isCoHosted: true });
                  })
                }
              >
                <PenSquare className="h-4 w-4" />
                Thiết kế nội dung &amp; bảng giá riêng
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3">
              <span className="block text-[11px] font-medium text-slate-500">Chặng phụ trách</span>
              <span className="mt-0.5 block text-sm font-semibold text-slate-900">{me.assignedSegments || "Phối hợp chung"}</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3">
              <span className="block text-[11px] font-medium text-slate-500">Ngân sách đề xuất</span>
              <span className="mt-0.5 block text-sm font-bold tabular-nums text-[#075985]">
                {me.estimatedBudgetPerGuest != null ? `${money(me.estimatedBudgetPerGuest)} / khách` : "Chưa đề xuất"}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3">
              <span className="block text-[11px] font-medium text-slate-500">Thời gian gửi lời mời</span>
              <span className="mt-0.5 block text-xs font-semibold text-slate-800">{dateTime(me.invitedAt)}</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3">
              <span className="block text-[11px] font-medium text-slate-500">Thời gian phản hồi / cập nhật</span>
              <span className="mt-0.5 block text-xs font-semibold text-slate-800">{dateTime(me.respondedAt)}</span>
            </div>
          </div>

          {me.notes && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-sm text-slate-700">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <MessageSquareText className="h-3.5 w-3.5" />
                Lời nhắn từ Agency chủ trì
              </span>
              <p className="whitespace-pre-wrap">{me.notes}</p>
            </div>
          )}

          {(me.status === "removed" || me.status === "revoked") && (
            <div role="status" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-white p-3.5 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p>Bạn đã bị Agency chủ trì gỡ khỏi phiên bản v{version}. Lời mời cũ vẫn được lưu để đối chiếu; bạn không còn quyền xem hoặc sửa tour trong bản này.</p>
            </div>
          )}

          {mutable && me.status === "pending" && (
            <div className="space-y-3 border-t border-amber-200/70 pt-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  disabled={busy || loading}
                  className="bg-[#075985] text-white hover:bg-[#0369a1]"
                  onClick={() =>
                    void action(async () => {
                      await http(`${root}/co-hosts/decision`, { method: "POST", body: JSON.stringify({ action: "accept", version }) });
                      await load();
                      toast.success("Đã nhận lời mời đồng tổ chức.");
                    })
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Chấp nhận tham gia
                </Button>
                <Button
                  variant="outline"
                  className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                  disabled={busy || loading}
                  onClick={() => setRejecting(!rejecting)}
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối
                </Button>
              </div>

              {rejecting && (
                <div className="space-y-2.5 rounded-xl border border-rose-200 bg-white p-4">
                  <label className="block text-xs font-semibold text-slate-700">Lý do từ chối lời mời</label>
                  <textarea
                    aria-label="Lý do từ chối hợp tác"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    maxLength={2000}
                    rows={3}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Nhập lý do chưa thể tham gia…"
                  />
                  <div className="flex justify-end">
                    <Button
                      disabled={busy || loading || !reason.trim()}
                      className="bg-rose-600 text-white hover:bg-rose-700"
                      onClick={() =>
                        void action(async () => {
                          await http(`${root}/co-hosts/decision`, {
                            method: "POST",
                            body: JSON.stringify({ action: "reject", reason: reason.trim(), version }),
                          });
                          toast.success("Đã từ chối và gửi lý do cho Agency chủ trì.");
                          onClose();
                        })
                      }
                    >
                      Xác nhận từ chối
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* LEAD WORKSPACE: TABS RÕ RÀNG (THÀNH VIÊN vs MỜI ĐỐI TÁC MỚI) */}
      {lead && mutable && request.designedTourId && version && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div role="tablist" aria-label="Quản lý liên minh" className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "members"}
              onClick={() => setActiveTab("members")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === "members" ? "bg-white font-semibold text-[#075985] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-4 w-4" />
              Thành viên &amp; Lời mời ({hosts.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "invite"}
              onClick={() => setActiveTab("invite")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === "invite" ? "bg-white font-semibold text-[#075985] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Mời đối tác mới
            </button>
          </div>
        </div>
      )}

      {/* TAB 1 (HOẶC VIEW ĐỐI TÁC): DANH SÁCH THÀNH VIÊN & XEM CHI TIẾT LỜI MỜI */}
      {(!lead || activeTab === "members" || !mutable || !request.designedTourId) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Thành viên trong phiên bản v{version || 1} ({hosts.length})</h3>
            {lead && mutable && request.designedTourId && version && (
              <Button size="sm" className="bg-[#075985] text-white hover:bg-[#0369a1]" onClick={() => setActiveTab("invite")}>
                <Plus className="h-4 w-4" />
                Mời thêm đối tác
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {hosts.map(host => {
              const tiers = working?.agencyPricing?.find(p => p.agencyId === host.companyId)?.tiers || [];
              const isLeadHost = host.role === "lead";
              const statusColor =
                host.status === "accepted"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : host.status === "rejected" || host.status === "removed" || host.status === "revoked"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-800";

              return (
                <div
                  key={host.companyId}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <CompanyAvatar name={host.companyName} logo={host.companyLogo} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{host.companyName}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            isLeadHost ? "bg-sky-100 text-[#075985]" : "bg-teal-50 text-teal-800"
                          }`}
                        >
                          {isLeadHost ? "Agency chủ trì" : "Đối tác"}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusColor}`}>
                          {designPartnerStatusLabel(host.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>
                          Phụ trách: <strong className="font-medium text-slate-800">{host.assignedSegments || "Điều phối chung"}</strong>
                        </span>
                        {!isLeadHost && host.estimatedBudgetPerGuest != null && (
                          <span>
                            Ngân sách đề xuất: <strong className="font-semibold tabular-nums text-[#075985]">{money(host.estimatedBudgetPerGuest)}/khách</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        {host.invitedAt && host.status !== "uninvited" && <span>Mời: {dateTime(host.invitedAt)}</span>}
                        {(host.status === "removed" || host.status === "revoked") && host.respondedAt && (
                          <span className="text-rose-700">Gỡ: {dateTime(host.respondedAt)}</span>
                        )}
                      </div>

                      {host.rejectionReason && (
                        <p className="text-xs text-rose-600">
                          {host.status === "removed" || host.status === "revoked" ? "Lý do bị gỡ" : "Lý do từ chối"}: {host.rejectionReason}
                        </p>
                      )}

                      {tiers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {tiers.map((t, i) => (
                            <span key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-700">
                              {t.name}: <strong className="text-[#075985]">{money(t.pricePerGuest)}</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">Chưa nhập bảng giá riêng</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!isLeadHost && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-700 hover:bg-slate-50"
                        onClick={() => setInspectingHost(host)}
                      >
                        <Eye className="h-3.5 w-3.5 text-[#075985]" />
                        Chi tiết lời mời
                      </Button>
                    )}
                    {host.companyId !== company.id && (
                      <ChatWithButton
                        userId={host.companyId}
                        context={{ kind: "design-request", id: Number(request.id), title: `Yêu cầu thiết kế #${request.id}`, subtitle: request.destinations }}
                      >
                        Chat với đối tác
                      </ChatWithButton>
                    )}
                    {lead && mutable && !isLeadHost && host.status !== "removed" && host.status !== "revoked" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        disabled={busy || loading || !version}
                        onClick={() => {
                          setRemoveReason("");
                          setRemovingHost(host);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Gỡ đối tác
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2 (CHO LEAD): MỜI ĐỐI TÁC MỚI - BỐ CỤC 2 CỘT RỘNG RÃI */}
      {lead && mutable && request.designedTourId && version && activeTab === "invite" && (
        <form
          className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr] xl:items-start"
          onSubmit={e => {
            e.preventDefault();
            void action(async () => {
              setHosts(
                await http<TourCoHost[]>(`${root}/co-hosts${query}`, {
                  method: "POST",
                  body: JSON.stringify({ agencyId: partner, version, segment, budget: budget ? Number(budget) : null, notes }),
                }),
              );
              setPartner("");
              setPartnerPreview(null);
              setSegment("");
              setBudget("");
              setNotes("");
              setActiveTab("members");
              await load();
              toast.success("Đã gửi lời mời đồng tổ chức.");
            });
          }}
        >
          {/* Cột trái: Tìm & Chọn Agency */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#075985] text-xs font-bold text-white">1</span>
              <h3 className="text-sm font-bold text-slate-900">Tìm &amp; chọn Agency đối tác</h3>
            </div>
            <AgencyDiscoveryPicker
              key={`${request.id}-${version}-${working?.id || "loading"}`}
              value={partner}
              onSelect={a => {
                setPartner(a.id);
                setPartnerPreview(a);
              }}
              destination={request.destinations}
              initialProvinceCodes={working?.provinceCodes}
              excludeIds={[company.id, ...hosts.filter(h => h.status === "accepted" || h.status === "pending").map(h => h.companyId)]}
              disabled={busy || loading}
            />
          </div>

          {/* Cột phải: Thông tin lời mời (Sticky) */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 xl:sticky xl:top-6">
            <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#075985] text-xs font-bold text-white">2</span>
              <h3 className="text-sm font-bold text-slate-900">Thiết lập lời mời cho v{version}</h3>
            </div>

            {partnerPreview ? (
              <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-white p-3">
                <CompanyAvatar name={partnerPreview.name} logo={partnerPreview.logo} />
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#075985]">Agency được chọn</span>
                  <p className="truncate text-sm font-bold text-slate-900">{partnerPreview.name}</p>
                  {partnerPreview.address && <p className="truncate text-xs text-slate-500">{partnerPreview.address}</p>}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-3.5 text-center text-xs text-slate-500">
                Chọn 1 Agency từ danh sách bên trái để gửi lời mời đồng tổ chức.
              </div>
            )}

            <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
              Tên chặng phụ trách (tùy chọn)
              <input
                maxLength={255}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-normal outline-none focus:border-[#075985] focus:ring-2 focus:ring-sky-100"
                value={segment}
                onChange={e => setSegment(e.target.value)}
                placeholder="Ví dụ: Chặng Đà Lạt – Nha Trang"
              />
            </label>

            <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
              Ngân sách chặng / khách (tùy chọn)
              <VietnameseMoneyInput
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-normal outline-none focus:border-[#075985] focus:ring-2 focus:ring-sky-100"
                maxLength={17}
                value={budget}
                onValueChange={setBudget}
                placeholder="Ví dụ: 1.000.000"
              />
            </label>

            <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
              Lời nhắn cho đối tác
              <textarea
                maxLength={2000}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-normal outline-none focus:border-[#075985] focus:ring-2 focus:ring-sky-100"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Mô tả kỳ vọng dịch vụ, lịch trình hoặc điểm đón/trả khách..."
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setActiveTab("members")}>
                Hủy
              </Button>
              <Button disabled={busy || loading || !partner} className="bg-[#075985] text-white hover:bg-[#0369a1]">
                <Plus className="h-4 w-4" />
                Gửi lời mời đồng tổ chức
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* MODAL XEM CHI TIẾT LỜI MỜI CỦA TỪNG ĐỐI TÁC */}
      <Dialog open={Boolean(inspectingHost)} onOpenChange={open => { if (!open) setInspectingHost(null); }}>
        <DialogContent className="bg-white sm:max-w-lg">
          {inspectingHost && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#075985]">
                  <Handshake className="h-5 w-5" />
                  Chi tiết lời mời · Phiên bản v{version || 1}
                </DialogTitle>
                <DialogDescription>Thông tin phân công và phản hồi giữa Agency chủ trì và đối tác.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <CompanyAvatar name={inspectingHost.companyName} logo={inspectingHost.companyLogo} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{inspectingHost.companyName}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {inspectingHost.companyPhone && <span>{inspectingHost.companyPhone}</span>}
                      {inspectingHost.companyEmail && <span>{inspectingHost.companyEmail}</span>}
                    </div>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {designPartnerStatusLabel(inspectingHost.status)}
                  </span>
                </div>

                <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <dt className="flex items-center gap-1 text-slate-500"><Building2 className="h-3.5 w-3.5" />Chặng phụ trách</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">{inspectingHost.assignedSegments || "Phối hợp chung"}</dd>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <dt className="flex items-center gap-1 text-slate-500"><Wallet className="h-3.5 w-3.5" />Ngân sách đề xuất</dt>
                    <dd className="mt-1 text-sm font-bold tabular-nums text-[#075985]">
                      {inspectingHost.estimatedBudgetPerGuest != null ? `${money(inspectingHost.estimatedBudgetPerGuest)} / khách` : "Chưa đề xuất"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <dt className="flex items-center gap-1 text-slate-500"><Calendar className="h-3.5 w-3.5" />Thời gian gửi mời</dt>
                    <dd className="mt-1 font-medium text-slate-800">{dateTime(inspectingHost.invitedAt)}</dd>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <dt className="flex items-center gap-1 text-slate-500"><Calendar className="h-3.5 w-3.5" />Thời gian phản hồi</dt>
                    <dd className="mt-1 font-medium text-slate-800">{dateTime(inspectingHost.respondedAt)}</dd>
                  </div>
                </dl>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs">
                  <span className="block font-semibold text-slate-600">Lời nhắn khi mời</span>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                    {inspectingHost.notes || "Không có lời nhắn kèm theo."}
                  </p>
                </div>

                {inspectingHost.rejectionReason && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                    <span className="block font-semibold">
                      {inspectingHost.status === "removed" || inspectingHost.status === "revoked" ? "Lý do gỡ đối tác" : "Lý do từ chối"}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{inspectingHost.rejectionReason}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* POPUP XÁC NHẬN GỠ ĐỐI TÁC KÈM LÝ DO BẮT BUỘC */}
      <AlertDialog open={Boolean(removingHost)} onOpenChange={open => { if (!busy && !open) setRemovingHost(null); }}>
        <AlertDialogContent tone="error" className="bg-white sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Gỡ đối tác khỏi phiên bản v{version}</AlertDialogTitle>
            <AlertDialogDescription>
              Gỡ <strong>{removingHost?.companyName}</strong> khỏi phiên bản v{version}? Toàn bộ điểm tham quan, bữa ăn, khách sạn, hình ảnh, điểm nhấn và bảng giá do đối tác tạo trong bản này sẽ bị gỡ; các phiên bản khác giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Lý do gỡ đối tác <span className="text-rose-600">*</span>
            <textarea
              aria-label="Lý do gỡ đối tác"
              rows={3}
              maxLength={2000}
              value={removeReason}
              onChange={e => setRemoveReason(e.target.value)}
              placeholder="Nhập lý do gửi cho đối tác (bắt buộc)…"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button data-slot="alert-dialog-cancel" variant="outline" disabled={busy} onClick={() => setRemovingHost(null)}>
                Quay lại
              </Button>
            </AlertDialogCancel>
            <Button
              data-slot="alert-dialog-action"
              disabled={busy || !removeReason.trim()}
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                if (!removingHost || !removeReason.trim()) return;
                const target = removingHost;
                const clean = removeReason.trim();
                void action(async () => {
                  await http(`${root}/co-hosts/${target.companyId}?version=${version}&reason=${encodeURIComponent(clean)}`, {
                    method: "DELETE",
                  });
                  setRemovingHost(null);
                  setRemoveReason("");
                  await load();
                  toast.success("Đã gỡ đối tác và nội dung khỏi phiên bản.");
                });
              }}
            >
              Gỡ đối tác
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AgencyDesignCoHosting({
  requests,
  company,
  tours,
  onChanged,
  embedded = false,
  onDetailChange,
}: {
  requests: CustomTourRequest[];
  company: TourCompany;
  tours?: Tour[];
  onChanged: () => void | Promise<void>;
  embedded?: boolean;
  onDetailChange?: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<{ id: string; version?: number; edit?: boolean } | null>(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    const id = params.get("requestId");
    const version = Number(params.get("version"));
    return id ? { id, version: Number.isInteger(version) && version > 0 ? version : undefined } : null;
  });
  const source = requests.find(r => r.id === selected?.id);
  const request = source && selected?.version ? { ...source, currentVersion: selected.version } : source;

  useEffect(() => {
    onDetailChange?.(!!request);
  }, [!!request, onDetailChange]);
  useEffect(() => () => onDetailChange?.(false), [onDetailChange]);

  if (request) {
    return (
      <DesignCollaborationPanel
        key={`${request.id}-${selected?.version || "current"}-${selected?.edit ? "edit" : "view"}`}
        request={request}
        company={company}
        autoEdit={!!selected?.edit}
        onChanged={onChanged}
        onClose={() => {
          setSelected(null);
          const [path, query] = window.location.hash.split("?");
          const params = new URLSearchParams(query);
          if (params.has("requestId")) {
            params.delete("requestId");
            params.delete("version");
            window.history.replaceState(null, "", path + (params.size ? `?${params}` : ""));
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {!embedded && (
        <header className="space-y-2 px-1">
          <h1 className="text-2xl font-semibold text-slate-900">Lời mời đối tác</h1>
          <p className="text-sm text-slate-500">Quản lý lời mời cùng thiết kế tour và quyền tham gia từng phiên bản.</p>
        </header>
      )}
      <PartnerInvitationTable
        requests={requests}
        company={company}
        tours={tours}
        onChanged={onChanged}
        onOpen={(row, version) => setSelected({ id: row.id, version })}
        onDesign={(row, version) => setSelected({ id: row.id, version, edit: true })}
      />
    </div>
  );
}
