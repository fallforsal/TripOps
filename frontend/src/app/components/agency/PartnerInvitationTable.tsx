import { useState } from "react";
import { CalendarDays, Eye, Handshake, MapPin, PenSquare, Search, Users } from "lucide-react";
import type { CustomTourRequest, Tour, TourCoHost, TourCompany } from "@/app/types";
import { designPartnerStatusLabel } from "@/app/lib/designAlliance";
import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { Button } from "@/app/components/ui/button";

type Invitation = NonNullable<CustomTourRequest["collaborationInvitations"]>[number];
type Filter = "all" | "pending" | "accepted" | "closed";
type Props = {
  requests: CustomTourRequest[];
  company: TourCompany;
  tours?: Tour[];
  onOpen: (request: CustomTourRequest, version?: number) => void;
  onDesign?: (request: CustomTourRequest, version?: number) => void;
};
const tabs: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" }, { id: "pending", label: "Chờ phản hồi" },
  { id: "accepted", label: "Đã tham gia" }, { id: "closed", label: "Đã kết thúc / Từ chối" },
];
const closedStatuses = new Set(["rejected", "revoked", "removed"]);
const closedRequest = (request: CustomTourRequest) => ["cancelled", "rejected", "closed"].includes(request.status);
const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const badge = (status?: TourCoHost["status"]) => status === "accepted" ? "bg-emerald-50 text-emerald-700" : status && closedStatuses.has(status) ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800";

export function PartnerInvitationTable({ requests, company, tours, onOpen, onDesign }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedVersions, setSelectedVersions] = useState<Record<string, number>>({});
  const invitations = (request: CustomTourRequest): Invitation[] => {
    if (request.collaborationInvitations?.length) return request.collaborationInvitations.filter(invite => invite.companyId === company.id && invite.status !== "uninvited");
    const me = request.coHosts?.find(host => host.companyId === company.id && host.role === "partner");
    return me && me.status !== "uninvited" ? [{ companyId: me.companyId, version: request.currentVersion || 1, status: me.status,
      segment: me.assignedSegments, invitedAt: me.invitedAt || request.createdAt, respondedAt: me.respondedAt }] : [];
  };
  const matches = (request: CustomTourRequest, tab: Filter) => tab === "all" || (tab === "closed"
    ? closedRequest(request) || invitations(request).some(invite => closedStatuses.has(invite.status))
    : !closedRequest(request) && invitations(request).some(invite => invite.status === tab));
  const collaborations = requests.filter(request => invitations(request).length > 0);
  const rows = collaborations.filter(request => matches(request, filter) && [request.id, request.targetCompanyName, request.destinations,
    ...invitations(request).map(invite => invite.segment)].some(value => value?.toLocaleLowerCase("vi-VN").includes(search.trim().toLocaleLowerCase("vi-VN"))))
    .sort((a, b) => Math.max(...invitations(b).map(i => Date.parse(i.invitedAt) || 0)) - Math.max(...invitations(a).map(i => Date.parse(i.invitedAt) || 0)));

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Danh sách lời mời đối tác">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="relative min-w-[240px] flex-1 sm:max-w-lg">
        <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
        <input aria-label="Tìm lời mời đối tác" placeholder="Tìm Agency chủ trì, điểm đến, mã yêu cầu…" value={search} onChange={event => setSearch(event.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm outline-none focus:border-sky-600 focus:bg-white focus:ring-2 focus:ring-sky-100"/>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><Handshake className="h-4 w-4 text-sky-700"/>Quản lý lời mời theo từng phiên bản</p>
    </div>
    <div role="tablist" aria-label="Trạng thái liên minh" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4">
      {tabs.map(tab => <button type="button" role="tab" key={tab.id} aria-selected={filter === tab.id} aria-controls="agency-partner-invitation-rows" onClick={() => setFilter(tab.id)}
        className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-600 ${filter === tab.id ? "border-sky-700 font-semibold text-sky-800" : "border-transparent text-slate-500 hover:text-slate-900"}`}>
        {tab.label}<span className={`rounded-md px-1.5 py-0.5 text-xs ${filter === tab.id ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-500"}`}>{collaborations.filter(request => matches(request, tab.id)).length}</span>
      </button>)}
    </div>
    <div id="agency-partner-invitation-rows" role="tabpanel" className="overflow-x-auto">
      <table className="w-full min-w-[900px] table-fixed text-left text-sm">
        <colgroup><col className="w-[23%]"/><col className="w-[21%]"/><col className="w-[16%]"/><col className="w-[22%]"/><col className="w-[18%]"/></colgroup>
        <thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr>{["Agency chủ trì", "Hành trình", "Ngân sách dự kiến", "Phiên bản hợp tác", "Thao tác"].map(label => <th scope="col" key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(request => {
            const all = [...invitations(request)].sort((a, b) => b.version - a.version);
            const options = filter === "all" || closedRequest(request) ? all : all.filter(invite => filter === "closed" ? closedStatuses.has(invite.status) : invite.status === filter);
            const selected = options.find(invite => invite.version === selectedVersions[request.id]) || options.find(invite => invite.version === request.currentVersion) || options[0];
            const lead = request.coHosts?.find(host => host.companyId === request.targetCompanyId);
            const budget = Number(request.budgetPerPerson);
            const linkedTour = tours?.find(t =>
              (request.designedTourId && String(t.id) === String(request.designedTourId)) ||
              String(t.customRequestId) === String(request.id),
            );
            const thumb = linkedTour?.image || linkedTour?.images?.[0];
            return <tr key={request.id} className="transition-colors hover:bg-slate-50/50">
              <td className="px-4 py-5 align-top">
                <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-500">#{request.id}</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(selected?.status)}`}>{selected ? designPartnerStatusLabel(selected.status) : "Lời mời đối tác"}</span></div>
                <p className="truncate font-semibold text-slate-900" title={request.targetCompanyName}>{request.targetCompanyName}</p>
                {selected?.segment && <p className="mt-1 text-xs text-slate-600">Chặng phụ trách: {selected.segment}</p>}
                {lead?.companyPhone && <p className="mt-2 text-xs text-slate-500">{lead.companyPhone}</p>}
                {lead?.companyEmail && <p className="mt-0.5 truncate text-xs text-slate-500" title={lead.companyEmail}>{lead.companyEmail}</p>}
                <ChatWithButton className="mt-3" userId={request.targetCompanyId} context={{ kind: "design-request", id: Number(request.id), title: `Yêu cầu thiết kế #${request.id}`, subtitle: request.destinations }}>Chat với chủ trì</ChatWithButton>
                <p className="mt-2 text-xs text-slate-400">Mời {date(selected?.invitedAt)}</p>
              </td>
              <td className="px-4 py-5 align-top">
                <div className="flex items-start gap-3">
                  {thumb && (
                    <img
                      src={thumb}
                      alt={linkedTour?.name || request.destinations}
                      className="h-14 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-start gap-1.5 font-semibold text-slate-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"/>{request.destinations}</p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500"><CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0"/>{date(request.departureDate)} – {date(request.returnDate)}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600"><Users className="h-3.5 w-3.5"/>{request.numberOfPeople} khách</p>
                    {closedRequest(request) && <p className="mt-2 text-xs text-slate-500">Yêu cầu đã đóng</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-5 align-top">{budget > 0 ? <><p className="font-semibold tabular-nums text-slate-800">{money(budget)}</p><p className="mt-0.5 text-xs text-slate-400">mỗi khách</p><p className="mt-3 text-xs text-slate-500">Tổng dự kiến</p><p className="mt-1 text-xs font-medium tabular-nums text-slate-600">{money(budget * Number(request.numberOfPeople))}</p></> : <span className="text-slate-500">Thỏa thuận</span>}</td>
              <td className="px-4 py-5 align-top"><select aria-label={`Phiên bản hợp tác yêu cầu #${request.id}`} value={selected?.version ?? ""} onChange={event => setSelectedVersions(previous => ({ ...previous, [request.id]: Number(event.target.value) }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100">
                {options.map(invite => <option key={invite.version} value={invite.version}>v{invite.version} · {designPartnerStatusLabel(invite.status)}</option>)}
              </select><p className="mt-2 text-xs text-slate-400">{all.length} phiên bản được mời</p>
                {selected && (selected.status === "removed" || selected.status === "revoked") && <p className="mt-2 text-xs text-rose-700">Đã bị chủ trì gỡ{selected.respondedAt ? ` ngày ${date(selected.respondedAt)}` : ""}</p>}
              </td>
              <td className="px-4 py-5 align-top">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 border-slate-200 text-sky-800" onClick={() => onOpen(request, selected?.version)}><Eye className="h-3.5 w-3.5"/>Xem lời mời</Button>
                  {onDesign && selected?.status === "accepted" && request.designedTourId && !closedRequest(request) && (
                    <Button size="sm" className="gap-1.5 bg-[#075985] text-white hover:bg-[#0369a1]" onClick={() => onDesign(request, selected?.version)}>
                      <PenSquare className="h-3.5 w-3.5"/>Thiết kế tour
                    </Button>
                  )}
                </div>
              </td>
            </tr>;
          })}
          {!rows.length && <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">{search.trim() ? "Không tìm thấy lời mời phù hợp. Hãy thử tên Agency, điểm đến hoặc mã yêu cầu khác." : filter === "all" ? "Chưa có lời mời từ Agency khác. Bạn có thể thiết kế tour và mời đối tác trong phần Yêu cầu khách hàng." : "Chưa có lời mời trong trạng thái này."}</td></tr>}
        </tbody>
      </table>
    </div>
    <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">Hiển thị {rows.length} yêu cầu · Lời mời mới nhất trước</p>
  </section>;
}
