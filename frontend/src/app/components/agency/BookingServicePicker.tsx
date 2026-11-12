import { useEffect, useState } from "react";
import { Building2, Check, ChevronDown, Eye, MapPin, Phone, Search, Utensils } from "lucide-react";
import { useServiceCatalogue } from "@/app/contexts/ServiceCatalogue";
import { agencySuppliers, type AgencySupplier } from "@/app/services/wf02Tours";
import { Dialog, DialogContent, DialogTitle } from "@/app/components/ui/dialog";
import { ServiceBlogDetailModal } from "@/app/components/service/ServiceBlogDetailModal";

export type BookingReplacement = {
  serviceId?: number; agencySupplierId?: number; name: string; stars?: number;
  supplier?: { address?: string; contactPhone?: string; referencePrice?: number };
};

export function BookingServicePicker({ kind, value, onChange, platformOnly = false, allowManual = true }:
  { kind: "hotel" | "meal"; value: BookingReplacement | null; onChange: (value: BookingReplacement | null) => void; platformOnly?: boolean; allowManual?: boolean }) {
  const services = useServiceCatalogue();
  const [source, setSource] = useState<"platform" | "directory" | "manual">("platform");
  const [suppliers, setSuppliers] = useState<AgencySupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (platformOnly) { setLoading(false); return; }
    const abort = new AbortController();
    agencySuppliers(kind === "hotel" ? "HOTEL" : "RESTAURANT", "", abort.signal)
      .then(setSuppliers).catch(e => !abort.signal.aborted && setError(e.message))
      .finally(() => !abort.signal.aborted && setLoading(false));
    return () => abort.abort();
  }, [kind, platformOnly]);
  const label = kind === "hotel" ? "khách sạn" : "nhà hàng";
  const Icon = kind === "hotel" ? Building2 : Utensils;
  const address = (s: typeof services[number]) => s.fullAddress || [s.street, s.ward, s.province].filter(Boolean).join(", ");
  // Hotel reference price per person/night: average room price, shared by two people.
  const displayedPrice = (s: typeof services[number]) => kind === "hotel"
    ? ((s.priceFrom ?? s.price) + (s.priceTo ?? s.priceFrom ?? s.price)) / 4
    : s.priceFrom ?? s.price;
  const match = (text: string) => text.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"));
  const catalogue = services.filter(s => s.category === (kind === "hotel" ? "hotel" : "fnb") && s.status === "approved" && !s.isPaused);
  const selected = catalogue.find(s => Number(s.id) === value?.serviceId);
  const selectedReferencePrice = selected ? displayedPrice(selected) : value?.supplier?.referencePrice;
  useEffect(() => { if (!selected) setPreview(false); }, [selected]);
  const candidates = catalogue.filter(s => match(`${s.name} ${address(s)}`));
  const privateCandidates = suppliers.filter(s => s.status === "ACTIVE" && match(`${s.name} ${s.address || s.area || ""}`));
  const switchSource = (next: typeof source) => { setSource(next); setExpanded(false); setSearch(""); onChange(null); };
  const choose = (next: BookingReplacement) => { onChange(next); setExpanded(false); setSearch(""); };
  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-semibold text-slate-800">Dịch vụ thay thế</span>
      {!platformOnly && <button type="button" className="rounded-md border border-sky-200 bg-white px-2.5 py-1.5 font-medium text-sky-800 hover:bg-sky-50"
        onClick={() => switchSource(source === "platform" ? "directory" : "platform")}>
        {source === "platform" ? `+ Nhập ${label} ngoài sàn` : "Chọn dịch vụ trên sàn"}
      </button>}
    </div>
    {allowManual && source !== "platform" && <div className="grid grid-cols-2 rounded-lg bg-violet-50 p-1 text-xs" aria-label="Nguồn ngoài sàn">
      <button type="button" onClick={() => switchSource("directory")} className={`rounded-md px-3 py-2 font-semibold ${source === "directory" ? "bg-white text-violet-900 shadow-sm" : "text-slate-500"}`}>Từ danh bạ Agency</button>
      <button type="button" onClick={() => switchSource("manual")} className={`rounded-md px-3 py-2 font-semibold ${source === "manual" ? "bg-white text-violet-900 shadow-sm" : "text-slate-500"}`}>Nhập nhà cung cấp mới</button>
    </div>}
    {source !== "manual" ? <div className="space-y-2">
      <button type="button" role="combobox" aria-label={source === "platform" ? `Chọn ${label} trên sàn` : "Chọn nhà cung cấp trong danh bạ"}
        aria-expanded={expanded} aria-controls="replacement-options" disabled={source === "directory" && loading}
        onClick={() => setExpanded(!expanded)} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left hover:border-sky-500">
        <span className="min-w-0 truncate">{value?.name || (source === "directory" && loading ? "Đang tải danh bạ…" : `Chọn ${label} ${source === "platform" ? "trên sàn" : "đã lưu"}`)}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {expanded && <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b px-3"><Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input aria-label="Tìm dịch vụ thay thế" autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, địa chỉ…" className="h-10 min-w-0 flex-1 bg-transparent outline-none" />
        </div>
        <div id="replacement-options" role="listbox" aria-label="Dịch vụ thay thế" className="max-h-44 overflow-y-auto overscroll-contain">
          {source === "platform" ? candidates.map(s => <button key={s.id} type="button" role="option" aria-selected={Number(s.id) === value?.serviceId}
            onClick={() => choose({ serviceId: Number(s.id), name: s.name, stars: s.stars, supplier: { address: address(s), referencePrice: s.priceFrom ?? s.price } })}
            className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-sky-50">
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-800">{s.name}</span><span className="block truncate text-[11px] text-slate-500">{address(s)}</span></span>
            <span className="shrink-0 whitespace-nowrap text-right font-semibold text-sky-800">
              {displayedPrice(s).toLocaleString("vi-VN")}đ
              {kind === "hotel" && <span className="block text-[10px] font-normal text-slate-500">/ người / đêm</span>}
            </span>
          </button>) : privateCandidates.map(s => <button key={s.id} type="button" role="option" aria-selected={s.id === value?.agencySupplierId}
            onClick={() => choose({ agencySupplierId: s.id, name: s.name, stars: s.starRating ?? undefined, supplier: { address: s.address ?? undefined, contactPhone: s.contactPhone ?? undefined, referencePrice: s.referencePrice ?? undefined } })}
            className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-violet-50">
            <span className="block truncate font-semibold">{s.name}</span><span className="block truncate text-[11px] text-slate-500">{s.address || s.area}</span>
          </button>)}
          {((source === "platform" && !candidates.length) || (source === "directory" && !privateCandidates.length)) && <p className="p-3 text-slate-500">Không có dịch vụ phù hợp.</p>}
        </div>
      </div>}
      {source === "directory" && error && <p role="alert" className="text-rose-700">Không tải được danh bạ: {error}</p>}
    </div> : <div className="grid grid-cols-1 gap-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3 sm:grid-cols-2">
      <label className="min-w-0 space-y-1 font-medium">Tên {label} *<input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 font-normal" value={value?.name || ""}
        onChange={e => onChange({ ...value, name: e.target.value })} maxLength={255} placeholder={`Nhập tên ${label}`} /></label>
      <label className="min-w-0 space-y-1 font-medium">Số điện thoại<input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 font-normal" value={value?.supplier?.contactPhone || ""}
        onChange={e => onChange({ ...value, name: value?.name || "", supplier: { ...value?.supplier, contactPhone: e.target.value } })} maxLength={30} placeholder="Số liên hệ" /></label>
      <label className="space-y-1 font-medium sm:col-span-2">Địa chỉ *<input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 font-normal" value={value?.supplier?.address || ""}
        onChange={e => onChange({ ...value, name: value?.name || "", supplier: { ...value?.supplier, address: e.target.value } })} maxLength={500} placeholder="Số nhà, đường, phường/xã, tỉnh/thành" /></label>
    </div>}
    {value?.name && source !== "manual" && <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 p-3">
        {selected ? <img src={selected.thumbnailUrl || selected.image} alt={selected.name} className="h-20 w-24 shrink-0 rounded-lg object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Icon className="h-6 w-6" /></div>}
        <div className="min-w-0 flex-1 space-y-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><Check className="h-3 w-3" /> Đã chọn {source === "platform" ? "dịch vụ trên sàn" : "nhà cung cấp riêng"}</span>
          <h4 className="break-words text-sm font-bold text-slate-900">{value.name}</h4>
          {selected?.description && <p className="line-clamp-1 text-[11px] text-slate-500">{selected.description}</p>}
          <p className="flex items-start gap-1 text-[11px] text-slate-500"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{value.supplier?.address || "Chưa có địa chỉ"}</p>
          {selectedReferencePrice != null && <p className="font-semibold text-sky-800">{selectedReferencePrice.toLocaleString("vi-VN")}đ <span className="text-[10px] font-normal text-slate-500">/ {kind === "hotel" ? "người / đêm" : "người / bữa"} · tham khảo</span></p>}
          {selected && kind === "hotel" && <p className="text-[10px] text-slate-500">Quy đổi từ giá phòng: ({(selected.priceFrom ?? selected.price).toLocaleString("vi-VN")} + {(selected.priceTo ?? selected.priceFrom ?? selected.price).toLocaleString("vi-VN")}) / 4.</p>}
          {value.supplier?.contactPhone && <p className="flex items-center gap-1 text-slate-500"><Phone className="h-3 w-3" />{value.supplier.contactPhone}</p>}
        </div>
      </div>
      {selected && <button type="button" onClick={() => setPreview(true)} className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 bg-sky-50/50 py-2 font-semibold text-sky-800 hover:bg-sky-50"><Eye className="h-3.5 w-3.5" /> Xem bài viết & Bản đồ</button>}
    </article>}
    {source !== "platform" && <p className="text-[11px] text-violet-700">Agency làm việc và xác nhận trực tiếp với nhà cung cấp ngoài sàn.</p>}
    <Dialog open={preview} onOpenChange={setPreview}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden p-0 gap-0 sm:max-w-4xl [&>button]:hidden">
        <DialogTitle className="sr-only">Bài đăng {selected?.name}</DialogTitle>
        <ServiceBlogDetailModal service={selected || null} isOpen={preview} embedded onClose={() => setPreview(false)} />
      </DialogContent>
    </Dialog>
  </div>;
}
