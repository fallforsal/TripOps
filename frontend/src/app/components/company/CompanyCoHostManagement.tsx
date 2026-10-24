import { useState } from "react";
import { TourCompany, Tour, CustomTourRequest, Booking, TourCoHost } from "@/app/types";
import {
  Handshake,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  Eye,
  Send,
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
  Edit,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface CompanyCoHostManagementProps {
  company: TourCompany;
  tours: Tour[];
  customTourRequests: CustomTourRequest[];
  bookings?: Booking[];
  allCompanies: TourCompany[];
  onAcceptInvitation: (requestIdOrTourId: string, isTour: boolean) => void;
  onRejectInvitation: (requestIdOrTourId: string, isTour: boolean, reason?: string) => void;
  onOpenInviteModal?: () => void;
  onViewTour?: (tour: Tour) => void;
  onEditTourSegment?: (item: Tour | CustomTourRequest) => void;
}

function formatVND(n: number) {
  return (n || 0).toLocaleString("vi-VN") + " ₫";
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function CompanyCoHostManagement({
  company,
  tours,
  customTourRequests,
  bookings = [],
  allCompanies,
  onAcceptInvitation,
  onRejectInvitation,
  onOpenInviteModal,
  onViewTour,
  onEditTourSegment,
}: CompanyCoHostManagementProps) {
  const [activeTab, setActiveTab] = useState<"incoming" | "active" | "outgoing">(
    "incoming"
  );
  const [rejectModalItem, setRejectModalItem] = useState<{
    id: string;
    isTour: boolean;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // 1. INCOMING INVITATIONS:
  // Custom requests or tours where:
  // - targetCompany is NOT current company (or lead is not current company)
  // - coHosts includes current company with role === "partner" and status === "pending"
  const incomingRequestInvites = customTourRequests.filter((r) =>
    r.coHosts?.some(
      (ch) => ch.companyId === company.id && ch.status === "pending"
    )
  );

  const incomingTourInvites = tours.filter((t) =>
    t.coHosts?.some(
      (ch) => ch.companyId === company.id && ch.status === "pending"
    )
  );

  const totalIncomingPending =
    incomingRequestInvites.length + incomingTourInvites.length;

  // 2. ACTIVE CO-HOSTED ITEMS (Accepted):
  // Where current company is either lead or partner, and partner is accepted
  const activeCustomRequests = customTourRequests.filter((r) =>
    r.coHosts?.some(
      (ch) => ch.companyId === company.id && ch.status === "accepted"
    )
  );

  const activeTours = tours.filter((t) =>
    t.coHosts?.some(
      (ch) => ch.companyId === company.id && ch.status === "accepted"
    )
  );

  // 3. OUTGOING INVITATIONS:
  // Where current company is the lead (or targetCompanyId === company.id), and has invited partner(s)
  const outgoingRequestInvites = customTourRequests.filter(
    (r) =>
      r.targetCompanyId === company.id &&
      r.coHosts?.some((ch) => ch.companyId !== company.id)
  );

  const outgoingTourInvites = tours.filter(
    (t) =>
      t.companyId === company.id &&
      t.coHosts?.some((ch) => ch.companyId !== company.id)
  );

  const handleConfirmReject = () => {
    if (!rejectModalItem) return;
    onRejectInvitation(rejectModalItem.id, rejectModalItem.isTour, rejectReason);
    setRejectModalItem(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-blue-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold text-purple-100">
            <Handshake className="w-4 h-4 text-amber-300" />
            <span>Mạng Lưới Liên Minh Du Lịch (Co-Hosting)</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Hợp Tác Dẫn Tour &amp; Phân Chia Chặng
          </h2>
          <p className="text-purple-100 text-xs sm:text-sm leading-relaxed">
            Kết nối các đơn vị lữ hành chuyên tuyến để nhận khách hoặc cùng phụ trách các chặng chuyên môn. Dòng tiền thanh toán được bảo chứng an toàn qua Tài khoản Ký quỹ (Escrow) của Sàn và quyết toán minh bạch.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <Handshake className="w-80 h-80" />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab("incoming")}
          className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
            activeTab === "incoming"
              ? "border-purple-500 ring-2 ring-purple-100"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              Lời mời hợp tác nhận được
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-extrabold text-gray-900">
              {totalIncomingPending}
            </p>
            {totalIncomingPending > 0 && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
                Cần phản hồi
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Các công ty khác mời bạn cùng chia chặng
          </p>
        </div>

        <div
          onClick={() => setActiveTab("active")}
          className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
            activeTab === "active"
              ? "border-purple-500 ring-2 ring-purple-100"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              Tour liên minh đang phối hợp
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">
            {activeCustomRequests.length + activeTours.length}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Đã chốt hợp tác &amp; đang phục vụ khách
          </p>
        </div>

        <div
          onClick={() => setActiveTab("outgoing")}
          className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
            activeTab === "outgoing"
              ? "border-purple-500 ring-2 ring-purple-100"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              Lời mời bạn đã gửi đi
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] flex items-center justify-center text-[#075985]">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#075985] mt-2">
            {outgoingRequestInvites.length + outgoingTourInvites.length}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Mời đối tác tham gia tour của công ty bạn
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab("incoming")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "incoming"
              ? "text-[#EA580C] border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <span>Lời Mời Nhận Được</span>
          {totalIncomingPending > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              {totalIncomingPending}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("active")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "active"
              ? "text-[#EA580C] border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <span>Tour Đang Phối Hợp ({activeCustomRequests.length + activeTours.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("outgoing")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "outgoing"
              ? "text-[#EA580C] border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <span>Lời Mời Đã Gửi Đi ({outgoingRequestInvites.length + outgoingTourInvites.length})</span>
        </button>
      </div>

      {/* TAB 1: INCOMING INVITATIONS */}
      {activeTab === "incoming" && (
        <div className="space-y-4">
          {totalIncomingPending === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F0F9FF] flex items-center justify-center mx-auto text-[#F97316]">
                <Handshake className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-800 text-sm">
                Hiện tại không có lời mời hợp tác nào mới
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Khi có công ty lữ hành khác cần hỗ trợ chặng tour tại khu vực thế mạnh của bạn, lời mời sẽ hiển thị tại đây để bạn xem xét và chấp nhận.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingRequestInvites.map((req) => {
                const myInvite = req.coHosts?.find(
                  (ch) => ch.companyId === company.id && ch.status === "pending"
                );
                const leadHost = req.coHosts?.find((ch) => ch.role === "lead");

                return (
                  <div
                    key={req.id}
                    className="bg-white border-2 border-[#F97316]/30 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        {leadHost?.companyLogo ? (
                          <img
                            src={leadHost.companyLogo}
                            alt={leadHost.companyName}
                            className="w-12 h-12 rounded-xl object-cover border border-[#F97316]/30"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center font-bold text-[#075985]">
                            {leadHost?.companyName?.slice(0, 2).toUpperCase() || "C"}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                              Lời mời mới cần duyệt
                            </span>
                            <span className="text-xs text-gray-400">
                              Mã yêu cầu: #{req.id}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-gray-900 text-base mt-0.5">
                            {leadHost?.companyName || req.targetCompanyName} mời bạn cùng tổ chức tour
                          </h3>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Chờ xác nhận &amp; Báo giá
                        </span>
                        {myInvite?.estimatedBudgetPerGuest && (
                          <p className="text-[11px] text-gray-500 font-medium mt-1">
                            Ngân sách gợi ý: ~{formatVND(myInvite.estimatedBudgetPerGuest)} / khách
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Customer & Tour details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F0F9FF]/50 p-3.5 rounded-xl border border-purple-100 text-xs">
                      <div>
                        <span className="text-gray-500 font-medium block">Điểm đến &amp; Tuyến đường</span>
                        <p className="font-bold text-gray-900 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#F97316] flex-shrink-0" />
                          {req.destinations}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Thời gian &amp; Đoàn khách</span>
                        <p className="font-bold text-gray-900 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#075985] flex-shrink-0" />
                          {formatDate(req.departureDate)} – {formatDate(req.returnDate)} ({req.numberOfPeople} người)
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium block">Khách hàng yêu cầu</span>
                        <p className="font-bold text-gray-900 mt-0.5">
                          {req.contactName}
                          {req.businessName && ` (${req.businessName})`}
                        </p>
                      </div>
                    </div>

                    {/* Assignment breakdown */}
                    <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#F97316]" />
                          Chặng được giao cho công ty bạn phụ trách:
                        </span>
                        {myInvite?.estimatedBudgetPerGuest && (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                            Ngân sách gợi ý: ~{formatVND(myInvite.estimatedBudgetPerGuest)} / khách
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-purple-950">
                        {myInvite?.assignedSegments || "Phụ trách điều phối dịch vụ tại điểm đến"}
                      </p>
                      {myInvite?.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="text-gray-500 text-[11px] block">Nội dung trao đổi từ đơn vị chủ trì:</span>
                          <p className="text-gray-800 italic mt-0.5">"{myInvite.notes}"</p>
                        </div>
                      )}
                    </div>

                    {/* Escrow Guarantee note */}
                    <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        <strong>Bảo chứng Sàn Escrow &amp; Báo giá độc lập:</strong> Sau khi nhận lời mời, công ty bạn sẽ tự chọn khách sạn, nhà hàng và gửi báo giá chi phí chặng mình. Khi hoàn thành tour, Sàn giải ngân chính xác số tiền theo báo giá của công ty bạn.
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setRejectModalItem({
                            id: req.id,
                            isTour: false,
                            name: req.destinations,
                          })
                        }
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Từ chối lời mời
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onAcceptInvitation(req.id, false)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Chấp nhận liên kết &amp; Tham gia dẫn tour
                      </Button>
                    </div>
                  </div>
                );
              })}

              {incomingTourInvites.map((t) => {
                const myInvite = t.coHosts?.find(
                  (ch) => ch.companyId === company.id && ch.status === "pending"
                );
                const leadHost = t.coHosts?.find((ch) => ch.role === "lead");

                return (
                  <div
                    key={t.id}
                    className="bg-white border-2 border-[#F97316]/30 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                          Lời mời tour mẫu có sẵn
                        </span>
                        <h3 className="font-extrabold text-gray-900 text-base mt-1">
                          {t.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Đơn vị chủ trì: <strong>{leadHost?.companyName || t.companyName}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Chờ xác nhận
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setRejectModalItem({
                            id: t.id,
                            isTour: true,
                            name: t.name,
                          })
                        }
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Từ chối
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onAcceptInvitation(t.id, true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Đồng ý hợp tác tour
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE JOINT TOURS */}
      {activeTab === "active" && (
        <div className="space-y-4">
          {activeCustomRequests.length === 0 && activeTours.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-800 text-sm">
                Chưa có tour liên minh nào đang hoạt động
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Khi bạn gửi lời mời và đối tác đồng ý (hoặc bạn chấp nhận lời mời từ đối tác), danh sách các tour liên minh sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {/* Active custom requests */}
              {activeCustomRequests.map((req) => {
                const leadHost = req.coHosts?.find((ch) => ch.role === "lead");
                const partnerHost = req.coHosts?.find((ch) => ch.role === "partner");
                const isMeLead = leadHost?.companyId === company.id;

                return (
                  <div
                    key={req.id}
                    className="bg-white border border-[#F97316]/30 rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isMeLead
                                ? "bg-[#E0F2FE] text-blue-800"
                                : "bg-[#F97316]/15 text-purple-800"
                            }`}
                          >
                            {isMeLead ? "Bạn là Đơn vị Chủ trì (Lead)" : "Bạn là Đối tác Chuyên môn (Partner)"}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Đã chốt liên minh
                          </span>
                        </div>
                        <h4 className="font-extrabold text-gray-900 text-base mt-1">
                          {req.destinations}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Khách hàng: <strong>{req.contactName}</strong> ({req.numberOfPeople} người) · Thời gian: {formatDate(req.departureDate)} – {formatDate(req.returnDate)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-gray-400 block">Doanh thu tour</span>
                        <span className="text-base font-extrabold text-emerald-600">
                          {formatVND(
                            (req.quotedPricePerPerson || Number(req.budgetPerPerson) || 0) *
                              Number(req.numberOfPeople || 1)
                          )}
                        </span>
                      </div>
                    </div>

                    {/* All hosts representation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                      {req.coHosts?.map((host, hIdx) => {
                        const isLead = host.role === "lead";
                        const isMe = host.companyId === company.id;
                        return (
                          <div
                            key={host.id || hIdx}
                            className={`border rounded-xl p-3.5 space-y-2 ${
                              isLead ? "bg-[#F0F9FF]/70 border-[#CBD5E1]" : "bg-[#F0F9FF]/70 border-[#F97316]/30"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {host.companyLogo ? (
                                  <img
                                    src={host.companyLogo}
                                    alt={host.companyName}
                                    className="w-7 h-7 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center font-bold text-xs">
                                    {host.companyName?.slice(0, 1)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-gray-900 text-xs">
                                    {host.companyName} {isMe ? "(Bạn)" : ""}
                                  </p>
                                  <span className={`text-[10px] font-semibold ${isLead ? "text-[#075985]" : "text-[#EA580C]"}`}>
                                    {isLead ? "Đơn vị chủ trì" : "Đối tác liên minh"}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${isLead ? "text-blue-800 bg-blue-200/80" : "text-purple-900 bg-purple-200/80"}`}>
                                {host.revenueSharePercentage}% doanh thu
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-700">
                              <strong>Phụ trách:</strong> {host.assignedSegments || "Dịch vụ chặng đảm nhiệm"}
                            </p>
                            {host.quotePerGuest && (
                              <p className="text-[10px] text-gray-500">
                                Báo giá: <strong>{formatVND(host.quotePerGuest)}</strong> / khách
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-100">
                      {onEditTourSegment && (
                        <Button
                          size="sm"
                          onClick={() => onEditTourSegment(req)}
                          className="bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs gap-1.5 shadow-xs"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          ✏️ Lên lịch trình, khách sạn &amp; nhà ăn chặng phụ trách
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Active tours */}
              {activeTours.map((t) => {
                const leadHost = t.coHosts?.find((ch) => ch.role === "lead");
                const partnerHost = t.coHosts?.find((ch) => ch.role === "partner");
                const isMeLead = leadHost?.companyId === company.id;

                return (
                  <div
                    key={t.id}
                    className="bg-white border border-[#F97316]/30 rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isMeLead
                                ? "bg-[#E0F2FE] text-blue-800"
                                : "bg-[#F97316]/15 text-purple-800"
                            }`}
                          >
                            {isMeLead ? "Bạn là Đơn vị Chủ trì (Lead)" : "Bạn là Đối tác Chuyên môn (Partner)"}
                          </span>
                          <span className="bg-[#F97316]/15 text-purple-900 text-xs font-mono font-bold px-2 py-0.5 rounded">
                            v{t.version || 1}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-gray-900 text-base mt-1">
                          {t.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t.duration} · Điểm đến: {t.destination} · Giá tour:{" "}
                          <strong className="text-emerald-700">{formatVND(t.price)}/khách</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {onEditTourSegment && (
                          <Button
                            size="sm"
                            onClick={() => onEditTourSegment(t)}
                            className="bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs gap-1.5 shadow-xs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            ✏️ Điều chỉnh chặng của bạn
                          </Button>
                        )}
                        {onViewTour && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewTour(t)}
                            className="text-[#EA580C] border-[#F97316]/30 hover:bg-[#F0F9FF] text-xs gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Xem chi tiết tour
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                      {t.coHosts?.map((host, hIdx) => {
                        const isLead = host.role === "lead";
                        const isMe = host.companyId === company.id;
                        return (
                          <div
                            key={host.id || hIdx}
                            className={`border rounded-xl p-3.5 space-y-1.5 ${
                              isLead ? "bg-[#F0F9FF]/70 border-[#CBD5E1]" : "bg-[#F0F9FF]/70 border-[#F97316]/30"
                            }`}
                          >
                            <p className="font-bold text-gray-900 text-xs flex items-center justify-between">
                              <span>
                                {host.companyName} {isMe ? "(Bạn)" : ""}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${isLead ? "text-[#075985] bg-[#E0F2FE]" : "text-[#EA580C] bg-[#F97316]/15"}`}>
                                {host.revenueSharePercentage ?? Math.round(100 / (t.coHosts?.length || 1))}% chia
                              </span>
                            </p>
                            <p className="text-[11px] text-gray-600 line-clamp-1">
                              <strong>Phụ trách:</strong> {host.assignedSegments || (isLead ? "Đơn vị điều phối chính" : "Đối tác địa phương")}
                            </p>
                            {host.quotePerGuest && (
                              <p className="text-[10px] text-gray-500">
                                Báo giá: <strong>{formatVND(host.quotePerGuest)}</strong> / khách
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OUTGOING INVITATIONS */}
      {activeTab === "outgoing" && (
        <div className="space-y-4">
          {outgoingRequestInvites.length === 0 && outgoingTourInvites.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F0F9FF] flex items-center justify-center mx-auto text-[#075985]">
                <Send className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-800 text-sm">
                Bạn chưa gửi lời mời hợp tác nào
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Khi bạn nhận được yêu cầu thiết kế tour từ khách mà cần sự hỗ trợ của đối tác chuyên tuyến, hãy bấm "Mời đối tác liên kết" trong mục Quản lý Yêu cầu.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {outgoingRequestInvites.map((req) => {
                const partnerInvite = req.coHosts?.find(
                  (ch) => ch.companyId !== company.id
                );

                return (
                  <div
                    key={req.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500">Mã yêu cầu: #{req.id}</span>
                          {partnerInvite?.status === "accepted" ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Đối tác đã đồng ý
                            </span>
                          ) : partnerInvite?.status === "rejected" ? (
                            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Đối tác từ chối
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3" />
                              Đang chờ đối tác phản hồi
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-base mt-1">
                          {req.destinations}
                        </h4>
                        <p className="text-xs text-gray-500">
                          Khách hàng: {req.contactName} ({req.numberOfPeople} người) · Ngày đi: {formatDate(req.departureDate)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#EA580C] bg-[#F0F9FF] px-2.5 py-1 rounded-full border border-[#F97316]/30">
                          Chờ đối tác báo giá chặng
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                      <p className="font-semibold text-gray-800">
                        Đối tác được mời:{" "}
                        <strong className="text-purple-900">{partnerInvite?.companyName}</strong>
                      </p>
                      <p className="text-gray-600">
                        Phân công: {partnerInvite?.assignedSegments}
                      </p>
                      {partnerInvite?.notes && (
                        <p className="text-gray-500 italic">
                          "{partnerInvite.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: TỪ CHỐI LỜI MỜI */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Từ chối lời mời hợp tác
            </h3>
            <p className="text-xs text-gray-600">
              Bạn có chắc chắn muốn từ chối lời mời tham gia tổ chức tour{" "}
              <strong>"{rejectModalItem.name}"</strong> không?
            </p>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Lý do từ chối (Gửi lại cho công ty mời):
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Công ty đã kín lịch đoàn vào ngày này, không đủ hướng dẫn viên..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-xs resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalItem(null)}
              >
                Hủy
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmReject}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
