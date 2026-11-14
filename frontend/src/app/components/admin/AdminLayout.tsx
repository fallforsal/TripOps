import { SidebarLogoutButton } from "@/app/components/common/SidebarLogoutButton";
import { useState } from "react";
import { TRIPOPS_LOGO, TRIPOPS_ICON } from "@/app/constants/logo";
import {
  MessageSquareWarning,
  LayoutDashboard,
  Package,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  UserCheck,
  FileCheck,
  Building2,
  Users,
  Landmark,
  Compass,
  FileText,
  RotateCcw,
  Banknote,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout?: () => void;
  pendingToursCount?: number;
  pendingRefundsCount?: number;
  pendingServicesCount?: number;
}

export function AdminLayout({
  children,
  activeSection,
  onNavigate,
  onLogout,
  pendingToursCount = 0,
  pendingRefundsCount = 0,
  pendingServicesCount = 0,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "partner-approvals",
      label: "Phê duyệt Đối tác",
      icon: UserCheck,
    },
    {
      id: "approve-tours",
      label: "Quản lý Tour",
      icon: Compass,
      badge: pendingToursCount > 0 ? pendingToursCount : undefined,
    },
    {
      id: "approve-posts",
      label: "Quản lý Bài đăng",
      icon: FileText,
      badge: pendingServicesCount > 0 ? pendingServicesCount : undefined,
    },
    {
      id: "refund-requests",
      label: "Xử lý Hoàn tiền",
      icon: RotateCcw,
      badge: pendingRefundsCount > 0 ? pendingRefundsCount : undefined,
    },
    {
      id: "complaints",
      label: "Khiếu nại",
      icon: MessageSquareWarning,
    },
    {
      id: "settlements",
      label: "Quyết toán Agency",
      icon: Banknote,
    },
    {
      id: "finance",
      label: "STK Sàn",
      icon: Landmark,
    },
    {
      id: "providers",
      label: "Mạng lưới Dịch vụ",
      icon: Package,
    },
    {
      id: "users",
      label: "Quản lý Người dùng",
      icon: Users,
    },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo/Header */}
      <div className="p-6 border-b border-[#CBD5E1]">
        <div className="flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <img
                src={TRIPOPS_LOGO}
                alt="TripOps Logo"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-sky-100 text-[#075985] px-2 py-0.5 rounded-md">
                Admin
              </span>
            </div>
          ) : (
            <img
              src={TRIPOPS_ICON}
              alt="TripOps"
              className="h-7 w-7 object-contain mx-auto"
            />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="tripops-sidebar-nav p-4 space-y-2 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-[#F97316] text-white shadow-lg shadow-blue-600/30"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-600"}`}
              />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span data-slot="sidebar-label" className="font-medium">
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white text-[#075985]"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
        
      </nav>
      <SidebarLogoutButton onLogout={onLogout} collapsed={collapsed} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block bg-white border-r border-[#CBD5E1] transition-all duration-300 fixed left-0 top-0 bottom-0 z-30 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="h-full flex flex-col">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#CBD5E1] z-50 transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-[#CBD5E1] px-4 py-3 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8 w-full">{children}</div>
      </main>
    </div>
  );
}
