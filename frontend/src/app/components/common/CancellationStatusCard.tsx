import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { CancellationRequestDto, RefundAccountInput } from "@/app/services/wf05Bookings";
import { formatVietnamDateTime } from "@/app/services/payos";
import { VIETNAM_BANKS } from "@/app/data/vietnamBanks";

const REASON_LABELS: Record<string, string> = {
  CUSTOMER_REQUEST: "Khách đổi kế hoạch",
  WEATHER_FORCE_MAJEURE: "Thời tiết / bất khả kháng",
  SERVICE_QUALITY: "Không đồng ý điều chỉnh dịch vụ",
  OTHER: "Lý do khác",
  TOUR_CANCELLED: "Agency hủy tour",
  PAYMENT_OVERDUE: "Quá hạn thanh toán",
};

const formatVND = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

interface CancellationStatusCardProps {
  cancellation: CancellationRequestDto;
  /** Chỉ khách mới được nhập tài khoản nhận hoàn. */
  onSaveRefundAccount?: (input: RefundAccountInput) => Promise<boolean>;
}

/** Trạng thái yêu cầu hủy/hoàn tiền của một đơn: số liệu lấy nguyên từ máy chủ. */
export function CancellationStatusCard({ cancellation: c, onSaveRefundAccount }: CancellationStatusCardProps) {
  const pending = c.status === "Pending" || c.status === "Reviewing";
  const needsAccount = pending && !c.hasRefundAccount && c.suggestedRefund > 0;
  const [bankName, setBankName] = useState(VIETNAM_BANKS[0].name);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const number = accountNumber.replace(/\s/g, "");
    if (!bankName.trim() || !accountHolder.trim() || !/^\d{6,30}$/.test(number)) {
      setError("Nhập đủ ngân hàng, số tài khoản (6–30 chữ số) và tên chủ tài khoản.");
      return;
    }
    if (!onSaveRefundAccount) return;
    setSaving(true);
    const ok = await onSaveRefundAccount({ bankName: bankName.trim(), accountNumber: number, accountHolder: accountHolder.trim().toUpperCase() });
    setSaving(false);
    if (ok) setError("");
  };

  const tone = pending
    ? "border-amber-300 bg-amber-50"
    : c.status === "Completed"
      ? "border-emerald-300 bg-emerald-50"
      : "border-gray-300 bg-gray-50";

  return (
    <div className={`rounded-2xl border p-4 space-y-2 text-xs text-gray-800 ${tone}`}>
      <div className="flex items-center gap-2 font-bold text-sm">
        {pending ? (
          <Clock className="w-4 h-4 text-amber-600" />
        ) : c.status === "Completed" ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <XCircle className="w-4 h-4 text-gray-500" />
        )}
        {pending
          ? "Yêu cầu hủy đang chờ Admin duyệt"
          : c.status === "Completed"
            ? "Admin đã duyệt hủy đơn"
            : "Yêu cầu hủy đã bị từ chối"}
      </div>
      <p>
        {REASON_LABELS[c.reason] ?? c.reason} · gửi lúc {formatVietnamDateTime(c.createdAt)}
        {c.requestedByRole === "agency" ? " (do công ty lữ hành gửi)" : ""}
      </p>
      {c.reasonDetail && <p className="text-gray-600 italic">“{c.reasonDetail}”</p>}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div>
          <span className="block text-[10px] text-gray-500">Đã thanh toán</span>
          <strong>{formatVND(c.paidAmount)}</strong>
        </div>
        <div>
          <span className="block text-[10px] text-gray-500">Phí hủy ({c.feePercent}%)</span>
          <strong>{formatVND(Math.min(c.fee, c.paidAmount))}</strong>
        </div>
        <div>
          <span className="block text-[10px] text-gray-500">{c.status === "Completed" ? "Đã hoàn" : "Dự kiến hoàn"}</span>
          <strong className="text-emerald-700">{formatVND(c.approvedRefundAmount ?? c.suggestedRefund)}</strong>
        </div>
      </div>
      {pending && <p className="text-gray-600">Trong lúc chờ duyệt, đơn tạm khóa thanh toán.</p>}
      {c.status === "Completed" && c.refundTransactionCode && (
        <p>
          Mã giao dịch hoàn tiền: <strong className="font-mono">{c.refundTransactionCode}</strong>
          {c.completedAt ? ` · ${formatVietnamDateTime(c.completedAt)}` : ""}
        </p>
      )}
      {c.adminNote && <p>Ghi chú của Admin: {c.adminNote}</p>}
      {c.status === "Rejected" && c.rejectionReason && <p>Lý do từ chối: {c.rejectionReason}</p>}

      {needsAccount && (
        <div className="mt-2 space-y-2 rounded-xl border border-amber-300 bg-white p-3">
          <p className="flex items-start gap-1.5 font-semibold text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {onSaveRefundAccount
              ? "Vui lòng nhập tài khoản nhận tiền hoàn để Admin chuyển khoản."
              : "Khách chưa cung cấp tài khoản nhận tiền hoàn."}
          </p>
          {onSaveRefundAccount && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Ngân hàng</Label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full h-9 px-2 text-xs rounded-md border border-gray-300 bg-white"
                  >
                    {VIETNAM_BANKS.map((b) => (
                      <option key={b.bin} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Số tài khoản</Label>
                  <Input value={accountNumber} inputMode="numeric" onChange={(e) => setAccountNumber(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Chủ tài khoản</Label>
                  <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value.toUpperCase())} className="h-9 text-xs uppercase" />
                </div>
              </div>
              {error && <p className="text-[11px] text-rose-600">{error}</p>}
              <Button size="sm" onClick={save} disabled={saving} className="h-8 text-xs">
                {saving ? "Đang lưu..." : "Lưu tài khoản nhận hoàn"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
