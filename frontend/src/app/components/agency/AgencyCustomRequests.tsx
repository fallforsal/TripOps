import { DesignRequestMessages } from "@/app/components/common/DesignRequestMessages";
import { DesignVersionHistory } from "@/app/components/common/DesignVersionHistory";
import { http } from "@/app/lib/http";
import { fromApiTour, type TourConfiguration } from "@/app/services/wf02Tours";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type DesignRequestDecision } from "@/app/components/agency/DesignRequestAgencyActions";
import { agencyPlanProposals, replyPlanProposal, type TourPlanProposal } from "@/app/services/customTourRequests";
import { CustomTourRequest, Tour, TourCompany } from "@/app/types";
import { mockTourCompanies } from "@/app/data/mockData";
import {
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  Users,
  Phone,
  Mail,
  Building2,
  Sparkles,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  Handshake,
  ArrowRight,
  Compass,
  CheckCircle2,
  XCircle,
  MapPin,
  Star,
  History,
  Loader2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TourFormPage } from "@/app/components/agency/AgencyTourManagement";
import { TourVersionHistoryModal } from "@/app/components/agency/TourVersionHistoryModal";
import { CoHostInvitationModal } from "@/app/components/agency/CoHostInvitationModal";
import { CustomRequestDetailModal } from "@/app/components/common/CustomRequestDetailModal";

interface AgencyCustomRequestsProps {
  requests: CustomTourRequest[];
  company: TourCompany;
  tours: Tour[];
  allCompanies?: TourCompany[];
  onUpdateRequest: (id: string, update: Partial<CustomTourRequest>) => void | Promise<void>;
  onCreateTour: (tour: Omit<Tour, "id"> & { id?: string }) => Tour | void | Promise<Tour | void>;
  onEditTour: (tourId: string, tour: Partial<Tour>) => void | Promise<void>;
  onRestoreTourVersion?: (tourId: string, versionNumber: number) => void;
  onViewTour?: (tour: Tour) => void;
}

const STATUS_CONFIG: Record<
  CustomTourRequest["status"],
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  pending: {
    label: "Chờ xử lý",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  reviewing: {
    label: "Đang xem xét",
    bg: "bg-[#E0F2FE]",
    text: "text-[#075985]",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
  designed: {
    label: "Đã thiết kế tour",
    bg: "bg-orange-50",
    text: "text-[#F97316]",
    border: "border-orange-200",
    dot: "bg-[#F97316]",
  },
  quoted: {
    label: "Đã báo giá",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  accepted: {
    label: "Khách chốt tour",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    dot: "bg-teal-500",
  },
  rejected: {
    label: "Từ chối",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  cancelled: {
    label: "Đã huỷ",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}

function formatVND(n?: number) {
  if (!n) return "0 ₫";
  return n.toLocaleString("vi-VN") + " ₫";
}

export function AgencyCustomRequests({
  requests,
  company,
  tours,
  allCompanies,
  onUpdateRequest,
  onCreateTour,
  onEditTour,
  onRestoreTourVersion,
  onViewTour,
}: AgencyCustomRequestsProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [designingRequest, setDesigningRequest] = useState<CustomTourRequest | null>(null);
  const [templateTour, setTemplateTour] = useState<Tour | null>(null);
  const [editingTourForRequest, setEditingTourForRequest] = useState<Tour | null>(null);
  const [versionHistoryTour, setVersionHistoryTour] = useState<Tour | null>(null);
  const [invitingRequest, setInvitingRequest] = useState<CustomTourRequest | null>(null);
  const [viewingDetailRequest, setViewingDetailRequest] = useState<CustomTourRequest | null>(null);
  const [decidingRequestId, setDecidingRequestId] = useState<string | null>(null);
  const decisionInFlight = useRef(false);

  const detailRequest = viewingDetailRequest
    ? requests.find((request) => request.id === viewingDetailRequest.id) || null
    : null;

  const [pendingProposalCounts, setPendingProposalCounts] = useState<Record<string, number>>({});
  const [proposalRefresh, setProposalRefresh] = useState(0);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Proposals & Replies inside expanded row
  const [proposalRows, setProposalRows] = useState<Record<string, TourPlanProposal[]>>({});
  const [proposalReply, setProposalReply] = useState<Record<number, string>>({});
  const [proposalError, setProposalError] = useState<Record<string, string>>({});

  const requestIds = requests
    .filter((r) => r.status === "designed" || r.status === "quoted" || r.status === "accepted")
    .map((r) => r.id)
    .join(",");

  useEffect(() => {
    const ids = requestIds.split(",").filter(Boolean);
    if (!ids.length) return;
    let active = true;
    void Promise.all(
      ids.map(async (id) => {
        try {
          return [id, (await agencyPlanProposals(id)).filter((p) => p.status === "Pending").length] as const;
        } catch {
          return [id, 0] as const;
        }
      })
    ).then((rows) => {
      if (active) setPendingProposalCounts(Object.fromEntries(rows));
    });
    return () => {
      active = false;
    };
  }, [requestIds, proposalRefresh]);

  // Load proposals for expanded row
  useEffect(() => {
    if (!expandedRow) return;
    setProposalError((prev) => ({ ...prev, [expandedRow]: "" }));
    void agencyPlanProposals(expandedRow)
      .then((rows) => {
        setProposalRows((prev) => ({ ...prev, [expandedRow]: rows }));
      })
      .catch((e) => {
        setProposalError((prev) => ({
          ...prev,
          [expandedRow]: e instanceof Error ? e.message : "Không tải được bản khách chỉnh.",
        }));
      });
  }, [expandedRow]);

  const handleReplyProposal = async (requestId: string, proposalId: number, decision: "reviewed" | "needs_changes") => {
    try {
      await replyPlanProposal(requestId, proposalId, decision, proposalReply[proposalId] || "");
      const rows = await agencyPlanProposals(requestId);
      setProposalRows((prev) => ({ ...prev, [requestId]: rows }));
      setProposalReply((prev) => ({ ...prev, [proposalId]: "" }));
      setProposalRefresh((n) => n + 1);
    } catch (e) {
      setProposalError((prev) => ({
        ...prev,
        [requestId]: e instanceof Error ? e.message : "Không gửi được phản hồi.",
      }));
    }
  };

  const handleRequestDecision = async (request: CustomTourRequest, decision: DesignRequestDecision) => {
    if (decisionInFlight.current) return;
    if (
      decision === "rejected" &&
      !window.confirm(`Từ chối yêu cầu thiết kế tour #${request.id}? Khách hàng sẽ thấy trạng thái từ chối.`)
    ) {
      return;
    }
    decisionInFlight.current = true;
    setDecidingRequestId(request.id);
    try {
      await onUpdateRequest(request.id, { status: decision });
      toast.success(
        decision === "reviewing"
          ? "Đã tiếp nhận yêu cầu thiết kế tour."
          : "Đã từ chối yêu cầu thiết kế tour."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật yêu cầu. Vui lòng thử lại.");
    } finally {
      decisionInFlight.current = false;
      setDecidingRequestId(null);
    }
  };

  const handleStartDesignTour = async (req: CustomTourRequest, existingTour?: Tour | null) => {
    if (
      decisionInFlight.current ||
      req.status === "pending" ||
      req.status === "cancelled" ||
      req.status === "rejected"
    ) {
      return;
    }
    setTemplateTour(null);
    if (!existingTour) {
      try {
        const configuration = await http<TourConfiguration | null>(`/agency/tour-design-requests/${req.id}/source`);
        const initialChanges = await http<CustomTourRequest["initialChanges"] | null>(
          `/agency/tour-design-requests/${req.id}/initial-changes`
        );
        if (configuration) {
          const template = fromApiTour({
            id: 0,
            agencyId: company.id,
            code: null,
            status: "draft",
            visibility: "hidden",
            isRequest: true,
            isAiGenerated: false,
            version: 1,
            configuration: { ...configuration, code: null },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setTemplateTour(
            initialChanges
              ? { ...template, itinerary: initialChanges.itinerary, hotels: initialChanges.hotels }
              : template
          );
        }
      } catch {
        /* Request details remain available for manual design. */
      }
    }
    setDesigningRequest(req);
    setEditingTourForRequest(existingTour || null);
  };

  const handleSaveTourFromRequest = async (tourData: Partial<Tour>) => {
    if (!designingRequest) return;
    if (editingTourForRequest) {
      await onEditTour(editingTourForRequest.id, { ...tourData, is_request: true });
    } else {
      await onCreateTour({
        ...(tourData as any),
        customRequestId: designingRequest.id,
        is_request: true,
        companyId: company.id,
        companyName: company.name,
        companyLogo: company.logo,
      });
    }
    await onUpdateRequest(designingRequest.id, {});
    setDesigningRequest(null);
    setEditingTourForRequest(null);
  };

  // Filtered and sorted requests
  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        if (filterStatus === "all") return true;
        if (filterStatus === "others") return r.status === "rejected" || r.status === "cancelled";
        return r.status === filterStatus;
      })
      .filter((r) => {
        const query = search.toLowerCase();
        return (
          r.id.toLowerCase().includes(query) ||
          r.destinations.toLowerCase().includes(query) ||
          (r.contactName || "").toLowerCase().includes(query) ||
          (r.contactPhone || "").includes(query) ||
          (r.contactEmail || "").toLowerCase().includes(query) ||
          (r.businessName || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.departureDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.departureDate || 0).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [requests, filterStatus, search, sortOrder]);

  if (designingRequest) {
    return (
      <TourFormPage
        company={company}
        tour={editingTourForRequest || templateTour || null}
        onBack={() => {
          setDesigningRequest(null);
          setEditingTourForRequest(null);
        }}
        onSubmit={handleSaveTourFromRequest}
        customRequest={designingRequest}
        isCustomTour={true}
        companyId={company.id}
        companyName={company.name}
        companyLogo={company.logo}
        onSave={handleSaveTourFromRequest}
        onCancel={() => {
          setDesigningRequest(null);
          setEditingTourForRequest(null);
        }}
        isCustomDesign={true}
        customRequestData={{
          id: designingRequest.id,
          destinations: designingRequest.destinations,
          departureDate: designingRequest.departureDate,
          returnDate: designingRequest.returnDate,
          numberOfPeople: designingRequest.numberOfPeople,
          budgetPerPerson: designingRequest.budgetPerPerson,
          contactName: designingRequest.contactName,
          businessName: designingRequest.businessName,
          specialRequirements: designingRequest.additionalInfo,
          version: editingTourForRequest ? (editingTourForRequest.version || 1) + 1 : 1,
        }}
        initialTour={editingTourForRequest || templateTour || undefined}
      />
    );
  }

  return (
    <div className="space-y-5 font-sans">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#075985] flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#075985]" />
            Yêu cầu thiết kế tour từ khách hàng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Tiếp nhận, phân tích nhu cầu và xây dựng lịch trình may đo riêng biệt cho khách đoàn & doanh nghiệp
          </p>
        </div>
      </div>

      {/* Control bar: Search & Filters */}
      <div className="bg-white rounded-2xl border border-[#CBD5E1] p-3.5 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#075985] focus:bg-white transition-all placeholder:text-slate-400"
            placeholder="Tìm theo mã, tên khách, SĐT, điểm đến..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Lọc:
          </span>
          {[
            { id: "all", label: "Tất cả" },
            { id: "pending", label: "Chờ xử lý" },
            { id: "reviewing", label: "Đang xem xét" },
            { id: "designed", label: "Đã thiết kế tour" },
            { id: "quoted", label: "Đã báo giá" },
            { id: "accepted", label: "Khách chốt tour" },
            { id: "others", label: "Đã hủy / Từ chối" },
          ].map((tab) => {
            const count =
              tab.id === "all"
                ? requests.length
                : tab.id === "others"
                ? requests.filter((r) => r.status === "rejected" || r.status === "cancelled").length
                : requests.filter((r) => r.status === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === tab.id
                    ? "bg-[#075985] text-white shadow-2xs font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      filterStatus === tab.id
                        ? "bg-white text-[#075985]"
                        : tab.id === "pending"
                        ? "bg-amber-400 text-amber-950"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Không tìm thấy yêu cầu thiết kế tour nào</p>
            <p className="text-slate-400 text-xs mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#F0F9FF]/80 text-[11px] font-bold text-slate-500 uppercase border-b border-[#CBD5E1] tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap w-[110px]">
                    <div className="flex items-center gap-1.5">
                      <span>Mã & Ngày</span>
                      <button
                        type="button"
                        onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                        className="inline-flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-semibold text-[#075985] bg-white border border-[#CBD5E1] hover:bg-[#F0F9FF] transition-colors cursor-pointer"
                        title={
                          sortOrder === "desc"
                            ? "Sắp xếp: Mới nhất trước. Bấm để đổi sang Cũ nhất trước"
                            : "Sắp xếp: Cũ nhất trước. Bấm để đổi sang Mới nhất trước"
                        }
                      >
                        <ArrowUpDown className="w-2.5 h-2.5" />
                        <span>{sortOrder === "desc" ? "Mới" : "Cũ"}</span>
                      </button>
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 min-w-[190px]">Khách hàng</th>
                  <th scope="col" className="px-4 py-3 min-w-[210px]">Điểm đến & Lịch trình</th>
                  <th scope="col" className="px-4 py-3 min-w-[140px]">Ngân sách</th>
                  <th scope="col" className="px-4 py-3 text-center min-w-[120px]">Trạng thái</th>
                  <th scope="col" className="px-4 py-3 min-w-[160px]">Phương án Tour</th>
                  <th scope="col" className="px-4 py-3 text-right whitespace-nowrap min-w-[240px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => {
                  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  const matchingTour = tours.find(
                    (t) => t.id === req.designedTourId || t.customRequestId === req.id
                  );
                  const isExp = expandedRow === req.id;
                  const pendingProposalCount = pendingProposalCounts[req.id] || 0;
                  const isBusy = decidingRequestId === req.id;

                  return (
                    <tr
                      key={req.id}
                      className="group hover:bg-[#F0F9FF]/40 transition-colors"
                    >
                      {/* Mã & Ngày gửi */}
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#075985] bg-[#E0F2FE] px-2 py-0.5 rounded border border-sky-200 inline-block">
                          #{req.id.toUpperCase().slice(0, 8)}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{formatDate(req.createdAt || req.departureDate)}</span>
                        </div>
                      </td>

                      {/* Khách hàng & Doanh nghiệp */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {req.contactName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{req.contactPhone || "—"}</span>
                          {req.contactEmail && (
                            <span className="text-slate-400 truncate max-w-[140px]" title={req.contactEmail}>
                              · {req.contactEmail}
                            </span>
                          )}
                        </div>
                        {req.businessName && (
                          <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 max-w-[200px] truncate">
                            <Building2 className="w-3 h-3 text-sky-600 flex-shrink-0" />
                            <span className="truncate">{req.businessName}</span>
                          </div>
                        )}
                      </td>

                      {/* Điểm đến & Lịch trình */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm group-hover:text-[#075985] transition-colors flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#F97316] flex-shrink-0" />
                          <span className="truncate max-w-[190px]" title={req.destinations}>
                            {req.destinations}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" />
                            {formatDate(req.departureDate)} – {formatDate(req.returnDate)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            <Users className="w-2.5 h-2.5 text-slate-400" />
                            {req.numberOfPeople} khách
                          </span>
                        </div>
                        {req.isCoHosted && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                              <Handshake className="w-3 h-3 text-amber-600" />
                              Liên minh lữ hành
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Ngân sách */}
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {req.budgetPerPerson ? formatVND(Number(req.budgetPerPerson)) : "Thỏa thuận"}
                          <span className="text-[10px] text-slate-400 font-normal"> / khách</span>
                        </div>
                        {req.budgetPerPerson && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Tổng: {formatVND(Number(req.budgetPerPerson) * (Number(req.numberOfPeople) || 1))}
                          </div>
                        )}
                        {req.hotelStars && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                              {req.hotelStars.includes("sao") ? req.hotelStars : `${req.hotelStars} sao`}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3.5 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Phương án Tour */}
                      <td className="px-4 py-3.5 align-middle">
                        {matchingTour ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E0F2FE] text-[#075985] border border-sky-200">
                              Phiên bản v{matchingTour.version || 1}
                            </span>
                            <p className="text-xs text-slate-700 font-medium truncate max-w-[160px]" title={matchingTour.name}>
                              {matchingTour.name}
                            </p>
                            {matchingTour.price > 0 && (
                              <p className="text-[10px] text-[#075985] font-bold">
                                Báo giá: {formatVND(matchingTour.price)} / khách
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-block">
                            Chưa tạo tour
                          </span>
                        )}

                        {pendingProposalCount > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.2 text-[10px] font-semibold text-orange-800 border border-orange-200">
                              ⚠️ {pendingProposalCount} bản khách chỉnh
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Thao tác (Single line flex-nowrap - Gọn gàng, không bị xuống dòng) */}
                      <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {/* Nút Tiếp nhận (cho trạng thái pending) */}
                          {req.status === "pending" && !matchingTour && (
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => void handleRequestDecision(req, "reviewing")}
                              className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs flex items-center gap-1 cursor-pointer rounded-lg transition-all"
                              title="Xác nhận Agency tiếp nhận yêu cầu này"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>Tiếp nhận</span>
                            </Button>
                          )}

                          {/* Nút Từ chối (icon button gọn gàng cho pending / reviewing) */}
                          {(req.status === "pending" || req.status === "reviewing") && !matchingTour && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleRequestDecision(req, "rejected")}
                              className="w-8 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
                              title="Từ chối yêu cầu thiết kế này"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Nút Xem chi tiết (Nút chính chuẩn hệ thống) */}
                          <Button
                            size="sm"
                            className="h-8 px-3 bg-[#075985] hover:bg-[#0C4A6E] text-white font-medium text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer rounded-lg transition-all"
                            onClick={() => setViewingDetailRequest(req)}
                            title="Xem chi tiết đầy đủ hồ sơ yêu cầu khách đã gửi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </Button>

                          {/* Nút Thiết kế / Sửa tour */}
                          {req.status !== "pending" && req.status !== "cancelled" && req.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 border-[#075985] text-[#075985] hover:bg-[#F0F9FF] font-medium text-xs flex items-center justify-center gap-1 cursor-pointer rounded-lg transition-all"
                              onClick={() => handleStartDesignTour(req, matchingTour)}
                              disabled={isBusy}
                              title={matchingTour ? "Chỉnh sửa thiết kế tour" : "Bắt đầu thiết kế tour cho khách"}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                              <span>{matchingTour ? "Sửa tour" : "Thiết kế"}</span>
                            </Button>
                          )}

                          {/* Nút mở rộng trao đổi & bản khách chỉnh */}
                          <button
                            type="button"
                            onClick={() => setExpandedRow(isExp ? null : req.id)}
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                              isExp
                                ? "bg-sky-100 border-[#075985] text-[#075985]"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                            title={isExp ? "Đóng khu vực trao đổi" : "Mở rộng trao đổi & bản khách chỉnh"}
                          >
                            {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="px-4 py-3 bg-[#F0F9FF] border-t border-[#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Hiển thị <strong>{filteredRequests.length}</strong> / {requests.length} yêu cầu thiết kế
          </span>
          <span>
            Bấm <strong>"Xem chi tiết"</strong> để mở toàn văn hồ sơ yêu cầu, hoặc bấm mũi tên mở rộng để trao đổi và xem bản khách chỉnh
          </span>
        </div>
      </div>

      {/* Expanded Row Drawer / Detail Section (if active) */}
      {expandedRow && (() => {
        const req = requests.find((r) => r.id === expandedRow);
        if (!req) return null;
        const matchingTour = tours.find((t) => t.id === req.designedTourId || t.customRequestId === req.id);
        const reqProposals = proposalRows[req.id] || [];
        const reqError = proposalError[req.id] || "";

        return (
          <div className="bg-white rounded-2xl border-2 border-sky-300 p-5 shadow-sm space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#075985] bg-[#E0F2FE] px-2.5 py-1 rounded border border-sky-200">
                  #{req.id.toUpperCase()}
                </span>
                <h3 className="text-sm sm:text-base font-serif font-bold text-[#075985]">
                  Khu vực trao đổi & Bản tùy biến: {req.destinations} ({req.contactName})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExpandedRow(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Đóng khu vực này
              </button>
            </div>

            {/* Trao đổi trực tiếp */}
            <DesignRequestMessages requestId={req.id} agency />

            {/* Lịch sử phiên bản */}
            <DesignVersionHistory requestId={req.id} agency />

            {/* Bản khách tùy biến và trao đổi */}
            <section className="space-y-3 rounded-xl border border-sky-200 bg-[#F0F9FF]/40 p-4 text-sm">
              <h4 className="font-bold text-sky-900 flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="w-4 h-4 text-[#075985]" />
                Bản khách tùy biến và trao đổi
              </h4>
              {reqError && <p role="alert" className="text-red-700 text-xs">{reqError}</p>}
              {!reqProposals.length && (
                <p className="text-slate-500 text-xs italic">Khách chưa gửi bản chỉnh nào cho yêu cầu này.</p>
              )}
              {reqProposals.map((proposal) => {
                const base = tours.find((t) => t.id === String(proposal.tourId));
                return (
                  <div key={proposal.id} className="space-y-2 rounded-xl border border-sky-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-sky-900">
                        Bản #{proposal.id} · Plan v{proposal.baseTourVersion} · Trạng thái: {proposal.status}
                      </span>
                    </div>
                    {proposal.message && <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded">{proposal.message}</p>}
                    {proposal.proposal.quotation && (
                      <p className="text-xs text-sky-800">
                        Giá gắn với bản gửi này · Plan v{proposal.proposal.quotation.tourVersion}:{" "}
                        <strong>{proposal.proposal.quotation.pricePerPerson.toLocaleString("vi-VN")} ₫/khách</strong> · Tổng{" "}
                        <strong>{proposal.proposal.quotation.total.toLocaleString("vi-VN")} ₫</strong> (
                        {proposal.proposal.quotation.preliminary ? "dự kiến" : "báo giá chính thức"})
                      </p>
                    )}
                    {proposal.proposal.requestedChanges && (
                      <p className="text-xs text-slate-700">
                        Điều chỉnh đề xuất:{" "}
                        {Object.entries(proposal.proposal.requestedChanges)
                          .filter(([, v]) => v)
                          .map(
                            ([k, v]) =>
                              `${
                                ({
                                  numberOfPeople: "Số khách",
                                  budgetPerPerson: "Ngân sách/người",
                                  hotelStars: "Tiêu chuẩn sao",
                                  departureDate: "Ngày đi",
                                  returnDate: "Ngày về",
                                } as Record<string, string>)[k] || k
                              }: ${v}`
                          )
                          .join(" · ")}
                      </p>
                    )}
                    {base && base.version !== proposal.baseTourVersion && (
                      <p className="text-xs text-amber-800 font-medium">
                        ⚠️ Plan hiện là v{base.version}; hãy đối chiếu các thay đổi cũ trước khi lưu.
                      </p>
                    )}
                    {base && (
                      <button
                        className="text-xs rounded-lg border border-sky-700 px-3 py-1.5 text-sky-800 hover:bg-sky-50 font-medium cursor-pointer"
                        onClick={() =>
                          handleStartDesignTour(req, {
                            ...base,
                            itinerary: proposal.proposal.itinerary,
                            hotels: proposal.proposal.hotels,
                          })
                        }
                      >
                        Mở bản khách chỉnh để tạo phiên bản Agency
                      </button>
                    )}
                    {proposal.agencyReply && (
                      <p className="text-xs text-sky-800 bg-sky-50 p-2 rounded border border-sky-100">
                        Đã phản hồi: {proposal.agencyReply}
                      </p>
                    )}
                    <textarea
                      aria-label={`Phản hồi bản ${proposal.id}`}
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-[#075985] focus:outline-none"
                      rows={2}
                      placeholder="Thông báo phần nào được chấp nhận, cần đổi hoặc sẽ báo giá lại…"
                      value={proposalReply[proposal.id] || ""}
                      onChange={(e) => setProposalReply({ ...proposalReply, [proposal.id]: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg bg-[#075985] hover:bg-[#0C4A6E] px-3 py-1.5 text-xs text-white font-medium cursor-pointer"
                        onClick={() => void handleReplyProposal(req.id, proposal.id, "reviewed")}
                      >
                        Đã xem, sẽ cập nhật plan
                      </button>
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                        onClick={() => void handleReplyProposal(req.id, proposal.id, "needs_changes")}
                      >
                        Yêu cầu khách làm rõ
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Quick action bar inside drawer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingDetailRequest(req)}
                  className="text-xs font-semibold text-[#075985] border-sky-300 bg-sky-50 hover:bg-[#075985] hover:text-white rounded-lg"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Xem chi tiết hồ sơ đầy đủ
                </Button>
                {matchingTour && onViewTour && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewTour(matchingTour)}
                    className="text-xs font-medium text-[#075985] border-slate-200 rounded-lg"
                  >
                    Xem demo tour
                  </Button>
                )}
                {matchingTour && onRestoreTourVersion && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setVersionHistoryTour(matchingTour)}
                    className="text-xs font-medium text-[#075985] border-slate-200 rounded-lg"
                  >
                    <History className="w-3.5 h-3.5 mr-1" />
                    Lịch sử phiên bản
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInvitingRequest(req)}
                  className="text-xs font-medium text-[#F97316] border-[#F97316]/30 bg-[#F97316]/10 hover:bg-[#F97316]/20 rounded-lg"
                >
                  <Handshake className="w-3.5 h-3.5 mr-1" />
                  Mời liên minh đối tác
                </Button>
              </div>

              {req.status !== "cancelled" && req.status !== "rejected" && (
                <div className="flex gap-2">
                  {matchingTour && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartDesignTour(req, null)}
                      className="border-[#075985] text-[#075985] text-xs font-semibold rounded-lg"
                    >
                      Thêm Tour plan mới
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleStartDesignTour(req, matchingTour)}
                    className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs rounded-lg"
                  >
                    <span>{matchingTour ? "Chỉnh sửa thiết kế tour" : "Bắt đầu thiết kế hành trình"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modals */}
      {versionHistoryTour && (
        <TourVersionHistoryModal
          isOpen={Boolean(versionHistoryTour)}
          onClose={() => setVersionHistoryTour(null)}
          tour={versionHistoryTour}
          onRestoreVersion={(tourId, verNum) => {
            onRestoreTourVersion?.(tourId, verNum);
            setVersionHistoryTour(null);
          }}
        />
      )}

      {/* Modal Xem chi tiết yêu cầu từ khách */}
      <CustomRequestDetailModal
        isOpen={Boolean(viewingDetailRequest)}
        onClose={() => setViewingDetailRequest(null)}
        request={detailRequest}
        matchingTour={
          detailRequest
            ? tours.find(
                (t) =>
                  t.id === detailRequest.designedTourId ||
                  t.customRequestId === detailRequest.id
              ) || null
            : null
        }
        userRole="agency"
        onStartDesignTour={handleStartDesignTour}
        onViewTour={onViewTour}
      />

      {invitingRequest && (
        <CoHostInvitationModal
          open={Boolean(invitingRequest)}
          onClose={() => setInvitingRequest(null)}
          customRequest={invitingRequest}
          tour={tours.find(
            (t) => t.id === invitingRequest.designedTourId || t.customRequestId === invitingRequest.id
          )}
          currentCompany={company}
          availableCompanies={allCompanies || mockTourCompanies}
          onSendInvitation={() => setInvitingRequest(null)}
        />
      )}
    </div>
  );
}
