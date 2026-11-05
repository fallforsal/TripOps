import React from "react";
import { LogOut } from "lucide-react";

interface SidebarLogoutButtonProps {
  onLogout?: () => void;
  collapsed?: boolean;
  className?: string;
}

export function SidebarLogoutButton({
  onLogout,
  collapsed = false,
  className = "",
}: SidebarLogoutButtonProps) {
  if (!onLogout) return null;

  return (
    <div className="p-3 border-t border-[#CBD5E1] bg-white flex-shrink-0 mt-auto">
      <button
        type="button"
        onClick={onLogout}
        title={collapsed ? "Đăng xuất" : undefined}
        aria-label="Đăng xuất khỏi hệ thống"
        className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-xs font-semibold text-red-600 bg-red-50/70 border border-red-200/60 hover:bg-red-600 hover:text-white hover:border-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-all cursor-pointer ${
          collapsed ? "justify-center px-0" : ""
        } ${className}`}
      >
        <LogOut className="w-4 h-4 flex-shrink-0 text-red-600 group-hover:text-white transition-colors" />
        {!collapsed && <span data-slot="sidebar-label">Đăng xuất</span>}
      </button>
    </div>
  );
}

