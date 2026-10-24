import { useState, useRef, useEffect } from "react";
import {
  User,
  LogOut,
  Menu,
  MapPin,
  Settings,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { User as UserType } from "@/app/types";

interface NavbarProps {
  currentUser: UserType;
  onLogout: () => void;
  onMenuClick?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToBookings?: () => void;
}

export function Navbar({
  currentUser,
  onLogout,
  onMenuClick,
  onNavigateToProfile,
  onNavigateToBookings,
}: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleLabels = {
    user: "Khách hàng",
    guide: "Hướng dẫn viên",
    admin: "Quản lý",
    provider: "Nhà cung cấp",
  };

  // Close dropdown when clicking outside
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

  // Generate avatar initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-purple-500 to-purple-600",
      "from-green-500 to-green-600",
      "from-orange-500 to-orange-600",
      "from-pink-500 to-pink-600",
      "from-indigo-500 to-indigo-600",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer">
            <MapPin className="w-8 h-8 text-[#075985]" />
            <span className="text-2xl font-bold bg-[#075985] bg-clip-text text-transparent">
              TripOps
            </span>
          </div>

          {/* Navigation - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#home"
              className="text-gray-700 hover:text-[#075985] transition-colors font-medium"
            >
              Trang chủ
            </a>
            <a
              href="#tours"
              className="text-gray-700 hover:text-[#075985] transition-colors font-medium"
            >
              Tour
            </a>
            <a
              href="#features"
              className="text-gray-700 hover:text-[#075985] transition-colors font-medium"
            >
              Tính năng
            </a>
            <a
              href="#about"
              className="text-gray-700 hover:text-[#075985] transition-colors font-medium"
            >
              Về chúng tôi
            </a>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(currentUser.name)} flex items-center justify-center text-white font-semibold shadow-md`}
              >
                {getInitials(currentUser.name)}
              </div>

              {/* User Info - Hidden on mobile */}
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-gray-900">
                  {currentUser.name}
                </div>
                <div className="text-xs text-gray-500">
                  {roleLabels[currentUser.role]}
                </div>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Info in Dropdown */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(currentUser.name)} flex items-center justify-center text-white font-semibold shadow-md`}
                    >
                      {getInitials(currentUser.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {currentUser.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 px-2 py-1 bg-[#F0F9FF] text-[#075985] text-xs font-medium rounded-full inline-block">
                    {roleLabels[currentUser.role]}
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onNavigateToProfile?.();
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Quản lý hồ sơ
                      </div>
                      <div className="text-xs text-gray-500">
                        Cập nhật thông tin cá nhân
                      </div>
                    </div>
                  </button>

                  {currentUser.role === "user" && (
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onNavigateToBookings?.();
                      }}
                      className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Tour đã đặt
                        </div>
                        <div className="text-xs text-gray-500">
                          Xem và quản lý các tour
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 pt-2">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <div>
                      <div className="text-sm font-medium">
                        Đăng xuất
                      </div>
                      <div className="text-xs text-red-500">
                        Thoát khỏi tài khoản
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}