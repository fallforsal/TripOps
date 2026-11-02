import { useState } from "react";
import { Service } from "@/app/types";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Image as ImageIcon,
  MapPin,
  Star,
  Hotel,
  Utensils,
  Compass,
  Sparkles,
  Car,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Calendar,
  DollarSign,
  Users,
  ShieldCheck,
  Info,
  ExternalLink,
  FileText,
  Eye,
  EyeOff,
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
import { ImageUploadManager } from "../ImageUploadManager";

interface ProviderServiceDetailPageProps {
  service: Service;
  onBack: () => void;
  onEdit?: (service: Service) => void;
  onDelete: (serviceId: string) => void;
  onUpdateServiceImages?: (serviceId: string, images: string[], thumbnail: string) => void;
  isAdmin?: boolean;
  onToggleHide?: (serviceId: string, reason?: string) => void;
}

export function ProviderServiceDetailPage({
  service,
  onBack,
  onEdit,
  onDelete,
  onUpdateServiceImages,
  isAdmin = false,
  onToggleHide,
}: ProviderServiceDetailPageProps) {
  const imagesList = service.images && service.images.length > 0
    ? service.images
    : [service.image];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showImageManager, setShowImageManager] = useState(false);
  const [showAdminHideModal, setShowAdminHideModal] = useState(false);
  const [adminHideReason, setAdminHideReason] = useState("");

  const quickReasonSuggestions = [
    "Thông tin dịch vụ sai lệch, nhảm nhí không đúng thực tế.",
    "Bảng giá ảo hoặc phụ thu bất hợp lý.",
    "Hình ảnh bài đăng chất lượng kém hoặc sao chép trái phép.",
    "Cơ sở dịch vụ đã tạm dừng hoạt động hoặc đổi địa chỉ.",
    "Bài đăng trùng lặp hoặc spam trên sàn.",
  ];

  const getStatusBadge = (status: Service["status"]) => {
    switch (status) {
      case "hidden":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Đã tạm ẩn trên sàn (Xàm / Vi phạm)
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {isAdmin ? "Đang hiển thị công khai trên sàn" : "Đã phê duyệt (Đang hoạt động)"}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Bị từ chối kiểm duyệt
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đang hiển thị công khai
          </span>
        );
    }
  };

  const getCategoryMeta = () => {
    switch (service.category) {
      case "hotel":
        return {
          label: "Lưu trú & Khách sạn",
          icon: Hotel,
          color: "bg-[#F0F9FF] text-[#075985] border-[#CBD5E1]",
          unit: "/ phòng",
          capacityLabel: "Tổng số phòng",
          capacityUnit: "phòng",
        };
      case "fnb":
      case "restaurant":
        return {
          label: "Ẩm thực & Nhà hàng",
          icon: Utensils,
          color: "bg-orange-50 text-orange-700 border-orange-200",
          unit: "/ người",
          capacityLabel: "Sức chứa phục vụ",
          capacityUnit: "khách",
        };
      case "transportation":
        return {
          label: "Phương tiện & Vận chuyển",
          icon: Car,
          color: "bg-cyan-50 text-cyan-700 border-cyan-200",
          unit: "/ người",
          capacityLabel: "Số lượng chỗ ngồi",
          capacityUnit: "ghế",
        };
      case "attraction":
      case "activity":
      default:
        return {
          label: "Điểm tham quan & Hoạt động",
          icon: Compass,
          color: "bg-teal-50 text-teal-700 border-teal-200",
          unit: "/ người",
          capacityLabel: "Sức chứa tối đa / lượt",
          capacityUnit: "khách",
        };
    }
  };

  const meta = getCategoryMeta();
  const Icon = meta.icon;

  const formatAddress = () => {
    // Strictly 2 levels: Ward and Province (NO district)
    const parts = [service.street, service.ward, service.province].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    return service.location || "Chưa cập nhật";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="rounded-xl border-gray-200 hover:bg-gray-100 text-gray-700 font-medium text-xs sm:text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {isAdmin ? "Quay lại danh sách Quản lý Bài đăng" : "Quay lại bảng dịch vụ"}
          </Button>
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
            <span>/</span>
            <span>{isAdmin ? "Giám sát bài đăng" : "Dịch vụ"}</span>
            <span>/</span>
            <span className="text-gray-700 font-medium truncate max-w-[200px]">
              {service.name}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isAdmin ? (
            <>
              {service.status === "hidden" ? (
                <Button
                  size="sm"
                  onClick={() => onToggleHide?.(service.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs text-xs font-semibold gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mở hiển thị lại bài đăng
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAdminHideModal(true)}
                  className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-semibold gap-1.5"
                >
                  <EyeOff className="w-4 h-4 text-amber-600" />
                  Tạm ẩn bài đăng (Xàm / Vi phạm)
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl text-xs font-semibold gap-1.5"
                onClick={() => {
                  if (
                    confirm(
                      `[Admin] Bạn có chắc chắn muốn xóa bài đăng "${service.name}"? Hành động này sẽ gỡ bỏ hoàn toàn bài đăng khỏi hệ thống.`
                    )
                  ) {
                    onDelete(service.id);
                    onBack();
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
                Xóa bài đăng
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-[#F97316] border-[#F97316]/30 hover:bg-[#F0F9FF] rounded-xl"
                onClick={() => setShowImageManager(true)}
              >
                <ImageIcon className="w-4 h-4 mr-1.5" />
                Quản lý ảnh ({imagesList.length})
              </Button>

              <Button
                size="sm"
                className="bg-[#075985] hover:bg-[#F97316] text-white rounded-xl shadow-xs"
                onClick={() => onEdit?.(service)}
              >
                <Edit className="w-4 h-4 mr-1.5" />
                Chỉnh sửa
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                onClick={() => {
                  if (
                    confirm(
                      `Bạn có chắc chắn muốn xóa bài đăng "${service.name}"? Hành động này không thể hoàn tác.`
                    )
                  ) {
                    onDelete(service.id);
                    onBack();
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Admin Hidden Notice Banner */}
      {isAdmin && service.status === "hidden" && (
        <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-900 text-sm">
              Bài đăng dịch vụ đang bị tạm ẩn khỏi sàn
            </h4>
            <p className="text-xs text-rose-700 mt-1">
              <strong>Lý do kiểm duyệt Admin:</strong> {service.hiddenReason || "Thông tin dịch vụ không chính xác, nhảm nhí hoặc không phù hợp với tiêu chuẩn sàn."}
            </p>
            <p className="text-xs text-rose-600 mt-0.5">
              Các công ty du lịch hiện không thể tìm thấy hoặc gán dịch vụ này vào các tour mới trên sàn.
            </p>
          </div>
        </div>
      )}

      {/* Rejection / Moderation Status Banner */}
      {service.status === "rejected" && (
        <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-900 text-sm">
              Bài đăng bị từ chối kiểm duyệt
            </h4>
            <p className="text-xs text-rose-700 mt-1">
              <strong>Lý do từ Admin:</strong> {service.rejectionReason || "Thông tin dịch vụ chưa đầy đủ hoặc không đạt tiêu chuẩn."}
            </p>
            <p className="text-xs text-rose-600 mt-1">
              Vui lòng bấm nút <strong>Chỉnh sửa</strong> ở trên để cập nhật lại thông tin theo yêu cầu và gửi duyệt lại.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => onEdit(service)}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl flex-shrink-0"
          >
            Sửa & Gửi lại
          </Button>
        </div>
      )}

      {service.status === "pending" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-xs text-amber-800">
            <strong>Bài đăng đang chờ Admin xét duyệt:</strong> Dịch vụ sẽ tự động kích hoạt và có thể được các công ty lữ hành tích hợp vào tour ngay sau khi được phê duyệt.
          </div>
        </div>
      )}

      {/* Hero Showcase: Photos and Main Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        {/* Left: Interactive Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative h-80 sm:h-96 w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
            <img
              src={imagesList[activeImageIndex] || service.image}
              alt={service.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute top-4 left-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md bg-white/90 border border-gray-200 shadow-sm`}>
                <Icon className="w-4 h-4 text-[#075985]" />
                {meta.label}
              </span>
            </div>
            <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Ảnh {activeImageIndex + 1} / {imagesList.length}
            </div>
          </div>

          {/* Thumbnails list */}
          {imagesList.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx
                      ? "border-[#075985] ring-2 ring-blue-600/30 scale-102"
                      : "border-gray-200 opacity-75 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Key Info & Overview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {getStatusBadge(service.status)}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {service.name}
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-1">
              Mã dịch vụ: {service.id}
            </p>

            <div className="flex items-start gap-2 mt-3 text-xs text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{formatAddress()}</span>
            </div>

            {/* Price Box */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border border-blue-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                {service.priceFrom && service.priceTo
                  ? `Khoảng giá dự kiến / ${service.category === "hotel" ? "phòng" : "người"}`
                  : "Đơn giá niêm yết"}
              </span>
              {service.priceFrom && service.priceTo ? (
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#075985]">
                      {service.priceFrom.toLocaleString("vi-VN")}đ - {service.priceTo.toLocaleString("vi-VN")}đ
                    </span>
                    <span className="text-xs font-semibold text-[#075985]">
                      / {service.category === "hotel" ? "phòng" : "người"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {service.category === "hotel"
                      ? "Khoảng giá theo phòng/đêm giúp công ty lữ hành dễ dàng ước tính chi phí khi thiết kế tour."
                      : "Khoảng giá theo đầu người giúp công ty lữ hành dễ dàng ước tính chi phí khi thiết kế tour."}
                  </p>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-[#075985]">
                    {service.price?.toLocaleString("vi-VN")}đ
                  </span>
                  <span className="text-xs font-medium text-gray-600">
                    {meta.unit}
                  </span>
                </div>
              )}

              {service.pricePerPerson && !service.priceFrom && (
                <div className="mt-2 pt-2 border-t border-[#CBD5E1]/50 flex justify-between text-xs text-gray-700">
                  <span>Giá tính theo người:</span>
                  <strong>{service.pricePerPerson.toLocaleString("vi-VN")}đ/người</strong>
                </div>
              )}

              {service.childPrice && (
                <div className="mt-1 flex justify-between text-xs text-gray-700">
                  <span>Giá vé trẻ em:</span>
                  <strong>{service.childPrice.toLocaleString("vi-VN")}đ/trẻ</strong>
                </div>
              )}
            </div>
          </div>

          {/* Quick Specs summary */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
            <div className="p-2.5 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block">{meta.capacityLabel}:</span>
              <strong className="text-gray-900 text-sm">
                {service.capacity || service.totalRooms || service.seats || "—"} {meta.capacityUnit}
              </strong>
            </div>

            {service.category === "hotel" && service.stars ? (
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Xếp hạng:</span>
                <strong className="text-amber-600 text-sm">{service.stars} Sao ⭐</strong>
              </div>
            ) : (
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">Phân loại:</span>
                <strong className="text-gray-900 text-sm">{service.subCategory || "Tiêu chuẩn"}</strong>
              </div>
            )}

            <div className="p-2.5 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block">Ngày tạo bài:</span>
              <strong className="text-gray-900">
                {new Date(service.createdAt).toLocaleDateString("vi-VN")}
              </strong>
            </div>

            <div className="p-2.5 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block">Cập nhật:</span>
              <strong className="text-gray-900">
                {service.updatedAt ? new Date(service.updatedAt).toLocaleDateString("vi-VN") : "Gần đây"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Detailed Description & Category Specs */}
        <div className="md:col-span-2 space-y-6">
          {/* 1. Description */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#075985]" />
              Mô tả chi tiết dịch vụ
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50/60 p-4 rounded-xl border border-gray-100">
              {service.description}
            </p>
          </div>

          {/* 2. Category-Specific Details */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <Icon className="w-5 h-5 text-[#075985]" />
              Thông số & Quy mô dịch vụ [{meta.label}]
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 block mb-0.5">Tên cơ sở / Dịch vụ:</span>
                <span className="font-semibold text-gray-900 text-sm">
                  {service.name}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 block mb-0.5">Loại hình / Phân loại:</span>
                <span className="font-semibold text-gray-900 text-sm">
                  {service.subCategory || "Dịch vụ tiêu chuẩn"}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 block mb-0.5">{meta.capacityLabel}:</span>
                <span className="font-bold text-[#075985] text-sm">
                  {service.capacity || service.totalRooms || service.seats || "Đang cập nhật"} {meta.capacityUnit}
                </span>
              </div>

              {service.category === "hotel" && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block mb-0.5">Xếp hạng sao:</span>
                  <span className="font-semibold text-amber-600 text-sm">
                    {service.stars && service.stars > 0 ? `${service.stars} Sao ⭐` : "Tiêu chuẩn du lịch"}
                  </span>
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 block mb-0.5">Đơn vị định giá đối tác:</span>
                <span className="font-semibold text-gray-900 text-sm">
                  Khoảng giá tính theo {service.category === "hotel" ? "phòng / đêm" : "người (đầu khách)"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Unified Policies & Special Operating Conditions (Gộp vào 1 trường duy nhất) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Chính sách, điều kiện & Thông số đặc thù
              </h3>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs">
                Quy chuẩn áp dụng
              </Badge>
            </div>

            <p className="text-xs text-gray-500">
              Bao gồm thông tin vận hành chuyên biệt (giờ giấc nhận/trả/đón khách, quy định hủy phòng, phụ thu trẻ em/ngày lễ, dòng xe, set menu, quyền lợi vé...) được chuẩn hóa trong hợp đồng tour.
            </p>

            {service.policies && (Array.isArray(service.policies) ? service.policies.length > 0 : Boolean(service.policies)) ? (
              <div className="space-y-2">
                {Array.isArray(service.policies) ? (
                  service.policies.map((policy, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 text-gray-800 text-sm flex items-start gap-2.5 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="font-normal">{policy}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/60 text-gray-800 text-sm leading-relaxed whitespace-pre-line font-normal">
                    {service.policies}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-500 text-sm italic">
                Chưa có ghi chú chính sách đặc thù. Nhà cung cấp có thể chỉnh sửa để bổ sung thêm quy định giờ giấc, hoàn hủy và phụ thu.
              </div>
            )}
          </div>

          {/* 3. Amenities List */}
          {service.amenities && service.amenities.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#075985]" />
                Tiện nghi & Dịch vụ đi kèm
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {service.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-[#F0F9FF]/80 text-blue-800 text-xs font-semibold rounded-xl border border-[#CBD5E1] flex items-center gap-1.5"
                  >
                    ✓ {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 col): Address, Map & System Info */}
        <div className="space-y-6">
          {/* Address Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Địa chỉ
            </h3>
            <div className="space-y-3 text-xs">
              {service.province && (
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Tỉnh / Thành phố:</span>
                  <strong className="text-gray-900">{service.province}</strong>
                </div>
              )}
              {service.ward && (
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Phường / Xã:</span>
                  <strong className="text-gray-900">{service.ward}</strong>
                </div>
              )}
              {service.street && (
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Đường / Số nhà:</span>
                  <strong className="text-gray-900">{service.street}</strong>
                </div>
              )}
              <div className="pt-2">
                <span className="text-gray-500 block mb-1">Địa chỉ đầy đủ:</span>
                <p className="text-gray-800 font-medium italic bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                  {formatAddress()}
                </p>
              </div>

              {/* Map Preview & Google Maps Link */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-[#075985]" />
                    Tọa độ GPS:
                  </span>
                  <span className="font-mono text-gray-800 font-semibold">
                    {(service.latitude || 11.9404).toFixed(4)}, {(service.longitude || 108.4583).toFixed(4)}
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden border border-gray-200 h-40 bg-gray-100 relative">
                  <iframe
                    title="Bản đồ vị trí dịch vụ"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${service.latitude || 11.9404},${service.longitude || 108.4583}&hl=vi&z=15&output=embed`}
                  />
                </div>

                <a
                  href={`https://www.google.com/maps?q=${service.latitude || 11.9404},${service.longitude || 108.4583}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#F0F9FF] text-[#075985] hover:bg-[#E0F2FE] font-medium text-xs border border-[#CBD5E1] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở vị trí trên Google Maps
                </a>
              </div>
            </div>
          </div>

          {/* System metadata */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-gray-900">
              Thông tin hệ thống
            </h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Nhà cung cấp:</span>
                <strong>{service.providerName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Mã số định danh:</span>
                <span className="font-mono">{service.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Ngày tạo bài:</span>
                <span>{new Date(service.createdAt).toLocaleString("vi-VN")}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Trạng thái:</span>
                {getStatusBadge(service.status)}
              </div>
            </div>
          </div>

          {/* Quick Action Footer */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
            {isAdmin ? (
              <div className="space-y-2">
                <div className="p-2.5 bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl text-xs text-blue-900">
                  <p className="font-semibold flex items-center gap-1.5 text-blue-950 mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#075985]" /> Giám sát bài đăng (Admin)
                  </p>
                  <p className="text-[11px] text-[#075985] leading-relaxed">
                    Bạn đang xem toàn bộ thông tin bài đăng dịch vụ do nhà cung cấp đăng tải.
                  </p>
                </div>

                {service.status === "hidden" ? (
                  <Button
                    onClick={() => onToggleHide?.(service.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Mở hiển thị lại bài đăng
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowAdminHideModal(true)}
                    className="w-full border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-semibold"
                  >
                    <EyeOff className="w-4 h-4 mr-1.5 text-amber-600" />
                    Tạm ẩn bài đăng (Xàm / Vi phạm)
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    if (
                      confirm(
                        `[Admin] Bạn có chắc chắn muốn xóa bài đăng "${service.name}"? Hành động này sẽ gỡ bỏ hoàn toàn bài đăng khỏi hệ thống.`
                      )
                    ) {
                      onDelete(service.id);
                      onBack();
                    }
                  }}
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Xóa bài đăng vĩnh viễn
                </Button>
              </div>
            ) : (
              <>
                <Button
                  className="w-full bg-[#075985] hover:bg-[#F97316] text-white rounded-xl"
                  onClick={() => onEdit?.(service)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Chỉnh sửa thông tin
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-[#F97316] border-[#F97316]/30 hover:bg-[#F0F9FF] rounded-xl"
                  onClick={() => setShowImageManager(true)}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Cập nhật ảnh bài đăng
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Upload Manager Modal */}
      {showImageManager && (
        <ImageUploadManager
          isOpen={showImageManager}
          onClose={() => setShowImageManager(false)}
          onSave={(images, thumbnailIndex) => {
            const updated = {
              ...service,
              images: images,
              image: images[thumbnailIndex] || images[0],
            };
            onEdit?.(updated);
            if (onUpdateServiceImages) {
              onUpdateServiceImages(service.id, images, images[thumbnailIndex] || images[0]);
            }
            setShowImageManager(false);
          }}
          initialImages={imagesList}
          initialThumbnailIndex={activeImageIndex}
          title={`Quản lý thư viện ảnh - ${service.name}`}
        />
      )}

      {/* Admin Hide Service Modal */}
      {isAdmin && (
        <Dialog open={showAdminHideModal} onOpenChange={setShowAdminHideModal}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700 text-base">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Tạm ẩn bài đăng dịch vụ khỏi sàn
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Chọn hoặc nhập lý do tạm ẩn bài đăng "<strong>{service.name}</strong>". Bài đăng bị ẩn sẽ không hiển thị trên sàn và công ty du lịch không thể gán vào tour mới.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block">
                  Lý do thường gặp (bấm để chọn nhanh):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickReasonSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAdminHideReason(suggestion)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-all ${
                        adminHideReason === suggestion
                          ? "bg-amber-100 border-amber-400 text-amber-900 font-semibold"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Nội dung chi tiết lý do ẩn:
                </label>
                <Textarea
                  rows={3}
                  placeholder="Nhập lý do chi tiết..."
                  value={adminHideReason}
                  onChange={(e) => setAdminHideReason(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdminHideModal(false)}
                  className="rounded-xl text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const reason = adminHideReason.trim() || "Thông tin dịch vụ bị tạm ẩn do không chính xác hoặc không phù hợp.";
                    onToggleHide?.(service.id, reason);
                    setShowAdminHideModal(false);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
                >
                  Xác nhận Tạm ẩn bài đăng
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
