import { useState } from "react";
import { MapPin, Clock, Users, Building2, Star, ArrowRight } from "lucide-react";
import { Tour } from "@/app/types";
import { Button } from "@/app/components/ui/button";

interface TourCardProps {
  tour: Tour;
  onViewTour: (tour: Tour) => void;
  onBookTour?: (tour: Tour) => void;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop";

export function TourCard({ tour, onViewTour, onBookTour }: TourCardProps) {
  const [imgSrc, setImgSrc] = useState(tour.image || FALLBACK_IMAGE);

  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(tour.price);

  return (
    <div
      onClick={() => onViewTour(tour)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewTour(tour);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Xem chi tiết tour ${tour.name}`}
      className="bg-white border border-[#CBD5E1] rounded-[6px] overflow-hidden flex flex-col hover:border-[#075985] hover:shadow-md transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#075985] select-none"
    >
      {/* Aspect Ratio 16:10 or 3:2 consistent */}
      <div className="relative aspect-[16/10] bg-[#F1F5F9] overflow-hidden">
        <img
          src={imgSrc}
          alt={tour.name}
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          loading="lazy"
        />

        {/* Destination badge */}
        <div className="absolute top-3 left-3 bg-[#0F172A]/80 text-white text-[11px] font-medium px-2.5 py-1 rounded-[4px] flex items-center gap-1 backdrop-blur-xs">
          <MapPin className="w-3 h-3 text-[#38BDF8]" />
          <span>{tour.destination}</span>
        </div>

        {/* Co-host or partner badge if present */}
        {tour.isCoHosted && (
          <div className="absolute top-3 right-3 bg-[#075985] text-white text-[11px] font-semibold px-2 py-0.5 rounded-[4px]">
            Liên minh tour
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Agency */}
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span className="flex items-center gap-1 truncate max-w-[180px]">
              <Building2 className="w-3.5 h-3.5 text-[#075985] shrink-0" />
              <strong className="font-medium text-[#0F172A] truncate">
                {tour.companyName || "Đơn vị lữ hành"}
              </strong>
            </span>

            {tour.rating > 0 && (
              <span className="flex items-center gap-1 text-[#B45309] font-semibold text-xs">
                <Star className="w-3.5 h-3.5 fill-[#B45309]" />
                {tour.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Tour Title */}
          <h3
            onClick={() => onViewTour(tour)}
            className="text-base font-semibold text-[#0F172A] line-clamp-2 hover:text-[#075985] transition-colors cursor-pointer leading-snug"
          >
            {tour.name}
          </h3>

          {/* Metadata: Duration & Group size */}
          <div className="flex items-center gap-4 text-xs text-[#475569] pt-1 border-t border-[#F1F5F9]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#075985]" />
              <span>{tour.duration}</span>
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#075985]" />
              <span>
                {tour.minGuests > 0 ? `Tối thiểu ${tour.minGuests} vé tính tiền` : `Tối đa ${tour.maxGuests} khách`}
              </span>
            </span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-[#CBD5E1] flex items-end justify-between gap-2">
          <div>
            <span className="text-[11px] text-[#475569] block">
              Giá từ / một khách
            </span>
            <span className="text-base font-bold text-[#075985]">
              {formattedPrice}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewTour(tour);
              }}
              className="border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] text-xs h-8 px-3 rounded-[6px]"
            >
              Chi tiết
            </Button>
            {onBookTour && (
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookTour(tour);
                }}
                className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-8 px-3 rounded-[6px]"
              >
                Đặt tour
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
