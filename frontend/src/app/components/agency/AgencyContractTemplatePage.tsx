import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Eye, FileSignature, Info, Loader2, Lock, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { toast } from "@/app/lib/notifications";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  DEFAULT_TIERS, MAX_CLAUSE_LENGTH, MAX_TIERS, clausePayload, normalizeClause, previewRows, sortTiers, validateTiers,
  type CancellationTier, type PolicyPreviewRow,
} from "@/app/lib/contractTemplate";
import { getContractTemplate, previewContractTemplate, saveContractTemplate, type ContractClauseDto, type ContractTemplateInput } from "@/app/services/contractTemplate";

type Row = { minDays: string; feePercent: string };
const toRows = (tiers: CancellationTier[]): Row[] => sortTiers(tiers).map((t) => ({ minDays: String(t.minDays), feePercent: String(t.feePercent) }));
const toTiers = (rows: Row[]): CancellationTier[] => rows.map((r) => ({ minDays: Number(r.minDays), feePercent: Number(r.feePercent.replace(",", ".")) }));

/** Thứ tự in trong hợp đồng: Điều 1–6 cố định, điều khoản bổ sung (nếu có) là Điều 7, điều cuối là 7 hoặc 8. */
const NUMBERS: Record<string, number> = { program: 1, price: 2, payment: 3, cancellation: 4, changes: 5, duties: 6 };

export function AgencyContractTemplatePage() {
  const [rows, setRows] = useState<Row[]>(toRows(DEFAULT_TIERS));
  const [note, setNote] = useState("");
  const [extra, setExtra] = useState("");
  const [clauses, setClauses] = useState<ContractClauseDto[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [isDefault, setIsDefault] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const apply = (t: Awaited<ReturnType<typeof getContractTemplate>>) => {
    setRows(toRows(t.isDefault ? DEFAULT_TIERS : t.tiers)); setNote(t.cancellationNote ?? ""); setExtra(t.additionalTerms ?? "");
    setClauses(t.clauses); setTexts(Object.fromEntries(t.clauses.map((c) => [c.key, c.text])));
    setIsDefault(t.isDefault); setUpdatedAt(t.updatedAt ?? null);
  };

  useEffect(() => {
    getContractTemplate()
      .then(apply)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Không tải được mẫu hợp đồng."))
      .finally(() => setLoading(false));
  }, []);

  const tiers = useMemo(() => toTiers(rows), [rows]);
  const tierError = rows.some((r) => r.minDays.trim() === "" || r.feePercent.trim() === "") ? "Điền đủ số ngày và % phí cho mọi mốc." : validateTiers(tiers);
  const tooLong = clauses.find((c) => normalizeClause(texts[c.key] ?? "").length > MAX_CLAUSE_LENGTH);
  const error = tierError ?? (tooLong ? `Mỗi điều tối đa ${MAX_CLAUSE_LENGTH} ký tự.` : null);
  const preview = useMemo(() => (tierError ? [] : previewRows(tiers)), [tierError, tiers]);

  const update = (i: number, key: keyof Row, value: string) =>
    setRows((list) => list.map((r, k) => (k === i ? { ...r, [key]: value.replace(/[^\d.,]/g, "") } : r)));

  const input = (): ContractTemplateInput => ({
    tiers, cancellationNote: note, additionalTerms: extra,
    clauses: Object.fromEntries(clauses.map((c) => [c.key, clausePayload(texts[c.key] ?? "", c.defaultText)])),
  });

  /** Bản xem trước luôn lấy nội dung đang soạn trên màn hình, kể cả khi chưa lưu. */
  const openPreview = async () => {
    if (error) return;
    setPreviewing(true);
    try {
      const blob = await previewContractTemplate(input());
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không tạo được bản xem trước.");
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    if (error) return;
    setSaving(true);
    try {
      const saved = await saveContractTemplate(input());
      apply(saved);
      toast.success("Đã lưu mẫu hợp đồng. Áp dụng cho các đơn đặt từ bây giờ.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không lưu được mẫu hợp đồng.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải mẫu hợp đồng…</div>;
  if (loadError) return <div role="alert" className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</div>;

  const cancellationCustomized = JSON.stringify(tiers) !== JSON.stringify(DEFAULT_TIERS) || note.trim() !== "";
  const clause = (key: string, children?: ReactNode) => {
    const c = clauses.find((x) => x.key === key);
    if (!c) return null;
    const number = NUMBERS[key] ?? (normalizeClause(extra) ? 8 : 7);
    return (
      <ClauseCard key={key} number={number} clause={c} text={texts[key] ?? ""}
        hasCustomContent={key === "cancellation" && cancellationCustomized}
        onChange={(value) => setTexts((t) => ({ ...t, [key]: value }))}
        onRestore={() => {
          setTexts((t) => ({ ...t, [key]: c.defaultText }));
          if (key === "cancellation") { setRows(toRows(DEFAULT_TIERS)); setNote(""); }
        }}>
        {children}
      </ClauseCard>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><FileSignature className="h-5 w-5 text-[#075985]" />Mẫu hợp đồng</h1>
          <p className="mt-1 text-sm text-slate-600">
            Đây là đủ các điều của hợp đồng theo mẫu TripOps. Công ty giữ nguyên hoặc sửa từng điều theo nội dung của mình, tự đặt bảng phí hủy
            và thêm điều khoản bổ sung. Thay đổi áp dụng cho các đơn đặt sau khi lưu; đơn đã đặt giữ hợp đồng lúc đặt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={openPreview} disabled={!!error || previewing}>
          {previewing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Eye className="mr-1.5 h-4 w-4" />}Xem trước hợp đồng
        </Button>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${isDefault ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {isDefault ? "Đang dùng mẫu mặc định của TripOps" : `Đã lưu${updatedAt ? " lúc " + new Date(updatedAt).toLocaleString("vi-VN") : ""}`}
        </span>
        </div>
      </div>



      {clause("program")}
      {clause("price")}
      {clause("payment")}
      {clause("cancellation", (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Bảng phí hủy của công ty</p>
            <p className="text-xs text-slate-500">Phí tính trên tổng giá trị tour, theo số ngày còn lại trước khởi hành lúc khách gửi yêu cầu hủy. Các ô được điền sẵn theo mẫu TripOps khi Agency chưa lưu bảng riêng.</p>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-slate-600">
              <span>Còn từ … ngày trở lên</span><span>Phí hủy (%)</span><span className="w-9" />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input inputMode="numeric" aria-label={`Số ngày mốc ${i + 1}`} value={r.minDays} onChange={(e) => update(i, "minDays", e.target.value)} />
                <Input inputMode="decimal" aria-label={`Phí hủy mốc ${i + 1}`} value={r.feePercent} onChange={(e) => update(i, "feePercent", e.target.value)} />
                <Button type="button" variant="outline" size="icon" aria-label="Xóa mốc" disabled={rows.length <= 1}
                  onClick={() => setRows((list) => list.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" disabled={rows.length >= MAX_TIERS}
                onClick={() => setRows((list) => [...list, { minDays: "", feePercent: "" }])}><Plus className="mr-1 h-4 w-4" />Thêm mốc</Button>
            </div>
            {tierError && <p role="alert" className="text-xs text-rose-700">{tierError}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">Xem trước bảng phí Agency đang nhập</p>
            {preview.length > 0 ? (
              <PolicyPreviewTable rows={preview} />
            ) : <p className="text-xs text-slate-500">Sửa lỗi ở trên để xem trước.</p>}
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500"><Lock className="mt-0.5 h-3 w-3 shrink-0" />
              Luật chung của TripOps, không đổi được: ngày khởi hành trở đi phí 100%; khách hủy trong 72 giờ sau lần thanh toán đầu tiên và còn từ 15 ngày trở lên được miễn phí.</p>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Ghi chú chính sách hủy (không bắt buộc)</span>
            <Textarea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Tour dịp Lễ, Tết áp dụng như ngày thường." />
          </label>
        </div>
      ))}
      {clause("changes")}
      {clause("duties")}

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Điều 7. Điều khoản bổ sung của Bên A <span className="font-normal text-slate-500">(không bắt buộc)</span></h2>
        <p className="text-xs text-slate-500">Để trống thì hợp đồng không có điều này và điều cuối thành Điều 7. Mỗi dòng là một ý.</p>
        <Textarea rows={4} maxLength={8000} value={extra} onChange={(e) => setExtra(e.target.value)}
          placeholder={"Ví dụ:\nKhách mang theo CCCD hoặc hộ chiếu bản gốc.\nTrẻ em dưới 14 tuổi đi cùng bố mẹ hoặc người giám hộ."} />
      </section>

      {clause("closing")}

      <div className="flex flex-wrap items-center justify-end gap-3 pb-16">
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        <Button type="button" variant="outline" onClick={openPreview} disabled={!!error || previewing}>
          {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}Xem trước
        </Button>
        <Button type="button" onClick={save} disabled={!!error || saving} className="bg-[#075985] hover:bg-[#0c4a6e]">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Lưu mẫu hợp đồng
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-3 sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Xem trước hợp đồng</DialogTitle>
            <DialogDescription>
              Đúng bản PDF khách sẽ nhận, theo nội dung đang soạn trên màn hình (kể cả phần chưa lưu). Thông tin khách, giá và lịch thanh toán là dữ liệu mẫu.
            </DialogDescription>
          </DialogHeader>
          {previewUrl && <iframe title="Xem trước hợp đồng" src={previewUrl} className="min-h-0 w-full flex-1 rounded-lg border border-slate-200" />}
          {previewUrl && (
            <div className="flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href={previewUrl} download="hop-dong-mau.pdf"><Download className="mr-1.5 h-4 w-4" />Tải PDF</a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClauseCard({ number, clause, text, hasCustomContent, onChange, onRestore, children }: {
  number: number; clause: ContractClauseDto; text: string;
  hasCustomContent?: boolean; onChange: (value: string) => void; onRestore: () => void; children?: ReactNode;
}) {
  const edited = normalizeClause(text) !== normalizeClause(clause.defaultText) || !!hasCustomContent;
  const lines = Math.min(12, Math.max(3, text.split("\n").length + 1));
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Điều {number}. {clause.title.charAt(0) + clause.title.slice(1).toLowerCase()}</h2>
        {edited && <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">Đã sửa</span>}
      </div>
      {clause.autoContent && (
        <p className="flex items-start gap-1.5 text-xs text-slate-500"><Lock className="mt-0.5 h-3 w-3 shrink-0" />Tự điền từ đơn đặt: {clause.autoContent}.</p>
      )}
      {children}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-800">Nội dung điều khoản</span>
        <Textarea rows={lines} maxLength={MAX_CLAUSE_LENGTH} value={text} onChange={(e) => onChange(e.target.value)}
          aria-label={`Nội dung Điều ${number}`} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>Mỗi dòng in thành một đoạn. Để trống thì dùng bản của TripOps.</span>
        <Button type="button" variant="outline" size="sm" className="border-slate-300 bg-white text-[#075985] hover:bg-sky-50 hover:text-[#075985]" onClick={onRestore}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />Khôi phục bản TripOps
        </Button>
      </div>
    </section>
  );
}

function PolicyPreviewTable({ rows }: { rows: PolicyPreviewRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-xs sm:text-sm">
        <thead>
          <tr className="text-left text-slate-600">
            <th className="w-1/2 pb-2 font-medium">Thời điểm gửi yêu cầu</th>
            <th className="w-1/4 pb-2 text-right font-medium">Phí hủy trên tổng giá trị tour</th>
            <th className="w-1/4 pb-2 text-right font-medium">Nếu đã trả đủ, được hoàn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.range} className="border-t border-slate-200">
              <td className="py-2 pr-2 text-slate-700">{row.range}</td>
              <td className="py-2 text-right font-semibold text-slate-900">{row.fee}</td>
              <td className="py-2 text-right font-semibold text-slate-900">{row.refundIfFullyPaid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
