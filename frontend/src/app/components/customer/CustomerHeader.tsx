import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Compass,
  FileQuestion,
  LogOut,
  Menu,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Star,
  UserRound,
  ArrowUpRight,
} from "lucide-react";
import type { User } from "@/app/types";
import { TRIPOPS_LOGO } from "@/app/constants/logo";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/app/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/app/components/ui/sheet";


export function getAccountInitials(name?: string): string {
  if (!name || typeof name !== "string") return "TK";
  // Remove suffixes in parentheses or brackets, e.g. "(Đại diện FPT)", "[FPT]"
  const cleaned = name
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\{.*?\}/g, "")
    .trim();

  // Strip special symbols, keep unicode letters, digits, and spaces
  const cleanWords = cleaned
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  if (cleanWords.length === 0) {
    const fallbackWords = name
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
      .filter(Boolean);
    if (fallbackWords.length === 0) return "TK";
    return fallbackWords[0].slice(0, 2).toUpperCase();
  }

  if (cleanWords.length === 1) {
    return cleanWords[0].slice(0, 2).toUpperCase();
  }

  // Last 2 words: e.g. Nguyễn Văn An -> Văn An -> VA
  const lastTwo = cleanWords.slice(-2);
  return (lastTwo[0][0] + lastTwo[1][0]).toUpperCase();
}

interface CustomerHeaderProps {
  currentUser: User | null;
  currentPage: string;
  onNavigate: (page: string) => void;
  onShowLogin: () => void;
  onLogout: () => void;
  onOpenAIAdvisor?: () => void;
}

export function CustomerHeader({
  currentUser,
  currentPage,
  onNavigate,
  onShowLogin,
  onLogout,
  onOpenAIAdvisor,
}: CustomerHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { id: "home", label: "Trang chủ" },
    { id: "book-tours", label: "Khám phá tour" },
    { id: "custom-tour", label: "Thiết kế tour theo yêu cầu" },
  ];
  const accountLinks = [
    { id: "user-profile", label: "Thông tin tài khoản", icon: UserRound },
    { id: "my-bookings", label: "Booking của tôi", icon: CalendarDays },
    { id: "messages", label: "Tin nhắn", icon: MessageSquare },
    {
      id: "my-requests",
      label: "Yêu cầu thiết kế của tôi",
      icon: FileQuestion,
    },
    { id: "my-reviews", label: "Đánh giá của tôi", icon: Star },
    { id: "my-complaints", label: "Khiếu nại của tôi", icon: ShieldAlert },
  ];
  const isCustomer = !currentUser || currentUser.role === "user";
  const displayName = currentUser?.name?.trim() || "Tài khoản";
  const initials = getAccountInitials(currentUser?.name);
  const navigate = (page: string) => {
    setMobileOpen(false);
    onNavigate(page);
  };
  return (
    <header className="trip-header">
      <div className="trip-header-inner">
        <button
          className="trip-brand focus:outline-none"
          onClick={() => navigate("home")}
          aria-label="TripOps — Trang chủ"
        >
          <img
            src={TRIPOPS_LOGO}
            alt="TripOps Logo"
            className="h-9 sm:h-10 w-auto object-contain transition-transform hover:scale-[1.02]"
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.dataset.fallback) {
                el.dataset.fallback = "1";
                el.src = "./images/Logo/TripOps_logo_transparent.png";
              }
            }}
          />
        </button>
        {isCustomer && (
          <nav className="trip-header-nav" aria-label="Điều hướng chính">
            {links.map((link) => (
              <button
                key={link.id}
                aria-current={
                  currentPage === link.id ||
                  (link.id === "book-tours" && currentPage === "tour-detail")
                    ? "page"
                    : undefined
                }
                onClick={() => navigate(link.id)}
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}
        <div className="trip-header-actions">
          {onOpenAIAdvisor && (
            <button
              className="trip-ai-trigger"
              onClick={onOpenAIAdvisor}
              aria-label="Tìm tour cùng AI"
            >
              <Sparkles aria-hidden="true" />
              <span>Tìm tour cùng AI</span>
            </button>
          )}
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="trip-account-trigger group flex items-center gap-2 px-2 py-1 rounded-full sm:rounded-lg hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition-colors cursor-pointer select-none"
                aria-label={`Menu tài khoản của ${displayName}`}
              >
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-teal-200/80 shadow-2xs shrink-0">
                  {currentUser.avatar ? (
                    <AvatarImage
                      src={currentUser.avatar}
                      alt={displayName}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-teal-50 text-teal-800 font-semibold text-xs sm:text-sm">
                    {initials !== "TK" ? initials : <UserRound className="w-4 h-4 text-teal-700" />}
                  </AvatarFallback>
                </Avatar>
                <span
                  className="trip-account-name text-sm font-medium text-slate-800 max-w-[130px] sm:max-w-[170px] md:max-w-[220px] truncate leading-tight group-hover:text-teal-900"
                  title={displayName}
                >
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-transform group-data-[state=open]:rotate-180 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="trip-account-menu w-64 p-1.5 shadow-lg border border-slate-200">
                <DropdownMenuLabel className="p-3">
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-9 w-9 border border-teal-200 shrink-0 mt-0.5">
                      {currentUser.avatar ? (
                        <AvatarImage
                          src={currentUser.avatar}
                          alt={displayName}
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="bg-teal-50 text-teal-800 font-semibold text-xs">
                        {initials !== "TK" ? initials : <UserRound className="w-4 h-4 text-teal-700" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words leading-tight" title={displayName}>
                        {displayName}
                      </p>
                      {currentUser.companyName && (
                        <p className="text-xs text-teal-700 font-medium mt-1 truncate" title={currentUser.companyName}>
                          🏢 {currentUser.companyName}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1 truncate" title={currentUser.email}>
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                {accountLinks
                  .filter(
                    (link) =>
                      currentUser.role === "user" || link.id === "user-profile",
                  )
                  .map((link) => (
                    <DropdownMenuItem
                      key={link.id}
                      onSelect={() => navigate(link.id)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 rounded-md cursor-pointer hover:bg-teal-50 hover:text-teal-900 transition-colors"
                    >
                      <link.icon size={15} className="text-teal-700" />
                      <span>{link.label}</span>
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                <DropdownMenuItem
                  onSelect={onLogout}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 rounded-md cursor-pointer hover:bg-red-50 hover:text-red-700 font-medium transition-colors"
                >
                  <LogOut size={15} className="text-red-600" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              className="home-primary-button trip-login"
              onClick={onShowLogin}
            >
              Đăng nhập
              <ArrowUpRight size={14} aria-hidden="true" />
            </Button>
          )}
          {isCustomer && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                className="trip-mobile-trigger"
                aria-label="Mở menu điều hướng"
              >
                <Menu size={20} />
              </SheetTrigger>
              <SheetContent
                className="trip-mobile-sheet"
                closeLabel="Đóng menu"
              >
                <SheetHeader>
                  <SheetTitle>Khám phá cùng TripOps</SheetTitle>
                  <SheetDescription>
                    Tìm hành trình dành cho đoàn bạn.
                  </SheetDescription>
                </SheetHeader>
                {currentUser && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-3 mb-2 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-teal-200 shrink-0">
                      {currentUser.avatar ? (
                        <AvatarImage src={currentUser.avatar} alt={displayName} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-teal-50 text-teal-800 font-semibold text-sm">
                        {initials !== "TK" ? initials : <UserRound className="w-5 h-5 text-teal-700" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate" title={displayName}>
                        {displayName}
                      </p>
                      {currentUser.companyName && (
                        <p className="text-xs text-teal-700 font-medium truncate">
                          🏢 {currentUser.companyName}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                )}
                <nav
                  className="trip-mobile-links"
                  aria-label="Điều hướng trên điện thoại"
                >
                  {links.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => navigate(link.id)}
                      aria-current={
                        currentPage === link.id ? "page" : undefined
                      }
                    >
                      {link.label}
                    </button>
                  ))}
                  {onOpenAIAdvisor && (
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        onOpenAIAdvisor();
                      }}
                    >
                      <Sparkles />
                      Tìm tour cùng AI
                    </button>
                  )}
                  {currentUser &&
                    accountLinks.map((link) => (
                      <button key={link.id} onClick={() => navigate(link.id)}>
                        <link.icon />
                        {link.label}
                      </button>
                    ))}
                  {currentUser && (
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        onLogout();
                      }}
                      className="text-red-600 hover:text-red-700 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
