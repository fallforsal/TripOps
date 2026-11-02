import { useState } from "react";
import { CustomTourRequest, Tour } from "@/app/types";
import { mockTours } from "@/app/data/mockData";
import {
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  Calendar,
  Sparkles,
  Eye,
  Info,
  Phone,
  ShieldAlert,
  Handshake,
  ShieldCheck,
  Building,
  Utensils,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface UserCustomRequestsProps {
  requests: CustomTourRequest[];
  tours?: Tour[];
  onCancel: (id: string) => void;
  onNavigateToForm: () => void;
  onViewTour?: (tour: Tour) => void;
  onBookTour?: (tour: Tour) => void;
}

const STATUS_CONFIG: Record<
  CustomTourRequest["status"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: { label: "Chờ xử lý", color: "bg-gray-100 text-gray-600 border-gray-200", icon: <Clock className="w-3.5 h-3.5" /> },
  reviewing: { label: "Đang xem xét", color: "bg-[#E0F2FE] text-[#075985] border-[#CBD5E1]", icon: <Clock className="w-3.5 h-3.5" /> },
  designed: { label: "Đã có Tour thiết kế", color: "bg-[#F97316]/15 text-[#EA580C] border-[#F97316]/30", icon: <Sparkles className="w-3.5 h-3.5 text-[#F97316]" /> },
  quoted: { label: "Đã báo giá", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  accepted: { label: "Đã chấp nhận", color: "bg-teal-100 text-teal-700 border-teal-200", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { label: "Không phù hợp", color: "bg-red-100 text-red-600 border-red-200", icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: "Đã huỷ", color: "bg-gray-100 text-gray-400 border-gray-200", icon: <XCircle className="w-3.5 h-3.5" /> },
};

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

export function UserCustomRequests({
  requests,
  tours = [],
  onCancel,
  onNavigateToForm,
  onViewTour,
  onBookTour,
}: UserCustomRequestsProps) {
  const [expanded, setExpanded] = useState<string | null>("ctr-1");
  const [expandedItinerary, setExpandedItinerary] = useState<Record<string, boolean>>({
    "ctr-1": true,
    "ctr-solo-1": true,
  });

  if (requests.length === 0) {
    return (
      <div className="text-center py-16 space-y-4 bg-white rounded-xl border border-gray-200">
        <div className="w-16 h-16 bg-[#F0F9FF] rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-purple-500" />
        </div>
        <p className="text-gray-700 font-semibold">Bạn chưa có yêu cầu thiết kế tour nào.</p>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Không tìm thấy tour phù hợp? Bạn có thể gửi yêu cầu để công ty du lịch thiết kế lịch trình riêng theo sở thích và ngân sách của bạn.
        </p>
        <Button onClick={onNavigateToForm} className="bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold">
          Gửi yêu cầu thiết kế tour riêng
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {requests.length} yêu cầu thiết kế tour của bạn
        </p>
        <Button size="sm" onClick={onNavigateToForm} className="bg-[#F97316] hover:bg-[#EA580C] text-white gap-1.5 font-semibold">
          <Sparkles className="w-4 h-4" />
          Gửi yêu cầu thiết kế mới
        </Button>
      </div>

      {requests.map((req) => {
        const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
        const isExp = expanded === req.id;

        // Find matching tour designed for this request
        const matchingTour =
          tours.find((t) => t.id === req.designedTourId || t.customRequestId === req.id) ||
          mockTours.find((t) => t.id === req.designedTourId || t.customRequestId === req.id);

        const isItineraryOpen = expandedItinerary[req.id] ?? false;

        return (
          <div
            key={req.id}
            className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${
              matchingTour ? "border-purple-300 ring-1 ring-purple-100" : "border-gray-200"
            }`}
          >
            {/* Row header */}
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(isExp ? null : req.id)}
            >
              {/* Status pill */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 border ${cfg.color}`}
              >
                {cfg.icon}
                {cfg.label}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {req.destinations}
                  </p>
                  {matchingTour && (
                    <span className="bg-[#F97316]/15 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      Phiên bản v{matchingTour.version || req.currentVersion || 1}
                    </span>
                  )}
                  {matchingTour?.isCoHosted && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Handshake className="w-3 h-3 text-indigo-600" />
                      Liên minh 2 cty
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-gray-700">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {formatDate(req.departureDate)} – {formatDate(req.returnDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-gray-400" />
                    {req.numberOfPeople} người
                  </span>
                  <span className="text-[#EA580C] font-medium">
                    {req.targetCompanyName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {(matchingTour?.price || req.quotedPricePerPerson) && (
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400">Giá tour / khách</p>
                    <p className="text-sm font-extrabold text-emerald-600">
                      {formatVND(matchingTour?.price ?? req.quotedPricePerPerson ?? 0)}
                    </p>
                  </div>
                )}
                {isExp ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded detail */}
            {isExp && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/60">
                {/* PROMINENT DESIGNED TOUR CARD FOR CUSTOMER */}
                {matchingTour ? (
                  <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white rounded-2xl p-5 shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="bg-purple-500/40 text-purple-200 border border-purple-400/60 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            ✨ Tour Thiết Kế Riêng Dành Cho Bạn
                          </span>
                          <span className="bg-purple-800 text-purple-200 text-xs px-2.5 py-0.5 rounded font-mono font-bold">
                            Phiên bản: v{matchingTour.version || 1}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          {matchingTour.name}
                        </h3>
                        <p className="text-xs text-purple-200 mt-1">
                          Điểm đến: {matchingTour.destination} · Thời lượng: {matchingTour.duration} · Lịch trình: {matchingTour.itinerary?.length || 0} ngày
                        </p>
                      </div>

                      <div className="text-left sm:text-right bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 flex-shrink-0">
                        <p className="text-xs text-purple-200">Đơn giá trọn gói</p>
                        <p className="text-xl font-extrabold text-amber-300">
                          {formatVND(matchingTour.price)}
                          <span className="text-xs font-normal text-purple-200"> / người</span>
                        </p>
                      </div>
                    </div>

                    {/* Operational responsibility banner: Co-hosted alliance vs Single company */}
                    {matchingTour.isCoHosted && matchingTour.coHosts && matchingTour.coHosts.length > 0 ? (
                      <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#F97316]/90 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <Handshake className="w-3.5 h-3.5 text-amber-300" />
                              Tour Liên Minh Đối Tác
                            </span>
                            <span className="text-xs text-purple-200">
                              Phối hợp thực hiện bởi {matchingTour.coHosts.length} thương hiệu lữ hành uy tín
                            </span>
                          </div>
                          <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Ký quỹ bảo chứng Escrow
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          {matchingTour.coHosts.map((ch) => (
                            <div key={ch.id} className="bg-purple-950/60 rounded-lg p-2.5 border border-purple-400/20">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-xs">{ch.companyName}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    ch.role === "lead"
                                      ? "bg-blue-500/40 text-blue-200 border border-blue-400/40"
                                      : "bg-purple-500/40 text-purple-200 border border-purple-400/40"
                                  }`}
                                >
                                  {ch.role === "lead" ? "Đơn vị Chủ trì" : "Đối tác Bản địa"}
                                </span>
                              </div>
                              <p className="text-[11px] text-purple-300 mt-1">{ch.assignedSegments}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15 flex items-center justify-between text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#075985]/90 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            🏢 Đơn vị tổ chức độc lập
                          </span>
                          <span className="font-bold text-white text-sm">
                            {matchingTour.companyName || req.targetCompanyName}
                          </span>
                        </div>
                        <span className="text-xs text-purple-200 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                          Phụ trách trọn gói 100% lịch trình &amp; dịch vụ chuyên nghiệp
                        </span>
                      </div>
                    )}

                    {matchingTour.changeNote && (
                      <div className="bg-black/30 rounded-lg p-3 text-xs text-purple-200 border border-white/10">
                        <p className="font-bold text-white mb-0.5">
                          Ghi chú từ công ty cho phiên bản này (v{matchingTour.version || 1}):
                        </p>
                        <p className="italic text-amber-200">"{matchingTour.changeNote}"</p>
                      </div>
                    )}

                    {/* Quick Itinerary Preview Accordion */}
                    <div className="bg-black/25 rounded-xl border border-white/15 overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedItinerary((prev) => ({
                            ...prev,
                            [req.id]: !prev[req.id],
                          }));
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-purple-100 hover:bg-white/5 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-bold text-white text-sm">
                          <Calendar className="w-4 h-4 text-amber-300" />
                          Xem nhanh tóm tắt lịch trình ({matchingTour.itinerary?.length || 0} ngày)
                        </span>
                        <span className="text-amber-300 text-xs flex items-center gap-1 font-bold">
                          {isItineraryOpen ? "Thu gọn lịch trình" : "Xem chi tiết từng ngày"}
                          {isItineraryOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </span>
                      </button>

                      {isItineraryOpen && (
                        <div className="p-3.5 space-y-2.5 border-t border-white/10 bg-black/30">
                          {matchingTour.itinerary?.map((day) => (
                            <div
                              key={day.id || day.day}
                              className="bg-white/10 hover:bg-white/15 transition-colors rounded-xl p-3 text-xs text-purple-100 border border-white/10 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="bg-amber-400 text-purple-950 font-extrabold text-[11px] px-2 py-0.5 rounded shadow-xs">
                                    Ngày {day.day}
                                  </span>
                                  <span className="font-bold text-white text-sm">
                                    {day.title}
                                  </span>
                                </div>
                                {day.createdByCompanyName && (
                                  <span className="text-[10px] bg-purple-800 border border-purple-400/40 text-purple-200 px-2 py-0.5 rounded-full font-semibold">
                                    Đơn vị phụ trách: {day.createdByCompanyName}
                                  </span>
                                )}
                              </div>

                              {day.description && (
                                <p className="text-purple-200 leading-relaxed text-xs">
                                  {day.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-purple-300 border-t border-white/10">
                                {day.hotel && (
                                  <span className="flex items-center gap-1 text-amber-200">
                                    <Building className="w-3.5 h-3.5 text-amber-300" />
                                    {day.hotel.name} {day.hotel.stars ? `(${day.hotel.stars}★)` : ""}
                                  </span>
                                )}
                                {day.meals && day.meals.length > 0 && (
                                  <span className="flex items-center gap-1 text-purple-200">
                                    <Utensils className="w-3.5 h-3.5 text-purple-300" />
                                    {day.meals.map((m) => m.serviceName).join(" · ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Important Customer Guideline Box */}
                    <div className="bg-purple-800/60 border border-purple-400/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-purple-100">
                      <ShieldAlert className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-white">Chính sách xem &amp; điều chỉnh Tour thiết kế riêng:</p>
                        <p className="mt-0.5 text-purple-200 leading-relaxed">
                          Đây là chương trình tour độc quyền thiết kế riêng theo thỏa thuận giữa bạn và <strong>{req.targetCompanyName}</strong>. Bạn có thể xem toàn bộ lịch trình, chỗ ở, bữa ăn và bấm <strong>"Đặt tour ngay"</strong>. Nếu cần thay đổi bất cứ điều gì, bạn hãy liên hệ với công ty qua hotline hoặc Zalo để công ty điều chỉnh và tạo phiên bản mới cho bạn.
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                      {onViewTour && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewTour(matchingTour);
                          }}
                          className="w-full sm:w-auto bg-white hover:bg-gray-100 text-purple-950 font-bold gap-2 text-xs shadow-sm"
                        >
                          <Eye className="w-4 h-4 text-[#EA580C]" />
                          Xem chi tiết Lịch trình &amp; Dịch vụ Tour
                        </Button>
                      )}
                      {onBookTour && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookTour(matchingTour);
                          }}
                          className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-purple-950 font-extrabold gap-2 text-xs shadow-sm"
                        >
                          <Sparkles className="w-4 h-4 text-purple-900" />
                          Đặt Tour này ngay
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-[#075985]" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          Công ty đang tiến hành thiết kế tour cho bạn
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {req.targetCompanyName} đã tiếp nhận yêu cầu và đang xây dựng lịch trình chi tiết. Tour thiết kế sẽ xuất hiện tại đây ngay khi hoàn tất.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Co-Hosting Alliance Information for Customer (when pending / reviewing) */}
                {!matchingTour && req.isCoHosted && (
                  <div className="bg-gradient-to-r from-purple-50 via-indigo-50/60 to-blue-50 border border-[#F97316]/30 rounded-xl p-4.5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-700 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                        <Handshake className="w-3.5 h-3.5 text-amber-300" />
                        Tour Liên Minh Hợp Tác Chuyên Nghiệp
                      </span>
                      <span className="text-xs text-purple-900 font-semibold">
                        2 công ty lữ hành cùng phối hợp dẫn tour
                      </span>
                    </div>

                    <p className="text-gray-700 text-xs leading-relaxed">
                      Để mang đến trải nghiệm tuyệt vời nhất cho đoàn, chuyến đi được hợp tác điều phối giữa <strong>Đơn vị chủ trì</strong> (chịu trách nhiệm ký kết hợp đồng, bảo hiểm và xe vận chuyển chính) cùng <strong>Công ty bản địa chuyên tuyến</strong> (cung cấp HDV am hiểu phong tục và dịch vụ chuyên sâu tại chỗ).
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {(matchingTour?.coHosts || req.coHosts)?.map((ch) => (
                        <div
                          key={ch.id}
                          className="bg-white rounded-lg p-3 border border-purple-100 shadow-2xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 flex items-center gap-1.5">
                              {ch.companyLogo && (
                                <img
                                  src={ch.companyLogo}
                                  alt=""
                                  className="w-5 h-5 rounded object-cover"
                                />
                              )}
                              {ch.companyName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                ch.role === "lead"
                                  ? "bg-[#E0F2FE] text-blue-800"
                                  : "bg-[#F97316]/15 text-purple-800"
                              }`}
                            >
                              {ch.role === "lead" ? "Đơn vị Chủ trì" : "Đối tác Bản địa"}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600">
                            <strong>Phụ trách:</strong> {ch.assignedSegments || "Điều phối lịch trình"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2 text-emerald-900 text-[11px]">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        <strong>Bảo chứng thanh toán Ký quỹ (Escrow):</strong> Tiền tour được giữ an toàn tại Tài khoản trung gian của Sàn Du Lịch cho đến khi quý khách hoàn thành chuyến đi.
                      </span>
                    </div>
                  </div>
                )}

                {/* Specification details */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    Thông tin yêu cầu đã gửi
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <InfoRow label="Điểm đến" value={req.destinations} />
                    <InfoRow label="Ngày đi" value={formatDate(req.departureDate)} />
                    <InfoRow label="Ngày về" value={formatDate(req.returnDate)} />
                    <InfoRow label="Số người" value={`${req.numberOfPeople} người`} />
                    {req.budgetPerPerson && (
                      <InfoRow
                        label="Ngân sách dự kiến"
                        value={`${Number(req.budgetPerPerson).toLocaleString("vi-VN")} ₫ / người`}
                      />
                    )}
                    {req.hotelStars && <InfoRow label="Hạng khách sạn" value={`${req.hotelStars} sao`} />}
                    {req.businessName && <InfoRow label="Doanh nghiệp" value={req.businessName} />}
                    <InfoRow label="Người liên hệ" value={req.contactName} />
                    <InfoRow label="SĐT liên hệ" value={req.contactPhone} />
                    <InfoRow label="Email" value={req.contactEmail} />
                    <InfoRow label="Công ty tiếp nhận" value={req.targetCompanyName} />
                    <InfoRow label="Ngày gửi" value={formatDate(req.createdAt)} />
                  </div>

                  {req.additionalInfo && (
                    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Ghi chú của bạn</p>
                      <p className="text-sm text-gray-700 italic">"{req.additionalInfo}"</p>
                    </div>
                  )}
                </div>

                {/* Company text response */}
                {(req.companyNote || req.quotedPricePerPerson) && (
                  <div className="bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-[#075985] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Phản hồi từ {req.targetCompanyName}
                    </p>
                    {req.companyNote && <p className="text-sm text-blue-800">{req.companyNote}</p>}
                    {req.quotedPricePerPerson && (
                      <p className="text-sm font-bold text-emerald-700">
                        Báo giá dự kiến: {formatVND(req.quotedPricePerPerson)} / người
                      </p>
                    )}
                    {req.responseAt && (
                      <p className="text-xs text-blue-400">
                        Cập nhật: {new Date(req.responseAt).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>
                )}

                {/* Cancel button */}
                {(req.status === "pending" || req.status === "reviewing") && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                      onClick={() => onCancel(req.id)}
                    >
                      Huỷ yêu cầu này
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
