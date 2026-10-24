import { Tour } from "@/app/types";
import {
  X,
  MapPin,
  Clock,
  Users,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface PublicTourDetailModalProps {
  tour: Tour;
  onClose: () => void;
  onBookNow?: () => void;
}

export function PublicTourDetailModal({
  tour,
  onClose,
  onBookNow,
}: PublicTourDetailModalProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="fixed inset-0 bg-[#075985]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-auto border border-[#CBD5E1] shadow-[0_20px_60px_rgb(0,0,0,0.15)] font-sans">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#CBD5E1] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#F97316]" />
            <span className="text-xs uppercase font-semibold tracking-widest text-[#075985]">
              Chi tiết hành trình TripOps
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#CBD5E1] hover:border-[#075985] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#075985]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Main Visual */}
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-[#F0F9FF] border border-[#CBD5E1]">
            <img
              src={tour.image}
              alt={tour.name}
              className="w-full h-full object-cover filter saturate-[0.92]"
            />
            <div className="absolute top-4 left-4 bg-[#F0F9FF]/90 backdrop-blur-md text-[#075985] px-3 py-1 rounded-full text-xs font-medium border border-[#CBD5E1]">
              {tour.destination}
            </div>
            {tour.companyName && (
              <div className="absolute bottom-4 left-4 bg-[#075985]/95 text-white px-3 py-1 rounded-full text-xs font-light">
                Đơn vị tổ chức: {tour.companyName}
              </div>
            )}
          </div>

          {/* Title & Metadata Strip */}
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-4xl font-serif text-[#075985] leading-snug">
              {tour.name}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F0F9FF] border border-[#CBD5E1]">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#475569] block">Thời lượng</span>
                <span className="text-sm font-semibold text-[#075985] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#F97316]" />
                  {tour.duration}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#475569] block">Quy mô đoàn</span>
                <span className="text-sm font-semibold text-[#075985] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#F97316]" />
                  Tối đa {tour.maxGuests} người
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#475569] block">Điểm xuất phát</span>
                <span className="text-sm font-semibold text-[#075985] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                  {tour.destination}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#475569] block">Dịch vụ đi kèm</span>
                <span className="text-sm font-semibold text-[#075985] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
                  Bảo hiểm 100%
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-sm uppercase tracking-wider font-semibold text-[#F97316]">
              Trải nghiệm nổi bật
            </h3>
            <p className="text-sm text-[#0F172A]/80 leading-relaxed font-light">
              {tour.description}
            </p>
          </div>

          {/* TripOps Guarantees */}
          <div className="p-6 rounded-2xl bg-[#075985] text-[#F0F9FF] space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-[#F97316] font-semibold">
              Cam kết chuẩn mực dịch vụ TripOps
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#F0F9FF]/80 font-light">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F97316]" />
                <span>Không phát sinh phụ phí ẩn trong suốt hành trình</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F97316]" />
                <span>Khách sạn & phương tiện được kiểm tra thực tế</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F97316]" />
                <span>Hướng dẫn viên bản địa am hiểu văn hóa sâu sắc</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F97316]" />
                <span>Hỗ trợ điều phối viên 1:1 qua hotline khẩn cấp</span>
              </div>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#CBD5E1] px-6 sm:px-8 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#475569] block">Chi phí trọn gói từ</span>
            <span className="text-2xl font-serif font-semibold text-[#075985]">
              {formatPrice(tour.price)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[#CBD5E1] text-xs font-medium text-[#075985] hover:border-[#075985] transition-colors"
            >
              Đóng lại
            </button>
            <button
              onClick={() => {
                onClose();
                onBookNow?.();
              }}
              className="px-6 py-2.5 rounded-full bg-[#075985] text-white text-xs font-semibold hover:bg-[#F97316] transition-all duration-300 shadow-sm flex items-center gap-2"
            >
              <span>Đặt hành trình này</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
