import { useEffect, useState, useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { notificationDialogs, confirmationTone, type NotificationDialogRequest } from "@/app/lib/notificationDialogs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./alert-dialog";
import { Textarea } from "./textarea";

function NotificationDialog({ request }: { request: NotificationDialogRequest }) {
  const [value, setValue] = useState(request.initialValue || "");
  const tone = request.tone || confirmationTone(request.message);
  const Icon = { error: AlertCircle, warning: TriangleAlert, success: CheckCircle2, info: Info }[tone];
  const close = () => notificationDialogs.respond(request.id, request.kind === "input" ? null : false);
  return <AlertDialog open onOpenChange={open => { if (!open) close(); }}>
    <AlertDialogContent tone={tone} className="sm:max-w-lg">
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-3">
          <span className="notification-dialog-icon"><Icon aria-hidden="true" className="h-5 w-5" /></span>
          {request.title || (request.kind === "input" ? "Bổ sung thông tin" : "Xác nhận thao tác")}
        </AlertDialogTitle>
        <AlertDialogDescription className="whitespace-pre-line leading-relaxed">{request.message}</AlertDialogDescription>
      </AlertDialogHeader>
      {request.kind === "input" && <Textarea aria-label={request.message} value={value} onChange={e => setValue(e.target.value)}
        autoFocus rows={3} maxLength={2000} placeholder="Nhập thông tin tại đây…" />}
      <AlertDialogFooter>
        <AlertDialogCancel onClick={close}>Quay lại</AlertDialogCancel>
        <AlertDialogAction disabled={request.kind === "input" && !value.trim()}
          onClick={() => notificationDialogs.respond(request.id, request.kind === "input" ? value.trim() : true)}>
          {request.confirmLabel || (request.kind === "input" ? "Tiếp tục" : "Xác nhận")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

export function NotificationDialogs() {
  const request = useSyncExternalStore(notificationDialogs.subscribe, notificationDialogs.snapshot, () => null);
  useEffect(() => {
    const cancel = () => notificationDialogs.cancelAll();
    window.addEventListener("hashchange", cancel);
    window.addEventListener("popstate", cancel);
    return () => { window.removeEventListener("hashchange", cancel); window.removeEventListener("popstate", cancel); cancel(); };
  }, []);
  return request ? <NotificationDialog key={request.id} request={request} /> : null;
}
