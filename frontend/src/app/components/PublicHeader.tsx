import { Compass, ArrowRight } from "lucide-react";

interface PublicHeaderProps {
  onShowLogin: () => void;
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export function PublicHeader({
  onShowLogin,
  onNavigate,
  currentPage = "home",
}: PublicHeaderProps) {
  const menuItems = [
    { id: "home", label: "Trang chủ" },
    { id: "book-tours", label: "Hành trình" },
    { id: "services", label: "Dịch vụ địa phương" },
    { id: "about", label: "Về TripOps" },
    { id: "reviews", label: "Trải nghiệm thực tế" },
    { id: "contact", label: "Liên hệ" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#F0F9FF]/90 backdrop-blur-md border-b border-[#CBD5E1] z-50 transition-all duration-300">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigate?.("home")}
          >
            <div className="w-10 h-10 rounded-full bg-[#075985] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Compass className="w-5 h-5 text-[#CBD5E1]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tracking-tight text-[#075985]">
                TripOps
              </span>
              <span className="text-[10px] tracking-widest uppercase text-[#475569] -mt-1 font-medium">
                Curated Travel
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {menuItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  className={`relative text-sm tracking-wide transition-colors py-1 ${
                    isActive
                      ? "text-[#075985] font-medium"
                      : "text-[#475569] hover:text-[#075985]"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#F97316] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-4">
            <button
              onClick={onShowLogin}
              className="text-sm font-medium text-[#075985] hover:text-[#F97316] transition-colors px-3 py-2"
            >
              Đăng nhập
            </button>

            <button
              onClick={() => onNavigate?.("book-tours")}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#075985] text-[#F0F9FF] text-sm font-medium tracking-wide hover:bg-[#F97316] transition-all duration-300 shadow-sm"
            >
              <span>Khám phá ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
