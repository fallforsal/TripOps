import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Calendar,
  Users,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  PenSquare,
  Handshake,
  Compass,
} from "lucide-react";
import { TourCompany, User } from "@/app/types";

interface AgencyLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onNavigate: (section: string) => void;
  company: TourCompany;
  currentUser: User;
  coHostingBadgeCount?: number;
  onLogout?: () => void;
}

export function AgencyLayout({
  children,
  activeSection,
  onNavigate,
  company,
  currentUser,
  coHostingBadgeCount,
  onLogout,
}: AgencyLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
    { id: "tours", label: "Quản lý Tour", icon: Package },
    { id: "bookings", label: "Đặt tour & Khách", icon: Calendar },
    { id: "services", label: "Dịch vụ đối tác", icon: Compass },
    { id: "guides", label: "Hướng dẫn viên", icon: Users },
    { id: "custom-requests", label: "Yêu cầu thiết kế riêng", icon: PenSquare },
    { id: "co-hosting", label: "Liên minh lữ hành", icon: Handshake, badge: coHostingBadgeCount },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-[#CBD5E1]">
      {/* Header / Brand */}
      <div className="p-4 border-b border-[#CBD5E1]">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-[#CBD5E1] shadow-2xs"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#075985] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-2xs">
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-[#075985] text-sm truncate">
                  {company.name}
                </h3>
                <p className="text-[10px] text-[#475569] truncate font-medium">
                  {currentUser.name}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 hover:bg-[#F0F9FF] rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#075985] transition-colors"
            title={collapsed ? "Mở rộng menu" : "Thu gọn"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 hover:bg-[#F0F9FF] rounded-lg border border-[#CBD5E1] text-[#475569]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? "bg-[#075985] text-white shadow-sm font-semibold"
                  : "text-[#475569] hover:bg-[#F0F9FF] hover:text-[#075985]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? "text-[#F97316]" : "text-[#475569] group-hover:text-[#075985]"
                }`}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className={`truncate ${isActive ? "text-white font-semibold" : "text-[#475569]"}`}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#EA580C] text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      {onLogout && (
        <div className="p-3 border-t border-[#CBD5E1]">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex font-sans antialiased text-[#0F172A]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-[#CBD5E1] transition-all duration-300 fixed left-0 top-0 bottom-0 z-30 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-[#075985]/50 z-40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`lg:hidden fixed top-0 bottom-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 flex flex-col border-r border-[#CBD5E1] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? "lg:ml-16" : "lg:ml-64"
        }`}
      >
        {/* Mobile Header Bar */}
        <div className="lg:hidden bg-white border-b border-[#CBD5E1] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 hover:bg-[#F0F9FF] rounded-lg border border-[#CBD5E1]"
            >
              <Menu className="w-5 h-5 text-[#075985]" />
            </button>
            <span className="font-serif font-semibold text-[#075985] text-sm">
              {company.name}
            </span>
          </div>
        </div>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 sm:p-8 w-full space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
