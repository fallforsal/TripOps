import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Landmark,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Send,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { formatVietnamDateTime } from "@/app/services/payos";
import { getPayoutAccount, type PayoutAccountDto } from "@/app/services/wf05Bookings";
import {
  formatVND,
  holdSettlement,
  listSettlements,
  payoutSettlement,
  recordManualSettlement,
  releaseSettlement,
  runSettlements,
  SETTLEMENT_STATUS_LABEL,
  SETTLEMENT_STATUS_STYLE,
  syncSettlement,
  type SettlementDto,
  type SettlementStatus,
} from "@/app/services/settlements";

type Filter = "all" | SettlementStatus;
type ActionMode = "payout" | "manual" | "hold";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "Ready", label: "Chờ chuyển" },
  { id: "Processing", label: "Đang chuyển" },
  { id: "Failed", label: "Chuyển lỗi" },
  { id: "OnHold", label: "Tạm giữ" },
  { id: "Paid", label: "Đã chuyển" },
];

const errorText = (err: unknown, fallback: string) => friendlyNote(err instanceof Error && err.message ? err.message : fallback);

/** Rút gọn lỗi kỹ thuật của payOS thành câu ngắn cho Admin (lỗi gốc vẫn xem được khi rê chuột). */
function friendlyNote(text: string): string {
  if (/HTTP 403/.test(text) || /IP/.test(text) && /không được phép/i.test(text))
    return "payOS chặn vì IP máy chạy backend chưa được thêm vào kênh chuyển tiền (my.payos.vn). Chưa có tiền ra.";
  return text;
}

/**
 * Quyết toán cho Agency sau khi tour hoàn thành.
 * Tự động: hệ thống chuyển sau ngày hẹn (mặc định 2 ngày sau khi HDV bấm hoàn thành) nếu đủ điều kiện.
 * Thủ công: Admin chuyển qua payOS ngay, hoặc tự chuyển khoản rồi ghi nhận mã giao dịch.
 */
export function AdminSettlementManagement() {
  const [items, setItems] = useState<SettlementDto[]>([]);
  const [account, setAccount] = useState<PayoutAccountDto | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [action, setAction] = useState<{ mode: ActionMode; item: SettlementDto } | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, payout] = await Promise.all([listSettlements(), getPayoutAccount().catch(() => null)]);
      setItems(list);
      setAccount(payout);
    } catch (err) {
      setMessage({ tone: "error", text: errorText(err, "Không tải được danh sách quyết toán.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replace = (next: SettlementDto) => setItems((list) => list.map((s) => (s.id === next.id ? next : s)));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (s) =>
        (filter === "all" || s.status === filter) &&
        (!q || [s.bookingCode, s.tourName, s.agencyName].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [items, filter, search]);

  const stats = useMemo(() => {
    const sum = (list: SettlementDto[], pick: (s: SettlementDto) => number) => list.reduce((t, s) => t + pick(s), 0);
    const waiting = items.filter((s) => s.status === "Ready" || s.status === "Failed" || s.status === "OnHold");
    const paid = items.filter((s) => s.status === "Paid");
    return {
      waitingCount: waiting.length,
      waitingAmount: sum(waiting, (s) => s.netPayout),
      processing: items.filter((s) => s.status === "Processing").length,
      paidAmount: sum(paid, (s) => s.netPayout),
      fees: sum(paid, (s) => s.platformFee),
    };
  }, [items]);

  const runNow = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const result = await runSettlements();
      setMessage(
        result.configured
          ? {
              tone: result.errors.length ? "error" : "ok",
              text:
                `Đã tạo ${result.started} lệnh chuyển, cập nhật ${result.synced} lệnh đang chạy, ${result.waiting} khoản chưa đủ điều kiện.` +
                (result.errors.length ? ` Lỗi: ${result.errors.join(" ")}` : ""),
            }
          : { tone: "error", text: result.errors.join(" ") || "Chưa cấu hình kênh chuyển tiền payOS." },
      );
      await load();
    } catch (err) {
      setMessage({ tone: "error", text: errorText(err, "Không chạy được lượt chuyển tự động.") });
    } finally {
      setRunning(false);
    }
  };

  const quick = async (item: SettlementDto, run: () => Promise<SettlementDto>, done: string) => {
    setBusyId(item.id);
    setMessage(null);
    try {
      const next = await run();
      replace(next);
      setMessage({ tone: "ok", text: done });
    } catch (err) {
      setMessage({ tone: "error", text: errorText(err, "Thao tác không thành công.") });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const open = (mode: ActionMode, item: SettlementDto) => {
    setAction({ mode, item });
    setAmount(String(Math.round(item.netPayout)));
    setNote("");
    setCode("");
    setFormError("");
  };

  const submit = async () => {
    if (!action) return;
    const { mode, item } = action;
    const value = Number(amount.replace(/\D/g, ""));
    const changed = value !== Math.round(item.netPayout);
    if (mode !== "hold") {
      if (!value || value <= 0) return setFormError("Vui lòng nhập số tiền hợp lệ.");
      if (value > item.netPayout) return setFormError(`Không được chuyển quá ${formatVND(item.netPayout)}.`);
      if ((changed || item.openComplaints > 0) && !note.trim())
        return setFormError(item.openComplaints > 0 ? "Đang có khiếu nại: vui lòng ghi chú cách đã giải quyết với Agency." : "Chuyển ít hơn số được nhận: vui lòng ghi lý do.");
    }
    if (mode === "manual" && code.trim().length < 3) return setFormError("Vui lòng nhập mã giao dịch ngân hàng.");
    if (mode === "hold" && note.trim().length < 3) return setFormError("Vui lòng nhập lý do tạm giữ.");
    setSubmitting(true);
    setFormError("");
    try {
      const next =
        mode === "payout"
          ? await payoutSettlement(item.id, changed ? value : null, note.trim())
          : mode === "manual"
            ? await recordManualSettlement(item.id, code.trim(), changed ? value : null, note.trim())
            : await holdSettlement(item.id, note.trim());
      replace(next);
      setAction(null);
      setMessage({
        tone: "ok",
        text:
          mode === "payout"
            ? next.status === "Paid"
              ? `Đã chuyển ${formatVND(next.netPayout)} cho ${next.agencyName}.`
              : `Đã tạo lệnh chuyển ${formatVND(next.netPayout)}. Bấm "Kiểm tra" để cập nhật kết quả từ payOS.`
            : mode === "manual"
              ? `Đã ghi nhận chuyển khoản ${formatVND(next.netPayout)} cho ${next.agencyName}.`
              : "Đã tạm giữ khoản này.",
      });
    } catch (err) {
      setFormError(errorText(err, "Thao tác không thành công."));
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Quyết toán cho Agency</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
            <Wallet className="w-4 h-4 text-[#075985]" />
            {account?.configured ? (
              account.balance != null ? (
                <span>
                  Số dư chi hộ payOS: <strong>{formatVND(account.balance)}</strong>
                </span>
              ) : (
                <span className="text-amber-700">{account.error || "Không đọc được số dư"}</span>
              )
            ) : (
              <span className="text-rose-700">Chưa cấu hình kênh chi hộ payOS</span>
            )}
          </div>
          <Button variant="outline" onClick={() => void load()} className="h-9 gap-1.5 text-xs">
            <RefreshCw className="w-4 h-4" /> Tải lại
          </Button>
          <Button onClick={runNow} disabled={running} className="h-9 gap-1.5 text-xs bg-[#075985] hover:bg-[#0C4A6E] text-white">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Chạy chuyển tự động ngay
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Chờ chuyển" value={formatVND(stats.waitingAmount)} hint={`${stats.waitingCount} khoản (gồm lỗi / tạm giữ)`} tone="text-amber-600" />
        <Stat label="Đang chuyển" value={String(stats.processing)} hint="Chờ payOS báo kết quả" tone="text-sky-700" />
        <Stat label="Đã chuyển cho Agency" value={formatVND(stats.paidAmount)} hint="Tổng số đã trả" tone="text-emerald-700" />
        <Stat label="Phí sàn đã thu" value={formatVND(stats.fees)} hint="Từ các khoản đã trả" tone="text-[#EA580C]" />
      </div>

      {message && (
        <div
          role={message.tone === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm flex items-start justify-between gap-3 ${message.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          <span>{message.text}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setMessage(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const count = f.id === "all" ? items.length : items.filter((s) => s.status === f.id).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold border ${filter === f.id ? "bg-[#075985] text-white border-[#075985]" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã booking, tour, Agency..." className="h-9 text-xs md:w-64" />
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
            Đang tải...
          </p>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <Landmark className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm">Chưa có khoản quyết toán nào (khoản chỉ xuất hiện khi hướng dẫn viên bấm hoàn thành tour).</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3">Booking / Tour</th>
                  <th className="py-3 px-3">Agency nhận</th>
                  <th className="py-3 px-3 text-right">Khách đã trả</th>
                  <th className="py-3 px-3 text-right">Phí sàn</th>
                  <th className="py-3 px-3 text-right">Agency nhận</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="py-3 px-3 space-y-0.5">
                      <p className="font-bold text-gray-900">{s.bookingCode}</p>
                      <p className="text-gray-600 max-w-[220px] truncate">{s.tourName || "—"}</p>
                      <p className="text-[11px] text-gray-400">
                        Hoàn thành: {s.tourCompletedAt ? formatVietnamDateTime(s.tourCompletedAt) : "—"}
                      </p>
                    </td>
                    <td className="py-3 px-3 space-y-0.5">
                      <p className="font-semibold text-gray-900">
                        {s.agencyName}
                        {!s.isHost && <span className="ml-1 text-[10px] text-gray-500">(đối tác)</span>}
                      </p>
                      {s.accountNumber ? (
                        <p className="text-[11px] text-gray-500">
                          {s.bankName} · {s.accountNumber} · {s.accountHolder}
                        </p>
                      ) : (
                        <p className="text-[11px] text-rose-600">Chưa nhập tài khoản nhận tiền</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <p className="font-semibold">{formatVND(s.customerPaid)}</p>
                      <p className="text-[11px] text-gray-400">/ {formatVND(s.bookingTotal)}</p>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <p>{formatVND(s.platformFee)}</p>
                      <p className="text-[11px] text-gray-400">{s.feePercent}%</p>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatVND(s.netPayout)}</td>
                    <td className="py-3 px-3 space-y-1 max-w-[260px]">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${SETTLEMENT_STATUS_STYLE[s.status]}`}>
                        {SETTLEMENT_STATUS_LABEL[s.status]}
                      </span>
                      {s.status === "Paid" ? (
                        <p className="text-[11px] text-gray-500">
                          {s.payoutMethod === "MANUAL" ? "Chuyển tay" : s.settledBy ? "Admin chuyển qua payOS" : "Hệ thống tự chuyển"} ·{" "}
                          {formatVietnamDateTime(s.transferredAt)}
                          {s.bankReferenceCode && <> · Mã GD {s.bankReferenceCode}</>}
                        </p>
                      ) : s.autoBlockers.length === 0 ? (
                        <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đủ điều kiện: lượt quét kế tiếp sẽ tự chuyển
                        </p>
                      ) : (
                        <ul className="text-[11px] text-gray-500 space-y-0.5">
                          {s.status === "Ready" && s.autoPayoutAt && (
                            <li className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Tự chuyển từ {formatVietnamDateTime(s.autoPayoutAt)}
                            </li>
                          )}
                          {s.autoBlockers
                            .filter((b) => !b.startsWith("Chưa tới ngày"))
                            .map((b) => (
                              <li key={b} className="flex gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" /> {b}
                              </li>
                            ))}
                        </ul>
                      )}
                      {s.payoutNote && s.status !== "Paid" && (
                        <p className="text-[11px] text-rose-700 line-clamp-2" title={s.payoutNote}>
                          {friendlyNote(s.payoutNote)}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col items-end gap-1.5">
                        {s.status === "Processing" && (
                          <Button
                            variant="outline"
                            disabled={busyId === s.id}
                            onClick={() => quick(s, () => syncSettlement(s.id), "Đã cập nhật kết quả lệnh chuyển.")}
                            className="h-8 text-xs gap-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Kiểm tra
                          </Button>
                        )}
                        {(s.status === "Ready" || s.status === "Failed" || s.status === "OnHold") && (
                          <>
                            <Button
                              disabled={s.payoutBlockers.length > 0 || !s.accountNumber || !s.bankBin}
                              title={s.payoutBlockers.join(" ") || (!s.bankBin ? "Agency chưa có tài khoản ngân hàng hỗ trợ chi tự động" : "")}
                              onClick={() => open("payout", s)}
                              className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Send className="w-3.5 h-3.5" /> Chuyển qua payOS
                            </Button>
                            <Button
                              variant="outline"
                              disabled={s.payoutBlockers.length > 0}
                              title={s.payoutBlockers.join(" ")}
                              onClick={() => open("manual", s)}
                              className="h-8 text-xs gap-1"
                            >
                              <Landmark className="w-3.5 h-3.5" /> Đã chuyển tay
                            </Button>
                          </>
                        )}
                        {(s.status === "Ready" || s.status === "Failed") && (
                          <button type="button" onClick={() => open("hold", s)} className="text-[11px] text-violet-700 hover:underline flex items-center gap-1">
                            <PauseCircle className="w-3.5 h-3.5" /> Tạm giữ
                          </button>
                        )}
                        {s.status === "OnHold" && (
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => quick(s, () => releaseSettlement(s.id), "Đã bỏ tạm giữ.")}
                            className="text-[11px] text-violet-700 hover:underline"
                          >
                            Bỏ tạm giữ
                          </button>
                        )}
                        {s.payoutBlockers.length > 0 && s.status !== "Paid" && s.status !== "Processing" && (
                          <p className="text-[11px] text-rose-600 text-right max-w-[200px]">{s.payoutBlockers[0]}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={Boolean(action)} onOpenChange={(o) => !o && !submitting && setAction(null)}>
        <DialogContent className="sm:max-w-lg">
          {action && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {action.mode === "payout" ? "Chuyển tiền qua payOS" : action.mode === "manual" ? "Ghi nhận đã chuyển khoản tay" : "Tạm giữ khoản quyết toán"}
                </DialogTitle>
                <DialogDescription>
                  {action.item.bookingCode} · {action.item.agencyName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {action.mode !== "hold" && (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-1 text-xs">
                    <p>
                      Khách đã trả: <strong>{formatVND(action.item.grossAmount)}</strong>
                    </p>
                    <p>
                      Phí sàn {action.item.feePercent}%: <strong>− {formatVND(action.item.platformFee)}</strong>
                    </p>
                    <p>
                      Agency được nhận: <strong className="text-emerald-700">{formatVND(action.item.netPayout)}</strong>
                    </p>
                    <p>
                      Tài khoản: {action.item.bankName || "—"} · {action.item.accountNumber || "—"} · {action.item.accountHolder || "—"}
                    </p>
                  </div>
                )}
                {action.item.openComplaints > 0 && (
                  <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                    Booking đang có {action.item.openComplaints} khiếu nại mở. Hãy thống nhất với Agency và ghi chú lại trước khi chuyển.
                  </p>
                )}
                {action.mode === "manual" && (
                  <div className="space-y-1">
                    <Label htmlFor="settle-code">Mã giao dịch ngân hàng</Label>
                    <Input id="settle-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD FT26316000123" />
                  </div>
                )}
                {action.mode !== "hold" && (
                  <div className="space-y-1">
                    <Label htmlFor="settle-amount">Số tiền chuyển (đ)</Label>
                    <Input
                      id="settle-amount"
                      inputMode="numeric"
                      value={Number(amount.replace(/\D/g, "") || 0).toLocaleString("vi-VN")}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    />
                    <p className="text-[11px] text-gray-500">Muốn trừ bồi thường khiếu nại thì nhập số nhỏ hơn và ghi lý do.</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="settle-note">{action.mode === "hold" ? "Lý do tạm giữ" : "Ghi chú"}</Label>
                  <Textarea id="settle-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                </div>
                {action.mode === "payout" && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                    Đây là chuyển tiền thật từ số dư kênh chi hộ payOS. Kiểm tra kỹ số tiền và tài khoản trước khi xác nhận.
                  </p>
                )}
                {formError && <p className="text-xs text-rose-600">{formError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={submitting} onClick={() => setAction(null)}>
                  Hủy
                </Button>
                <Button disabled={submitting} onClick={submit} className="bg-[#075985] hover:bg-[#0C4A6E] text-white gap-1.5">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {action.mode === "payout" ? "Xác nhận chuyển" : action.mode === "manual" ? "Ghi nhận đã chuyển" : "Tạm giữ"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-1">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <p className={`text-2xl font-extrabold ${tone}`}>{value}</p>
      <p className="text-[11px] text-gray-400">{hint}</p>
    </div>
  );
}
