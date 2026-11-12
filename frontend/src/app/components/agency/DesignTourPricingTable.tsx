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
      {isLead && <Button type="button" size="sm" onClick={onAdd}><Plus className="mr-1 h-4 w-4"/>Thêm khung vé</Button>}
    </div>

    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            <th scope="col" className="min-w-[220px] border-b border-slate-200 bg-slate-50 p-4 align-bottom">
              <span className="font-semibold text-slate-700">Phân loại khách & độ tuổi</span>
              <p className="mt-1 text-xs font-normal text-slate-500">{isLead ? "Chủ trì được thêm, sửa, xóa" : "Khung vé chung · Chỉ xem"}</p>
            </th>
            {members.map(agency => {
              const own = agency.companyId === company.id;
              return <th key={agency.companyId} scope="col" className={`min-w-[250px] max-w-[340px] border-b p-4 align-top ${own ? "border-x-2 border-t-2 border-violet-300 bg-violet-50/60" : "border-slate-200 bg-slate-50"}`}>
                <span className={`mb-2 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${own ? "bg-violet-100 text-violet-800" : "bg-slate-200/70 text-slate-600"}`}>
                  {own ? <Pencil className="h-3 w-3"/> : <LockKeyhole className="h-3 w-3"/>}
                  {own ? "Phần của bạn · Được sửa" : "Đối tác · Chỉ xem"}
                </span>
                <p className="font-semibold text-slate-900">{agency.companyName}{own ? " (Bạn)" : ""}</p>
                <p className="mt-1 line-clamp-2 text-xs font-normal text-slate-500">{agency.assignedSegments || (agency.role === "lead" ? "Agency chủ trì" : "Agency liên minh")}</p>
              </th>;
            })}
            <th scope="col" className="min-w-[180px] border-b border-emerald-100 bg-emerald-50 p-4 text-right align-bottom">
              <span className="font-semibold text-emerald-900">Đơn giá bán / khách</span>
              <p className="mt-1 text-xs font-normal text-emerald-700">Tự động cộng giá các bên</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const total = members.reduce((sum, agency) => sum + (agency.companyId === company.id ? row.price : partnerPrice(agency.companyId, row)?.pricePerGuest ?? 0), 0);
            return <tr key={row.tierKey || index}>
              <td className="border-b border-slate-100 bg-slate-50/40 p-4 align-top">
                {isLead ? <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input aria-label={`Tên khung vé ${index + 1}`} value={row.ageGroupLabel} onChange={e => update(index, { ageGroupLabel: e.target.value })} className="h-9 bg-white font-semibold" maxLength={100}/>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>Từ</span><Input aria-label={`Tuổi tối thiểu khung ${index + 1}`} type="number" min={0} max={150} value={row.minAge ?? ""} onChange={e => update(index, { minAge: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-8 w-16 bg-white px-2"/>
                      <span>đến</span><Input aria-label={`Tuổi tối đa khung ${index + 1}`} type="number" min={0} max={150} placeholder="∞" value={row.maxAge ?? ""} onChange={e => update(index, { maxAge: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-8 w-16 bg-white px-2"/>
                    </div>
                  </div>
                  <button type="button" aria-label={`Xóa khung vé ${row.ageGroupLabel}`} title="Xóa khung vé chung" disabled={rows.length <= 1} onClick={() => onRemove(index)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button>
                </div> : <div><p className="font-semibold text-slate-900">{row.ageGroupLabel}</p><p className="mt-2 text-xs text-slate-500">{ageRange(row)}</p></div>}
              </td>
              {members.map(agency => {
                const own = agency.companyId === company.id;
                const saved = partnerPrice(agency.companyId, row);
                return <td key={agency.companyId} className={`border-b p-4 align-top ${own ? "border-x-2 border-violet-300 bg-violet-50/30" : "border-slate-100 bg-slate-50/30"}`}>
                  {own ? <>
                    <div className="relative"><Input aria-label={`Giá ${row.ageGroupLabel} của ${company.name}`} inputMode="numeric" value={row.price.toLocaleString("vi-VN")} onChange={e => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const value = digits ? Number(digits) : 0;
                      if (value <= 9999999999) update(index, { price: value });
                    }} className="h-10 border-violet-300 bg-white pr-14 font-semibold text-violet-900 focus-visible:ring-violet-400"/><span className="pointer-events-none absolute right-3 top-3 text-xs text-violet-600">VNĐ</span></div>
                    <p className="mt-2 text-xs text-violet-600">{money(row.price)} / khách</p>
                  </> : <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-100/70 px-3 text-slate-600">
                    <span className="font-medium tabular-nums">{saved ? money(saved.pricePerGuest) : "Chưa nhập giá"}</span><LockKeyhole className="h-3.5 w-3.5 shrink-0 text-slate-400"/>
                  </div>}
                </td>;
              })}
              <td className="border-b border-emerald-100 bg-emerald-50/70 p-4 text-right align-middle font-bold tabular-nums text-emerald-800">{money(total)}</td>
            </tr>;
          })}
          {!rows.length && <tr><td colSpan={members.length + 2} className="p-8 text-center text-slate-500">{isLead ? "Thêm khung vé để các Agency nhập giá." : "Agency chủ trì chưa thiết lập khung vé."}</td></tr>}
        </tbody>
      </table>
    </div>
    <p className="text-xs leading-relaxed text-slate-500">Customer chỉ xem giá bán tổng. Các Agency cần nhập đủ giá cho khung vé chung trước khi chủ trì hoàn tất tour. Phần tiền của mỗi bên được ghi nhận theo số khách và khung tuổi khi đặt tour.</p>
  </section>;
}
