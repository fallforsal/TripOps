import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  Users,
  Building2,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  Search,
  Check,
  X,
  Hotel,
  Utensils,
  ShieldCheck,
  Tag,
  MessageSquare,
  Bed,
  User as UserIcon,
  HelpCircle,
  ChevronRight,
  Info,
} from "lucide-react";
import { ProviderGroupReservationRequest, GroupGuestMember } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";

interface ProviderGroupRequestDetailPageProps {
  request: ProviderGroupReservationRequest;
  onBack: () => void;
  onApproveAndQuote: (
    requestId: string,
    quotedTotalPrice: number,
    providerNote: string
  ) => void;
  onRejectRequest: (requestId: string, rejectionReason: string) => void;
}

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function numberToVietnameseWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "";
  let n = Math.floor(num);
  if (n >= 1000000000) {
    const billions = Math.floor(n / 1000000000);
    const millions = Math.floor((n % 1000000000) / 1000000);
    return `${billions} tỷ ${millions > 0 ? millions + " triệu " : ""}đồng`;
  }
  if (n >= 1000000) {
    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    return `${millions} triệu ${thousands > 0 ? thousands + " nghìn " : ""}đồng`;
  }
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    return `${thousands} nghìn đồng`;
  }
  return `${n} đồng`;
}

export function ProviderGroupRequestDetailPage({
  request,
  onBack,
  onApproveAndQuote,
  onRejectRequest,
}: ProviderGroupRequestDetailPageProps) {
  const isRestaurant = request.serviceType === "restaurant" || Boolean(request.mealType);

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Form states
  const [quoteInputPrice, setQuoteInputPrice] = useState<string>(
    request.quotedTotalPrice ? request.quotedTotalPrice.toString() : ""
  );
  const [providerNote, setProviderNote] = useState<string>(
    request.providerNote ||
      (isRestaurant
        ? "Nhà hàng đã ghi nhận số lượng thành viên và các yêu cầu ăn uống/dị ứng của từng khách. Sẽ sắp xếp set ăn riêng theo đúng thực đơn và tiêu chuẩn phục vụ."
        : "Khách sạn đã xem danh sách đoàn và bố trí đủ phòng theo nguyện vọng ghép phòng của khách. Giá trọn gói toàn đoàn đã gồm buffet sáng và thuế VAT.")
  );
  const [quoteError, setQuoteError] = useState<string>("");

  const [rejectionReason, setRejectionReason] = useState<string>(
    request.rejectionReason || ""
  );
  const [rejectionError, setRejectionError] = useState<string>("");

  // Passenger list search term
  const [guestSearchTerm, setGuestSearchTerm] = useState("");

  const passengersList = request.passengers || [];

  // Filter passengers based on search input
  const filteredPassengers = useMemo(() => {
    return passengersList.filter((p) => {
      if (guestSearchTerm.trim()) {
        const term = guestSearchTerm.toLowerCase().trim();
        return (
          p.fullName.toLowerCase().includes(term) ||
          (p.identityCardNumber && p.identityCardNumber.toLowerCase().includes(term)) ||
          (p.roommateNote && p.roommateNote.toLowerCase().includes(term)) ||
          (p.dietaryNote && p.dietaryNote.toLowerCase().includes(term)) ||
          (p.note && p.note.toLowerCase().includes(term)) ||
          (p.tierName && p.tierName.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [passengersList, guestSearchTerm]);

  // Submit Approval
  const handleSubmitApproval = () => {
    const numPrice = Number(quoteInputPrice.replace(/\D/g, ""));
    if (!numPrice || numPrice <= 0) {
      setQuoteError("Vui lòng nhập giá tổng hợp lệ cho toàn bộ đoàn khách.");
      return;
    }

    onApproveAndQuote(request.id, numPrice, providerNote.trim());
    setShowApproveModal(false);
  };

  // Submit Rejection
  const handleSubmitRejection = () => {
    if (!rejectionReason.trim()) {
      setRejectionError("Vui lòng nhập lý do từ chối để thông báo cho Agency.");
      return;
    }

    onRejectRequest(request.id, rejectionReason.trim());
    setShowRejectModal(false);
  };

  const isConfirmed = request.status === "confirmed";
  const isRejected = request.status === "rejected";
  const isPending = request.status === "pending";
  const isQuoted = request.status === "quoted";
  const isCancelled = request.status === "cancelled";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Navigation & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách
          </Button>

          <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-gray-500 uppercase">
                Yêu cầu #{request.id}
              </span>
              <span className="text-gray-300">•</span>
              <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                Mã Booking: {request.bookingCode}
              </span>
              {isRestaurant ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <Utensils className="w-3.5 h-3.5" />
                  Dịch vụ Nhà hàng / Ẩm thực
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  <Hotel className="w-3.5 h-3.5" />
                  Dịch vụ Khách sạn Lưu trú
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 mt-1">
              {request.tourName}
            </h1>
          </div>
        </div>

        {/* Action Buttons if not cancelled */}
        {!isCancelled ? (
          <div className="flex items-center gap-2 self-end sm:self-center">
            {isPending || isQuoted ? (
              <>
                <Button
                  onClick={() => {
                    setQuoteError("");
                    setShowApproveModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Xác nhận & Báo giá
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectionError("");
                    setShowRejectModal(true);
                  }}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs h-9 px-4 rounded-xl gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Từ chối
                </Button>
              </>
            ) : isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đã xác nhận phục vụ
              </span>
            ) : isRejected ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600" />
                Đã từ chối tiếp nhận
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700 border border-gray-300">
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              Yêu cầu đã hủy
            </span>
          </div>
        )}
      </div>

      {/* Cancellation Banner */}
      {isCancelled && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Yêu cầu này đã bị hủy trên hệ thống</h4>
            <p className="text-xs leading-relaxed text-rose-700">
              {request.cancellationReason || "Đoàn khách hoặc Agency đã hủy booking liên quan. Dịch vụ không cần tiếp tục giữ chỗ."}
            </p>
          </div>
        </div>
      )}

      {/* 3 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Agency Info */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-sky-600" />
            <span>Công ty Lữ hành gửi yêu cầu</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              {request.agencyLogo ? (
                <img
                  src={request.agencyLogo}
                  alt={request.agencyName}
                  className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-extrabold text-sm text-gray-900 leading-snug">
                  {request.agencyName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Đại diện: <strong>{request.agencyContactName}</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a href={`tel:${request.agencyPhone}`} className="hover:text-sky-700 font-medium">
                  {request.agencyPhone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a href={`mailto:${request.agencyEmail}`} className="hover:text-sky-700 font-medium truncate">
                  {request.agencyEmail}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Service Details (Hotel vs Restaurant) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            {isRestaurant ? (
              <>
                <Utensils className="w-4 h-4 text-amber-600" />
                <span>Chi tiết Bữa ăn & Nhà hàng</span>
              </>
            ) : (
              <>
                <Hotel className="w-4 h-4 text-sky-600" />
                <span>Chi tiết Lưu trú & Khách sạn</span>
              </>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <p className="text-gray-500 text-[11px]">Dịch vụ yêu cầu:</p>
              <p className="font-bold text-sm text-gray-900 mt-0.5">{request.serviceName}</p>
            </div>

            {isRestaurant ? (
              // RESTAURANT DETAILS (No check-in/out, no nights, no rooms)
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Ngày phục vụ</span>
                    <strong className="text-gray-900 text-xs">
                      {formatDate(request.servingDate || request.checkInDate)}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Bữa ăn</span>
                    <strong className="text-amber-900 text-xs uppercase">
                      {request.mealType === "breakfast" ? "Bữa Sáng" : request.mealType === "lunch" ? "Bữa Trưa" : "Bữa Tối"}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span className="text-gray-500">Giờ ăn phục vụ:</span>
                  <span className="font-bold text-gray-900">{request.serviceTime || "Chưa xác định"}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span className="text-gray-500">Quy mô đoàn:</span>
                  <span className="font-bold text-gray-900">{request.numberOfGuests} khách</span>
                </div>

                {request.menuName && (
                  <div className="text-xs text-gray-700">
                    <span className="text-gray-500 block text-[11px]">Thực đơn đề xuất:</span>
                    <span className="font-semibold text-gray-900">{request.menuName}</span>
                  </div>
                )}

                {request.specialRequests && (
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-600 text-[11px] italic border border-gray-100">
                    "{request.specialRequests}"
                  </div>
                )}
              </div>
            ) : (
              // HOTEL DETAILS (Check-in, Check-out, Nights, Rooms)
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-100">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Nhận phòng</span>
                    <strong className="text-gray-900 text-xs">{formatDate(request.checkInDate)}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-100">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Trả phòng</span>
                    <strong className="text-gray-900 text-xs">{formatDate(request.checkOutDate)}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span className="text-gray-500">Thời gian lưu trú:</span>
                  <span className="font-bold text-gray-900">{request.numberOfNights} đêm</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span className="text-gray-500">Quy mô đoàn:</span>
                  <span className="font-bold text-gray-900">{request.numberOfGuests} khách ({request.adultGuests} NL, {request.childGuests} TE)</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span className="text-gray-500">Hạng phòng gợi ý:</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[180px]">{request.roomTypeRequested || "Deluxe / Superior"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Quotation & Response Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>
              {isRestaurant ? "Báo giá bữa ăn cho đoàn" : "Báo giá trọn gói toàn đoàn"}
            </span>
          </div>

          {isConfirmed && request.quotedTotalPrice ? (
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {isRestaurant ? "Tổng tiền bữa ăn đã báo" : "Tổng tiền lưu trú đã báo"}
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                  {formatVND(request.quotedTotalPrice)}
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold italic mt-0.5">
                  ({numberToVietnameseWords(request.quotedTotalPrice)})
                </div>
              </div>
              {request.providerNote && (
                <p className="text-xs text-gray-600 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  "{request.providerNote}"
                </p>
              )}
            </div>
          ) : isQuoted && request.quotedTotalPrice ? (
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                  Đã gửi báo giá (Chưa giữ chỗ)
                </div>
                <div className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">
                  {formatVND(request.quotedTotalPrice)}
                </div>
              </div>
              {request.providerNote && (
                <p className="text-xs text-gray-600 italic">
                  "{request.providerNote}"
                </p>
              )}
            </div>
          ) : isRejected ? (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1">
              <span className="font-bold block text-rose-800">Đã từ chối tiếp nhận:</span>
              <p className="text-gray-700 italic">"{request.rejectionReason || "Không còn khả năng phục vụ theo yêu cầu"}"</p>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              <p className="text-gray-500 leading-relaxed">
                {isRestaurant
                  ? "Chưa có báo giá. Hãy xem danh sách khách và yêu cầu ăn uống dị ứng bên dưới rồi bấm \"Xác nhận & Báo giá\"."
                  : "Chưa có báo giá. Hãy xem danh sách khách và nguyện vọng xếp phòng bên dưới rồi bấm \"Xác nhận & Báo giá\"."}
              </p>
              {!isCancelled && (
                <Button
                  size="sm"
                  onClick={() => {
                    setQuoteError("");
                    setShowApproveModal(true);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-9 rounded-xl"
                >
                  Nhập báo giá tổng ngay
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PASSENGER ROSTER SECTION */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                isRestaurant ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
              }`}>
                {isRestaurant ? <Utensils className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              </div>
              <h3 className="font-black text-base sm:text-lg text-gray-900">
                {isRestaurant
                  ? `Danh sách Thành viên & Yêu cầu Ăn uống (${passengersList.length} khách)`
                  : `Danh sách Đoàn khách & Nguyện vọng Xếp phòng (${passengersList.length} khách)`}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1 pl-10">
              {isRestaurant
                ? "Nhà hàng xem chi tiết từng thành viên và yêu cầu ăn uống / dị ứng thực phẩm để chuẩn bị món ăn an toàn, chu đáo."
                : "Khách sạn xem thông tin thành viên và ghi chú muốn ở cùng ai để tự phân bổ số lượng phòng phù hợp."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap pl-10 md:pl-0">
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs">
              Quy mô: <strong>{request.numberOfGuests}</strong> khách
            </span>
          </div>
        </div>

        {/* Search bar inside passenger table */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
            <span>Tất cả thành viên trong đoàn</span>
            <span className="px-2 py-0.5 rounded-md bg-white text-gray-900 font-black shadow-2xs">
              {filteredPassengers.length} / {passengersList.length}
            </span>
          </div>

          <div className="relative min-w-[240px] sm:w-80">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={guestSearchTerm}
              onChange={(e) => setGuestSearchTerm(e.target.value)}
              placeholder={isRestaurant ? "Tìm theo tên khách, yêu cầu ăn uống, dị ứng..." : "Tìm theo tên khách, CCCD, ở cùng ai..."}
              className="pl-8 text-xs h-8 rounded-xl border-gray-200 focus:border-[#075985]"
            />
            {guestSearchTerm && (
              <button
                onClick={() => setGuestSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Passengers Table */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">Thành viên đoàn</th>
                  <th className="py-3 px-3">Đối tượng</th>
                  {isRestaurant ? (
                    // RESTAURANT COLUMNS (No CCCD, No roommateNote)
                    <>
                      <th className="py-3 px-4 min-w-[260px] text-amber-900 font-black">
                        Yêu cầu ăn uống / Dị ứng thực phẩm
                      </th>
                      <th className="py-3 px-4">Ghi chú cá nhân</th>
                    </>
                  ) : (
                    // HOTEL COLUMNS (CCCD, RoommateNote)
                    <>
                      <th className="py-3 px-4">CCCD / Hộ chiếu</th>
                      <th className="py-3 px-4 min-w-[280px]">Ghi chú muốn ở cùng với ai (Xếp phòng)</th>
                      <th className="py-3 px-4">Ghi chú cá nhân</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPassengers.length === 0 ? (
                  <tr>
                    <td colSpan={isRestaurant ? 5 : 6} className="py-8 text-center text-gray-400">
                      Không tìm thấy thành viên nào phù hợp với từ khóa tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredPassengers.map((guest, idx) => {
                    const participantSTT = guest.participantIndex || idx + 1;
                    const genderLabel =
                      guest.gender === "FEMALE" || guest.gender === "female"
                        ? "Nữ"
                        : guest.gender === "MALE" || guest.gender === "male"
                        ? "Nam"
                        : "Khác";

                    const isChild = guest.tierName?.toLowerCase().includes("trẻ") || false;

                    return (
                      <tr
                        key={guest.id || idx}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* 1. STT */}
                        <td className="py-3 px-3 text-center font-bold text-gray-400">
                          {participantSTT}
                        </td>

                        {/* 2. Họ và tên */}
                        <td className="py-3 px-4 font-bold text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span>{guest.fullName}</span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              ({genderLabel})
                            </span>
                          </div>
                        </td>

                        {/* 3. Phân khúc đối tượng */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isChild
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-sky-100 text-sky-900 border border-sky-200"
                            }`}
                          >
                            {guest.tierName || "Người lớn"}
                          </span>
                        </td>

                        {isRestaurant ? (
                          // RESTAURANT ROW CELLS
                          <>
                            {/* Yêu cầu ăn uống / Dị ứng thực phẩm */}
                            <td className="py-3 px-4">
                              {guest.dietaryNote ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-950 border border-amber-300">
                                  <Utensils className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                  {guest.dietaryNote}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Bình thường (Không yêu cầu riêng)</span>
                              )}
                            </td>

                            {/* Ghi chú cá nhân */}
                            <td className="py-3 px-4 text-gray-600">
                              {guest.note ? (
                                <span className="text-xs text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                  {guest.note}
                                </span>
                              ) : (
                                <span className="text-gray-300 italic">—</span>
                              )}
                            </td>
                          </>
                        ) : (
                          // HOTEL ROW CELLS
                          <>
                            {/* CCCD / Hộ chiếu */}
                            <td className="py-3 px-4 font-mono font-medium text-gray-700">
                              {guest.identityCardNumber || "—"}
                            </td>

                            {/* Ghi chú muốn ở cùng với ai (Xếp phòng) */}
                            <td className="py-3 px-4">
                              {guest.roommateNote ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-900 border border-teal-300">
                                  <Bed className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                  {guest.roommateNote}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Tự do ghép phòng theo sắp xếp</span>
                              )}
                            </td>

                            {/* Ghi chú cá nhân */}
                            <td className="py-3 px-4 text-gray-600">
                              {guest.note ? (
                                <span className="text-xs text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                  {guest.note}
                                </span>
                              ) : (
                                <span className="text-gray-300 italic">—</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* APPROVAL / QUOTATION MODAL */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Check className="w-5 h-5 text-emerald-600" />
              {isRestaurant ? "Xác nhận Phục vụ & Gửi Báo giá Bữa ăn" : "Xác nhận & Báo giá Lưu trú Toàn đoàn"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {isRestaurant
                ? `Nhà hàng: ${request.serviceName} · Bữa ${request.mealType === "breakfast" ? "Sáng" : request.mealType === "lunch" ? "Trưa" : "Tối"} (${request.numberOfGuests} khách)`
                : `Khách sạn: ${request.serviceName} · ${request.numberOfNights} đêm (${request.numberOfGuests} khách)`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-gray-800 text-xs">
                {isRestaurant ? "Tổng giá tiền cho toàn bộ bữa ăn của đoàn (VNĐ) *" : "Tổng giá tiền trọn gói lưu trú toàn đoàn (VNĐ) *"}
              </Label>
              <Input
                type="text"
                value={quoteInputPrice}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setQuoteInputPrice(raw ? Number(raw).toLocaleString("vi-VN") : "");
                  setQuoteError("");
                }}
                placeholder="VD: 5.000.000"
                className="text-sm font-black text-emerald-700"
              />
              <p className="text-[11px] text-gray-500">
                Lưu ý: Báo giá tổng cho toàn bộ đoàn {request.numberOfGuests} khách, không phải giá một người.
              </p>
              {quoteError && <p className="text-rose-600 font-semibold">{quoteError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-gray-800 text-xs">
                Ghi chú gửi kèm cho Agency
              </Label>
              <Textarea
                value={providerNote}
                onChange={(e) => setProviderNote(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setShowApproveModal(false)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleSubmitApproval} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Xác nhận & Gửi báo giá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECTION MODAL */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700">
              <X className="w-5 h-5 text-rose-600" />
              Từ chối tiếp nhận yêu cầu #{request.id}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Agency sẽ nhận được lý do từ chối để chủ động tìm phương án thay thế cho đoàn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-gray-800 text-xs">
                Lý do từ chối *
              </Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setRejectionError("");
                }}
                placeholder={isRestaurant ? "VD: Nhà hàng đã kín chỗ vào khung giờ 11:30 - 13:00 ngày này..." : "VD: Khách sạn đã kín phòng trong giai đoạn này..."}
                rows={3}
                className="text-xs"
              />
              {rejectionError && <p className="text-rose-600 font-semibold">{rejectionError}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setShowRejectModal(false)}>
              Quay lại
            </Button>
            <Button size="sm" onClick={handleSubmitRejection} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
