import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { VietnameseMoneyInput } from "@/app/components/ui/VietnameseMoneyInput";
import { http } from "@/app/lib/http";
import type { BookingDto } from "@/app/services/wf05Bookings";

export function BookingSurchargeDialog({ open, onOpenChange, bookingId, expectedTotal, onChanged }:
  { open: boolean; onOpenChange: (open: boolean) => void; bookingId: string; expectedTotal: number; onChanged?: (booking: BookingDto) => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");
  useEffect(() => { if (open) { setAmount(""); setReason(""); setError(""); requestId.current = crypto.randomUUID(); } }, [open]);
  const save = async () => {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const updated = await http<BookingDto>(`/agency/bookings/${bookingId}/surcharges`, { method: "POST",
        body: JSON.stringify({ amount: Number(amount), reason: reason.trim(), expectedTotal, requestId: requestId.current }) });
      onChanged?.(updated); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Không lưu được phụ thu."); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={next => !saving && onOpenChange(next)}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[560px]">
      <DialogHeader><DialogTitle>Thêm phụ thu cho booking #{bookingId}</DialogTitle></DialogHeader>
      <p className="rounded-lg bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">Giá tour đã chốt được giữ nguyên. Phụ thu được ghi riêng trong nhật ký và lịch thanh toán của khách, không cần duyệt lại booking.</p>
      <label className="space-y-1.5 text-sm font-semibold">Số tiền phụ thu (VNĐ) *
        <VietnameseMoneyInput value={amount} onValueChange={setAmount} placeholder="VD: 200.000" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-semibold tabular-nums" />
      </label>
      <label className="space-y-1.5 text-sm font-semibold">Lý do phụ thu đã thống nhất với khách *
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={240} placeholder="VD: Phụ thu nâng cấp phòng theo yêu cầu của khách" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs font-normal" />
      </label>
      <p className="text-xs text-slate-500">Khách thanh toán các khoản tour trước, sau đó đến phụ thu. Hạn phụ thu tối thiểu 24 giờ và không sớm hơn hạn thanh toán tour.</p>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Hủy bỏ</Button>
        <Button disabled={saving || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0 || reason.trim().length < 3} onClick={save}>{saving ? "Đang lưu…" : "Tạo phụ thu"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
