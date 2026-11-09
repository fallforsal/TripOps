import React, { useState } from "react";
import { CustomTourRequest, Tour } from "@/app/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import {
  MapPin,
  Calendar,
  Users,
  Building2,
  Mail,
  Phone,
  Wallet,
  Star,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Building,
  Utensils,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { DesignRequestAgencyActions, type DesignRequestDecision } from "@/app/components/agency/DesignRequestAgencyActions";

export interface CustomRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: CustomTourRequest | null;
  matchingTour?: Tour | null;
  userRole?: "customer" | "agency";
  onStartDesignTour?: (req: CustomTourRequest, existingTour?: Tour | null) => void;
  onViewTour?: (tour: Tour) => void;
  onCancelRequest?: (requestId: string) => Promise<void> | void;
  onBookTour?: (tour: Tour) => Promise<void> | void;
  agencyActionBusy?: boolean;
  onAgencyDecision?: (request: CustomTourRequest, decision: DesignRequestDecision) => Promise<void>;
}

const STATUS_CONFIG: Record<
  CustomTourRequest["status"],
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Chờ xử lý",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
  },
  reviewing: {
    label: "Đang xem xét",
    bg: "bg-sky-50",
    text: "text-[#075985]",
    border: "border-sky-200",
    icon: <Clock className="w-3.5 h-3.5 text-[#075985]" />,
  },
  designed: {
    label: "Đã có phương án tour",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-600" />,
  },
  quoted: {
    label: "Đã báo giá",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  },
  accepted: {
    label: "Khách chốt tour",
    bg: "bg-teal-50",
    text: "text-teal-800",
    border: "border-teal-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />,
  },
  rejected: {
    label: "Từ chối",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
  },
  cancelled: {
    label: "Đã hủy",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-300",
    icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />,
  },
};

function formatVND(n: number) {
  return (n || 0).toLocaleString("vi-VN") + " ₫";
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    const parts = iso.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

function calculateDaysNights(startIso: string, endIso: string): string {
  try {
    const d1 = new Date(startIso);
    const d2 = new Date(endIso);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays <= 0 || isNaN(diffDays)) return "";
    if (diffDays === 1) return "(1 ngày trong ngày)";
    return `(${diffDays} ngày ${diffDays - 1} đêm)`;
  } catch {
    return "";
  }
}

export function CustomRequestDetailModal({
  isOpen,
  onClose,
  request,
  matchingTour,
  userRole = "customer",
  onStartDesignTour,
  onViewTour,
  onCancelRequest,
  onBookTour,
  agencyActionBusy = false,
  onAgencyDecision,
}: CustomRequestDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!request) return null;

  const cfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const daysNightsText = calculateDaysNights(request.departureDate, request.returnDate);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Đã sao chép ${fieldName}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const parsedBudget = request.budgetPerPerson ? Number(request.budgetPerPerson) : 0;
  const parsedPeople = request.numberOfPeople ? Number(request.numberOfPeople) : 0;
  const totalEstimatedBudget = parsedBudget > 0 && parsedPeople > 0 ? parsedBudget * parsedPeople : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl w-full max-w-[95vw] bg-white rounded-2xl border border-[#CBD5E1] p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-[#F0F9FF] border-b border-[#CBD5E1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[#075985] border border-sky-200 flex items-center justify-center shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Hồ sơ yêu cầu thiết kế tour #{request.id}
                </DialogTitle>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                >
                  {cfg.icon}
                  {cfg.label}
                </span>
                {matchingTour && (
                  <span className="bg-[#E0F2FE] text-[#075985] text-xs font-mono font-bold px-2 py-0.5 rounded border border-sky-200">
                    Tour v{matchingTour.version || 1}
                  </span>
                )}
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Đơn vị nhận yêu cầu: <strong className="text-slate-700">{request.targetCompanyName || "Travel Agency"}</strong> · Gửi ngày: {formatDate(request.createdAt)}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-sm">
          {/* SECTION 1: ĐƠN VỊ LỮ HÀNH TIẾP NHẬN */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#075985]">
              <Building2 className="w-4 h-4 text-[#075985]" />
              <span>1. Đơn vị Lữ hành phụ trách (Travel Agency)</span>
            </div>

            <div className="text-xs bg-white p-3.5 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block font-medium">Công ty lữ hành:</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {request.targetCompanyName || "TripOps Travel"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: THÔNG TIN ĐƠN VỊ ĐẶT TOUR & NGƯỜI ĐẠI DIỆN */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#075985]">
              <Users className="w-4 h-4 text-[#075985]" />
              <span>2. Thông tin Đơn vị đặt tour & Người đại diện liên hệ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
              {/* Tên doanh nghiệp / đoàn thể */}
              <div className="sm:col-span-2">
                <span className="text-slate-400 block font-medium">Tên doanh nghiệp / Đoàn thể:</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {request.businessName || "Khách hàng cá nhân / Nhóm gia đình"}
                </span>
              </div>

              {/* Email công ty */}
              <div>
                <span className="text-slate-400 block font-medium">Email cơ quan / đoàn:</span>
                <span className="text-slate-800 font-medium block mt-0.5">
                  {request.businessEmail || "—"}
                </span>
              </div>

              {/* SĐT cơ quan */}
              <div>
                <span className="text-slate-400 block font-medium">Điện thoại cơ quan:</span>
                <span className="text-slate-800 font-medium block mt-0.5">
                  {request.businessPhone || "—"}
                </span>
              </div>

              {/* Người đại diện liên hệ */}
              <div>
                <span className="text-slate-400 block font-medium">Người đại diện liên hệ:</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {request.contactName}
                </span>
              </div>

              {/* SĐT di động */}
              <div>
                <span className="text-slate-400 block font-medium">Số điện thoại di động:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-[#075985]">
                    {request.contactPhone || "—"}
                  </span>
                  {request.contactPhone && (
                    <button
                      type="button"
                      onClick={() => handleCopy(request.contactPhone, "số điện thoại")}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                      title="Sao chép số điện thoại"
                    >
                      {copiedField === "số điện thoại" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Email người liên hệ */}
              <div className="sm:col-span-2">
                <span className="text-slate-400 block font-medium">Email người liên hệ:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={`mailto:${request.contactEmail}`}
                    className="text-xs font-semibold text-[#075985] hover:underline"
                  >
                    {request.contactEmail}
                  </a>
                  {request.contactEmail && (
                    <button
                      type="button"
                      onClick={() => handleCopy(request.contactEmail, "email")}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                      title="Sao chép email"
                    >
                      {copiedField === "email" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: THÔNG SỐ LỊCH TRÌNH & NHU CẦU DỊCH VỤ */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#075985]">
              <MapPin className="w-4 h-4 text-[#075985]" />
              <span>3. Thông số Lịch trình & Nhu cầu dịch vụ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
              {/* Điểm đến mong muốn */}
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="text-slate-400 block font-medium">Điểm đến mong muốn:</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#F97316] shrink-0" />
                  {request.destinations}
                </span>
              </div>

              {/* Thời gian dự kiến */}
              <div className="sm:col-span-2">
                <span className="text-slate-400 block font-medium">Thời gian dự kiến:</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(request.departureDate)}</span>
                  <span className="text-slate-400 font-normal">đến</span>
                  <span>{formatDate(request.returnDate)}</span>
                  {daysNightsText && (
                    <span className="text-xs text-[#075985] font-semibold ml-1">
                      {daysNightsText}
                    </span>
                  )}
                </div>
              </div>

              {/* Số lượng khách */}
              <div>
                <span className="text-slate-400 block font-medium">Số lượng khách:</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {request.numberOfPeople} người
                </span>
              </div>

              {/* Ngân sách dự kiến */}
              <div>
                <span className="text-slate-400 block font-medium">Ngân sách / một người:</span>
                <span className="text-sm font-extrabold text-[#075985] block mt-0.5">
                  {request.budgetPerPerson ? formatVND(Number(request.budgetPerPerson)) : "Chưa định mức"}
                </span>
              </div>

              {/* Tổng ngân sách dự kiến đoàn */}
              <div>
                <span className="text-slate-400 block font-medium">Tổng ngân sách dự toán đoàn:</span>
                <span className="text-sm font-extrabold text-emerald-700 block mt-0.5">
                  {totalEstimatedBudget > 0 ? formatVND(totalEstimatedBudget) : "Theo thỏa thuận"}
                </span>
              </div>

              {/* Tiêu chuẩn khách sạn */}
              <div>
                <span className="text-slate-400 block font-medium">Tiêu chuẩn khách sạn / lưu trú:</span>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 inline-block mt-0.5">
                  {request.hotelStars
                    ? request.hotelStars.includes("sao")
                      ? request.hotelStars
                      : `Khách sạn / Resort ${request.hotelStars} sao`
                    : "Theo tư vấn của Agency"}
                </span>
              </div>
            </div>

            {/* Ghi chú & Yêu cầu riêng */}
            {request.additionalInfo ? (
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1">
                <span className="text-xs font-semibold text-slate-700 block">
                  Sở thích ẩm thực, hoạt động đặc thù hoặc lưu ý riêng của đoàn:
                </span>
                <p className="text-xs text-slate-800 italic leading-relaxed bg-[#F8FAFC] p-3 rounded-md border border-slate-200">
                  "{request.additionalInfo}"
                </p>
              </div>
            ) : (
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-400 italic">
                Khách hàng không có ghi chú thêm về ẩm thực hoặc hoạt động đặc thù.
              </div>
            )}
          </div>

          {/* SECTION 4: PHẢN HỒI HOẶC PHƯƠNG ÁN TỪ TRAVEL AGENCY */}
          {(request.companyNote || request.quotedPricePerPerson || matchingTour) && (
            <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#075985]">
                <Sparkles className="w-4 h-4 text-[#075985]" />
                <span>4. Phản hồi & Phương án thiết kế từ Agency</span>
              </div>

              {request.companyNote && (
                <div className="bg-white p-3.5 rounded-lg border border-sky-100 text-xs text-[#075985] leading-relaxed">
                  <strong className="block text-slate-900 mb-0.5">Phản hồi từ công ty lữ hành:</strong>
                  {request.companyNote}
                </div>
              )}

              {request.quotedPricePerPerson && (
                <div className="bg-white p-3 rounded-lg border border-sky-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Báo giá đề xuất / khách:</span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {formatVND(request.quotedPricePerPerson)}
                  </span>
                </div>
              )}

              {matchingTour && (
                <div className="bg-white p-3.5 rounded-lg border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{matchingTour.name}</span>
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Phiên bản v{matchingTour.version || 1}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đơn giá: <strong className="text-[#075985]">{formatVND(matchingTour.price)}</strong> / khách · Lịch trình {matchingTour.itinerary?.length || 0} ngày
                    </p>
                  </div>

                  {onViewTour && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onClose();
                        onViewTour(matchingTour);
                      }}
                      className="bg-[#075985] hover:bg-[#F97316] text-white text-xs shrink-0"
                    >
                      Xem chi tiết tour
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-[#CBD5E1] text-slate-700 text-xs"
          >
            Đóng
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Agency Actions */}
            {userRole === "agency" && onAgencyDecision && (
              <DesignRequestAgencyActions
                request={request}
                hasTour={Boolean(matchingTour)}
                busy={agencyActionBusy}
                onDecide={onAgencyDecision}
              />
            )}
            {userRole === "agency" && onStartDesignTour && request.status !== "pending" && request.status !== "cancelled" && request.status !== "rejected" && (
              <Button
                type="button"
                disabled={agencyActionBusy}
                onClick={() => {
                  onClose();
                  onStartDesignTour(request, matchingTour || null);
                }}
                className="bg-[#075985] hover:bg-[#F97316] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{matchingTour ? "Sửa tour" : "Thiết kế"}</span>
              </Button>
            )}

            {/* Customer Actions */}
            {userRole === "customer" && (
              <>
                {matchingTour && onViewTour && (
                  <Button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewTour(matchingTour);
                    }}
                    className="bg-[#075985] hover:bg-[#F97316] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Xem chi tiết phương án</span>
                  </Button>
                )}

                {(request.status === "pending" || request.status === "reviewing") && onCancelRequest && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Bạn có chắc chắn muốn hủy yêu cầu thiết kế này?")) {
                        onClose();
                        onCancelRequest(request.id);
                      }
                    }}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs"
                  >
                    Hủy yêu cầu này
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
