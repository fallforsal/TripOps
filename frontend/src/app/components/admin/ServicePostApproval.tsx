import { useState, useMemo } from "react";
import { Service } from "@/app/types";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  FileText,
  Search,
  MapPin,
  Hotel,
  Utensils,
  Car,
  Compass,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  Filter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { ProviderServiceDetailPage } from "@/app/components/provider/ProviderServiceDetailPage";
import { toast } from "sonner";
import { ProviderProfileLink } from "./ProviderProfileLink";
import { ServiceModerationReason } from "@/app/components/ServiceModerationReason";

interface ServicePostApprovalProps {
  services: Service[];
  onToggleHideService?: (serviceId: string, reason?: string) => void | Promise<void>;
  onDeleteService?: (serviceId: string) => void | Promise<void>;
}

export function ServicePostApproval({
  services,
  onToggleHideService,
  onDeleteService,
}: ServicePostApprovalProps) {
  const [selectedStatus, setSelectedStatus] = useState<"all" | "approved" | "hidden">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<Service | null>(null);

  // Modals state
  const [hidingService, setHidingService] = useState<Service | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Only manage approved and hidden services on marketplace
  const marketServices = useMemo(() => {
    return services.filter((s) => s.status === "approved" || s.status === "hidden");
  }, [services]);

  const activeCount = useMemo(() => {
    return services.filter((s) => s.status === "approved" && !s.isPaused).length;
  }, [services]);

  const hiddenCount = useMemo(() => {
    return services.filter((s) => s.status === "hidden").length;
  }, [services]);

  const filteredServices = useMemo(() => {
    return marketServices.filter((service) => {
      // Status filter
      if (selectedStatus === "approved" && (service.status !== "approved" || service.isPaused)) return false;
      if (selectedStatus === "hidden" && service.status !== "hidden") return false;

      // Category filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "fnb") {
          if (service.category !== "fnb" && service.category !== "restaurant") return false;
        } else if (service.category !== selectedCategory) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = service.name.toLowerCase().includes(query);
        const matchProvider = (service.providerName || "").toLowerCase().includes(query);
        const matchLoc = (service.province || service.location || "").toLowerCase().includes(query);
        const matchId = service.id.toLowerCase().includes(query);
        if (!matchName && !matchProvider && !matchLoc && !matchId) return false;
      }

      return true;
    });
  }, [marketServices, selectedStatus, selectedCategory, searchQuery]);

  const handleConfirmHide = async () => {
    if (!hidingService) return;
    const sId = hidingService.id;
    const reason = hideReason.trim() || "Nội dung bài đăng bị tạm ẩn do vi phạm quy chế hoặc thông tin chưa chính xác.";
    setBusyId(sId);
    try {
      await onToggleHideService?.(sId, reason);
      toast.info(`Đã tạm ẩn bài đăng "${hidingService.name}". Dịch vụ này sẽ không xuất hiện trên sàn.`);
      setHidingService(null);
      setHideReason("");
      if (selectedServiceForDetail?.id === sId) {
        setSelectedServiceForDetail(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác tạm ẩn thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const handleUnhide = async (service: Service) => {
    setBusyId(service.id);
    try {
      await onToggleHideService?.(service.id, "");
      toast.success(`Đã mở lại bài đăng "${service.name}". Dịch vụ đã hiển thị công khai trên sàn.`);
      if (selectedServiceForDetail?.id === service.id) {
        setSelectedServiceForDetail(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mở lại bài đăng thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingService) return;
    const sId = deletingService.id;
    setBusyId(sId);
    try {
      await onDeleteService?.(sId);
      toast.success(`Đã xóa hoàn toàn bài đăng "${deletingService.name}".`);
      setDeletingService(null);
      if (selectedServiceForDetail?.id === sId) {
        setSelectedServiceForDetail(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa bài đăng thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "hotel":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Hotel className="w-3.5 h-3.5" />
            Lưu trú
          </span>
        );
      case "fnb":
      case "restaurant":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <Utensils className="w-3.5 h-3.5" />
            Ẩm thực
          </span>
        );
      case "transportation":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Car className="w-3.5 h-3.5" />
            Vận chuyển
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Compass className="w-3.5 h-3.5" />
            Tham quan
          </span>
        );
    }
  };

  const formatPriceDisplay = (service: Service) => {
    const isHotel = service.category === "hotel";
    const unit = isHotel ? "/ phòng" : "/ người";
    if (service.priceFrom && service.priceTo && service.priceTo > service.priceFrom) {
      return (
        <div>
          <div className="font-bold text-gray-900 text-xs">
            {service.priceFrom.toLocaleString("vi-VN")}đ - {service.priceTo.toLocaleString("vi-VN")}đ
          </div>
          <div className="text-[10px] text-gray-500">{unit} (ước lượng)</div>
        </div>
      );
    }
    return (
      <div>
        <div className="font-bold text-gray-900 text-xs">
          {(service.price || service.priceFrom || 0).toLocaleString("vi-VN")}đ
        </div>
        <div className="text-[10px] text-gray-500">{unit}</div>
      </div>
    );
  };

  const formatAddress = (service: Service) => {
    if (service.fullAddress) return service.fullAddress;
    const parts = [service.ward, service.province].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : service.location || "Chưa cập nhật";
  };

  // If viewing detail of a service
  if (selectedServiceForDetail) {
    return (
      <ProviderServiceDetailPage
        service={selectedServiceForDetail}
        isAdmin={true}
        onBack={() => setSelectedServiceForDetail(null)}
        backTitle="Quay lại danh sách quản lý"
        onToggleHide={onToggleHideService}
        onDelete={onDeleteService ? async (id) => {
          await onDeleteService(id);
          setSelectedServiceForDetail(null);
        } : undefined}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header - Tinh gọn, bỏ phần thống kê theo yêu cầu */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Quản Lý Bài Đăng Dịch Vụ
        </h1>
        <p className="text-xs text-gray-500">
          Giám sát các bài đăng dịch vụ (khách sạn, ăn uống, xe tour, vé tham quan) do Nhà cung cấp đăng tải. Xem chi tiết, tạm ẩn nếu sai lệch hoặc xóa bài đăng vi phạm.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Phân loại:
          </span>
          {[
            { id: "all", label: "Tất cả loại" },
            { id: "hotel", label: "Lưu trú & Khách sạn" },
            { id: "fnb", label: "Ẩm thực & Nhà hàng" },
            { id: "transportation", label: "Phương tiện" },
            { id: "attraction", label: "Tham quan & Vé" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#075985] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Status Tabs Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1 border-t border-gray-100">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên dịch vụ, nhà cung cấp, địa bàn..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedStatus === "all"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Tất cả ({marketServices.length})
            </button>

            <button
              onClick={() => setSelectedStatus("approved")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedStatus === "approved"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>Đang hiển thị</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedStatus === "approved" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setSelectedStatus("hidden")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedStatus === "hidden"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>Đã tạm ẩn</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedStatus === "hidden" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                {hiddenCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLE VIEW (Standardized exactly like Image 5) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] table-fixed text-left border-collapse [&_td]:align-middle">
            <colgroup>
              <col className="w-[3%]" /><col className="w-[30%]" /><col className="w-[14%]" /><col className="w-[8%]" />
              <col className="w-[10%]" /><col className="w-[12%]" /><col className="w-[13%]" /><col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4 min-w-[260px]">Dịch vụ</th>
                <th className="py-3 px-4 min-w-[140px]">Nhà cung cấp</th>
                <th className="py-3 px-4 min-w-[120px]">Phân loại</th>
                <th className="py-3 px-4 min-w-[140px]">Khu vực</th>
                <th className="py-3 px-4 min-w-[130px]">Khoảng giá</th>
                <th className="py-3 px-4 text-center min-w-[120px]">Trạng thái</th>
                <th className="py-3 px-4 text-center min-w-[130px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="font-bold text-gray-800 text-sm">Không tìm thấy bài đăng nào</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Không có dịch vụ nào phù hợp với bộ lọc hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service, index) => {
                  const imageCount = service.images?.length || 1;
                  const isHidden = service.status === "hidden";

                  return (
                    <tr
                      key={service.id}
                      className="hover:bg-[#F0F9FF]/40 transition-colors group"
                    >
                      {/* # STT */}
                      <td className="py-3.5 px-4 text-center text-xs text-gray-500 font-medium">
                        {index + 1}
                      </td>

                      {/* Service Info */}
                      <td className="py-3.5 px-4">
                        <div
                          className="flex items-center gap-3 cursor-pointer group/item"
                          onClick={() => setSelectedServiceForDetail(service)}
                        >
                          <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs">
                            <img
                              src={service.thumbnailUrl || service.image}
                              alt={service.name}
                              className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                            />
                            {imageCount > 1 && (
                              <div
                                className="absolute bottom-1 right-1 bg-black/75 text-white text-[10px] font-semibold px-1 rounded flex items-center gap-0.5"
                                title={`${imageCount} hình ảnh`}
                              >
                                <ImageIcon className="w-2.5 h-2.5" />
                                {imageCount}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[400px] flex-1">
                            <div title={service.name} className="truncate font-bold text-gray-900 group-hover/item:text-[#075985] transition-colors">
                              {service.name}
                            </div>
                            <div title={service.description} className="mt-0.5 truncate text-xs text-gray-500">
                              {service.description || "Chưa có mô tả chi tiết."}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Provider Name */}
                      <td className="py-3.5 px-4">
                        <ProviderProfileLink providerId={service.providerId} name={service.providerName} />
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {getCategoryBadge(service.category)}
                        </div>
                      </td>

                      {/* Area */}
                      <td className="py-3.5 px-4 text-xs text-gray-700">
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate" title={service.province}>{service.province || "Chưa cập nhật"}</span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4">
                        {formatPriceDisplay(service)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isHidden ? (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <EyeOff className="w-3 h-3 text-amber-600" />
                                Đã tạm ẩn
                              </span>
                              <ServiceModerationReason service={service} />
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {service.isPaused ? "Provider tạm ngừng" : "Đang hiển thị"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {/* Xem chi tiết */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-[#075985] hover:bg-blue-50"
                            onClick={() => setSelectedServiceForDetail(service)}
                            title="Xem chi tiết bài đăng"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Tạm ẩn hoặc Mở lại */}
                          {isHidden ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === service.id}
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleUnhide(service)}
                              title="Mở lại hiển thị công khai trên sàn"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => setHidingService(service)}
                              title="Tạm ẩn bài đăng (xàm / vi phạm)"
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Xóa bài đăng */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => setDeletingService(service)}
                            title="Xóa bài đăng vi phạm"
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

        {/* Footer info */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
          <span>
            Hiển thị <strong>{filteredServices.length}</strong> bài đăng trong danh sách quản lý
          </span>
          <span className="text-[11px] text-gray-400 font-medium">
            Dạng hiển thị: Bảng dữ liệu (Table View)
          </span>
        </div>
      </div>

      {/* Hide Modal - Solid Crisp styling */}
      <Dialog open={!!hidingService} onOpenChange={() => setHidingService(null)}>
        <DialogContent className="max-w-md bg-white text-gray-900 border border-gray-200 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-amber-600" />
              Tạm ẩn bài đăng dịch vụ
            </DialogTitle>
          </DialogHeader>

          {hidingService && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <span className="text-gray-400 block mb-0.5">Dịch vụ đang thao tác:</span>
                <strong className="text-gray-900 font-bold block">{hidingService.name}</strong>
                <span className="text-gray-500 text-[11px] mt-0.5 block">
                  Nhà cung cấp: {hidingService.providerName}
                </span>
              </div>

              {/* Quick suggestions */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-gray-600">Gợi ý lý do nhanh:</span>
                <div className="flex flex-col gap-1.5">
                  {[
                    "Thông tin dịch vụ sai lệch hoặc không đúng thực tế.",
                    "Bảng giá ảo hoặc phụ thu bất hợp lý.",
                    "Hình ảnh chất lượng kém hoặc sao chép.",
                    "Cơ sở tạm ngưng hoạt động hoặc đổi địa chỉ.",
                  ].map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setHideReason(sug)}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors text-left font-medium"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nhập cụ thể lý do tạm ẩn *
                </label>
                <Textarea
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể..."
                  rows={3}
                  className="text-xs rounded-xl bg-white border-gray-300 focus:border-amber-500 text-gray-900"
                />
              </div>

              <DialogFooter className="gap-2 pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHidingService(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Hủy bỏ
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmHide}
                  disabled={busyId === hidingService.id}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs"
                >
                  {busyId === hidingService.id ? "Đang xử lý..." : "Xác nhận tạm ẩn bài đăng"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingService} onOpenChange={() => setDeletingService(null)}>
        <DialogContent className="max-w-md bg-white text-gray-900 border border-gray-200 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Xóa bài đăng dịch vụ
            </DialogTitle>
          </DialogHeader>

          {deletingService && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-gray-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn bài đăng{" "}
                <strong className="text-gray-900 font-bold">"{deletingService.name}"</strong>? Hành động này sẽ gỡ bỏ hoàn toàn dịch vụ khỏi hệ thống và không thể hoàn tác.
              </p>

              <DialogFooter className="gap-2 pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingService(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Hủy bỏ
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={busyId === deletingService.id}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
                >
                  {busyId === deletingService.id ? "Đang xóa..." : "Xác nhận xóa vĩnh viễn"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
