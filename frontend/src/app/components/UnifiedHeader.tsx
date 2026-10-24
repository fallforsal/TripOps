import { useState, useRef, useEffect } from "react";
import {
  Compass,
  ChevronDown,
  LogOut,
  Settings,
  Calendar,
  Tag,
  MessageSquare,
  Heart,
  CreditCard,
  Star,
  Bell,
  HelpCircle,
  History,
  MapPinned,
  MessageCircleMore,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { User as UserType } from "@/app/types";

interface UnifiedHeaderProps {
  currentUser: UserType | null;
  onShowLogin: () => void;
  onLogout?: () => void;
  onNavigate: (page: string) => void;
  currentPage?: string;
  onOpenAIAdvisor?: () => void;
}

export function UnifiedHeader({
  currentUser,
  onShowLogin,
  onLogout,
  onNavigate,
  currentPage = "home",
  onOpenAIAdvisor,
}: UnifiedHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { id: "home", label: "Trang chủ" },
    { id: "book-tours", label: "Đặt Tour" },
    { id: "custom-tour", label: "Thiết kế tour theo yêu cầu" },
    { id: "contact", label: "Liên hệ" },
    { id: "about", label: "Về chúng tôi" },
    { id: "reviews", label: "Đánh giá của khách hàng" },
  ];

  const roleLabels = {
    user: "Khách hàng",
    guide: "Hướng dẫn viên",
    admin: "Quản trị viên",
    provider: "Nhà cung cấp",
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleNavigateClick = (page: string) => {
    if (currentUser && currentUser.role !== "user") {
      if (page !== "home") {
        return;
      }
    }
    onNavigate(page);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#F0F9FF]/90 backdrop-blur-md border-b border-[#CBD5E1] z-50 transition-all duration-300">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Brand: TripOps */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => handleNavigateClick("home")}
          >
            <div className="w-10 h-10 rounded-full bg-[#075985] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Compass className="w-5 h-5 text-[#CBD5E1]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-serif font-semibold tracking-tight text-[#075985]">
                TripOps
              </span>
              <span className="text-[10px] tracking-widest uppercase text-[#475569] -mt-0.5 font-medium">
                Curated Travel
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          {(!currentUser || currentUser.role === "user") && (
            <div className="hidden md:flex items-center gap-8">
              {menuItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigateClick(item.id)}
                    className={`relative text-sm tracking-wide transition-colors py-1 ${
                      isActive
                        ? "text-[#075985] font-semibold"
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
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* AI Advisor Button - Elegant terracotta minimalist styling */}
            {onOpenAIAdvisor && (
              <button
                type="button"
                onClick={onOpenAIAdvisor}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#F97316]/30 bg-[#F97316]/10 hover:bg-[#F97316]/20 text-[#F97316] text-xs font-semibold tracking-wide transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                <span>AI Cố vấn Tour</span>
              </button>
            )}

            {/* Login Button or Profile Dropdown */}
            {!currentUser ? (
              <button
                onClick={onShowLogin}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#075985] text-[#F0F9FF] text-sm font-medium hover:bg-[#F97316] transition-all duration-300 shadow-sm"
              >
                <span>Đăng nhập</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : currentUser.role === "user" ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-[#CBD5E1] hover:border-[#075985] transition-colors bg-white"
                >
                  <div className="w-8 h-8 rounded-full bg-[#075985] flex items-center justify-center text-white text-xs font-semibold">
                    {getInitials(currentUser.name)}
                  </div>

                  <div className="hidden md:block text-left pr-1">
                    <div className="text-xs font-semibold text-[#075985]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-[#475569]">
                      {roleLabels[currentUser.role]}
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#475569] transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.08)] border border-[#CBD5E1] py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="px-4 py-3 border-b border-[#CBD5E1]">
                      <div className="font-semibold text-sm text-[#075985]">
                        {currentUser.name}
                      </div>
                      <div className="text-xs text-[#475569]">
                        {currentUser.email}
                      </div>
                      <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#075985] text-[10px] font-semibold">
                        {roleLabels[currentUser.role]}
                      </span>
                    </div>

                    <div className="py-2 text-sm text-[#0F172A]">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onNavigate("user-profile");
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-[#F0F9FF] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-[#475569]" />
                        <span>Hồ sơ cá nhân</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onNavigate("my-bookings");
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-[#F0F9FF] transition-colors"
                      >
                        <History className="w-4 h-4 text-[#475569]" />
                        <span>Lịch sử đặt tour</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onNavigate("wishlist");
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-[#F0F9FF] transition-colors"
                      >
                        <Heart className="w-4 h-4 text-[#475569]" />
                        <span>Yêu thích</span>
                      </button>

                      <div className="my-1 border-t border-[#CBD5E1]" />

                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onLogout?.();
                        }}
                        className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-[#CBD5E1] hover:border-[#075985] transition-colors bg-white"
                >
                  <div className="w-8 h-8 rounded-full bg-[#075985] flex items-center justify-center text-white text-xs font-semibold">
                    {getInitials(currentUser.name)}
                  </div>
                  <div className="hidden md:block text-left pr-1">
                    <div className="text-xs font-semibold text-[#075985]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-[#475569]">
                      {roleLabels[currentUser.role]}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#475569]" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-[#CBD5E1] py-2 z-50">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLogout?.();
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
