import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Eye,
  Handshake,
  Mail,
  MapPin,
  PenSquare,
  Phone,
  Search,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import type { CustomTourRequest, Tour, TourCoHost, TourCompany } from "@/app/types";
import { designPartnerStatusLabel } from "@/app/lib/designAlliance";
import { http } from "@/app/lib/http";
import { toast } from "@/app/lib/notifications";
import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

type Invitation = NonNullable<CustomTourRequest["collaborationInvitations"]>[number];
type Filter = "all" | "pending" | "accepted" | "closed";
type Props = {
  requests: CustomTourRequest[];
  company: TourCompany;
  tours?: Tour[];
  onChanged?: () => void | Promise<void>;
  onOpen: (request: CustomTourRequest, version?: number) => void;
  onDesign?: (request: CustomTourRequest, version?: number) => void;
};

const tabs: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ phản hồi" },
  { id: "accepted", label: "Đã tham gia" },
  { id: "closed", label: "Đã kết thúc / Từ chối" },
];
const closedStatuses = new Set(["rejected", "revoked", "removed"]);
const closedRequest = (request: CustomTourRequest) => ["cancelled", "rejected", "closed"].includes(request.status);
const date = (value?: string) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "—";
const dateTime = (value?: string) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const badgeStyle = (status?: TourCoHost["status"]) =>
  status === "accepted"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status && closedStatuses.has(status)
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-amber-200 bg-amber-50 text-amber-800";

function LeadAvatar({ name, logo }: { name?: string; logo?: string }) {
  const clean = (name || "AG").replace(/^\[[^\]]+\]\s*/g, "").trim();
  const initials = clean.slice(0, 2).toUpperCase();
  return logo ? (
    <img src={logo} alt={name} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover bg-white" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-xs font-bold text-[#075985]">
      {initials}
    </span>
  );
}

export function PartnerInvitationTable({ requests, company, tours, onChanged, onOpen, onDesign }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedVersions, setSelectedVersions] = useState<Record<string, number>>({});
  const [inspecting, setInspecting] = useState<{ request: CustomTourRequest; version: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [modalError, setModalError] = useState("");

  const invitations = (request: CustomTourRequest): Invitation[] => {
    if (request.collaborationInvitations?.length) {
      return request.collaborationInvitations.filter(invite => invite.companyId === company.id && invite.status !== "uninvited");
    }
    const me = request.coHosts?.find(host => host.companyId === company.id && host.role === "partner");
    return me && me.status !== "uninvited"
      ? [{
          companyId: me.companyId,
          version: request.currentVersion || 1,
          status: me.status,
          segment: me.assignedSegments,
          invitedAt: me.invitedAt || request.createdAt,
          respondedAt: me.respondedAt,
          budget: me.estimatedBudgetPerGuest,
          notes: me.notes,
          rejectionReason: me.rejectionReason,
        }]
      : [];
  };

  const resolveInvitationDetails = (request: CustomTourRequest, invite?: Invitation) => {
    const meHost = request.coHosts?.find(host => host.companyId === company.id);
    const sameVersion = !invite || invite.version === (request.currentVersion || invite.version);
    const budget = invite?.budget ?? (sameVersion ? meHost?.estimatedBudgetPerGuest : undefined);
    const notes = invite?.notes ?? (sameVersion ? meHost?.notes : undefined);
    const rejectionReason = invite?.rejectionReason ?? (sameVersion ? meHost?.rejectionReason : undefined);
    return { budget, notes, rejectionReason };
  };

  const matches = (request: CustomTourRequest, tab: Filter) =>
    tab === "all" ||
    (tab === "closed"
      ? closedRequest(request) || invitations(request).some(invite => closedStatuses.has(invite.status))
      : !closedRequest(request) && invitations(request).some(invite => invite.status === tab));

  const collaborations = requests.filter(request => invitations(request).length > 0);
  const rows = collaborations
    .filter(
      request =>
        matches(request, filter) &&
        [request.id, request.targetCompanyName, request.destinations, ...invitations(request).map(invite => invite.segment)]
          .some(value => value?.toLocaleLowerCase("vi-VN").includes(search.trim().toLocaleLowerCase("vi-VN"))),
    )
    .sort((a, b) => Math.max(...invitations(b).map(i => Date.parse(i.invitedAt) || 0)) - Math.max(...invitations(a).map(i => Date.parse(i.invitedAt) || 0)));

  const inspectedRequest = inspecting ? requests.find(r => r.id === inspecting.request.id) || inspecting.request : null;
  const inspectedInvite = inspectedRequest
    ? invitations(inspectedRequest).find(i => i.version === inspecting?.version) || invitations(inspectedRequest)[0]
    : undefined;
  const inspectedLead = inspectedRequest?.coHosts?.find(host => host.companyId === inspectedRequest.targetCompanyId);
  const inspectedDetails = inspectedRequest ? resolveInvitationDetails(inspectedRequest, inspectedInvite) : null;
  const inspectedMutable = inspectedRequest ? !closedRequest(inspectedRequest) : false;

  const quickAccept = async (requestId: string, ver: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await http(`/agency/tour-design-requests/${requestId}/co-hosts/decision`, {
        method: "POST",
        body: JSON.stringify({ action: "accept", version: ver }),
      });
      await onChanged?.();
      toast.success("Đã nhận lời mời đồng tổ chức.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể chấp nhận lời mời.");
    } finally {
      setBusy(false);
    }
  };

  const decideFromModal = async (actionType: "accept" | "reject") => {
    if (!inspectedRequest || !inspectedInvite || busy) return;
    setBusy(true);
    setModalError("");
    try {
      await http(`/agency/tour-design-requests/${inspectedRequest.id}/co-hosts/decision`, {
        method: "POST",
        body: JSON.stringify({
          action: actionType,
          version: inspectedInvite.version,
          ...(actionType === "reject" ? { reason: reason.trim() } : {}),
        }),
      });
      await onChanged?.();
      toast.success(actionType === "accept" ? "Đã nhận lời mời đồng tổ chức." : "Đã từ chối và gửi lý do cho Agency chủ trì.");
      setRejecting(false);
      setReason("");
      if (actionType === "reject") setInspecting(null);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Không thể xử lý phản hồi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 border-t-4 border-t-teal-600 bg-white shadow-2xs" aria-label="Danh sách lời mời đối tác">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="relative min-w-[240px] flex-1 sm:max-w-lg">
          <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            aria-label="Tìm lời mời đối tác"
            placeholder="Tìm Agency chủ trì, điểm đến, mã yêu cầu…"
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-teal-800">
          <Handshake className="h-4 w-4 text-teal-700" />
          Quản lý lời mời theo từng phiên bản
        </p>
      </div>

      <div role="tablist" aria-label="Trạng thái liên minh" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-teal-50/20 px-4">
        {tabs.map(tab => (
          <button
            type="button"
            role="tab"
            key={tab.id}
            aria-selected={filter === tab.id}
            aria-controls="agency-partner-invitation-rows"
            onClick={() => setFilter(tab.id)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-700 ${
              filter === tab.id
                ? "border-teal-700 font-semibold text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${filter === tab.id ? "bg-teal-100 text-teal-800" : "bg-slate-200/70 text-slate-600"}`}>
              {collaborations.filter(request => matches(request, tab.id)).length}
            </span>
          </button>
        ))}
      </div>

      <div id="agency-partner-invitation-rows" role="tabpanel" className="divide-y divide-slate-100">
        {rows.map(request => {
          const all = [...invitations(request)].sort((a, b) => b.version - a.version);
          const options =
            filter === "all" || closedRequest(request)
              ? all
              : all.filter(invite => (filter === "closed" ? closedStatuses.has(invite.status) : invite.status === filter));
          const selected =
            options.find(invite => invite.version === selectedVersions[request.id]) ||
            options.find(invite => invite.version === request.currentVersion) ||
            options[0];
          const lead = request.coHosts?.find(host => host.companyId === request.targetCompanyId);
          const { budget: proposedBudget } = resolveInvitationDetails(request, selected);
          const linkedTour = tours?.find(
            t =>
              (request.designedTourId && String(t.id) === String(request.designedTourId)) ||
              String(t.customRequestId) === String(request.id),
          );
          const thumb = linkedTour?.image || linkedTour?.images?.[0];
          const isPending = selected?.status === "pending" && !closedRequest(request);

          return (
            <article key={request.id} className="p-5 transition-colors hover:bg-slate-50/60">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(240px,1.15fr)_minmax(260px,1.25fr)_minmax(240px,1fr)]">
                {/* Cột 1: Agency chủ trì */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">
                      #{request.id}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeStyle(selected?.status)}`}>
                      {isPending && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
                      {selected ? designPartnerStatusLabel(selected.status) : "Lời mời đối tác"}
                    </span>
                    <span className="text-xs text-slate-400">Mời {date(selected?.invitedAt)}</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <LeadAvatar name={request.targetCompanyName} logo={lead?.companyLogo} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900" title={request.targetCompanyName}>
                        {request.targetCompanyName}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Building2 className="h-3 w-3 shrink-0" />
                        Agency chủ trì
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500">
                    {lead?.companyPhone && (
                      <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{lead.companyPhone}</p>
                    )}
                    {lead?.companyEmail && (
                      <p className="flex items-center gap-1.5 truncate" title={lead.companyEmail}>
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />{lead.companyEmail}
                      </p>
                    )}
                  </div>

                  <div>
                    <ChatWithButton
                      userId={request.targetCompanyId}
                      context={{ kind: "design-request", id: Number(request.id), title: `Yêu cầu thiết kế #${request.id}`, subtitle: request.destinations }}
                    >
                      Chat với chủ trì
                    </ChatWithButton>
                  </div>
                </div>

                {/* Cột 2: Hành trình & Ngân sách chủ trì đề xuất */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3.5">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={linkedTour?.name || request.destinations}
                        className="h-16 w-20 shrink-0 rounded-xl border border-slate-200 object-cover bg-slate-100"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                        <MapPin className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-start gap-1.5 font-semibold text-slate-900">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#075985]" />
                        <span>{request.destinations}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{date(request.departureDate)} – {date(request.returnDate)}</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-slate-400" />{request.numberOfPeople} khách</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2">
                      <span className="block text-[11px] font-medium text-teal-700">Chặng phụ trách</span>
                      <span className="mt-0.5 block text-xs font-semibold text-teal-950">
                        {selected?.segment || "Phối hợp chung"}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
                      <span className="block text-[11px] font-medium text-slate-500">Ngân sách chủ trì đề xuất</span>
                      {proposedBudget != null ? (
                        <span className="mt-0.5 block text-xs font-bold tabular-nums text-[#075985]">
                          {money(proposedBudget)}<span className="font-normal text-slate-500"> / khách</span>
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-xs font-semibold text-slate-600">Chưa đề xuất</span>
                      )}
                    </div>
                  </div>

                  {closedRequest(request) && (
                    <p className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      Yêu cầu thiết kế đã đóng hoặc bị hủy.
                    </p>
                  )}
                </div>

                {/* Cột 3: Phiên bản & Hành động */}
                <div className="flex flex-col justify-start gap-2.5 self-start rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                  <div>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">
                        Phiên bản hợp tác ({all.length} phiên bản)
                      </span>
                      <select
                        aria-label={`Phiên bản hợp tác yêu cầu #${request.id}`}
                        value={selected?.version ?? ""}
                        onChange={event => setSelectedVersions(previous => ({ ...previous, [request.id]: Number(event.target.value) }))}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-[#075985] focus:ring-2 focus:ring-sky-100"
                      >
                        {options.map(invite => (
                          <option key={invite.version} value={invite.version}>
                            v{invite.version} · {designPartnerStatusLabel(invite.status)}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selected && (selected.status === "removed" || selected.status === "revoked") && (
                      <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
                        Đã bị chủ trì gỡ{selected.respondedAt ? ` ngày ${date(selected.respondedAt)}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="flex-1 gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setRejecting(false);
                        setReason("");
                        setModalError("");
                        setInspecting({ request, version: selected?.version || 1 });
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem lời mời
                    </Button>
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          disabled={busy}
                          className="flex-1 gap-1.5 bg-[#075985] text-white hover:bg-[#0369a1]"
                          onClick={() => void quickAccept(request.id, selected?.version || 1)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Chấp nhận
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          className="gap-1.5 border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setRejecting(true);
                            setReason("");
                            setModalError("");
                            setInspecting({ request, version: selected?.version || 1 });
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Từ chối
                        </Button>
                      </>
                    )}
                    {onDesign && selected?.status === "accepted" && request.designedTourId && !closedRequest(request) && (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 bg-[#075985] text-white hover:bg-[#0369a1]"
                        onClick={() => onDesign(request, selected?.version)}
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                        Thiết kế tour
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {!rows.length && (
          <div className="px-6 py-14 text-center">
            <Handshake className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {search.trim()
                ? "Không tìm thấy lời mời phù hợp"
                : filter === "all"
                  ? "Chưa có lời mời từ Agency khác"
                  : "Chưa có lời mời trong trạng thái này"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {search.trim()
                ? "Hãy thử tên Agency, điểm đến hoặc mã yêu cầu khác."
                : "Khi có Agency mời bạn đồng tổ chức tour thiết kế riêng, lời mời sẽ xuất hiện tại đây."}
            </p>
          </div>
        )}
      </div>

      <p className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
        Hiển thị {rows.length} yêu cầu · Lời mời mới nhất trước
      </p>

      {/* POPUP XEM CHI TIẾT LỜI MỜI DÀNH CHO AGENCY ĐỐI TÁC */}
      <Dialog open={Boolean(inspectedRequest && inspectedInvite)} onOpenChange={open => { if (!busy && !open) setInspecting(null); }}>
        <DialogContent className="bg-white sm:max-w-lg">
          {inspectedRequest && inspectedInvite && inspectedDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#075985]">
                  <Handshake className="h-5 w-5" />
                  Chi tiết lời mời · Phiên bản v{inspectedInvite.version}
                </DialogTitle>
                <DialogDescription>
                  Thông tin phân công chặng và ngân sách do Agency chủ trì đề xuất cho yêu cầu #{inspectedRequest.id}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <LeadAvatar name={inspectedRequest.targetCompanyName} logo={inspectedLead?.companyLogo} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{inspectedRequest.targetCompanyName}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {inspectedLead?.companyPhone && <span>{inspectedLead.companyPhone}</span>}
                      {inspectedLead?.companyEmail && <span>{inspectedLead.companyEmail}</span>}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeStyle(inspectedInvite.status)}`}>
                    {designPartnerStatusLabel(inspectedInvite.status)}
                  </span>
                </div>

                <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <dt className="flex items-center gap-1 text-slate-500"><Building2 className="h-3.5 w-3.5" />Chặng phụ trách</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">{inspectedInvite.segment || "Phối hợp chung"}</dd>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <dt className="flex items-center gap-1 text-slate-500"><Wallet className="h-3.5 w-3.5" />Ngân sách chủ trì đề xuất</dt>
                    <dd className="mt-1 text-sm font-bold tabular-nums text-[#075985]">
                      {inspectedDetails.budget != null ? `${money(inspectedDetails.budget)} / khách` : "Chưa đề xuất"}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <dt className="flex items-center gap-1 text-slate-500"><Calendar className="h-3.5 w-3.5" />Thời gian gửi mời</dt>
                    <dd className="mt-1 font-medium text-slate-800">{dateTime(inspectedInvite.invitedAt)}</dd>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <dt className="flex items-center gap-1 text-slate-500"><Calendar className="h-3.5 w-3.5" />Thời gian phản hồi</dt>
                    <dd className="mt-1 font-medium text-slate-800">{dateTime(inspectedInvite.respondedAt)}</dd>
                  </div>
                </dl>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs">
                  <span className="block font-semibold text-slate-600">Lời nhắn khi mời</span>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                    {inspectedDetails.notes || "Không có lời nhắn kèm theo."}
                  </p>
                </div>

                {inspectedDetails.rejectionReason && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                    <span className="block font-semibold">
                      {inspectedInvite.status === "removed" || inspectedInvite.status === "revoked" ? "Lý do gỡ đối tác" : "Lý do từ chối"}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{inspectedDetails.rejectionReason}</p>
                  </div>
                )}

                {(inspectedInvite.status === "removed" || inspectedInvite.status === "revoked") && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Bạn đã bị Agency chủ trì gỡ khỏi phiên bản v{inspectedInvite.version}.</p>
                  </div>
                )}

                {modalError && <p className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{modalError}</p>}

                {inspectedMutable && inspectedInvite.status === "pending" && (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        disabled={busy}
                        onClick={() => setRejecting(!rejecting)}
                      >
                        <XCircle className="h-4 w-4" />
                        Từ chối
                      </Button>
                      <Button
                        className="bg-[#075985] text-white hover:bg-[#0369a1]"
                        disabled={busy}
                        onClick={() => void decideFromModal("accept")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Chấp nhận tham gia
                      </Button>
                    </div>

                    {rejecting && (
                      <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                        <label className="block text-xs font-semibold text-slate-700">Lý do từ chối lời mời</label>
                        <textarea
                          aria-label="Lý do từ chối hợp tác"
                          rows={3}
                          maxLength={2000}
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          placeholder="Nhập lý do chưa thể tham gia…"
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-rose-500"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            disabled={busy || !reason.trim()}
                            className="bg-rose-600 text-white hover:bg-rose-700"
                            onClick={() => void decideFromModal("reject")}
                          >
                            Xác nhận từ chối
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectedRequest;
                      const ver = inspectedInvite.version;
                      setInspecting(null);
                      onOpen(target, ver);
                    }}
                    className="text-xs font-semibold text-[#075985] hover:underline"
                  >
                    Xem thành viên liên minh
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setInspecting(null)}>
                      Đóng
                    </Button>
                    {onDesign && inspectedInvite.status === "accepted" && inspectedRequest.designedTourId && inspectedMutable && (
                      <Button
                        size="sm"
                        className="bg-[#075985] text-white hover:bg-[#0369a1]"
                        onClick={() => {
                          const target = inspectedRequest;
                          const ver = inspectedInvite.version;
                          setInspecting(null);
                          onDesign(target, ver);
                        }}
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                        Thiết kế tour
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
