import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { http } from "@/app/lib/http";

interface Notice {
  id: number;
  message: string;
  bookingId: number | null;
  requestId: number | null;
  createdAt: string;
  readAt: string | null;
}
type Role = "agency" | "provider" | "admin" | "user";
interface Props {
  role?: Role;
  onNavigate?: (section: string) => void;
}

function sectionFor(notice: Notice, role: Role): string | null {
  if (notice.requestId != null) {
    return role === "agency" ? "custom-requests" :
      role === "user" ? "my-requests" : null;
  }
  if (notice.bookingId != null) {
    return role === "agency" ? "bookings" :
      role === "user" ? "my-bookings" :
      role === "provider" ? "room-requests" :
      role === "admin" ? "bookings" : null;
  }
  return null;
}

/** Shared inbox for the four authenticated web actors. The backend is the
 * sole source of truth; no user IDs are accepted from the client. */
export function WorkflowNotifications({ role = "user", onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [notices, summary] = await Promise.all([
        http<Notice[]>("/notifications"),
        http<{ count: number }>("/notifications/unread-count"),
      ]);
      setItems(notices);
      setUnread(summary.count);
      setError(null);
    } catch {
      setError("Không tải được thông báo. Hãy thử lại.");
    }
  }, []);

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => {
      if (!document.hidden) void reload();
    }, 15000);
    const onVisible = () => { if (!document.hidden) void reload(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  async function markRead(notice: Notice) {
    if (notice.readAt) return;
    try {
      await http<void>("/notifications/" + notice.id + "/read", { method: "POST" });
      setItems(prev => prev.map(n => n.id === notice.id
        ? { ...n, readAt: new Date().toISOString() } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {
      setError("Không đánh dấu đã đọc được thông báo.");
    }
  }

  async function markAll() {
    setLoading(true);
    try {
      await http<void>("/notifications/read-all", { method: "POST" });
      setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnread(0);
      setError(null);
    } catch {
      setError("Không cập nhật được trạng thái đã đọc.");
    } finally {
      setLoading(false);
    }
  }

  async function choose(n: Notice) {
    await markRead(n);
    const section = sectionFor(n, role);
    if (section && onNavigate) {
      setOpen(false);
      onNavigate(section);
    }
  }

  return (
    <div className="relative shrink-0">
      <button type="button"
        aria-label={unread > 0 ? "Thông báo: " + unread + " chưa đọc" : "Thông báo"}
        aria-expanded={open}
        onClick={() => { setOpen(v => !v); if (!open) void reload(); }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Thông báo của tôi"
          className="absolute right-0 top-full z-[100] mt-2 w-[min(88vw,380px)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h3 className="font-bold">Thông báo</h3>
              <p className="text-xs text-slate-500">{unread} chưa đọc</p>
            </div>
            <div className="flex gap-2">
              <button title="Làm mới" aria-label="Làm mới thông báo" onClick={() => void reload()}
                className="rounded-lg p-2 hover:bg-slate-100"><RefreshCw size={17} /></button>
              <button title="Đánh dấu tất cả đã đọc" aria-label="Đánh dấu tất cả đã đọc"
                disabled={loading || unread === 0} onClick={() => void markAll()}
                className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40"><CheckCheck size={17} /></button>
            </div>
          </div>
          {error && <p role="alert" className="px-4 py-2 text-xs text-red-700">{error}</p>}
          <div className="max-h-[390px] overflow-y-auto">
            {items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Chưa có thông báo.</p> :
              items.map(n => (
                <button key={n.id} type="button" onClick={() => void choose(n)}
                  className={"flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-sky-50 " +
                    (n.readAt ? "bg-white" : "bg-sky-50/60")}>
                  <span aria-hidden="true" className={"mt-2 h-2 w-2 shrink-0 rounded-full " +
                    (n.readAt ? "bg-transparent" : "bg-sky-600")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-5">{n.message}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {new Date(n.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </span>
                </button>
              ))}
          </div>
          <button type="button" onClick={() => setOpen(false)}
            className="w-full border-t px-4 py-2 text-sm font-medium text-sky-800 hover:bg-slate-50">Đóng</button>
        </div>
      )}
    </div>
  );
}
