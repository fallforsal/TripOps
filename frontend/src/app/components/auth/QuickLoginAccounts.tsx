import { useId, useState } from "react";
import { Check, Info, Search } from "lucide-react";
import { QUICK_LOGIN_ACCOUNTS, QUICK_LOGIN_PROVINCES, QUICK_LOGIN_ROLES, type QuickLoginAccount } from "@/app/data/quickLoginAccounts";

type Props = { email: string; disabled?: boolean; onSelect: (account: QuickLoginAccount) => void };
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();

export function QuickLoginAccounts({ email, disabled, onSelect }: Props) {
  const [group, setGroup] = useState("all");
  const [role, setRole] = useState("all");
  const [province, setProvince] = useState("all");
  const [search, setSearch] = useState("");
  const id = useId();
  const rows = QUICK_LOGIN_ACCOUNTS.filter(a => (group === "all" || a.group === group)
    && (role === "all" || a.role === role) && (province === "all" || a.province === province)
    && fold(`${a.name} ${a.email} ${a.province ?? ""}`).includes(fold(search)));
  const selected = QUICK_LOGIN_ACCOUNTS.find(a => a.email === email);
  const clear = () => { setGroup("all"); setRole("all"); setProvince("all"); setSearch(""); };
  return <section aria-labelledby={`${id}-title`} className="space-y-3 border-t border-[#F1F5F9] pt-4 text-xs">
    <h2 id={`${id}-title`} className="flex items-center gap-1.5 font-semibold text-[#475569]"><Info className="h-3.5 w-3.5 text-[#075985]" />Chọn tài khoản kiểm thử</h2>
    <p className="text-[11px] leading-relaxed text-slate-500">Chọn tài khoản để điền email và mật khẩu, sau đó bấm Đăng nhập.</p>
    <div role="tablist" aria-label="Bộ tài khoản kiểm thử" className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
      {[{ value: "all", label: "Tất cả", count: QUICK_LOGIN_ACCOUNTS.length }, { value: "legacy", label: "Có sẵn", count: 4 }, { value: "regional", label: "19 địa bàn", count: 172 }].map(tab => <button type="button" key={tab.value} role="tab" aria-selected={group === tab.value} disabled={disabled}
        onClick={() => setGroup(tab.value)} className={`flex-1 whitespace-nowrap rounded px-2 py-1.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075985] ${group === tab.value ? "bg-white text-[#075985] shadow-sm" : "text-slate-600"}`}>{tab.label} ({tab.count})</button>)}
    </div>
    <div className="grid grid-cols-2 gap-2">
      <label htmlFor={`${id}-role`} className="space-y-1 text-[11px] text-slate-600"><span>Vai trò</span><select id={`${id}-role`} value={role} onChange={e => setRole(e.target.value)} disabled={disabled} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#075985]">
        <option value="all">Tất cả vai trò</option>{QUICK_LOGIN_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select></label>
      <label htmlFor={`${id}-province`} className="space-y-1 text-[11px] text-slate-600"><span>Tỉnh/thành</span><select id={`${id}-province`} value={province} onChange={e => setProvince(e.target.value)} disabled={disabled} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#075985]">
        <option value="all">Tất cả địa bàn</option>{QUICK_LOGIN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
      </select></label>
    </div>
    <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" /><input aria-label="Tìm tài khoản kiểm thử" value={search} onChange={e => setSearch(e.target.value)} disabled={disabled} placeholder="Tìm tên hoặc email..." className="h-9 w-full rounded-md border border-slate-300 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#075985]" /></div>
    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500"><span role="status">{rows.length} tài khoản</span>{(group !== "all" || role !== "all" || province !== "all" || search) && <button type="button" disabled={disabled} onClick={clear} className="text-[#075985] hover:underline">Xóa bộ lọc</button>}</div>
    <div aria-label="Danh sách tài khoản kiểm thử" className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
      {rows.map(account => <button type="button" key={account.email} disabled={disabled} aria-pressed={email === account.email} onClick={() => onSelect(account)}
        className={`flex w-full items-center justify-between gap-2 rounded border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075985] disabled:opacity-50 ${email === account.email ? "border-[#075985] bg-sky-50" : "border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F0F9FF]"}`}>
        <span className="min-w-0"><span className="block truncate font-semibold text-slate-900">{account.name}</span><span className="mt-0.5 block break-all text-[10px] leading-relaxed text-slate-500">{account.email}</span>{account.province && <span className="mt-0.5 block text-[10px] text-slate-500">{account.province}</span>}</span>
        <span className="flex shrink-0 items-center gap-1">{email === account.email && <Check size={13} className="text-[#075985]" />}<span className="rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#075985]">{QUICK_LOGIN_ROLES.find(r => r.value === account.role)?.label}</span></span>
      </button>)}
      {!rows.length && <p className="rounded-md border border-dashed p-4 text-center text-slate-500">Không có tài khoản phù hợp. Hãy đổi hoặc xóa bộ lọc.</p>}
    </div>
    {selected && <p className="break-all rounded-md bg-sky-50 p-2 text-[11px] text-[#075985]">Đã chọn {selected.email}. Mật khẩu: <code className="font-semibold">{selected.password}</code></p>}
  </section>;
}
