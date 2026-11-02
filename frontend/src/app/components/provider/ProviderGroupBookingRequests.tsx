import { useState, useMemo } from "react";
import {
  BedDouble,
  Calendar,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  Search,
  Sparkles,
  Check,
  X,
  Hotel,
  Utensils,
  ShieldCheck,
  Tag,
  MessageSquare,
  ArrowRight,
  ListFilter,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { ProviderGroupReservationRequest, Service } from "@/app/types";
import { ProviderGroupRequestDetailPage } from "./ProviderGroupRequestDetailPage";
import { Button } from "@/app/components/ui/button";
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

interface ProviderGroupBookingRequestsProps {
  requests: ProviderGroupReservationRequest[];
  providerServices?: Service[];
  currentProviderId?: string;
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

export function ProviderGroupBookingRequests({
  requests,
  providerServices = [],
  currentProviderId,
  onApproveAndQuote,
  onRejectRequest,
}: ProviderGroupBookingRequestsProps) {
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "pending" | "confirmed" | "quoted" | "rejected" | "cancelled"
  >("ALL");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<
    "all" | "hotel" | "restaurant"
  >("all");

  // State to manage dedicated standalone detail page
  const [viewingRequestId, setViewingRequestId] = useState<string | null>(null);

  // Quick modals for list actions
  const [approvingRequest, setApprovingRequest] =
    useState<ProviderGroupReservationRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] =
    useState<ProviderGroupReservationRequest | null>(null);

  // Form states for Approval & Quoting
  const [quoteInputPrice, setQuoteInputPrice] = useState<string>("");
  const [providerNote, setProviderNote] = useState<string>("");
  const [quoteError, setQuoteError] = useState<string>("");

  // Form states for Rejection
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionError, setRejectionError] = useState<string>("");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper check for request types
  const isHotelReq = (r: ProviderGroupReservationRequest) =>
    r.serviceType === "hotel" || (!r.serviceType && !r.mealType);
  const isRestaurantReq = (r: ProviderGroupReservationRequest) =>
    r.serviceType === "restaurant" || Boolean(r.mealType);

  // Determine available service types for this provider
  const hasHotelServices = useMemo(() => {
    const fromSvc = providerServices.some(
      (s) =>
        s.category === "hotel" ||
        (s.subCategory && s.subCategory.toLowerCase().includes("hotel"))
    );
    const fromReq = requests.some(isHotelReq);
    return fromSvc || fromReq;
  }, [providerServices, requests]);

  const hasRestaurantServices = useMemo(() => {
    const fromSvc = providerServices.some(
      (s) =>
        s.category === "restaurant" ||
        (s.category === "fnb" && s.subCategory === "restaurant") ||
        (s.subCategory &&
          (s.subCategory.toLowerCase().includes("ẩm thực") ||
            s.subCategory.toLowerCase().includes("nhà hàng") ||
            s.subCategory.toLowerCase().includes("cơm niêu") ||
            s.subCategory.toLowerCase().includes("lẩu")))
    );
    const fromReq = requests.some(isRestaurantReq);
    return fromSvc || fromReq;
  }, [providerServices, requests]);

  const hasBothTypes = hasHotelServices && hasRestaurantServices;

  // Counts by type
  const hotelCount = useMemo(() => requests.filter(isHotelReq).length, [requests]);
  const restaurantCount = useMemo(
    () => requests.filter(isRestaurantReq).length,
    [requests]
  );

  // Requests filtered by service type first (for status counts)
  const requestsForType = useMemo(() => {
    if (!hasBothTypes) {
      if (hasHotelServices) return requests.filter(isHotelReq);
      if (hasRestaurantServices) return requests.filter(isRestaurantReq);
      return requests;
    }
    if (serviceTypeFilter === "hotel") return requests.filter(isHotelReq);
    if (serviceTypeFilter === "restaurant") return requests.filter(isRestaurantReq);
    return requests;
  }, [requests, hasBothTypes, hasHotelServices, hasRestaurantServices, serviceTypeFilter]);

  // Status counts based on the active service type
  const statusStats = useMemo(() => {
    const all = requestsForType.length;
    const pending = requestsForType.filter((r) => r.status === "pending").length;
    const quoted = requestsForType.filter((r) => r.status === "quoted").length;
    const confirmed = requestsForType.filter((r) => r.status === "confirmed").length;
    const rejected = requestsForType.filter((r) => r.status === "rejected").length;
    const cancelled = requestsForType.filter((r) => r.status === "cancelled").length;
    return { all, pending, quoted, confirmed, rejected, cancelled };
  }, [requestsForType]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const confirmed = requests.filter((r) => r.status === "confirmed").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const totalQuotedRevenue = requests
      .filter((r) => r.status === "confirmed" && r.quotedTotalPrice)
      .reduce((sum, r) => sum + (r.quotedTotalPrice || 0), 0);

    return { total, pending, confirmed, rejected, totalQuotedRevenue };
  }, [requests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requestsForType.filter((r) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && r.status !== statusFilter) {
        return false;
      }

      // 2. Search Query
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;

      const matchCode = r.bookingCode.toLowerCase().includes(term);
      const matchTour = r.tourName.toLowerCase().includes(term);
      const matchAgency = r.agencyName.toLowerCase().includes(term);
      const matchService = r.serviceName.toLowerCase().includes(term);
      const matchMenu = r.menuName ? r.menuName.toLowerCase().includes(term) : false;

      return matchCode || matchTour || matchAgency || matchService || matchMenu;
    });
  }, [requestsForType, statusFilter, searchTerm]);

  // Open Approval modal
  const handleOpenApproveModal = (req: ProviderGroupReservationRequest) => {
    setApprovingRequest(req);
    setQuoteInputPrice(
      req.quotedTotalPrice ? req.quotedTotalPrice.toString() : ""
    );
    const isRest = isRestaurantReq(req);
    setProviderNote(
      req.providerNote ||
        (isRest
          ? "Nhà hàng đã xác nhận tiếp nhận đặt bàn và chuẩn bị set ăn riêng theo đúng yêu cầu ăn uống/dị ứng của đoàn."
          : "Khách sạn đã xem danh sách đoàn và bố trí phòng theo đúng nguyện vọng ghép phòng của khách. Giá trọn gói toàn đoàn đã gồm buffet sáng và thuế VAT.")
    );
    setQuoteError("");
  };

  // Open Rejection modal
  const handleOpenRejectModal = (req: ProviderGroupReservationRequest) => {
    setRejectingRequest(req);
    setRejectionReason(req.rejectionReason || "");
    setRejectionError("");
  };

  // Submit Approval & Quotation
  const handleSubmitApproval = () => {
    if (!approvingRequest) return;
    const numPrice = Number(quoteInputPrice.replace(/\D/g, ""));
    if (!numPrice || numPrice <= 0) {
      setQuoteError("Vui lòng nhập giá tổng hợp lệ cho toàn bộ đoàn khách.");
      return;
    }

    onApproveAndQuote(approvingRequest.id, numPrice, providerNote.trim());
    showToast(
      `Đã phê duyệt và gửi báo giá ${formatVND(numPrice)} cho đoàn ${approvingRequest.agencyName} thành công!`
    );
    setApprovingRequest(null);
  };

  // Submit Rejection
  const handleSubmitRejection = () => {
    if (!rejectingRequest) return;
    if (!rejectionReason.trim()) {
      setRejectionError("Vui lòng nhập lý do từ chối để thông báo cho Agency.");
      return;
    }

    onRejectRequest(rejectingRequest.id, rejectionReason.trim());
    showToast(
      `Đã từ chối yêu cầu của đoàn ${rejectingRequest.agencyName}.`,
      "error"
    );
    setRejectingRequest(null);
  };

  // If viewing a standalone detail page, render it directly
  if (viewingRequestId) {
    const targetRequest = requests.find((r) => r.id === viewingRequestId);
    if (targetRequest) {
      return (
        <ProviderGroupRequestDetailPage
          request={targetRequest}
          onBack={() => setViewingRequestId(null)}
          onApproveAndQuote={(id, price, note) => {
            onApproveAndQuote(id, price, note);
            showToast("Đã cập nhật báo giá và xác nhận yêu cầu thành công!");
          }}
          onRejectRequest={(id, reason) => {
            onRejectRequest(id, reason);
            showToast("Đã từ chối yêu cầu dịch vụ.", "error");
          }}
        />
      );
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-white text-xs font-bold animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Yêu cầu Dịch vụ Đoàn
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#E0F2FE] text-[#075985] border border-sky-200">
              {stats.pending} yêu cầu chờ xử lý
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Tiếp nhận yêu cầu dịch vụ khách sạn lưu trú và nhà hàng ẩm thực từ các Công ty Lữ hành, kiểm tra danh sách đoàn và báo giá xác nhận.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span className="font-semibold">Tổng yêu cầu</span>
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.total}</div>
          <p className="text-[11px] text-gray-400">Tất cả dịch vụ được điều phối</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-800 text-xs">
            <span className="font-bold">Chờ phản hồi</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">{stats.pending}</div>
          <p className="text-[11px] text-amber-700">Cần xem xét và gửi báo giá</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800 text-xs">
            <span className="font-bold">Đã xác nhận</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900">{stats.confirmed}</div>
          <p className="text-[11px] text-emerald-700">Đã chốt phục vụ đoàn</p>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sky-800 text-xs">
            <span className="font-bold">Doanh số đã chốt</span>
            <DollarSign className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-900">
            {formatVND(stats.totalQuotedRevenue)}
          </div>
          <p className="text-[11px] text-sky-700">Từ các đoàn đã xác nhận</p>
        </div>
      </div>

      {/* FILTER & TAB BAR */}
      <div className="bg-white rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Service Type Tabs - RENDER ONLY WHEN PROVIDER HAS BOTH HOTEL & RESTAURANT */}
        {hasBothTypes && (
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 overflow-x-auto">
            <button
              type="button"
              onClick={() => setServiceTypeFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                serviceTypeFilter === "all"
                  ? "bg-[#075985] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>Tất cả dịch vụ</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                serviceTypeFilter === "all" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {requests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setServiceTypeFilter("hotel")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                serviceTypeFilter === "hotel"
                  ? "bg-sky-700 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Hotel className="w-3.5 h-3.5" />
              <span>Khách sạn lưu trú</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                serviceTypeFilter === "hotel" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {hotelCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setServiceTypeFilter("restaurant")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                serviceTypeFilter === "restaurant"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Nhà hàng ẩm thực</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                serviceTypeFilter === "restaurant" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {restaurantCount}
              </span>
            </button>
          </div>
        )}

        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "Tất cả", count: statusStats.all },
              { id: "pending", label: "Chờ phản hồi", count: statusStats.pending },
              { id: "quoted", label: "Đã báo giá", count: statusStats.quoted },
              { id: "confirmed", label: "Đã xác nhận", count: statusStats.confirmed },
              { id: "rejected", label: "Từ chối", count: statusStats.rejected },
              { id: "cancelled", label: "Đã hủy", count: statusStats.cancelled },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-gray-900 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã booking, tour, agency..."
              className="pl-9 text-xs h-9 rounded-xl border-gray-200 focus:border-[#075985]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-700 text-sm">
                Không tìm thấy yêu cầu dịch vụ nào
              </h3>
              <p className="text-xs text-gray-400">
                {searchTerm || statusFilter !== "ALL" || serviceTypeFilter !== "all"
                  ? "Hãy thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm."
                  : "Chưa có yêu cầu dịch vụ nào được điều phối từ các Công ty Lữ hành."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const isPending = req.status === "pending";
              const isQuoted = req.status === "quoted";
              const isConfirmed = req.status === "confirmed";
              const isRejected = req.status === "rejected";
              const isCancelled = req.status === "cancelled";
              const isRest = isRestaurantReq(req);

              return (
                <div
                  key={req.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all hover:shadow-xs space-y-3 ${
                    isCancelled
                      ? "bg-gray-50/70 border-gray-200 opacity-80"
                      : isPending
                      ? "bg-amber-50/20 border-amber-200/80"
                      : isConfirmed
                      ? "bg-emerald-50/20 border-emerald-200/80"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {/* Top line: Type Badge, ID, Tour, and Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isRest ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <Utensils className="w-3.5 h-3.5 text-amber-700" />
                          Nhà hàng ẩm thực
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-200">
                          <Hotel className="w-3.5 h-3.5 text-sky-700" />
                          Khách sạn lưu trú
                        </span>
                      )}

                      <span className="font-mono text-xs font-bold text-gray-500">
                        #{req.id}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {req.bookingCode}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 truncate max-w-xs sm:max-w-md">
                        {req.tourName}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Chờ phản hồi
                        </span>
                      )}
                      {isQuoted && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-sky-100 text-sky-900 border border-sky-300">
                          <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                          Đã gửi báo giá
                        </span>
                      )}
                      {isConfirmed && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đã xác nhận phục vụ
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Từ chối tiếp nhận
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-gray-200 text-gray-700 border border-gray-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-gray-500" />
                          Yêu cầu đã hủy
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle content: Service name, details, Agency info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-400 font-semibold uppercase">Dịch vụ & Đoàn</p>
                      <h4 className="font-extrabold text-sm text-gray-900 leading-snug">
                        {req.serviceName}
                      </h4>
                      <p className="text-xs text-gray-600">
                        Quy mô: <strong>{req.numberOfGuests}</strong> khách
                        {req.passengers && req.passengers.length > 0 && (
                          <span className="text-gray-400 ml-1">({req.passengers.length} thành viên trong danh sách)</span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-400 font-semibold uppercase">
                        {isRest ? "Thời gian phục vụ bữa ăn" : "Lịch trình lưu trú"}
                      </p>
                      {isRest ? (
                        <div className="text-xs text-gray-700 space-y-0.5">
                          <p>
                            Ngày: <strong>{formatDate(req.servingDate || req.checkInDate)}</strong>
                          </p>
                          <p className="text-amber-900 font-bold">
                            Bữa {req.mealType === "breakfast" ? "Sáng" : req.mealType === "lunch" ? "Trưa" : "Tối"}
                            {req.serviceTime && ` (Giờ: ${req.serviceTime})`}
                          </p>
                          {req.menuName && (
                            <p className="text-gray-500 text-[11px] truncate">
                              Menu: {req.menuName}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-700 space-y-0.5">
                          <p>
                            {formatDate(req.checkInDate)} → {formatDate(req.checkOutDate)}
                          </p>
                          <p className="text-sky-900 font-bold">
                            {req.numberOfNights} đêm · {req.roomTypeRequested || "Deluxe / Superior"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-400 font-semibold uppercase">Đơn vị gửi yêu cầu</p>
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {req.agencyName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {req.agencyContactName} · <a href={`tel:${req.agencyPhone}`} className="hover:text-sky-700">{req.agencyPhone}</a>
                      </p>
                    </div>
                  </div>

                  {/* Dietary Note Summary Snippet for Restaurant */}
                  {isRest && req.dietaryNotes && (
                    <div className="text-xs p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-2">
                      <Utensils className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <strong>Lưu ý ăn uống:</strong> {req.dietaryNotes}
                      </div>
                    </div>
                  )}

                  {/* Quoted Price Banner if available */}
                  {req.quotedTotalPrice && (
                    <div className="text-xs p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                      <span className="font-semibold text-emerald-800">
                        {isRest ? "Báo giá bữa ăn toàn đoàn:" : "Báo giá lưu trú toàn đoàn:"}
                      </span>
                      <strong className="text-emerald-700 text-sm font-black">
                        {formatVND(req.quotedTotalPrice)}
                      </strong>
                    </div>
                  )}

                  {/* Rejection / Cancellation Snippets */}
                  {isRejected && req.rejectionReason && (
                    <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <strong>Lý do từ chối:</strong> {req.rejectionReason}
                    </p>
                  )}
                  {isCancelled && req.cancellationReason && (
                    <p className="text-xs text-gray-600 bg-gray-100 p-2 rounded-lg border border-gray-200">
                      <strong>Lý do hủy:</strong> {req.cancellationReason}
                    </p>
                  )}

                  {/* Bottom Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                    <span className="text-[11px] text-gray-400">
                      Gửi lúc: {formatDate(req.createdAt)}
                    </span>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingRequestId(req.id)}
                        className="text-xs font-semibold text-[#075985] border-gray-300 hover:bg-[#F0F9FF] h-8 px-3 rounded-xl gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Xem chi tiết & danh sách đoàn
                      </Button>

                      {!isCancelled && (isPending || isQuoted) && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleOpenApproveModal(req)}
                            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 rounded-xl shadow-2xs gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Xác nhận & Báo giá
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRejectModal(req)}
                            className="text-xs font-semibold border-rose-300 text-rose-700 hover:bg-rose-50 h-8 px-2.5 rounded-xl gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Từ chối
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK APPROVAL & QUOTE MODAL */}
      <Dialog open={Boolean(approvingRequest)} onOpenChange={(open) => !open && setApprovingRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Check className="w-5 h-5 text-emerald-600" />
              {approvingRequest && isRestaurantReq(approvingRequest)
                ? "Xác nhận Phục vụ & Báo giá Bữa ăn"
                : "Xác nhận & Báo giá Lưu trú Đoàn"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Mã booking: #{approvingRequest?.bookingCode} · Tour: {approvingRequest?.tourName}
            </DialogDescription>
          </DialogHeader>

          {approvingRequest && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1 border border-gray-200">
                <p className="font-bold text-gray-900">{approvingRequest.serviceName}</p>
                <p className="text-gray-500">
                  Agency: <strong>{approvingRequest.agencyName}</strong> ({approvingRequest.agencyContactName} · {approvingRequest.agencyPhone})
                </p>
                <p className="text-gray-500">
                  Quy mô đoàn: <strong>{approvingRequest.numberOfGuests} khách</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-gray-800 text-xs">
                  {isRestaurantReq(approvingRequest)
                    ? "Tổng giá tiền cho toàn bộ bữa ăn của đoàn (VNĐ) *"
                    : "Tổng giá tiền trọn gói lưu trú cho đoàn (VNĐ) *"}
                </Label>
                <Input
                  type="text"
                  value={quoteInputPrice}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setQuoteInputPrice(raw ? Number(raw).toLocaleString("vi-VN") : "");
                    setQuoteError("");
                  }}
                  placeholder="VD: 4.500.000"
                  className="text-sm font-black text-emerald-700"
                />
                <p className="text-[11px] text-gray-500">
                  Giá tổng cho toàn bộ đoàn {approvingRequest.numberOfGuests} khách, không phải giá một người.
                </p>
                {quoteError && <p className="text-rose-600 font-semibold">{quoteError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-gray-800 text-xs">
                  Ghi chú phản hồi cho Agency
                </Label>
                <Textarea
                  value={providerNote}
                  onChange={(e) => setProviderNote(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setApprovingRequest(null)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleSubmitApproval} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Xác nhận & Gửi báo giá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUICK REJECTION MODAL */}
      <Dialog open={Boolean(rejectingRequest)} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700">
              <X className="w-5 h-5 text-rose-600" />
              Từ chối tiếp nhận yêu cầu #{rejectingRequest?.id}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Agency sẽ nhận được lý do từ chối để kịp thời tìm đối tác dịch vụ thay thế.
            </DialogDescription>
          </DialogHeader>

          {rejectingRequest && (
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
                  placeholder={
                    isRestaurantReq(rejectingRequest)
                      ? "VD: Nhà hàng đã kín bàn vào khung giờ này..."
                      : "VD: Khách sạn đã kín phòng trong thời gian này..."
                  }
                  rows={3}
                  className="text-xs"
                />
                {rejectionError && <p className="text-rose-600 font-semibold">{rejectionError}</p>}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setRejectingRequest(null)}>
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
