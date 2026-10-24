import { useState } from "react";
import { Service } from "@/app/types";
import {
  FileText,
  Eye,
  EyeOff,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  Building2,
  DollarSign,
  Layers,
  ShieldAlert,
  Hotel,
  Utensils,
  Car,
  Compass,
  Star,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
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
import { ProviderServiceDetailPage } from "@/app/components/provider/ProviderServiceDetailPage";

interface ServicePostApprovalProps {
  services: Service[];
  onToggleHideService?: (serviceId: string, reason?: string) => void;
  onDeleteService?: (serviceId: string) => void;
  onApproveService?: (serviceId: string) => void;
  onRejectService?: (serviceId: string, reason: string) => void;
}

export function ServicePostApproval({
  services,
  onToggleHideService,
  onDeleteService,
}: ServicePostApprovalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "approved" | "hidden">("all");
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<Service | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [hidingService, setHidingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "info"; message: string } | null>(null);

  // If Admin clicked view detail, render full dedicated page (trang riêng luôn)
  if (selectedServiceForDetail) {
    const currentService = services.find((s) => s.id === selectedServiceForDetail.id) || selectedServiceForDetail;
    return (
      <ProviderServiceDetailPage
        service={currentService}
        isAdmin={true}
        onBack={() => setSelectedServiceForDetail(null)}
        onToggleHide={(id, reason) => {
          onToggleHideService?.(id, reason);
        }}
        onDelete={(id) => {
          onDeleteService?.(id);
          setSelectedServiceForDetail(null);
        }}
      />
    );
  }

  // Quick suggestions for Admin when hiding inappropriate/troll service posts
  const quickReasonSuggestions = [
    "Thông tin dịch vụ sai lệch, nhảm nhí không đúng thực tế.",
    "Bảng giá ảo hoặc phụ thu bất hợp lý.",
    "Hình ảnh bài đăng chất lượng kém hoặc sao chép trái phép.",
    "Cơ sở dịch vụ đã tạm dừng hoạt động hoặc đổi địa chỉ.",
    "Bài đăng trùng lặp hoặc spam trên sàn.",
  ];

  // Counts
  const totalCount = services.length;
  const hiddenCount = services.filter((s) => s.status === "hidden").length;
  const activeCount = services.filter((s) => s.status !== "hidden").length;

  const filteredServices = services.filter((service) => {
    // Status filter
    const isHidden = service.status === "hidden";
    if (selectedStatus === "approved" && isHidden) return false;
    if (selectedStatus === "hidden" && !isHidden) return false;

    // Category filter
    if (selectedCategory !== "all") {
      if (selectedCategory === "hotel" && service.category !== "hotel") return false;
      if (
        (selectedCategory === "fnb" || selectedCategory === "restaurant") &&
        service.category !== "fnb" &&
        service.category !== "restaurant"
      )
        return false;
      if (selectedCategory === "transportation" && service.category !== "transportation") return false;
      if (
        (selectedCategory === "attraction" || selectedCategory === "activity") &&
        service.category !== "attraction" &&
        service.category !== "activity"
      )
        return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = service.name.toLowerCase().includes(q);
      const matchProvider = (service.providerName || "").toLowerCase().includes(q);
      const matchLoc = (service.location || "").toLowerCase().includes(q);
      const matchProv = (service.province || "").toLowerCase().includes(q);
      return matchName || matchProvider || matchLoc || matchProv;
    }

    return true;
  });

  const getCategoryMeta = (cat: Service["category"]) => {
    switch (cat) {
      case "hotel":
        return {
          label: "Lưu trú & Khách sạn",
          shortLabel: "Khách sạn",
          icon: Hotel,
          badgeColor: "bg-[#F0F9FF] text-[#075985] border-[#CBD5E1]",
        };
      case "fnb":
      case "restaurant":
        return {
          label: "Ẩm thực & Nhà hàng",
          shortLabel: "Nhà hàng",
          icon: Utensils,
          badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
        };
      case "transportation":
        return {
          label: "Vận chuyển & Xe tour",
          shortLabel: "Vận chuyển",
          icon: Car,
          badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
        };
      case "attraction":
      case "activity":
      default:
        return {
          label: "Điểm tham quan & Vé",
          shortLabel: "Tham quan",
          icon: Compass,
          badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
        };
    }
  };

  const handleConfirmHide = () => {
    if (!hidingService) return;
    const reason = hideReason.trim() || "Nội dung bài đăng bị tạm ẩn do thông tin không chính xác hoặc không phù hợp.";
    if (onToggleHideService) {
      onToggleHideService(hidingService.id, reason);
    }
    setNotification({
      type: "info",
      message: `Đã tạm ẩn bài đăng "${hidingService.name}". Dịch vụ này sẽ không xuất hiện trên sàn!`,
    });
    setHidingService(null);
    setHideReason("");
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRestoreService = (service: Service) => {
    if (onToggleHideService) {
      onToggleHideService(service.id);
    }
    setNotification({
      type: "success",
      message: `Đã mở hiển thị lại bài đăng "${service.name}" công khai trên sàn!`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleConfirmDelete = () => {
    if (!deletingService) return;
    if (onDeleteService) {
      onDeleteService(deletingService.id);
    }
    setNotification({
      type: "info",
      message: `Đã xóa vĩnh viễn bài đăng "${deletingService.name}" khỏi hệ thống!`,
    });
    setDeletingService(null);
    if (selectedServiceForDetail?.id === deletingService.id) {
      setSelectedServiceForDetail(null);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const formatPriceSummary = (service: Service) => {
    if (service.priceFrom && service.priceTo) {
      return `${service.priceFrom.toLocaleString("vi-VN")}đ - ${service.priceTo.toLocaleString("vi-VN")}đ`;
    }
    if (service.price) {
      return `${service.price.toLocaleString("vi-VN")}đ`;
    }
    if (service.pricePerPerson) {
      return `${service.pricePerPerson.toLocaleString("vi-VN")}đ/người`;
    }
    return "Liên hệ báo giá";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#075985]" />
            Quản Lý Bài Đăng Dịch Vụ
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Giám sát các bài đăng dịch vụ (khách sạn, ăn uống, xe tour, vé tham quan) do Nhà cung cấp đăng tải. Xem chi tiết, tạm ẩn nếu sai lệch / nhảm nhí hoặc xóa vi phạm.
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => {
            setSelectedStatus("all");
            setSelectedCategory("all");
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            selectedStatus === "all" && selectedCategory === "all"
              ? "bg-[#F0F9FF]/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
              : "bg-white border-gray-200 hover:border-[#CBD5E1]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#075985] uppercase tracking-wider">Tổng bài đăng</span>
            <Layers className="w-5 h-5 text-[#075985]" />
          </div>
          <p className="text-3xl font-extrabold text-[#075985] mt-3">{totalCount}</p>
          <p className="text-[12px] text-gray-500 mt-1">Toàn bộ dịch vụ từ các đối tác cung ứng</p>
        </div>

        <div
          onClick={() => setSelectedStatus("approved")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            selectedStatus === "approved"
              ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-white border-gray-200 hover:border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Đang hiển thị công khai</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-3">{activeCount}</p>
          <p className="text-[12px] text-gray-500 mt-1">Công ty lữ hành có thể tra cứu và chọn</p>
        </div>

        <div
          onClick={() => setSelectedStatus("hidden")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            selectedStatus === "hidden"
              ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white border-gray-200 hover:border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Đã tạm ẩn (Vi phạm / xàm)</span>
            <EyeOff className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-amber-700 mt-3">{hiddenCount}</p>
          <p className="text-[12px] text-gray-500 mt-1">Bị ẩn khỏi sàn do thông tin sai lệch</p>
        </div>
      </div>

      {/* Toolbar: Category tabs + Search + Status */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-100">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-[#075985] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tất cả danh mục ({services.length})
          </button>
          <button
            onClick={() => setSelectedCategory("hotel")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === "hotel"
                ? "bg-[#075985] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Hotel className="w-3.5 h-3.5" />
            Lưu trú & Khách sạn ({services.filter((s) => s.category === "hotel").length})
          </button>
          <button
            onClick={() => setSelectedCategory("fnb")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === "fnb" || selectedCategory === "restaurant"
                ? "bg-[#075985] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Ẩm thực & Nhà hàng ({services.filter((s) => s.category === "fnb" || s.category === "restaurant").length})
          </button>
          <button
            onClick={() => setSelectedCategory("transportation")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === "transportation"
                ? "bg-[#075985] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Xe & Vận chuyển ({services.filter((s) => s.category === "transportation").length})
          </button>
          <button
            onClick={() => setSelectedCategory("attraction")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === "attraction" || selectedCategory === "activity"
                ? "bg-[#075985] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Tham quan & Trải nghiệm (
            {services.filter((s) => s.category === "attraction" || s.category === "activity").length})
          </button>
        </div>

        {/* Search & Status Pills Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên bài đăng, nhà cung cấp, địa chỉ..."
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

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Tất cả trạng thái
            </button>
            <button
              onClick={() => setSelectedStatus("approved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === "approved"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Đang hiển thị ({activeCount})
            </button>
            <button
              onClick={() => setSelectedStatus("hidden")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === "hidden"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Đã tạm ẩn ({hiddenCount})
            </button>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredServices.map((service) => {
          const meta = getCategoryMeta(service.category);
          const CatIcon = meta.icon;
          const isHidden = service.status === "hidden";

          return (
            <div
              key={service.id}
              className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group shadow-2xs hover:shadow-md ${
                isHidden ? "border-amber-300 bg-amber-50/20" : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div>
                {/* Image Banner */}
                <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Category Pill */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/95 backdrop-blur-xs text-gray-800 shadow-xs flex items-center gap-1">
                      <CatIcon className="w-3.5 h-3.5 text-[#075985]" />
                      {meta.shortLabel}
                    </span>
                  </div>

                  {/* Status Badge */}
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

                  {/* Location & Price footer bar */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-medium bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{service.province || service.location || "Việt Nam"}</span>
                    </span>
                    <span className="font-bold text-amber-300 shrink-0 ml-2">
                      {formatPriceSummary(service)}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-2.5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-[#075985] transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-700">{service.providerName}</span>
                    </p>
                  </div>

                  {/* Hidden reason banner */}
                  {isHidden && (
                    <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        Lý do tạm ẩn bài đăng:
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed italic">
                        "{service.hiddenReason || "Thông tin dịch vụ bị tạm ẩn do không chính xác hoặc không phù hợp."}"
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    {service.description || "Chưa có mô tả chi tiết."}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 border-t border-gray-100 flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedServiceForDetail(service);
                    setActiveImageIndex(0);
                  }}
                  className="flex-1 rounded-xl text-xs font-semibold gap-1.5 hover:bg-[#F0F9FF] hover:text-[#075985] hover:border-[#CBD5E1]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Xem chi tiết
                </Button>

                {isHidden ? (
                  <Button
                    size="sm"
                    onClick={() => handleRestoreService(service)}
                    className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    title="Mở hiển thị lại bài đăng trên sàn"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mở lại
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setHidingService(service);
                      setHideReason("");
                    }}
                    className="rounded-xl text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-100 gap-1"
                    title="Tạm ẩn bài đăng nếu thông tin xàm hoặc sai lệch"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Tạm ẩn
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeletingService(service)}
                  className="rounded-xl text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50 p-2"
                  title="Xóa vĩnh viễn bài đăng dịch vụ này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <h4 className="font-bold text-gray-800 text-base">Không tìm thấy bài đăng dịch vụ nào</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Không có bài đăng nào phù hợp với bộ lọc danh mục, trạng thái hoặc từ khóa tìm kiếm.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedStatus("all");
              }}
              className="rounded-xl text-xs"
            >
              Đặt lại bộ lọc
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: XEM CHI TIẾT BÀI ĐĂNG DỊCH VỤ */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedServiceForDetail} onOpenChange={() => setSelectedServiceForDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          {selectedServiceForDetail && (
            <div>
              {/* Photo Gallery Banner */}
              <div className="relative h-64 sm:h-80 w-full bg-gray-900">
                <img
                  src={
                    selectedServiceForDetail.images?.[activeImageIndex] ||
                    selectedServiceForDetail.image
                  }
                  alt={selectedServiceForDetail.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedServiceForDetail(null)}
                  className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-[#075985] text-white border-none font-bold">
                    {getCategoryMeta(selectedServiceForDetail.category).label}
                  </Badge>
                  {selectedServiceForDetail.status === "hidden" ? (
                    <Badge className="bg-amber-500 text-white border-none font-bold">
                      Đang tạm ẩn trên sàn
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-600 text-white border-none font-bold">
                      Đang hiển thị công khai
                    </Badge>
                  )}
                </div>

                <div className="absolute bottom-4 left-6 right-6 text-white space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-md">
                    {selectedServiceForDetail.name}
                  </h2>
                  <p className="text-xs text-gray-200">
                    📍 {selectedServiceForDetail.street || ""}, {selectedServiceForDetail.ward || ""},{" "}
                    {selectedServiceForDetail.province || selectedServiceForDetail.location}
                  </p>
                </div>
              </div>

              {/* Thumbnails if multiple images */}
              {selectedServiceForDetail.images && selectedServiceForDetail.images.length > 1 && (
                <div className="flex gap-2 p-3 bg-gray-100 overflow-x-auto border-b border-gray-200">
                  {selectedServiceForDetail.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                        activeImageIndex === idx
                          ? "border-[#075985] ring-2 ring-blue-500/30"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Modal Body */}
              <div className="p-6 space-y-6 text-gray-800 text-xs">
                {/* Hidden Notice if hidden */}
                {selectedServiceForDetail.status === "hidden" && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-sm text-amber-800">
                      <ShieldAlert className="w-4 h-4" />
                      Lý do bài đăng đang bị tạm ẩn trên sàn:
                    </div>
                    <p className="text-xs leading-relaxed italic">
                      "{selectedServiceForDetail.hiddenReason || "Thông tin dịch vụ bị tạm ẩn do không chính xác hoặc không phù hợp."}"
                    </p>
                  </div>
                )}

                {/* Key Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Khoảng giá tham khảo:</span>
                    <strong className="text-[#075985] text-sm font-extrabold">
                      {formatPriceSummary(selectedServiceForDetail)}
                    </strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Quy mô / Sức chứa:</span>
                    <strong className="text-gray-900 text-sm">
                      {selectedServiceForDetail.capacity ||
                        selectedServiceForDetail.totalRooms ||
                        selectedServiceForDetail.seats ||
                        "—"}{" "}
                      {selectedServiceForDetail.category === "hotel"
                        ? "phòng"
                        : selectedServiceForDetail.category === "transportation"
                        ? "ghế"
                        : "khách"}
                    </strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Nhà cung cấp:</span>
                    <strong className="text-gray-900 text-sm truncate block" title={selectedServiceForDetail.providerName}>
                      {selectedServiceForDetail.providerName}
                    </strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Mã dịch vụ:</span>
                    <strong className="font-mono text-gray-900 text-sm">
                      {selectedServiceForDetail.id}
                    </strong>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-gray-900">Mô tả chi tiết bài đăng</h4>
                  <p className="text-gray-700 leading-relaxed bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 whitespace-pre-line">
                    {selectedServiceForDetail.description || "Chưa có mô tả chi tiết."}
                  </p>
                </div>

                {/* Policies & Amenities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Policies */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-gray-900">Chính sách & Quy định</h4>
                    {selectedServiceForDetail.policies &&
                    (Array.isArray(selectedServiceForDetail.policies)
                      ? selectedServiceForDetail.policies.length > 0
                      : Boolean(selectedServiceForDetail.policies)) ? (
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-1.5">
                        {Array.isArray(selectedServiceForDetail.policies) ? (
                          selectedServiceForDetail.policies.map((p, pIdx) => (
                            <p key={pIdx} className="text-gray-800 text-xs flex items-start gap-1.5">
                              <span className="font-bold text-amber-700">•</span> {p}
                            </p>
                          ))
                        ) : (
                          <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-line">
                            {selectedServiceForDetail.policies}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic bg-gray-50 p-3 rounded-xl">Không có ghi chú chính sách đặc biệt.</p>
                    )}
                  </div>

                  {/* Amenities */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-gray-900">Tiện nghi & Dịch vụ đi kèm</h4>
                    {selectedServiceForDetail.amenities && selectedServiceForDetail.amenities.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 p-3 bg-[#F0F9FF]/50 rounded-xl border border-[#CBD5E1]/60">
                        {selectedServiceForDetail.amenities.map((am, aIdx) => (
                          <span
                            key={aIdx}
                            className="px-2.5 py-1 bg-white text-blue-800 border border-[#CBD5E1] rounded-lg text-[11px] font-medium"
                          >
                            ✓ {am}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic bg-gray-50 p-3 rounded-xl">Chưa cập nhật tiện nghi.</p>
                    )}
                  </div>
                </div>

                {/* Location & GPS */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Tọa độ định vị GPS:</span>
                    <span className="font-mono font-bold text-gray-800 text-xs">
                      {selectedServiceForDetail.latitude || 11.9404}, {selectedServiceForDetail.longitude || 108.4583}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedServiceForDetail.latitude || 11.9404},${
                      selectedServiceForDetail.longitude || 108.4583
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#075985] hover:text-blue-800 font-semibold"
                  >
                    Xem vị trí trên Google Maps <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Dialog Footer Actions */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedServiceForDetail(null)}
                  className="rounded-xl text-xs"
                >
                  Đóng cửa sổ
                </Button>

                <div className="flex items-center gap-2">
                  {selectedServiceForDetail.status === "hidden" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleRestoreService(selectedServiceForDetail);
                        setSelectedServiceForDetail({ ...selectedServiceForDetail, status: "approved" });
                      }}
                      className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mở hiển thị lại bài đăng
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setHidingService(selectedServiceForDetail);
                        setHideReason("");
                      }}
                      className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Tạm ẩn bài đăng này
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeletingService(selectedServiceForDetail);
                    }}
                    className="rounded-xl text-xs gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa bài đăng
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: TẠM ẨN BÀI ĐĂNG DỊCH VỤ (KÈM LÝ DO THÔNG TIN XÀM / SAI LỆCH) */}
      {/* ========================================================================= */}
      <Dialog open={!!hidingService} onOpenChange={() => setHidingService(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-amber-600" />
              Tạm ẩn bài đăng dịch vụ
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Bài đăng bị tạm ẩn sẽ không còn hiển thị cho các công ty lữ hành tra cứu. Bạn có thể mở lại bất cứ lúc nào.
            </DialogDescription>
          </DialogHeader>

          {hidingService && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <span className="text-gray-400 block mb-0.5">Dịch vụ đang thao tác:</span>
                <strong className="text-gray-900 font-bold block">{hidingService.name}</strong>
                <span className="text-gray-500 text-[11px] mt-0.5 block">Nhà cung cấp: {hidingService.providerName}</span>
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
                  placeholder="Nhập lý do cụ thể (VD: Giá dịch vụ ảo, thông tin sai lệch so với thực tế...)"
                  rows={3}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHidingService(null)}
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
                  Xác nhận tạm ẩn dịch vụ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: XÁC NHẬN XÓA BÀI ĐĂNG DỊCH VỤ */}
      {/* ========================================================================= */}
      <Dialog open={!!deletingService} onOpenChange={() => setDeletingService(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Xác nhận xóa bài đăng dịch vụ
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Hành động này sẽ xóa vĩnh viễn bài đăng dịch vụ khỏi hệ thống và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          {deletingService && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-gray-700 leading-relaxed">
                Bạn có chắc chắn muốn xóa bài đăng{" "}
                <strong className="text-gray-900 font-bold">"{deletingService.name}"</strong> của đối tác{" "}
                <strong>{deletingService.providerName}</strong> không?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingService(null)}
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
