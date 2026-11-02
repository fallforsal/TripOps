import { useState } from "react";
import { Tour, Service } from "@/app/types";
import {
  Compass,
  MapPin,
  Calendar,
  Users,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Building2,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  Hotel,
  Utensils,
  ShieldAlert,
  ArrowRight,
  Info,
  DollarSign,
  Layers,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { TourDetailPage } from "@/app/components/user/TourDetailPage";

interface AdminTourModerationProps {
  tours: Tour[];
  services?: Service[];
  onToggleHideTour?: (tourId: string, reason?: string) => void;
  onDeleteTour?: (tourId: string) => void;
  onApproveTour?: (tourId: string) => void;
  onRejectTour?: (tourId: string, reason: string) => void;
}

export function AdminTourModeration({
  tours,
  services = [],
  onToggleHideTour,
  onDeleteTour,
}: AdminTourModerationProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "hidden">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTourForDetail, setSelectedTourForDetail] = useState<Tour | null>(null);
  const [hidingTour, setHidingTour] = useState<Tour | null>(null);
  const [deletingTour, setDeletingTour] = useState<Tour | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "info"; message: string } | null>(null);

  // If Admin selected a tour to inspect details, render dedicated full detail page (trang riêng luôn)
  if (selectedTourForDetail) {
    const currentTour = tours.find((t) => t.id === selectedTourForDetail.id) || selectedTourForDetail;
    return (
      <TourDetailPage
        tour={currentTour}
        services={services}
        currentUser={null}
        isAdmin={true}
        onBack={() => setSelectedTourForDetail(null)}
        onToggleHideTour={(id, reason) => {
          onToggleHideTour?.(id, reason);
        }}
        onDeleteTour={(id) => {
          onDeleteTour?.(id);
          setSelectedTourForDetail(null);
        }}
      />
    );
  }

  // Quick reason suggestions for Admin when hiding inappropriate/troll tours
  const quickReasonSuggestions = [
    "Thông tin lộ trình sai lệch, nhảm nhí không đúng thực tế.",
    "Giá tour ảo hoặc chênh lệch bất thường so với thị trường.",
    "Hình ảnh bài đăng tour vi phạm tiêu chuẩn cộng đồng.",
    "Thiếu thông tin địa điểm đón hoặc thời gian xuất phát cụ thể.",
    "Nội dung trùng lặp hoặc spam trên sàn du lịch.",
  ];

  // Counts
  const totalCount = tours.length;
  const hiddenCount = tours.filter((t) => t.status === "hidden").length;
  const publishedCount = tours.filter((t) => t.status !== "hidden").length;

  const filteredTours = tours.filter((tour) => {
    const isHidden = tour.status === "hidden";
    if (filterStatus === "published" && isHidden) return false;
    if (filterStatus === "hidden" && !isHidden) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = tour.name.toLowerCase().includes(q);
      const matchCode = (tour.tourCode || "").toLowerCase().includes(q);
      const matchDest = tour.destination.toLowerCase().includes(q);
      const matchCompany = (tour.companyName || "").toLowerCase().includes(q);
      return matchName || matchCode || matchDest || matchCompany;
    }

    return true;
  });

  const handleConfirmHide = () => {
    if (!hidingTour) return;
    const reason = hideReason.trim() || "Nội dung tour bị tạm ẩn do thông tin không chính xác hoặc không phù hợp.";
    if (onToggleHideTour) {
      onToggleHideTour(hidingTour.id, reason);
    }
    setNotification({
      type: "info",
      message: `Đã tạm ẩn tour "${hidingTour.name}". Tour này sẽ không hiển thị trên sàn!`,
    });
    setHidingTour(null);
    setHideReason("");
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRestoreTour = (tour: Tour) => {
    if (onToggleHideTour) {
      onToggleHideTour(tour.id);
    }
    setNotification({
      type: "success",
      message: `Đã mở hiển thị lại tour "${tour.name}" công khai trên sàn!`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleConfirmDelete = () => {
    if (!deletingTour) return;
    if (onDeleteTour) {
      onDeleteTour(deletingTour.id);
    }
    setNotification({
      type: "info",
      message: `Đã xóa vĩnh viễn tour "${deletingTour.name}" khỏi hệ thống!`,
    });
    setDeletingTour(null);
    if (selectedTourForDetail?.id === deletingTour.id) {
      setSelectedTourForDetail(null);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Compass className="w-7 h-7 text-[#075985]" />
            Quản Lý Tour Du Lịch
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Giám sát tất cả các tour du lịch trên toàn nền tảng. Xem chi tiết nội dung, tạm ẩn các bài đăng sai lệch / nhảm nhí hoặc xóa vi phạm.
          </p>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterStatus("all")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            filterStatus === "all"
              ? "bg-[#F0F9FF]/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
              : "bg-white border-gray-200 hover:border-[#CBD5E1]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#075985] uppercase tracking-wider">Tất cả Tour</span>
            <Layers className="w-5 h-5 text-[#075985]" />
          </div>
          <p className="text-3xl font-extrabold text-[#075985] mt-3">{totalCount}</p>
          <p className="text-[12px] text-gray-500 mt-1">Tổng số tour do các cty lữ hành đăng tải</p>
        </div>

        <div
          onClick={() => setFilterStatus("published")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            filterStatus === "published"
              ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-white border-gray-200 hover:border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Đang hiển thị công khai</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-3">{publishedCount}</p>
          <p className="text-[12px] text-gray-500 mt-1">Đang mở bán trực tiếp cho khách hàng</p>
        </div>

        <div
          onClick={() => setFilterStatus("hidden")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            filterStatus === "hidden"
              ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white border-gray-200 hover:border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Đã tạm ẩn (Vi phạm / xàm)</span>
            <EyeOff className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-amber-700 mt-3">{hiddenCount}</p>
          <p className="text-[12px] text-gray-500 mt-1">Bị ẩn khỏi sàn do thông tin không phù hợp</p>
        </div>
      </div>

      {/* Toolbar: Search & Filter Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên tour, mã tour, điểm đến, cty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-[#075985] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "all"
                ? "bg-[#075985] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus("published")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "published"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Đang hiển thị ({publishedCount})
          </button>
          <button
            onClick={() => setFilterStatus("hidden")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === "hidden"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Đã tạm ẩn ({hiddenCount})
          </button>
        </div>
      </div>

      {/* Tour List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTours.map((tour) => {
          const isHidden = tour.status === "hidden";
          return (
            <div
              key={tour.id}
              className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group shadow-2xs hover:shadow-md ${
                isHidden ? "border-amber-300 bg-amber-50/20" : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div>
                {/* Image Banner */}
                <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
                  <img
                    src={tour.image}
                    alt={tour.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-black/70 backdrop-blur-xs text-white shadow-xs">
                      {tour.tourCode || `TOUR-${tour.id.substring(0, 5)}`}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#075985] text-white shadow-xs">
                      {tour.duration || `${tour.numberOfDays || 3}N${tour.numberOfNights || 2}Đ`}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    {isHidden ? (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                        <EyeOff className="w-3 h-3" />
                        Đã tạm ẩn
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Đang hiển thị
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-medium bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{tour.destination}</span>
                    </span>
                    <span className="font-bold text-amber-300 shrink-0 ml-2">
                      {formatPrice(tour.price)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-[#075985] transition-colors">
                      {tour.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-700">{tour.companyName || "Công ty lữ hành"}</span>
                    </p>
                  </div>

                  {/* Hidden reason alert banner */}
                  {isHidden && (
                    <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        Lý do tạm ẩn:
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed italic">
                        "{tour.hiddenReason || "Nội dung tour bị tạm ẩn do thông tin không chính xác hoặc không phù hợp."}"
                      </p>
                    </div>
                  )}

                  {/* Quick Specs */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 pt-1">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-400 block">Số điểm dừng:</span>
                      <strong className="text-gray-800">
                        {tour.itinerary?.reduce((acc, d) => acc + (d.locations?.length || 0), 0) || 0} điểm
                      </strong>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-400 block">Quy mô đoàn:</span>
                      <strong className="text-gray-800">
                        {tour.minGuests || 1} - {tour.maxGuests || 40} khách
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 border-t border-gray-100 flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTourForDetail(tour)}
                  className="flex-1 rounded-xl text-xs font-semibold gap-1.5 hover:bg-[#F0F9FF] hover:text-[#075985] hover:border-[#CBD5E1]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Xem chi tiết
                </Button>

                {isHidden ? (
                  <Button
                    size="sm"
                    onClick={() => handleRestoreTour(tour)}
                    className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    title="Mở hiển thị lại tour công khai trên sàn"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mở lại
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setHidingTour(tour);
                      setHideReason("");
                    }}
                    className="rounded-xl text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-100 gap-1"
                    title="Tạm ẩn tour nếu thông tin không đúng hoặc xàm"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Tạm ẩn
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeletingTour(tour)}
                  className="rounded-xl text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50 p-2"
                  title="Xóa vĩnh viễn tour này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}

        {filteredTours.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
            <Compass className="w-12 h-12 text-gray-300 mx-auto" />
            <h4 className="font-bold text-gray-800 text-base">Không tìm thấy tour du lịch nào</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Không có tour nào phù hợp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("all");
              }}
              className="rounded-xl text-xs"
            >
              Đặt lại bộ lọc
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: XEM CHI TIẾT TOÀN DIỆN TOUR DU LỊCH */}
      {/* ========================================================================= */}
      <Dialog open={false} onOpenChange={() => setSelectedTourForDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          {selectedTourForDetail && (
            <div>
              {/* Header Image Cover */}
              <div className="relative h-64 sm:h-72 w-full bg-gray-900">
                <img
                  src={selectedTourForDetail.image}
                  alt={selectedTourForDetail.name}
                  className="w-full h-full object-cover opacity-85"
                />
                <button
                  onClick={() => setSelectedTourForDetail(null)}
                  className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 left-6 right-6 text-white space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-[#075985] text-white border-none font-bold">
                      {selectedTourForDetail.tourCode || `TOUR-${selectedTourForDetail.id.substring(0, 5)}`}
                    </Badge>
                    <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 font-medium">
                      {selectedTourForDetail.duration}
                    </Badge>
                    {selectedTourForDetail.status === "hidden" ? (
                      <Badge className="bg-amber-500 text-white border-none font-bold">
                        Đang tạm ẩn trên sàn
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white border-none font-bold">
                        Đang mở bán công khai
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-md">
                    {selectedTourForDetail.name}
                  </h2>
                  <p className="text-xs text-gray-200 flex items-center gap-2">
                    <span>📍 {selectedTourForDetail.destination}</span>
                    <span>•</span>
                    <span>🏢 {selectedTourForDetail.companyName}</span>
                  </p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 text-gray-800 text-xs">
                {/* Hidden Notice if tour is currently hidden */}
                {selectedTourForDetail.status === "hidden" && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-sm text-amber-800">
                      <ShieldAlert className="w-4 h-4" />
                      Lý do tour đang bị tạm ẩn trên hệ thống:
                    </div>
                    <p className="text-xs leading-relaxed italic">
                      "{selectedTourForDetail.hiddenReason || "Nội dung tour bị tạm ẩn do thông tin không chính xác hoặc không phù hợp."}"
                    </p>
                  </div>
                )}

                {/* Key Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Giá cơ sở / khách:</span>
                    <strong className="text-[#075985] text-sm font-extrabold">
                      {formatPrice(selectedTourForDetail.price)}
                    </strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Số lượng khách:</span>
                    <strong className="text-gray-900 text-sm">
                      {selectedTourForDetail.minGuests || 1} - {selectedTourForDetail.maxGuests || 40} khách
                    </strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Đơn vị tổ chức:</span>
                    <strong className="text-gray-900 text-sm truncate block" title={selectedTourForDetail.companyName}>
                      {selectedTourForDetail.companyName || "Chưa cập nhật"}
                    </strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Mã Tour:</span>
                    <strong className="font-mono text-gray-900 text-sm">
                      {selectedTourForDetail.tourCode || selectedTourForDetail.id}
                    </strong>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#075985]" />
                    Mô tả giới thiệu Tour
                  </h4>
                  <p className="text-gray-700 leading-relaxed bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 whitespace-pre-line">
                    {selectedTourForDetail.description || "Chưa có mô tả chi tiết."}
                  </p>
                </div>

                {/* Daily Itinerary Detail */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#075985]" />
                    Lịch trình chi tiết từng ngày ({selectedTourForDetail.itinerary?.length || 0} ngày)
                  </h4>

                  <div className="space-y-3">
                    {selectedTourForDetail.itinerary?.map((day, idx) => (
                      <div key={day.id || idx} className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-[#075985] text-sm flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#075985] text-white flex items-center justify-center text-xs">
                              {day.day || idx + 1}
                            </span>
                            {day.title || `Ngày ${idx + 1}`}
                          </span>
                          {day.destinationCity && (
                            <Badge variant="outline" className="text-[10px]">
                              📍 {day.destinationCity}
                            </Badge>
                          )}
                        </div>

                        {day.description && (
                          <p className="text-gray-600 leading-relaxed text-xs">
                            {day.description}
                          </p>
                        )}

                        {/* Locations */}
                        {day.locations && day.locations.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[11px] font-semibold text-gray-500">Điểm tham quan trong ngày:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {day.locations.map((loc, lIdx) => (
                                <span key={lIdx} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-gray-800 text-[11px] flex items-center gap-1">
                                  📍 {loc.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hotel & Meals */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-200 text-[11px]">
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
                            <Hotel className="w-3.5 h-3.5 text-[#075985] shrink-0" />
                            <span className="truncate">
                              Khách sạn: <strong>{day.hotel?.name || "Theo tiêu chuẩn tour"}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
                            <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">
                              Bữa ăn: <strong>{day.meals?.map((m) => m.restaurantName || m.type).join(", ") || "Bao gồm theo tour"}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Table if available */}
                {selectedTourForDetail.priceTable && selectedTourForDetail.priceTable.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Bảng giá theo độ tuổi khách hàng
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100 text-gray-700">
                          <tr>
                            <th className="py-2.5 px-3">Phân nhóm</th>
                            <th className="py-2.5 px-3">Độ tuổi áp dụng</th>
                            <th className="py-2.5 px-3 text-right">Đơn giá niêm yết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {selectedTourForDetail.priceTable.map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td className="py-2 px-3 font-semibold text-gray-900">{row.ageGroupLabel}</td>
                              <td className="py-2 px-3 text-gray-500">{row.ageRange || "—"}</td>
                              <td className="py-2 px-3 text-right font-bold text-[#075985]">
                                {formatPrice(row.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Dialog Footer Actions */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTourForDetail(null)}
                  className="rounded-xl text-xs"
                >
                  Đóng cửa sổ
                </Button>

                <div className="flex items-center gap-2">
                  {selectedTourForDetail.status === "hidden" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleRestoreTour(selectedTourForDetail);
                        setSelectedTourForDetail({ ...selectedTourForDetail, status: "published" });
                      }}
                      className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mở hiển thị lại tour
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setHidingTour(selectedTourForDetail);
                        setHideReason("");
                      }}
                      className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Tạm ẩn tour này
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeletingTour(selectedTourForDetail);
                    }}
                    className="rounded-xl text-xs gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa tour
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: TẠM ẨN TOUR (KÈM LÝ DO THÔNG TIN XÀM / SAI LỆCH) */}
      {/* ========================================================================= */}
      <Dialog open={!!hidingTour} onOpenChange={() => setHidingTour(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-amber-600" />
              Tạm ẩn Tour du lịch khỏi hệ thống
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Tour bị ẩn sẽ ngay lập tức không hiển thị cho khách hàng trên sàn du lịch. Bạn có thể mở lại bất cứ lúc nào.
            </DialogDescription>
          </DialogHeader>

          {hidingTour && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <span className="text-gray-400 block mb-0.5">Tour đang thao tác:</span>
                <strong className="text-gray-900 font-bold block">{hidingTour.name}</strong>
                <span className="text-gray-500 text-[11px] mt-0.5 block">Đơn vị: {hidingTour.companyName}</span>
              </div>

              {/* Quick suggestions */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-gray-600">Gợi ý lý do nhanh:</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickReasonSuggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setHideReason(sug)}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors text-left"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 block">
                  Lý do tạm ẩn cụ thể (Gửi thông báo / lưu vết hệ thống):
                </label>
                <Textarea
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể (VD: Giá tour không chính xác, thông tin nhảm nhí vi phạm nội quy...)"
                  rows={3}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHidingTour(null)}
                  className="rounded-xl text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmHide}
                  className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Xác nhận tạm ẩn Tour
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: XÁC NHẬN XÓA VĨNH VIỄN TOUR */}
      {/* ========================================================================= */}
      <Dialog open={!!deletingTour} onOpenChange={() => setDeletingTour(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Xác nhận xóa vĩnh viễn Tour
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Hành động này sẽ xóa hoàn toàn tour này khỏi cơ sở dữ liệu và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          {deletingTour && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-gray-700 leading-relaxed">
                Bạn có chắc chắn muốn xóa tour{" "}
                <strong className="text-gray-900 font-bold">"{deletingTour.name}"</strong> của đơn vị{" "}
                <strong>{deletingTour.companyName}</strong> không?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingTour(null)}
                  className="rounded-xl text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  className="rounded-xl text-xs font-semibold"
                >
                  Đồng ý xóa vĩnh viễn
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
