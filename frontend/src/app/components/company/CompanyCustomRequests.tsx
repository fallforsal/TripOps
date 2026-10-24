import { useState } from "react";
import { CustomTourRequest, Tour, TourCompany, TourCoHost } from "@/app/types";
import { mockTourCompanies } from "@/app/data/mockData";
import {
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  Calendar,
  Sparkles,
  Building2,
  Handshake,
  ArrowRight,
  Filter,
} from "lucide-react";
import { TourFormPage } from "@/app/components/company/CompanyTourManagement";
import { TourVersionHistoryModal } from "@/app/components/company/TourVersionHistoryModal";
import { CoHostInvitationModal } from "@/app/components/company/CoHostInvitationModal";

interface CompanyCustomRequestsProps {
  requests: CustomTourRequest[];
  company: TourCompany;
  tours: Tour[];
  allCompanies?: TourCompany[];
  onUpdateRequest: (id: string, update: Partial<CustomTourRequest>) => void;
  onCreateTour: (tour: Omit<Tour, "id"> & { id?: string }) => void;
  onEditTour: (tourId: string, tour: Partial<Tour>) => void;
  onRestoreTourVersion?: (tourId: string, versionNumber: number) => void;
  onViewTour?: (tour: Tour) => void;
}

const STATUS_CONFIG: Record<CustomTourRequest["status"], { label: string; bg: string; text: string }> = {
  pending: { label: "Chờ xử lý", bg: "bg-amber-50 border-amber-200", text: "text-amber-800" },
  reviewing: { label: "Đang xem xét", bg: "bg-[#E0F2FE] border-[#075985]/15", text: "text-[#075985]" },
  designed: { label: "Đã thiết kế Tour", bg: "bg-[#F97316]/10 border-[#F97316]/30", text: "text-[#F97316]" },
  quoted: { label: "Đã báo giá", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800" },
  accepted: { label: "Khách chốt tour", bg: "bg-teal-50 border-teal-200", text: "text-teal-800" },
  rejected: { label: "Từ chối", bg: "bg-red-50 border-red-200", text: "text-red-700" },
  cancelled: { label: "Đã huỷ", bg: "bg-gray-50 border-gray-200", text: "text-gray-500" },
};

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

export function CompanyCustomRequests({
  requests,
  company,
  tours,
  allCompanies,
  onUpdateRequest,
  onCreateTour,
  onEditTour,
  onRestoreTourVersion,
  onViewTour,
}: CompanyCustomRequestsProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [designingRequest, setDesigningRequest] = useState<CustomTourRequest | null>(null);
  const [editingTourForRequest, setEditingTourForRequest] = useState<Tour | null>(null);
  const [versionHistoryTour, setVersionHistoryTour] = useState<Tour | null>(null);
  const [invitingRequest, setInvitingRequest] = useState<CustomTourRequest | null>(null);

  // Filter requests
  const pending = requests.filter((r) => r.status === "pending" || r.status === "reviewing");
  const designed = requests.filter((r) => r.status === "designed" || r.status === "quoted" || r.status === "accepted");
  const others = requests.filter((r) => r.status === "rejected" || r.status === "cancelled");

  const handleStartDesignTour = (req: CustomTourRequest, existingTour?: Tour | null) => {
    setDesigningRequest(req);
    setEditingTourForRequest(existingTour || null);
  };

  const handleSaveTourFromRequest = (tourData: Partial<Tour>) => {
    if (!designingRequest) return;
    if (editingTourForRequest) {
      onEditTour(editingTourForRequest.id, tourData);
      onUpdateRequest(designingRequest.id, {
        status: "designed",
        currentVersion: (editingTourForRequest.version || 1) + 1,
      });
    } else {
      const newTourId = `tour-custom-${Date.now()}`;
      onCreateTour({
        ...(tourData as any),
        id: newTourId,
        customRequestId: designingRequest.id,
        isCustomRequest: true,
        version: 1,
        companyId: company.id,
        companyName: company.name,
        companyLogo: company.logo,
        status: "published",
      });
      onUpdateRequest(designingRequest.id, {
        status: "designed",
        designedTourId: newTourId,
        currentVersion: 1,
      });
    }
    setDesigningRequest(null);
    setEditingTourForRequest(null);
  };

  if (designingRequest) {
    return (
      <TourFormPage
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
          specialRequirements: designingRequest.specialRequirements,
          version: editingTourForRequest ? (editingTourForRequest.version || 1) + 1 : 1,
        }}
        initialTour={editingTourForRequest || undefined}
      />
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Editorial Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#CBD5E1] shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-semibold tracking-widest text-[#F97316]">
              Điều phối hành trình riêng
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#075985] mt-1">
              Yêu cầu thiết kế tour từ khách hàng
            </h2>
            <p className="text-xs text-[#475569] font-light mt-0.5">
              Tiếp nhận, phân tích nhu cầu và xây dựng lịch trình may đo riêng biệt cho khách đoàn & doanh nghiệp.
            </p>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#CBD5E1]">
          {(["pending", "reviewing", "designed", "quoted"] as const).map((s) => {
            const count = requests.filter((r) => r.status === s).length;
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} className="bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#475569] block font-medium">
                  {cfg.label}
                </span>
                <span className="text-2xl font-serif font-bold text-[#075985]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Group 1: Pending & In-Review */}
      {pending.length > 0 && (
        <RequestGroupSection
          title="Yêu cầu chờ thiết kế & Đang xử lý"
          requests={pending}
          tours={tours}
          expanded={expanded}
          setExpanded={setExpanded}
          onStartDesignTour={handleStartDesignTour}
          onViewTour={onViewTour}
          onOpenVersionHistory={(tour) => setVersionHistoryTour(tour)}
          onOpenInviteCoHost={(req) => setInvitingRequest(req)}
        />
      )}

      {/* Group 2: Designed */}
      {designed.length > 0 && (
        <RequestGroupSection
          title="Hành trình đã thiết kế & Đang phục vụ khách"
          requests={designed}
          tours={tours}
          expanded={expanded}
          setExpanded={setExpanded}
          onStartDesignTour={handleStartDesignTour}
          onViewTour={onViewTour}
          onOpenVersionHistory={(tour) => setVersionHistoryTour(tour)}
          onOpenInviteCoHost={(req) => setInvitingRequest(req)}
        />
      )}

      {/* Modals */}
      {versionHistoryTour && (
        <TourVersionHistoryModal
          open={Boolean(versionHistoryTour)}
          onClose={() => setVersionHistoryTour(null)}
          tour={versionHistoryTour}
          onRestoreVersion={(verNum) => {
            onRestoreTourVersion?.(versionHistoryTour.id, verNum);
            setVersionHistoryTour(null);
          }}
        />
      )}

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

interface RequestGroupSectionProps {
  title: string;
  requests: CustomTourRequest[];
  tours: Tour[];
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onStartDesignTour: (req: CustomTourRequest, existingTour?: Tour | null) => void;
  onViewTour?: (tour: Tour) => void;
  onOpenVersionHistory?: (tour: Tour) => void;
  onOpenInviteCoHost: (req: CustomTourRequest) => void;
}

function RequestGroupSection({
  title,
  requests,
  tours,
  expanded,
  setExpanded,
  onStartDesignTour,
  onViewTour,
  onOpenVersionHistory,
  onOpenInviteCoHost,
}: RequestGroupSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
        <h3 className="text-base font-serif font-semibold text-[#075985] flex items-center gap-2">
          <span>{title}</span>
          <span className="text-xs bg-[#E0F2FE] text-[#075985] px-2 py-0.5 rounded-full font-sans">
            {requests.length}
          </span>
        </h3>
      </div>

      <div className="space-y-3">
        {requests.map((req) => {
          const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
          const isExp = expanded === req.id;
          const matchingTour = tours.find(
            (t) => t.id === req.designedTourId || t.customRequestId === req.id
          );

          return (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#075985] shadow-sm transition-all overflow-hidden"
            >
              {/* Header Card Row */}
              <div
                onClick={() => setExpanded(isExp ? null : req.id)}
                className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left meta */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    <h4 className="text-base font-serif font-semibold text-[#075985] truncate">
                      {req.destinations}
                    </h4>
                    {matchingTour && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E0F2FE] text-[#075985] font-medium border border-[#CBD5E1]">
                        Phiên bản v{matchingTour.version || 1}
                      </span>
                    )}
                    {req.isCoHosted && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F97316]/10 text-[#F97316] font-medium border border-[#F97316]/20 flex items-center gap-1">
                        <Handshake className="w-3 h-3" />
                        Liên minh lữ hành
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#475569] flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-[#075985]">
                      <Users className="w-3.5 h-3.5 text-[#F97316]" />
                      {req.contactName} ({req.contactPhone})
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(req.departureDate)} – {formatDate(req.returnDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {req.numberOfPeople} khách
                    </span>
                    {req.businessName && (
                      <span className="flex items-center gap-1 text-[#075985] font-medium">
                        <Building2 className="w-3.5 h-3.5" />
                        {req.businessName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right price & action */}
                <div className="flex items-center gap-4 self-end md:self-center">
                  {(req.quotedPricePerPerson || matchingTour?.price) && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-[#475569] block">Định mức / Khách</span>
                      <span className="text-base font-serif font-semibold text-[#075985]">
                        {formatVND(matchingTour?.price ?? req.quotedPricePerPerson ?? 0)}
                      </span>
                    </div>
                  )}

                  <div className="w-7 h-7 rounded-full border border-[#CBD5E1] flex items-center justify-center text-[#475569]">
                    {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* Collapsible Details */}
              {isExp && (
                <div className="p-6 bg-[#F0F9FF] border-t border-[#CBD5E1] space-y-6">
                  {req.specialRequirements && (
                    <div className="space-y-1 bg-white p-4 rounded-xl border border-[#CBD5E1]">
                      <span className="text-xs uppercase font-semibold tracking-wider text-[#F97316]">
                        Yêu cầu & Ghi chú từ khách hàng:
                      </span>
                      <p className="text-xs text-[#0F172A]/80 font-light leading-relaxed">
                        {req.specialRequirements}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      {matchingTour && onViewTour && (
                        <button
                          onClick={() => onViewTour(matchingTour)}
                          className="px-4 py-2 rounded-full border border-[#CBD5E1] bg-white text-xs font-medium text-[#075985] hover:border-[#075985] transition-colors"
                        >
                          Xem demo tour
                        </button>
                      )}
                      {matchingTour && onOpenVersionHistory && (
                        <button
                          onClick={() => onOpenVersionHistory(matchingTour)}
                          className="px-4 py-2 rounded-full border border-[#CBD5E1] bg-white text-xs font-medium text-[#075985] hover:border-[#075985] transition-colors"
                        >
                          Lịch sử phiên bản
                        </button>
                      )}
                      <button
                        onClick={() => onOpenInviteCoHost(req)}
                        className="px-4 py-2 rounded-full border border-[#F97316]/30 bg-[#F97316]/10 text-xs font-medium text-[#F97316] hover:bg-[#F97316]/20 transition-colors"
                      >
                        Mời liên minh đối tác
                      </button>
                    </div>

                    <button
                      onClick={() => onStartDesignTour(req, matchingTour)}
                      className="px-6 py-2.5 rounded-full bg-[#075985] text-white text-xs font-semibold hover:bg-[#F97316] transition-all duration-300 flex items-center gap-2 shadow-sm"
                    >
                      <span>{matchingTour ? "Chỉnh sửa thiết kế tour" : "Bắt đầu thiết kế hành trình"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
