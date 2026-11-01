import { useState } from "react";
import type { Service } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";

export function ServiceModerationReason({ service, providerView = false }: { service: Service; providerView?: boolean }) {
  const [open, setOpen] = useState(false);
  if (service.status !== "hidden" && service.status !== "rejected") return null;
  const hidden = service.status === "hidden";
  const reason = hidden ? service.hiddenReason : service.rejectionReason;
  return <>
    <button type="button" onClick={() => setOpen(true)}
      className="h-6 whitespace-nowrap rounded px-1 text-xs font-medium text-rose-700 underline decoration-rose-300 underline-offset-4 hover:text-rose-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      aria-label={`Xem lý do ${hidden ? "Admin ẩn" : "từ chối"} bài ${service.name}`}>
      Xem lý do
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>{hidden ? "Lý do Admin ẩn bài đăng" : "Lý do từ chối bài đăng"}</DialogTitle>
          <DialogDescription className="break-words">{service.name}</DialogDescription>
        </DialogHeader>
        <p className="max-h-[45vh] overflow-y-auto rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900 whitespace-pre-wrap break-words">
          {reason || "Admin chưa cung cấp lý do."}
        </p>
        {providerView && hidden && <p className="text-sm leading-6 text-slate-600">Bài đăng này đã bị khóa chỉnh sửa. Vui lòng tạo bài đăng mới để Admin kiểm duyệt nếu bạn muốn tiếp tục cung cấp dịch vụ.</p>}
        <div className="flex justify-end"><Button variant="outline" onClick={() => setOpen(false)}>Đóng</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
