import { useEffect, useMemo, useState } from "react";
import { HandCoins, Loader2, Search, ShieldOff } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { formatVietnamDateTime } from "@/app/services/payos";
import { formatVND } from "@/app/services/settlements";
import {
  listAgencyRefunds,
  REFUND_REASON_LABEL,
  REFUND_STATUS_LABEL,
  REFUND_STATUS_STYLE,
  type AgencyRefundDto,
  type AgencyRefundStatus,
} from "@/app/services/agencyRefunds";

/**
 * UC-068 (Xem lịch sử hoàn tiền) / UC-069 (Xem chi tiết hoàn tiền) — chỉ xem, không duyệt.
 * Agency chủ trì mới thấy; Admin vẫn là người duyệt/từ chối hoàn tiền.
 */
export function AgencyRefundHistory() {
  const [items, setItems] = useState<AgencyRefundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgencyRefundStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AgencyRefundDto | null>(null);

  useEffect(() => {
    listAgencyRefunds()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được lịch sử hoàn tiền."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        r.bookingCode.toLowerCase().includes(needle) ||
        (r.tourName ?? "").toLowerCase().includes(needle) ||
        (r.customerName ?? "").toLowerCase().includes(needle)
      );
    });
  }, [items, statusFilter, search]);

  if (loading) return <div className="p-6 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lịch sử hoàn tiền...</div>;

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-rose-600" /> Hoàn tiền cho khách
          </h2>
          {items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã booking, tên tour, tên khách..."
                  className="h-8 rounded-lg pl-7 text-xs w-60"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AgencyRefundStatus | "all")}
                className="h-8 rounded-lg border border-slate-200 text-xs px-2 text-slate-700"
              >
                <option value="all">Mọi trạng thái</option>
                {Object.entries(REFUND_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <ShieldOff className="w-3.5 h-3.5" /> Chỉ xem — việc duyệt hoặc từ chối hoàn tiền do Admin thực hiện. Số tài khoản của khách được ẩn một phần.
        </p>

        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        {items.length === 0 ? (
          <p className="text-xs text-slate-500">Chưa có yêu cầu hoàn tiền nào trong các booking bạn chủ trì.</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-500">Không có yêu cầu nào khớp với bộ lọc.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Booking</th>
                  <th className="py-2.5 px-3">Khách</th>
                  <th className="py-2.5 px-3">Lý do</th>
                  <th className="py-2.5 px-3 text-right">Đã trả</th>
                  <th className="py-2.5 px-3 text-right">Số tiền hoàn</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="align-top cursor-pointer hover:bg-slate-50" onClick={() => setSelected(r)}>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900">{r.bookingCode}</p>
                      <p className="text-[11px] text-slate-500 max-w-[200px] truncate">{r.tourName}</p>
                    </td>
                    <td className="py-2.5 px-3">{r.customerName ?? "—"}</td>
                    <td className="py-2.5 px-3">
                      <p>{REFUND_REASON_LABEL[r.reason] ?? r.reason}</p>
                      <p className="text-[11px] text-slate-500">{formatVietnamDateTime(r.createdAt)}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatVND(r.paidAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                      {formatVND(r.approvedRefundAmount ?? r.suggestedRefund)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${REFUND_STATUS_STYLE[r.status]}`}>
                        {REFUND_STATUS_LABEL[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.bookingCode} · {selected.tourName}</DialogTitle>
                <DialogDescription>Chi tiết yêu cầu hủy / hoàn tiền (UC-069)</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái</span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${REFUND_STATUS_STYLE[selected.status]}`}>
                    {REFUND_STATUS_LABEL[selected.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Khách</span>
                  <span className="font-medium">{selected.customerName ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Lý do</span>
                  <span className="font-medium">{REFUND_REASON_LABEL[selected.reason] ?? selected.reason}</span>
                </div>
                {selected.reasonDetail && (
                  <p className="text-slate-600 italic bg-slate-50 rounded-xl p-2.5">“{selected.reasonDetail}”</p>
                )}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Đã thanh toán</p>
                    <p className="font-bold">{formatVND(selected.paidAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Phí hủy ({selected.feePercent}%)</p>
                    <p className="font-bold">{formatVND(selected.fee)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Số tiền hoàn</p>
                    <p className="font-bold text-rose-700">{formatVND(selected.approvedRefundAmount ?? selected.suggestedRefund)}</p>
                  </div>
                </div>
                {selected.refundBankMasked && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tài khoản nhận hoàn</span>
                    <span className="font-medium">{selected.refundBankMasked}</span>
                  </div>
                )}
                {selected.adminNote && (
                  <p className="text-slate-600"><span className="text-slate-500">Ghi chú Admin:</span> {selected.adminNote}</p>
                )}
                {selected.rejectionReason && (
                  <p className="text-rose-700"><span className="text-slate-500">Lý do từ chối:</span> {selected.rejectionReason}</p>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Gửi lúc {formatVietnamDateTime(selected.createdAt)}</span>
                  {selected.completedAt && <span>Hoàn tất {formatVietnamDateTime(selected.completedAt)}</span>}
                </div>
                {selected.agencyNetPayout != null && (
                  <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                    Khoản quyết toán của booking này: {formatVND(selected.agencyNetPayout)}
                    {selected.agencySettlementStatus && <> · {selected.agencySettlementStatus}</>}
                    {selected.status !== "Rejected" && selected.status !== "Completed" && " — có thể bị giữ lại chờ xử lý xong yêu cầu này."}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
