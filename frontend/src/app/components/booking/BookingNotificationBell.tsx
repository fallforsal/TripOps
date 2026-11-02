import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { getBookingNotifications, readBookingNotification, type BookingNotification } from "@/app/services/wf05Bookings";

const titles = { proposal_sent: "Có phương án mới từ công ty lữ hành", proposal_accepted: "Khách đã chấp nhận phương án", changes_requested: "Khách yêu cầu chỉnh sửa phương án" };
// Khách chỉ nhận "proposal_accepted" khi Agency duyệt đơn theo yêu cầu ban đầu (Agency là người chốt).
const customerTitles = { ...titles, proposal_accepted: "Công ty lữ hành đã xác nhận đơn theo yêu cầu của bạn" };

export function BookingNotificationBell({ onOpenBooking, viewer = "agency" }: { onOpenBooking: (id: number) => void; viewer?: "customer" | "agency" }) {
  const [items, setItems] = useState<BookingNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let cancelled = false, busy = false;
    const refresh = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const feed = await getBookingNotifications();
        if (!cancelled) { setItems(feed.items); setUnread(feed.unreadCount); setError(""); }
      } catch { if (!cancelled) setError("Không tải được thông báo. Vui lòng thử lại."); }
      finally { busy = false; if (!cancelled) setLoading(false); }
    };
    refreshRef.current = () => void refresh();
    void refresh();
    const interval = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("booking-proposal-updated", refresh);
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh); window.removeEventListener("booking-proposal-updated", refresh); };
  }, []);
  const openItem = async (item: BookingNotification) => {
    // Navigation remains available even when marking a notification read fails.
    try { await readBookingNotification(item.id); refreshRef.current(); } catch { setError("Chưa đánh dấu đã đọc được. Vui lòng thử lại."); }
    setOpen(false); onOpenBooking(item.bookingId);
  };
  return <Popover open={open} onOpenChange={value => { setOpen(value); if (value) refreshRef.current(); }}>
    <PopoverTrigger asChild><Button variant="outline" size="icon" className="relative shrink-0" aria-label={`Thông báo đặt tour${unread ? `, ${unread} chưa đọc` : ""}`}>
      <Bell className="size-4" />{unread > 0 && <span className="absolute -top-2 -right-2 min-w-5 rounded-full bg-amber-600 px-1 text-xs text-white">{unread > 99 ? "99+" : unread}</span>}
    </Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[min(380px,calc(100vw-24px))] rounded-md border-slate-200 bg-white text-slate-900 p-0">
      <div className="border-b p-4 font-semibold">Thông báo đặt tour {unread > 0 && <span className="text-xs text-slate-500">({unread} chưa đọc)</span>}</div>
      {error && <div role="alert" className="p-3 text-sm text-red-700">{error}<Button variant="link" onClick={() => refreshRef.current()}>Thử lại</Button></div>}
      {loading ? <p className="p-4 text-sm text-slate-500">Đang tải thông báo...</p> : !error && !items.length ? <p className="p-4 text-sm text-slate-500">Chưa có thông báo về phương án đặt tour.</p> : null}
      <div className="max-h-96 overflow-y-auto">{items.map(item => <button key={item.id} onClick={() => void openItem(item)}
        className={`block w-full border-b p-4 text-left text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 ${!item.readAt ? "bg-amber-50" : "bg-white"}`}>
        <span className="block font-medium">{(viewer === "customer" ? customerTitles : titles)[item.eventType]}</span>
        <span className="mt-1 block text-xs text-slate-600">{item.bookingCode} · Phiên bản {item.version} · {new Date(item.createdAt).toLocaleString("vi-VN")}</span>
        {item.message && <span className="mt-2 block whitespace-pre-line text-slate-700">{item.message}</span>}
      </button>)}</div>
    </PopoverContent>
  </Popover>;
}
