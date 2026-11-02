import { useState, useMemo } from "react";
import { Service } from "@/app/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Users,
  Image as ImageIcon,
  Search,
  Hotel,
  Utensils,
  Compass,
  Sparkles,
  Car,
  Star,
  Layers,
  Filter,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { ImageUploadManager } from "../ImageUploadManager";

interface ServicePostManagementProps {
  services: Service[];
  providerId: string;
  onCreateService: () => void;
  onEditService: (service: Service) => void;
  onDeleteService: (serviceId: string) => void;
  onViewDetail?: (service: Service) => void;
}

export function ServicePostManagement({
  services,
  providerId,
  onCreateService,
  onEditService,
  onDeleteService,
  onViewDetail,
}: ServicePostManagementProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [imageManagementService, setImageManagementService] = useState<Service | null>(null);

  // Filter services by current provider
  const providerServices = useMemo(() => {
    return services.filter((s) => s.providerId === providerId);
  }, [services, providerId]);

  // Calculate statistics
  const stats = useMemo(() => {
    const pending = providerServices.filter((s) => s.status === "pending").length;
    const approved = providerServices.filter((s) => s.status === "approved").length;
    const rejected = providerServices.filter((s) => s.status === "rejected").length;
    return {
      total: providerServices.length,
      pending,
      approved,
      rejected,
    };
  }, [providerServices]);

  // Filter and search services
  const filteredServices = useMemo(() => {
    return providerServices.filter((service) => {
      // Status filter
      if (filter !== "all" && service.status !== filter) return false;

      // Category filter
      if (categoryFilter !== "all") {
        if (categoryFilter === "fnb") {
          if (service.category !== "fnb" && service.category !== "restaurant") return false;
        } else if (service.category !== categoryFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = service.name?.toLowerCase().includes(q);
        const matchLocation = service.location?.toLowerCase().includes(q);
        const matchProvince = service.province?.toLowerCase().includes(q);
        const matchDistrict = service.district?.toLowerCase().includes(q);
        const matchDesc = service.description?.toLowerCase().includes(q);
        return matchName || matchLocation || matchProvince || matchDistrict || matchDesc;
      }

      return true;
    });
  }, [providerServices, filter, categoryFilter, searchQuery]);

  const getStatusBadge = (status: Service["status"]) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã duyệt
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Bị từ chối
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
            Chờ duyệt
          </span>
        );
    }
  };

  const getCategoryBadge = (category: Service["category"]) => {
    switch (category) {
      case "hotel":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F0F9FF] text-[#075985] border border-[#CBD5E1]">
            <Hotel className="w-3.5 h-3.5 text-[#075985]" />
            Lưu trú
          </span>
        );
      case "fnb":
      case "restaurant":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            <Utensils className="w-3.5 h-3.5 text-orange-600" />
            Ẩm thực
          </span>
        );
      case "attraction":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
            <Compass className="w-3.5 h-3.5 text-teal-600" />
            Tham quan
          </span>
        );
      case "activity":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F0F9FF] text-[#EA580C] border border-[#F97316]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            Trải nghiệm
          </span>
        );
      case "transportation":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Car className="w-3.5 h-3.5 text-cyan-600" />
            Vận chuyển
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            <Layers className="w-3.5 h-3.5" />
            {category}
          </span>
        );
    }
  };

  const formatPriceDisplay = (service: Service) => {
    const isHotel = service.category === "hotel";
    const unitLabel = isHotel ? "phòng" : "người";

    if (service.priceFrom && service.priceTo) {
      return (
        <div>
          <div className="font-bold text-gray-900 text-sm">
            {service.priceFrom.toLocaleString("vi-VN")}đ - {service.priceTo.toLocaleString("vi-VN")}đ
          </div>
          <div className="text-xs text-[#075985] font-medium">/ {unitLabel} (ước lượng)</div>
        </div>
      );
    }
    if (service.priceFrom) {
      return (
        <div>
          <div className="font-bold text-gray-900 text-sm">
            từ {service.priceFrom.toLocaleString("vi-VN")}đ
          </div>
          <div className="text-xs text-[#075985] font-medium">/ {unitLabel}</div>
        </div>
      );
    }

    const formattedPrice = service.price ? service.price.toLocaleString("vi-VN") + "đ" : "Liên hệ";
    let unit = "";

    if (service.category === "hotel") {
      unit = "/phòng";
    } else if (service.category === "attraction") {
      unit = "/vé";
    } else if (service.category === "transportation") {
      unit = service.seats ? `/${service.seats} chỗ` : "/chuyến";
    } else if (service.pricePerPerson) {
      unit = "/người";
    }

    return (
      <div>
        <div className="font-bold text-gray-900 text-sm">{formattedPrice}</div>
        {unit && <div className="text-xs text-gray-500 font-normal">{unit}</div>}
      </div>
    );
  };

  const formatAddress = (service: Service) => {
    // Strictly 2 administrative levels: Phường/Xã and Tỉnh/Thành phố
    const parts = [service.ward, service.province].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(", ");
    }
    return service.location || "Chưa cập nhật";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Quản lý Dịch vụ & Bài đăng
            </h1>
            <Badge variant="outline" className="bg-[#F0F9FF] text-[#075985] border-[#CBD5E1]">
              Provider Portal
            </Badge>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Đăng ký và quản lý tất cả các loại dịch vụ (Lưu trú, Ẩm thực, Tham quan, Trải nghiệm, Vận chuyển)
          </p>
        </div>
        <Button
          onClick={onCreateService}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          Đăng dịch vụ mới
        </Button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-5 border-b border-gray-200 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên dịch vụ, địa chỉ, tỉnh thành..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#075985] focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  Xoá
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === "all"
                    ? "bg-white text-gray-900 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Tất cả ({providerServices.length})
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === "pending"
                    ? "bg-amber-500 text-white shadow-sm font-semibold"
                    : "text-gray-600 hover:text-amber-700"
                }`}
              >
                Chờ duyệt ({stats.pending})
              </button>
              <button
                onClick={() => setFilter("approved")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === "approved"
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : "text-gray-600 hover:text-emerald-700"
                }`}
              >
                Đã duyệt ({stats.approved})
              </button>
              <button
                onClick={() => setFilter("rejected")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === "rejected"
                    ? "bg-rose-600 text-white shadow-sm font-semibold"
                    : "text-gray-600 hover:text-rose-700"
                }`}
              >
                Từ chối ({stats.rejected})
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Phân loại:
            </span>
            {[
              { id: "all", label: "Tất cả loại" },
              { id: "hotel", label: "Lưu trú", icon: Hotel },
              { id: "fnb", label: "Ẩm thực", icon: Utensils },
              { id: "transportation", label: "Vận chuyển", icon: Car },
              { id: "attraction", label: "Tham quan", icon: Compass },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
                    isActive
                      ? "bg-[#075985] text-white font-semibold shadow-xs"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* TABLE VIEW */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4 min-w-[240px]">Dịch vụ</th>
                <th className="py-3.5 px-4 min-w-[130px]">Phân loại</th>
                <th className="py-3.5 px-4 min-w-[180px]">Khu vực</th>
                <th className="py-3.5 px-4 min-w-[160px]">Khoảng giá</th>
                <th className="py-3.5 px-4 text-center min-w-[130px]">Trạng thái</th>
                <th className="py-3.5 px-4 text-center min-w-[160px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="text-base font-medium text-gray-700">
                        Không tìm thấy dịch vụ nào phù hợp
                      </p>
                      <p className="text-xs text-gray-500 max-w-sm">
                        Thử thay đổi bộ lọc trạng thái, phân loại dịch vụ hoặc tạo bài đăng dịch vụ mới.
                      </p>
                      <Button
                        onClick={onCreateService}
                        size="sm"
                        className="mt-2 bg-[#075985] hover:bg-[#F97316] text-white"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Đăng dịch vụ mới
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service, index) => {
                  const imageCount = service.images?.length || 1;
                  return (
                    <tr
                      key={service.id}
                      className="hover:bg-[#F0F9FF]/40 transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center text-xs text-gray-500 font-medium">
                        {index + 1}
                      </td>

                      {/* Service Info */}
                      <td className="py-3.5 px-4">
                        <div
                          className="flex items-center gap-3 cursor-pointer group/item"
                          onClick={() => onViewDetail ? onViewDetail(service) : setSelectedService(service)}
                        >
                          <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs">
                            <img
                              src={service.image}
                              alt={service.name}
                              className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                            />
                            {imageCount > 1 && (
                              <div
                                className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-semibold px-1 rounded flex items-center gap-0.5"
                                title={`${imageCount} hình ảnh`}
                              >
                                <ImageIcon className="w-2.5 h-2.5" />
                                {imageCount}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 group-hover/item:text-[#075985] transition-colors line-clamp-1">
                              {service.name}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {service.description}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                              Mã: {service.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category - Only main type badge */}
                      <td className="py-3.5 px-4">
                        {getCategoryBadge(service.category)}
                      </td>

                      {/* Area - Only Ward & Province */}
                      <td className="py-3.5 px-4 text-xs text-gray-700">
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{formatAddress(service)}</span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4">
                        {formatPriceDisplay(service)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(service.status)}
                          {service.status === "rejected" && service.rejectionReason && (
                            <span
                              className="text-[10px] text-rose-600 max-w-[140px] truncate underline cursor-help"
                              title={`Lý do từ chối: ${service.rejectionReason}`}
                            >
                              Lý do: {service.rejectionReason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-[#075985] hover:bg-[#F0F9FF]"
                            onClick={() => onViewDetail ? onViewDetail(service) : setSelectedService(service)}
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => onEditService(service)}
                            title="Chỉnh sửa dịch vụ"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-[#F97316] hover:bg-[#F0F9FF]"
                            onClick={() => setImageManagementService(service)}
                            title="Quản lý thư viện ảnh"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              if (
                                confirm(
                                  `Bạn có chắc chắn muốn xóa bài đăng "${service.name}"? Hành động này không thể hoàn tác.`
                                )
                              ) {
                                onDeleteService(service.id);
                              }
                            }}
                            title="Xóa bài đăng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-gray-50/60 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <span>
            Hiển thị <strong>{filteredServices.length}</strong> trên tổng số{" "}
            <strong>{providerServices.length}</strong> dịch vụ của bạn
          </span>
          <div className="flex items-center gap-2">
            <span>Dạng hiển thị: <strong>Bảng dữ liệu (Table View)</strong></span>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedService}
        onOpenChange={() => setSelectedService(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {selectedService?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-1">
                  Mã dịch vụ: {selectedService?.id} • Nhà cung cấp: {selectedService?.providerName}
                </DialogDescription>
              </div>
              {selectedService && (
                <div className="flex items-center gap-2">
                  {getCategoryBadge(selectedService.category)}
                  {getStatusBadge(selectedService.status)}
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-6 pt-2">
              {/* Photo Showcase */}
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden bg-gray-100 h-64 border border-gray-200">
                  <img
                    src={selectedService.image}
                    alt={selectedService.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {selectedService.images?.length || 1} ảnh trong bộ sưu tập
                  </div>
                </div>

                {selectedService.images && selectedService.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {selectedService.images.slice(0, 4).map((img, idx) => (
                      <div
                        key={idx}
                        className="h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
                      >
                        <img
                          src={img}
                          alt={`Ảnh ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rejected reason banner if any */}
              {selectedService.status === "rejected" && selectedService.rejectionReason && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-rose-900 text-sm">
                      Lý do từ chối kiểm duyệt
                    </h5>
                    <p className="text-xs text-rose-700 mt-0.5">
                      {selectedService.rejectionReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1.5">
                  Mô tả dịch vụ
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  {selectedService.description}
                </p>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic & Pricing Info */}
                <div className="p-4 bg-[#F0F9FF]/50 rounded-xl border border-blue-100 space-y-2.5">
                  <h4 className="font-bold text-sm text-blue-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#075985]" />
                    Thông tin bảng giá
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-blue-100/60">
                      <span className="text-gray-600">Đơn giá niêm yết:</span>
                      <strong className="text-[#075985] text-sm">
                        {selectedService.price?.toLocaleString("vi-VN")}đ
                      </strong>
                    </div>

                    {selectedService.priceFrom && selectedService.priceTo && (
                      <div className="flex justify-between py-1 border-b border-blue-100/60">
                        <span className="text-gray-600">Khoảng giá ước lượng:</span>
                        <strong className="text-[#075985]">
                          {selectedService.priceFrom.toLocaleString("vi-VN")}đ - {selectedService.priceTo.toLocaleString("vi-VN")}đ / {selectedService.category === "hotel" ? "phòng" : "người"}
                        </strong>
                      </div>
                    )}

                    {selectedService.pricePerPerson && !selectedService.priceFrom && (
                      <div className="flex justify-between py-1 border-b border-blue-100/60">
                        <span className="text-gray-600">Giá theo người:</span>
                        <strong>
                          {selectedService.pricePerPerson.toLocaleString("vi-VN")}đ/người
                        </strong>
                      </div>
                    )}

                    {selectedService.childPrice && (
                      <div className="flex justify-between py-1 border-b border-blue-100/60">
                        <span className="text-gray-600">Giá vé trẻ em:</span>
                        <strong>
                          {selectedService.childPrice.toLocaleString("vi-VN")}đ/trẻ
                        </strong>
                      </div>
                    )}

                    {selectedService.category === "hotel" ? (
                      (selectedService.totalRooms || selectedService.capacity) && (
                        <div className="flex justify-between py-1 border-b border-blue-100/60">
                          <span className="text-gray-600">Tổng số phòng:</span>
                          <strong>{selectedService.totalRooms || selectedService.capacity} phòng</strong>
                        </div>
                      )
                    ) : (
                      selectedService.capacity && (
                        <div className="flex justify-between py-1 border-b border-blue-100/60">
                          <span className="text-gray-600">Sức chứa tối đa:</span>
                          <strong>{selectedService.capacity} người</strong>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Location Info */}
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2.5">
                  <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Địa chỉ & Khu vực
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {selectedService.province && (
                      <div className="flex justify-between py-1 border-b border-emerald-100/60">
                        <span className="text-gray-600">Tỉnh / Thành phố:</span>
                        <strong>{selectedService.province}</strong>
                      </div>
                    )}
                    {selectedService.ward && (
                      <div className="flex justify-between py-1 border-b border-emerald-100/60">
                        <span className="text-gray-600">Phường / Xã:</span>
                        <strong>{selectedService.ward}</strong>
                      </div>
                    )}
                    {selectedService.street && (
                      <div className="flex justify-between py-1 border-b border-emerald-100/60">
                        <span className="text-gray-600">Đường / Số nhà:</span>
                        <strong>{selectedService.street}</strong>
                      </div>
                    )}
                    {selectedService.latitude && selectedService.longitude && (
                      <div className="flex justify-between py-1 border-b border-emerald-100/60">
                        <span className="text-gray-600">Tọa độ GPS:</span>
                        <a
                          href={`https://www.google.com/maps?q=${selectedService.latitude},${selectedService.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#075985] font-mono hover:underline inline-flex items-center gap-1"
                        >
                          <Compass className="w-3 h-3 text-blue-500" />
                          {selectedService.latitude.toFixed(4)}, {selectedService.longitude.toFixed(4)}
                        </a>
                      </div>
                    )}
                    <div className="pt-1 text-gray-600 italic">
                      {formatAddress(selectedService)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Unified Specifications & Policies */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-bold text-sm text-gray-900 flex items-center justify-between">
                  <span>Thông số & Quy mô dịch vụ</span>
                  <span className="text-xs font-normal text-gray-500">
                    {selectedService.category === "hotel"
                      ? "Lưu trú & Khách sạn"
                      : selectedService.category === "fnb"
                      ? "Ẩm thực & Nhà hàng"
                      : selectedService.category === "transportation"
                      ? "Phương tiện & Vận chuyển"
                      : "Điểm tham quan & Trải nghiệm"}
                  </span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {selectedService.subCategory && (
                    <div>
                      <span className="text-gray-500 block">Phân loại chi tiết:</span>
                      <strong className="text-gray-900">{selectedService.subCategory}</strong>
                    </div>
                  )}
                  {selectedService.category === "hotel" && selectedService.stars && (
                    <div>
                      <span className="text-gray-500 block">Hạng sao:</span>
                      <strong className="text-amber-600 font-semibold">
                        {selectedService.stars} Sao ⭐
                      </strong>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 block">
                      {selectedService.category === "hotel"
                        ? "Tổng số phòng:"
                        : selectedService.category === "transportation"
                        ? "Số lượng chỗ ngồi:"
                        : selectedService.category === "fnb"
                        ? "Sức chứa phục vụ:"
                        : "Sức chứa tối đa:"}
                    </span>
                    <strong className="text-[#075985]">
                      {selectedService.capacity || selectedService.totalRooms || selectedService.seats || "—"}{" "}
                      {selectedService.category === "hotel"
                        ? "phòng"
                        : selectedService.category === "transportation"
                        ? "ghế"
                        : "khách"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Định giá đối tác:</span>
                    <strong className="text-gray-900">
                      {selectedService.category === "hotel" ? "Tính theo phòng" : "Tính theo đầu người"}
                    </strong>
                  </div>
                </div>

                {/* Policies & Special Conditions */}
                {selectedService.policies && (Array.isArray(selectedService.policies) ? selectedService.policies.length > 0 : Boolean(selectedService.policies)) && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-xs font-semibold text-amber-800 block mb-1.5">
                      Chính sách, điều kiện & Thông số đặc thù ({Array.isArray(selectedService.policies) ? selectedService.policies.length : 1}):
                    </span>
                    {Array.isArray(selectedService.policies) ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {selectedService.policies.map((p, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-amber-50/60 rounded-lg border border-amber-200/70 text-gray-800 text-xs flex items-start gap-2"
                          >
                            <span className="text-amber-700 font-bold">•</span>
                            <span className="leading-relaxed">{p}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/70 text-gray-800 text-xs leading-relaxed whitespace-pre-line">
                        {selectedService.policies}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amenities / Features */}
              {selectedService.amenities && selectedService.amenities.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">
                    Tiện nghi & Dịch vụ đi kèm
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedService.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg border border-gray-200 font-medium"
                      >
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer inside modal */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setSelectedService(null)}
                >
                  Đóng
                </Button>
                <Button
                  variant="outline"
                  className="text-[#F97316] border-[#F97316]/30 hover:bg-[#F0F9FF]"
                  onClick={() => {
                    const svc = selectedService;
                    setSelectedService(null);
                    setImageManagementService(svc);
                  }}
                >
                  <ImageIcon className="w-4 h-4 mr-1.5" />
                  Quản lý ảnh
                </Button>
                <Button
                  className="bg-[#075985] hover:bg-[#F97316] text-white"
                  onClick={() => {
                    const svc = selectedService;
                    setSelectedService(null);
                    onEditService(svc);
                  }}
                >
                  <Edit className="w-4 h-4 mr-1.5" />
                  Chỉnh sửa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Upload Manager */}
      {imageManagementService && (
        <ImageUploadManager
          isOpen={!!imageManagementService}
          onClose={() => setImageManagementService(null)}
          onSave={(images, thumbnailIndex) => {
            const updatedService = {
              ...imageManagementService,
              images: images,
              image: images[thumbnailIndex] || images[0],
            };
            onEditService(updatedService);
            setImageManagementService(null);
          }}
          initialImages={imageManagementService.images || [imageManagementService.image]}
          initialThumbnailIndex={0}
          title={`Quản lý ảnh - ${imageManagementService.name}`}
        />
      )}
    </div>
  );
}