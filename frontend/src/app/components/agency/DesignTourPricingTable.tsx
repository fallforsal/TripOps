import { LockKeyhole, Pencil, Plus, Trash2 } from "lucide-react";
import type { Tour, TourCoHost, TourCompany, TourPriceRow } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

type Props = {
  rows: TourPriceRow[];
  onRowsChange: (rows: TourPriceRow[]) => void;
  company: TourCompany;
  agencies: TourCoHost[];
  agencyPricing?: Tour["agencyPricing"];
  isLead: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const ageRange = (row: TourPriceRow) => row.maxAge == null
  ? `Từ ${row.minAge ?? 0} tuổi trở lên`
  : `Từ ${row.minAge ?? 0} đến ${row.maxAge} tuổi`;

export function DesignTourPricingTable({ rows, onRowsChange, company, agencies, agencyPricing, isLead, onAdd, onRemove }: Props) {
  const members = agencies.filter(a => a.status === "accepted");
  if (!members.some(a => a.companyId === company.id)) {
    members.unshift({ companyId: company.id, companyName: company.name, role: isLead ? "lead" : "partner", status: "accepted" });
  }
  // Keep the editable column beside the common age frames, followed by read-only partners.
  members.sort((a, b) => Number(b.companyId === company.id) - Number(a.companyId === company.id));
  const update = (index: number, patch: Partial<TourPriceRow>) => onRowsChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  const partnerPrice = (agencyId: string, row: TourPriceRow) => {
    const tiers = agencyPricing?.find(p => p.agencyId === agencyId)?.tiers ?? [];
    return tiers.find(t => row.tierKey && t.key === row.tierKey)
      ?? tiers.find(t => !t.key && t.minAge === (row.minAge ?? null) && t.maxAge === (row.maxAge ?? null));
  };

  return <section className="space-y-4" aria-label="Bảng giá tour liên minh">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Bảng giá tour</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {isLead ? "Bạn quản lý khung vé chung và nhập giá phần của mình. Giá của các đối tác chỉ được xem."
            : "Khung vé do Agency chủ trì thiết lập. Bạn chỉ nhập giá phần dịch vụ của công ty mình."}
        </p>
      </div>
      {isLead && <Button type="button" size="sm" variant="outline" onClick={onAdd}><Plus className="mr-1 h-4 w-4"/>Thêm khung vé</Button>}
    </div>

    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <th scope="col" className="min-w-[280px] px-4 py-3 align-bottom font-medium">
              <span className="block text-sm font-semibold text-slate-800">Khung vé & độ tuổi</span>
              {isLead ? "Bạn thêm, sửa, xóa khung vé" : "Do Agency chủ trì thiết lập"}
            </th>
            {members.map(agency => {
              const own = agency.companyId === company.id;
              return <th key={agency.companyId} scope="col" className={`min-w-[220px] max-w-[320px] px-4 py-3 align-bottom font-medium ${own ? "bg-[#F0F9FF]" : ""}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  {own ? <Pencil className="h-3.5 w-3.5 text-[#075985]"/> : <LockKeyhole className="h-3.5 w-3.5 text-slate-400"/>}
                  <span className="truncate">{agency.companyName}</span>
                  {own && <span className="shrink-0 rounded-full bg-[#075985] px-2 py-0.5 text-[10px] font-semibold text-white">Bạn</span>}
                </span>
                <span className="mt-0.5 block line-clamp-1">{agency.assignedSegments || (agency.role === "lead" ? "Agency chủ trì" : "Agency liên minh")}{own ? "" : " · chỉ xem"}</span>
              </th>;
            })}
            <th scope="col" className="min-w-[170px] px-4 py-3 text-right align-bottom font-medium">
              <span className="block text-sm font-semibold text-slate-800">Giá bán / khách</span>
              Tổng giá các bên
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const total = members.reduce((sum, agency) => sum + (agency.companyId === company.id ? row.price : partnerPrice(agency.companyId, row)?.pricePerGuest ?? 0), 0);
            return <tr key={row.tierKey || index} className="border-b border-slate-100 last:border-b-0">
              <td className="px-4 py-3 align-middle">
                {isLead ? <div className="flex items-center gap-2">
                  <Input aria-label={`Tên khung vé ${index + 1}`} value={row.ageGroupLabel} onChange={e => update(index, { ageGroupLabel: e.target.value })} className="h-9 min-w-0 flex-1 font-medium" maxLength={100}/>
                  <div className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                    <Input aria-label={`Tuổi tối thiểu khung ${index + 1}`} type="number" min={0} max={150} value={row.minAge ?? ""} onChange={e => update(index, { minAge: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-9 w-14 px-2 text-center"/>
                    <span>–</span>
                    <Input aria-label={`Tuổi tối đa khung ${index + 1}`} type="number" min={0} max={150} placeholder="∞" value={row.maxAge ?? ""} onChange={e => update(index, { maxAge: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-9 w-14 px-2 text-center"/>
                    <span>tuổi</span>
                  </div>
                  <button type="button" aria-label={`Xóa khung vé ${row.ageGroupLabel}`} title="Xóa khung vé" disabled={rows.length <= 1} onClick={() => onRemove(index)} className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button>
                </div> : <div><p className="font-medium text-slate-900">{row.ageGroupLabel}</p><p className="mt-0.5 text-xs text-slate-500">{ageRange(row)}</p></div>}
              </td>
              {members.map(agency => {
                const own = agency.companyId === company.id;
                const saved = partnerPrice(agency.companyId, row);
                return <td key={agency.companyId} className={`px-4 py-3 align-middle ${own ? "bg-[#F0F9FF]/60" : ""}`}>
                  {own ? <div className="relative">
                    <Input aria-label={`Giá ${row.ageGroupLabel} của ${company.name}`} inputMode="numeric" value={row.price.toLocaleString("vi-VN")} onChange={e => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const value = digits ? Number(digits) : 0;
                      if (value <= 9999999999) update(index, { price: value });
                    }} className="h-9 bg-white pr-8 text-right font-medium tabular-nums focus-visible:ring-[#075985]/30"/>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">đ</span>
                  </div> : <p className="text-right tabular-nums text-slate-600">{saved ? money(saved.pricePerGuest) : <span className="text-xs text-slate-400">Chưa nhập giá</span>}</p>}
                </td>;
              })}
              <td className="px-4 py-3 text-right align-middle font-semibold tabular-nums text-[#075985]">{money(total)}</td>
            </tr>;
          })}
          {!rows.length && <tr><td colSpan={members.length + 2} className="p-8 text-center text-slate-500">{isLead ? "Thêm khung vé để các Agency nhập giá." : "Agency chủ trì chưa thiết lập khung vé."}</td></tr>}
        </tbody>
      </table>
    </div>
    <p className="text-xs leading-relaxed text-slate-500">Customer chỉ xem giá bán tổng. Các Agency cần nhập đủ giá cho khung vé chung trước khi chủ trì hoàn tất tour. Phần tiền của mỗi bên được ghi nhận theo số khách và khung tuổi khi đặt tour.</p>
  </section>;
}
