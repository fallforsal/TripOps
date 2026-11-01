import { ArrowUpRight, Compass, MapPin } from "lucide-react";
import { TRIPOPS_LOGO_WHITE } from "@/app/constants/logo";

interface CustomerFooterProps {
  onNavigate?: (page: string) => void;
  onOpenAIAdvisor?: () => void;
}
export function CustomerFooter({
  onNavigate,
  onOpenAIAdvisor,
}: CustomerFooterProps) {
  return (
    <footer className="trip-footer">
      <div className="trip-footer-inner">
        <div className="trip-footer-top">
          <div>
            <button
              className="trip-brand focus:outline-none"
              onClick={() => onNavigate?.("home")}
              aria-label="TripOps — Trang chủ"
            >
              <img
                src={TRIPOPS_LOGO_WHITE}
                alt="TripOps Logo"
                className="h-8 w-auto object-contain transition-opacity hover:opacity-90"
              />
            </button>
            <p className="trip-footer-about">
              Những chuyến đi đáng nhớ bắt đầu từ một ý tưởng. Khám phá tour và
              tìm hành trình phù hợp cho cả đoàn.
            </p>
          </div>
          <div>
            <h2>Khám phá</h2>
            <div className="trip-footer-links">
              <button onClick={() => onNavigate?.("book-tours")}>
                Tất cả hành trình
              </button>
              <button onClick={() => onNavigate?.("custom-tour")}>
                Thiết kế tour riêng
              </button>
              {onOpenAIAdvisor && (
                <button onClick={onOpenAIAdvisor}>Tìm tour cùng AI</button>
              )}
            </div>
          </div>
          <div>
            <h2>Bắt đầu chuyến đi</h2>
            <div className="trip-footer-links">
              <button onClick={() => onNavigate?.("my-bookings")}>
                Booking của tôi
              </button>
              <button onClick={() => onNavigate?.("my-requests")}>
                Yêu cầu thiết kế của tôi
              </button>
              <button
                onClick={() => onNavigate?.("messages")}
                className="inline-flex items-center gap-1"
              >
                Tin nhắn
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div className="trip-footer-bottom">
          <p>
            © {new Date().getFullYear()} TripOps. Cùng nhau trên mỗi hành trình.
          </p>
          <span>
            <MapPin size={13} aria-hidden="true" />
            Khám phá Việt Nam
          </span>
        </div>
      </div>
    </footer>
  );
}
