import { useState, useMemo } from "react";
import { ProviderProfileLink } from "./ProviderProfileLink";
import { Service } from "@/app/types";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  MapPin,
  Image as ImageIcon,
  Search,
  Hotel,
  Utensils,
  Car,
  Compass,
  Sparkles,
  ClipboardCheck,
  AlertCircle,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { ProviderServiceDetailPage } from "@/app/components/provider/ProviderServiceDetailPage";
import { RejectServiceModal } from "./RejectServiceModal";
import { toast } from "sonner";

interface AdminServiceApprovalPageProps {
  services: Service[];
  onApproveService?: (serviceId: string) => void | Promise<void>;
  onRejectService?: (serviceId: string, reason: string) => void | Promise<void>;
}

export function AdminServiceApprovalPage({
  services,
  onApproveService,
  onRejectService,
}: AdminServiceApprovalPageProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "rejected" | "all">("pending");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<Service | null>(null);
  const [rejectingService, setRejectingService] = useState<Service | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filter only approval-relevant services (pending & rejected, or all)
  const approvalServices = useMemo(() => {
    return services.filter((s) => s.status === "pending" || s.status === "rejected");
  }, [services]);

  const pendingCount = useMemo(() => {
    return services.filter((s) => s.status === "pending").length;
  }, [services]);

  const rejectedCount = useMemo(() => {
    return services.filter((s) => s.status === "rejected").length;
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Tab filter
      if (activeTab === "pending" && service.status !== "pending") return false;
      if (activeTab === "rejected" && service.status !== "rejected") return false;
      if (activeTab === "all" && service.status !== "pending" && service.status !== "rejected") return false;

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
        const matchLocation = (service.province || service.location || "").toLowerCase().includes(query);
        const matchId = service.id.toLowerCase().includes(query);
        if (!matchName && !matchProvider && !matchLocation && !matchId) return false;
      }

      return true;
    });
  }, [services, activeTab, selectedCategory, searchQuery]);

  const handleApprove = async (service: Service) => {
    if (busyId) return;
    setBusyId(service.id);
    try {
      await onApproveService?.(service.id);
      toast.success(`Đã phê duyệt bài đăng "${service.name}" thành công!`);
      if (selectedServiceForDetail?.id === service.id) {
        setSelectedServiceForDetail(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Phê duyệt thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectingService) return;
    try {
      await onRejectService?.(rejectingService.id, reason);
      toast.success(`Đã từ chối bài đăng "${rejectingService.name}"`);
      if (selectedServiceForDetail?.id === rejectingService.id) {
        setSelectedServiceForDetail(null);
      }
      setRejectingService(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác từ chối thất bại.");
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
        backTitle="Quay lại bảng phê duyệt"
        onApprove={async (id) => {
          await onApproveService?.(id);
          setSelectedServiceForDetail(null);
        }}
        onReject={async (id, reason) => {
          await onRejectService?.(id, reason);
          setSelectedServiceForDetail(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header - Tinh gọn, bỏ phần thống kê theo yêu cầu */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Phê Duyệt Bài Đăng Dịch Vụ
        </h1>
        <p className="text-xs text-gray-500">
          Kiểm duyệt bài đăng mới từ các Nhà cung cấp (Lưu trú, Ăn uống, Vận chuyển, Vé tham quan). Kiểm tra tính xác thực, giá cả và hình ảnh trước khi mở bán trên sàn.
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
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === "pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>Chờ duyệt</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "pending" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("rejected")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === "rejected"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>Đã từ chối</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "rejected" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                {rejectedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === "all"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Tất cả ({approvalServices.length})
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
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="font-bold text-gray-800 text-sm">Không có bài đăng nào cần duyệt</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Hiện tại không có dịch vụ nào đang chờ phê duyệt phù hợp với bộ lọc đã chọn.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service, index) => {
                  const imageCount = service.images?.length || 1;
                  const isPending = service.status === "pending";
                  const isRejected = service.status === "rejected";

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
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Chờ duyệt
                            </span>
                          )}
                          {isRejected && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Đã từ chối
                              </span>
                              {service.rejectionReason && (
                                <span
                                  className="text-[10px] text-rose-600 max-w-[130px] truncate underline cursor-help"
                                  title={`Lý do: ${service.rejectionReason}`}
                                >
                                  Lý do: {service.rejectionReason}
                                </span>
                              )}
                            </>
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
                            title="Xem chi tiết để thẩm định"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* KHI ĐANG PENDING: Có nút Duyệt và Từ chối */}
                          {isPending && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busyId === service.id}
                                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleApprove(service)}
                                title="Phê duyệt bài đăng"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => setRejectingService(service)}
                                title="Từ chối phê duyệt"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {/* KHI ĐÃ TỪ CHỐI (REJECTED): TUYỆT ĐỐI KHÔNG CÓ NÚT PHÊ DUYỆT! */}
                          {isRejected && (
                            <span className="text-[11px] text-gray-400 italic">
                              Đã khóa duyệt
                            </span>
                          )}
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
            Hiển thị <strong>{filteredServices.length}</strong> bài đăng trong danh sách phê duyệt
          </span>
          <span className="text-[11px] text-gray-400 font-medium">
            Dạng hiển thị: Bảng dữ liệu (Table View)
          </span>
        </div>
      </div>

      {/* Reject Modal */}
      <RejectServiceModal
        isOpen={!!rejectingService}
        onClose={() => setRejectingService(null)}
        onConfirm={handleReject}
        serviceName={rejectingService?.name}
      />
    </div>
  );
}
