import { useState } from "react";
import {
  LayoutDashboard,
  Layers,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Building2,
  Plus,
  PlusCircle,
} from "lucide-react";
import { User } from "@/app/types";
import { Button } from "@/app/components/ui/button";

interface ProviderLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onNavigate: (section: string) => void;
  currentUser: User;
  onLogout?: () => void;
  onCreateService?: () => void;
}

export function ProviderLayout({
  children,
  activeSection,
  onNavigate,
  currentUser,
  onLogout,
  onCreateService,
}: ProviderLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: "overview", label: "Tổng quan Hoạt động", icon: LayoutDashboard },
    { id: "services", label: "Quản lý Dịch vụ", icon: Layers },
    { id: "create", label: "Đăng Dịch vụ Mới", icon: PlusCircle },
    { id: "profile", label: "Hồ sơ Doanh nghiệp", icon: Building2 },
  ];

  const businessDisplayName =
    currentUser.businessName || currentUser.name || "Nhà cung cấp";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-[#CBD5E1]">
      {/* Header / Brand */}
      <div className="p-4 border-b border-[#CBD5E1]">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={businessDisplayName}
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-[#CBD5E1] shadow-2xs"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#075985] text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">
                  {businessDisplayName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] text-gray-500 truncate">
                    Đối tác Cung ứng
                  </span>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block flex-shrink-0 text-gray-500"
            title={collapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors lg:hidden text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Action Button */}
      {onCreateService && (
        <div className="p-3">
          <Button
            onClick={() => {
              onCreateService();
              setMobileOpen(false);
            }}
            className={`w-full bg-[#075985] hover:bg-[#F97316] text-white shadow-md rounded-xl transition-all ${
              collapsed ? "px-0 justify-center h-10 w-10 mx-auto" : "h-10 justify-start px-3"
            }`}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="ml-2 text-xs font-semibold">Đăng dịch vụ mới</span>}
          </Button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
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
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20 font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
              } ${collapsed ? "justify-center px-0" : ""}`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? "text-white" : "text-gray-500"
                }`}
              />
              {!collapsed && (
                <span className="text-sm">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Provider Info Card (expanded only) */}
      {!collapsed && (
        <div className="p-3 mx-3 mb-2 bg-[#F0F9FF] rounded-xl border border-[#CBD5E1] text-xs">
          <div className="font-semibold text-[#075985] mb-1">
            Hỗ trợ Đối tác
          </div>
          <p className="text-gray-600 text-[11px] leading-relaxed mb-2">
            Đăng dịch vụ để liên kết cùng các đơn vị lữ hành thiết kế tour.
          </p>
          <div className="text-[11px] text-[#075985] font-medium">
            Hotline: 1900 6868
          </div>
        </div>
      )}

      {/* User / Logout Footer */}
      {onLogout && (
        <div className="p-3 border-t border-[#CBD5E1]">
          <button
            onClick={onLogout}
            title={collapsed ? "Đăng xuất" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-all ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0 text-gray-400 group-hover:text-rose-600" />
            {!collapsed && (
              <span className="font-medium text-sm">
                Đăng xuất
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 h-full bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? "lg:pl-18" : "lg:pl-64"
        }`}
      >
        {/* Mobile Top Sub-Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-[#CBD5E1] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="font-bold text-gray-900 text-sm truncate max-w-[200px]">
              {businessDisplayName}
            </div>
          </div>
          {onCreateService && (
            <Button
              size="sm"
              onClick={onCreateService}
              className="bg-[#F97316] hover:bg-[#F97316] text-white text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Đăng dịch vụ
            </Button>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
