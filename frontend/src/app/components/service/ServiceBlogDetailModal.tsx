import React, { useState } from "react";
import { Service } from "@/app/types";
import {
  X,
  MapPin,
  Star,
  Building2,
  Utensils,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Navigation,
  Info,
  Check,
  FileText,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface ServiceBlogDetailModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (service: Service) => void;
  isSelected?: boolean;
  selectButtonText?: string;
}

function formatVND(n?: number) {
  if (!n) return "0đ";
  return n.toLocaleString("vi-VN") + "đ";
}

export function ServiceBlogDetailModal({
  service,
  isOpen,
  onClose,
  onSelect,
  isSelected = false,
  selectButtonText = "Chọn dịch vụ này cho tour",
}: ServiceBlogDetailModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"blog" | "map" | "policies">("blog");

  if (!isOpen || !service) return null;

  const images = service.images && service.images.length > 0
    ? service.images
    : [service.image];

  const isHotel = service.category === "hotel";
  const lat = service.latitude || 11.9404;
  const lng = service.longitude || 108.4583;

  const mapEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=vi&z=15&output=embed`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.03}%2C${lat - 0.02}%2C${lng + 0.03}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`;
  const googleMapsExternalUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-purple-50/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E0F2FE] text-blue-800 border border-[#CBD5E1]">
              <Sparkles className="w-3.5 h-3.5 text-[#075985]" />
              Đối tác Nền tảng Du lịch
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Đã xác minh
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* Hero Gallery */}
          <div className="space-y-3">
            <div className="relative h-64 sm:h-80 md:h-96 w-full rounded-2xl overflow-hidden bg-gray-900 group shadow-md">
              <img
                src={images[activeImageIndex]}
                alt={service.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              />

              {/* Navigation arrows if multiple images */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-80 hover:opacity-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-80 hover:opacity-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-full font-medium">
                    {activeImageIndex + 1} / {images.length} ảnh
                  </div>
                </>
              )}

              {/* Floating badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                <span className="bg-black/60 backdrop-blur-xs text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                  {isHotel ? <Building2 className="w-3.5 h-3.5 text-amber-400" /> : <Utensils className="w-3.5 h-3.5 text-emerald-400" />}
                  {isHotel ? "Khách sạn & Lưu trú" : "Ẩm thực & Nhà hàng"}
                </span>
                {service.stars && (
                  <span className="bg-amber-400 text-amber-950 font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    {service.stars} <Star className="w-3.5 h-3.5 fill-amber-950" />
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail row */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      activeImageIndex === idx ? "border-[#075985] ring-2 ring-blue-300" : "border-gray-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Key Highlights */}
          <div className="space-y-3 border-b border-gray-100 pb-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug">
                  {service.name}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                  <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{service.street ? `${service.street}, ${service.ward || ""}, ${service.province || service.location}` : service.location}</span>
                </div>
              </div>

              {/* Price card */}
              <div className="bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl p-3.5 text-right flex-shrink-0 min-w-[200px]">
                <p className="text-xs font-semibold text-[#075985] uppercase tracking-wide">
                  {isHotel ? "Giá tham khảo / đêm" : "Đơn giá tham khảo / suất"}
                </p>
                <p className="text-xl sm:text-2xl font-black text-blue-900 mt-0.5">
                  {formatVND(service.pricePerPerson || service.price)}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  * Công ty du lịch sẽ chốt giá B2B chính thức
                </p>
              </div>
            </div>

            {/* Provider banner */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {service.providerName?.charAt(0) || "P"}
                </div>
                <div>
                  <p className="text-xs text-amber-800 font-medium">Nhà cung cấp dịch vụ trực thuộc hệ thống:</p>
                  <p className="text-sm font-bold text-gray-900">{service.providerName || "Tổ hợp Dịch vụ Du lịch Heritage"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-100/70 px-3 py-1.5 rounded-lg border border-amber-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Hợp đồng đối tác B2B &amp; Đảm bảo chất lượng</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 gap-6 text-sm font-semibold">
            <button
              onClick={() => setActiveTab("blog")}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "blog"
                  ? "border-[#075985] text-[#075985] font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              Bài viết giới thiệu chi tiết
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "map"
                  ? "border-[#075985] text-[#075985] font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <MapPin className="w-4 h-4" />
              Vị trí trên bản đồ Google Maps
            </button>
            <button
              onClick={() => setActiveTab("policies")}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "policies"
                  ? "border-[#075985] text-[#075985] font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Info className="w-4 h-4" />
              Tiện ích &amp; Chính sách phục vụ
            </button>
          </div>

          {/* Tab 1: Blog Content */}
          {activeTab === "blog" && (
            <div className="space-y-6">
              <div className="prose max-w-none text-gray-700 leading-relaxed text-sm sm:text-base bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Tổng quan trải nghiệm
                </h3>
                <p className="whitespace-pre-line text-gray-700">
                  {service.description}
                </p>
              </div>

              {/* Extra details based on Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                {isHotel ? (
                  <>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1.5">
                      <p className="text-gray-500 text-xs">Loại phòng đề xuất:</p>
                      <p className="font-bold text-gray-900">{service.roomType || "Phòng tiêu chuẩn Deluxe / Suite"}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1.5">
                      <p className="text-gray-500 text-xs">Giờ nhận &amp; trả phòng:</p>
                      <p className="font-bold text-gray-900">
                        Nhận: {service.checkInTime || "14:00"} — Trả: {service.checkOutTime || "12:00"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1.5">
                      <p className="text-gray-500 text-xs">Phong cách ẩm thực:</p>
                      <p className="font-bold text-gray-900">{service.cuisineType || "Đặc sản bản địa & Cơm đoàn du lịch"}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1.5">
                      <p className="text-gray-500 text-xs">Giờ mở cửa phục vụ:</p>
                      <p className="font-bold text-gray-900">{service.openingHours || "09:00 - 22:00 hàng ngày"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Map & Location */}
          {activeTab === "map" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#F0F9FF] border border-[#CBD5E1] p-4 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#075985]" />
                    Địa chỉ chính xác đã được gắn toạ độ GPS:
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {service.street ? `${service.street}, ${service.ward || ""}, ${service.province || service.location}` : service.location}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    Toạ độ GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
                  </p>
                </div>

                <a
                  href={googleMapsExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#075985] hover:bg-[#F97316] text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex-shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Mở trên Google Maps
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>

              {/* Embedded Interactive Map */}
              <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100">
                <iframe
                  title="Vị trí trên bản đồ"
                  src={mapEmbedUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
              <p className="text-xs text-gray-400 text-center italic">
                * Bản đồ tương tác trực quan giúp bạn xem xét vị trí khách sạn/nhà hàng so với lịch trình di chuyển của tour.
              </p>
            </div>
          )}

          {/* Tab 3: Amenities & Policies */}
          {activeTab === "policies" && (
            <div className="space-y-6">
              {/* Amenities */}
              {service.amenities && service.amenities.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Tiện nghi &amp; Dịch vụ đi kèm
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {service.amenities.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200/80 text-xs sm:text-sm text-gray-800"
                      >
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policies */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#075985]" />
                  Quy định &amp; Chính sách phục vụ
                </h4>
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2 text-xs sm:text-sm text-gray-800">
                  {service.policies && Array.isArray(service.policies) ? (
                    service.policies.map((p, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <p>• Phục vụ đoàn tour lữ hành và khách lẻ theo tiêu chuẩn đối tác nền tảng.</p>
                      <p>• Miễn phí huỷ đặt trước 48 giờ đối với phòng và 24 giờ đối với bàn tiệc.</p>
                      <p>• Xuất hoá đơn VAT điện tử đầy đủ theo thông tin của công ty du lịch.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {isSelected ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Dịch vụ này hiện đang được chọn làm phương án thay thế trong tour.
              </span>
            ) : (
              <span>Bấm chọn dịch vụ nếu bạn muốn đưa vào chương trình tour tùy chỉnh của mình.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-initial text-xs sm:text-sm"
            >
              Đóng
            </Button>

            {onSelect && (
              <Button
                onClick={() => {
                  onSelect(service);
                  onClose();
                }}
                className={`flex-1 sm:flex-initial font-bold text-xs sm:text-sm shadow-md transition-all ${
                  isSelected
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-[#075985] hover:bg-[#F97316] text-white"
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Đã chọn dịch vụ này
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    {selectButtonText}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
