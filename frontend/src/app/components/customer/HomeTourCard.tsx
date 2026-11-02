import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Clock3,
  ImageOff,
  Star,
  Users,
} from "lucide-react";
import type { Tour } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { homeTourImage } from "./homepage-media";

interface HomeTourCardProps {
  tour: Tour;
  onView: (tour: Tour) => void;
  onBook?: (tour: Tour) => void;
}

export function HomeTourCard({ tour, onView, onBook }: HomeTourCardProps) {
  const [failedImage, setFailedImage] = useState("");
  const image = homeTourImage(tour);

  return (
    <article
      onClick={() => onView(tour)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(tour);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Xem chi tiết tour ${tour.name}`}
      className="group bg-white border border-[#E5EAE7] hover:border-[#0F766E]/50 rounded-[12px] overflow-hidden flex flex-col transition-all duration-200 shadow-xs hover:shadow-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] select-none"
    >
      {/* Tour Photo: 3:2 aspect ratio */}
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-slate-100 block">
        {image && failedImage !== image ? (
          <img
            src={image}
            alt={`Cảnh quan ${tour.destination}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setFailedImage(image)}
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center gap-1.5 text-xs text-slate-400 bg-slate-100">
            <ImageOff className="w-4 h-4" />
            <span>Chưa có ảnh</span>
          </span>
        )}

        {/* Destination Tag */}
        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-white/95 text-[11px] font-semibold text-slate-800 shadow-xs backdrop-blur-xs">
          {tour.destination}
        </span>

        {/* Quick View Icon */}
        <span className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 text-[#0F766E] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>

      {/* Tour Information Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Agency & Rating */}
          <div className="flex items-center justify-between text-xs text-[#62706C] mb-2">
            <span className="inline-flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{tour.companyName || "Đơn vị tổ chức"}</span>
            </span>
            {Number.isFinite(tour.rating) && tour.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{tour.rating.toFixed(1)}</span>
              </span>
            )}
          </div>

          {/* Tour Title */}
          <h3 className="font-bold text-base text-[#172523] line-clamp-2 leading-snug group-hover:text-[#0F766E] transition-colors mb-2.5">
            {tour.name}
          </h3>

          {/* Metadata: Duration & Guests */}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-[#62706C] mb-4">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="w-3.5 h-3.5 text-slate-400" />
              <span>{tour.duration}</span>
            </span>
            {tour.maxGuests > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {tour.minGuests > 0 ? `Tối thiểu ${tour.minGuests} vé tính tiền · ` : "Tối đa "}
                  {tour.maxGuests} người (tối đa)
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom: Price & Actions */}
        <div className="pt-3 border-t border-[#E5EAE7] flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-[#62706C] block uppercase font-medium">
              Giá từ / khách
            </span>
            <p className="text-base sm:text-lg font-bold text-[#0F766E] tracking-tight leading-none mt-0.5">
              {new Intl.NumberFormat("vi-VN").format(tour.price)}
              <span className="text-xs font-semibold ml-0.5">đ</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onView(tour);
              }}
              className="h-8 px-2.5 text-xs text-[#172523] border-[#E5EAE7] hover:border-[#0F766E] hover:text-[#0F766E] rounded-[8px]"
            >
              Chi tiết
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onBook) onBook(tour);
                else onView(tour);
              }}
              className="h-8 px-3.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold rounded-[8px] transition-colors"
            >
              Đặt tour
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
