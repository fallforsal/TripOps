import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Clock, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { BankCombobox } from "@/app/components/common/BankCombobox";
import { formatVietnamDateTime } from "@/app/services/payos";
import {
  formatVND,
  getAgencyPayoutAccount,
  listAgencySettlements,
  saveAgencyPayoutAccount,
  SETTLEMENT_STATUS_LABEL,
  SETTLEMENT_STATUS_STYLE,
  type AgencyPayoutAccountDto,
  type SettlementDto,
} from "@/app/services/settlements";

/**
 * Agency tự nhập tài khoản ngân hàng nhận tiền quyết toán và theo dõi tiền về.
 * Tour hoàn thành 2 ngày → hệ thống tự chuyển (đã trừ phí sàn) nếu khách đã trả đủ và không có khiếu nại.
 */
export function AgencyPayoutPanel() {
  const [account, setAccount] = useState<AgencyPayoutAccountDto | null>(null);
  const [items, setItems] = useState<SettlementDto[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const settlementTabs = [{ id: "all", label: "Tất cả" }, ...Object.entries(SETTLEMENT_STATUS_LABEL).map(([id, label]) => ({ id, label }))];
  const filteredItems = items.filter(item => statusFilter === "all" || item.status === statusFilter);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getAgencyPayoutAccount(), listAgencySettlements().catch(() => [] as SettlementDto[])])
      .then(([acc, list]) => {
        setAccount(acc);
        setBankName(acc.bankName ?? "");
        setAccountNumber(acc.accountNumber ?? "");
        setHolder(acc.accountHolder ?? "");
        setItems(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được tài khoản nhận tiền."))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setError("");
    setSaved(false);
    if (!bankName) return setError("Vui lòng gõ và chọn ngân hàng trong danh sách gợi ý.");
    if (!/^\d{6,30}$/.test(accountNumber.replace(/\s/g, ""))) return setError("Số tài khoản chỉ gồm chữ số (6–30 số).");
    if (holder.trim().length < 2) return setError("Vui lòng nhập tên chủ tài khoản.");
    setSaving(true);
    try {
      const next = await saveAgencyPayoutAccount(bankName, accountNumber, holder);
      setAccount(next);
      setAccountNumber(next.accountNumber ?? "");
      setHolder(next.accountHolder ?? "");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  const changed =
    bankName !== (account?.bankName ?? "") ||
    accountNumber.replace(/\s/g, "") !== (account?.accountNumber ?? "") ||
    holder.trim() !== (account?.accountHolder ?? "");

  if (loading) return <div className="p-6 text-sm text-slate-500">Đang tải tài khoản nhận tiền...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Tài khoản nhận tiền quyết toán</h2>
            <p className="text-xs text-slate-500">
              Sau khi hướng dẫn viên bấm hoàn thành tour 2 ngày, TripOps tự chuyển tiền tour (đã trừ 10% phí sàn) vào tài khoản này nếu
              khách đã thanh toán đủ và không có khiếu nại. Có khiếu nại thì Admin liên hệ để xử lý trước khi chuyển.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="payout-bank">Ngân hàng</Label>
            <BankCombobox id="payout-bank" value={bankName} onChange={setBankName} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payout-number">Số tài khoản</Label>
            <Input id="payout-number" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payout-holder">Tên chủ tài khoản</Label>
            <Input id="payout-holder" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="VD CONG TY TNHH ABC" className="h-10 rounded-xl" />
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Tên chủ tài khoản phải trùng với ngân hàng (in hoa, không dấu). Sau khi đổi tài khoản, hệ thống chờ 24 giờ mới tự chuyển vào tài khoản mới.
        </p>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        {saved && !changed && (
          <p className="text-xs text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Đã lưu tài khoản nhận tiền.
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            {account?.updatedAt ? `Cập nhật lần cuối: ${formatVietnamDateTime(account.updatedAt)}` : "Chưa có tài khoản nhận tiền."}
          </p>
          <Button type="button" disabled={saving || !changed} onClick={save} className="rounded-xl bg-[#075985] hover:bg-[#0C4A6E] text-white gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Lưu tài khoản
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-emerald-600" /> Tiền quyết toán các tour
        </h2>
        <div role="tablist" aria-label="Trạng thái tiền quyết toán" className="flex flex-wrap gap-1">
          {settlementTabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={statusFilter === tab.id} onClick={() => setStatusFilter(tab.id)} className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${statusFilter === tab.id ? "bg-[#075985] text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            {tab.label} <span className="ml-1 opacity-80">({items.filter(item => tab.id === "all" || item.status === tab.id).length})</span>
          </button>)}
        </div>
        {filteredItems.length === 0 ? (
          <p className="text-xs text-slate-500">{statusFilter === "all" ? "Chưa có tour nào hoàn thành." : "Chưa có khoản quyết toán trong trạng thái này."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Booking</th>
                  <th className="py-2.5 px-3 text-right">Khách đã trả</th>
                  <th className="py-2.5 px-3 text-right">Phí sàn</th>
                  <th className="py-2.5 px-3 text-right">Bạn nhận</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900">{s.bookingCode}</p>
                      <p className="text-[11px] text-slate-500 max-w-[220px] truncate">{s.tourName}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatVND(s.grossAmount)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {formatVND(s.platformFee)} <span className="text-slate-400">({s.feePercent}%)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatVND(s.netPayout)}</td>
                    <td className="py-2.5 px-3 space-y-0.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${SETTLEMENT_STATUS_STYLE[s.status]}`}>
                        {SETTLEMENT_STATUS_LABEL[s.status]}
                      </span>
                      {s.status === "Paid" ? (
                        <p className="text-[11px] text-slate-500">
                          {formatVietnamDateTime(s.transferredAt)}
                          {s.bankReferenceCode && <> · Mã GD {s.bankReferenceCode}</>}
                        </p>
                      ) : s.status === "Ready" && s.autoPayoutAt && s.openComplaints === 0 ? (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Dự kiến từ {formatVietnamDateTime(s.autoPayoutAt)}
                        </p>
                      ) : s.openComplaints > 0 ? (
                        <p className="text-[11px] text-amber-700">Có khiếu nại: Admin sẽ liên hệ trước khi chuyển</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
