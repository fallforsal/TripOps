import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FileSignature, Info, Loader2, Lock, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "@/app/lib/notifications";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  DEFAULT_TIERS, MAX_CLAUSE_LENGTH, MAX_TIERS, clausePayload, normalizeClause, previewRows, sortTiers, validateTiers,
  type CancellationTier,
} from "@/app/lib/contractTemplate";
import { getContractTemplate, saveContractTemplate, type ContractClauseDto } from "@/app/services/contractTemplate";

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

  const apply = (t: Awaited<ReturnType<typeof getContractTemplate>>) => {
    setRows(toRows(t.tiers)); setNote(t.cancellationNote ?? ""); setExtra(t.additionalTerms ?? "");
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

  const save = async () => {
    if (error) return;
    setSaving(true);
    try {
      const saved = await saveContractTemplate({
        tiers, cancellationNote: note, additionalTerms: extra,
        clauses: Object.fromEntries(clauses.map((c) => [c.key, clausePayload(texts[c.key] ?? "", c.defaultText)])),
      });
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

  const clause = (key: string, children?: ReactNode) => {
    const c = clauses.find((x) => x.key === key);
    if (!c) return null;
    const number = NUMBERS[key] ?? (normalizeClause(extra) ? 8 : 7);
    return (
      <ClauseCard key={key} number={number} clause={c} text={texts[key] ?? ""}
        onChange={(value) => setTexts((t) => ({ ...t, [key]: value }))}
        onRestore={() => setTexts((t) => ({ ...t, [key]: c.defaultText }))}>
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
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${isDefault ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {isDefault ? "Đang dùng mẫu mặc định của TripOps" : `Đã lưu${updatedAt ? " lúc " + new Date(updatedAt).toLocaleString("vi-VN") : ""}`}
        </span>
      </div>



      {clause("program")}
      {clause("price")}
      {clause("payment")}
      {clause("cancellation", (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Bảng phí hủy của công ty</p>
            <p className="text-xs text-slate-500">Phí tính trên tổng giá trị tour, theo số ngày còn lại trước khởi hành lúc khách gửi yêu cầu hủy.</p>
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
              <Button type="button" variant="ghost" size="sm" onClick={() => setRows(toRows(DEFAULT_TIERS))}><RotateCcw className="mr-1 h-4 w-4" />Dùng bảng mặc định TripOps</Button>
            </div>
            {tierError && <p role="alert" className="text-xs text-rose-700">{tierError}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">Bảng sẽ in trong hợp đồng</p>
            {preview.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {preview.map((p) => (
                    <tr key={p.range} className="border-t border-slate-200 first:border-0">
                      <td className="py-1.5 text-slate-700">{p.range}</td><td className="py-1.5 text-right font-semibold text-slate-900">{p.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        <Button type="button" onClick={save} disabled={!!error || saving} className="bg-[#075985] hover:bg-[#0c4a6e]">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Lưu mẫu hợp đồng
        </Button>
      </div>
    </div>
  );
}

function ClauseCard({ number, clause, text, onChange, onRestore, children }: {
  number: number; clause: ContractClauseDto; text: string;
  onChange: (value: string) => void; onRestore: () => void; children?: ReactNode;
}) {
  const edited = normalizeClause(text) !== normalizeClause(clause.defaultText);
  const lines = Math.min(12, Math.max(3, text.split("\n").length + 1));
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Điều {number}. {clause.title.charAt(0) + clause.title.slice(1).toLowerCase()}</h2>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${edited ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
          {edited ? "Đã sửa" : "Mẫu TripOps"}
        </span>
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
        <Button type="button" variant="ghost" size="sm" disabled={!edited} onClick={onRestore}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />Khôi phục bản TripOps
        </Button>
      </div>
    </section>
  );
}
