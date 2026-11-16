import { useState } from "react";
import { Star } from "lucide-react";

const LABELS = ["", "Rất tệ", "Chưa hài lòng", "Bình thường", "Hài lòng", "Tuyệt vời"];

/** Hiển thị hoặc chọn số sao 1–5. Có onChange thì là ô chọn. */
export function StarRating({
  value,
  onChange,
  size = "md",
  showLabel = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const px = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={`${value} trên 5 sao`}>
        {[1, 2, 3, 4, 5].map((n) => {
          const icon = (
            <Star className={`${px} ${n <= Math.round(shown) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
          );
          return onChange ? (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} sao – ${LABELS[n]}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(n)}
              className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-[#075985]"
            >
              {icon}
            </button>
          ) : (
            <span key={n}>{icon}</span>
          );
        })}
      </div>
      {showLabel && shown > 0 && <span className="text-sm font-medium text-slate-700">{LABELS[Math.round(shown)]}</span>}
    </div>
  );
}
