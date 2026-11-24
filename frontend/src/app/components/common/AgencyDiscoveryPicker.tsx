import { useEffect, useId, useState } from "react";
import { Building2, Check, ExternalLink, Info, MapPin, Search, Star, X } from "lucide-react";
import type { TourCompany } from "@/app/types";
import { requestAgencies } from "@/app/services/customTourRequests";
import { currentProvinceCode, getProvinceName, suggestProvincesFromDestinationText, VIETNAM_PROVINCES } from "@/app/data/vietnamProvinces";
import { SearchableCombobox, foldVietnamese } from "./SearchableCombobox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

type Props = {
  value: string;
  onSelect: (agency: TourCompany) => void;
  destination?: string;
  initialProvinceCodes?: string[];
  excludeIds?: string[];
  onlyAgencyId?: string;
  disabled?: boolean;
};
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa ghi nhận";

function Logo({ agency }: { agency: TourCompany }) {
  const [failed, setFailed] = useState(false);
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-sky-50 text-xs font-bold text-sky-800">
    {agency.logo && !failed ? <img src={agency.logo} alt={`Logo ${agency.name}`} className="h-full w-full object-contain" onError={() => setFailed(true)} /> : agency.name.slice(0, 2).toUpperCase()}
  </span>;
}

export function AgencyDiscoveryPicker({ value, onSelect, destination = "", initialProvinceCodes = [], excludeIds = [], onlyAgencyId, disabled }: Props) {
  const [codes, setCodes] = useState<string[]>(() => [...new Set(initialProvinceCodes.map(currentProvinceCode))]);
  const [agencies, setAgencies] = useState<TourCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [profile, setProfile] = useState<TourCompany | null>(null);
  // Tự lọc theo tỉnh/thành đọc được từ điểm đến cho tới khi khách tự chỉnh bộ lọc.
  const [touched, setTouched] = useState(initialProvinceCodes.length > 0);
  useEffect(() => {
    if (touched) return;
    const timer = setTimeout(() => setCodes(suggestProvincesFromDestinationText(destination, []).map(p => p.code)), 400);
    return () => clearTimeout(timer);
  }, [destination, touched]);
  const searchId = useId();
  const provinceId = useId();
  const provinceKey = codes.join(",");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    requestAgencies(provinceKey ? provinceKey.split(",") : [], controller.signal).then(rows => {
      if (!controller.signal.aborted) setAgencies(rows);
    }).catch(e => { if (!controller.signal.aborted) { setAgencies([]); setError(e.message || "Không thể tải Agency."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [provinceKey, retry]);

  const available = agencies.filter(a => !excludeIds.includes(a.id) && (!onlyAgencyId || a.id === onlyAgencyId));
  const searched = available.filter(a => foldVietnamese(`${a.name} ${a.address}`).includes(foldVietnamese(query)));
  const matched = searched.filter(a => (a.evidence?.matchedProvinceCodes.length ?? 0) > 0);
  const rows = tab === "matched" ? matched : searched;
  const selected = available.find(a => a.id === value);
  const suggestions = suggestProvincesFromDestinationText(destination, codes);
  // Tỉnh/thành chưa có Agency nào có tour hoặc chuyến đã hoàn thành.
  const uncovered = loading || error || onlyAgencyId ? [] : codes.filter(code => !available.some(a => a.evidence?.matchedProvinceCodes.includes(code)));
  const selectedUncovered = !!selected && codes.length > 0 && !(selected.evidence?.matchedProvinceCodes.length);
  useEffect(() => { if (codes.length > 0 && uncovered.length === codes.length && tab === "matched") setTab("all"); }, [codes.length, uncovered.length, tab]);

  return <div className="space-y-4 text-sm" aria-busy={loading}>
    <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-4">
      <label htmlFor={provinceId} className="mb-2 flex items-center gap-2 font-semibold text-[#075985]"><MapPin size={16} />Tìm Agency theo tỉnh/thành của hành trình</label>
      <SearchableCombobox id={provinceId} options={VIETNAM_PROVINCES.filter(p => !codes.includes(p.code)).map(p => ({ value: p.code, label: p.name, keywords: p.popularDestinations.join(" ") }))}
        value="" onChange={code => { if (code) { setTouched(true); setCodes(previous => [...previous, code]); } }} placeholder="Chọn tỉnh/thành, có thể chọn nhiều" disabled={disabled} />
      {!!codes.length && <div className="mt-2 flex flex-wrap gap-2">{codes.map(code => <button type="button" disabled={disabled} key={code} onClick={() => { setTouched(true); setCodes(codes.filter(c => c !== code)); setTab("all"); }} className="flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs text-sky-800" aria-label={`Bỏ ${getProvinceName(code)}`}>{getProvinceName(code)}<X size={12} /></button>)}</div>}
      {!!suggestions.length && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">Gợi ý từ điểm đến:{suggestions.map(p => <button key={p.code} disabled={disabled} type="button" onClick={() => { setTouched(true); setCodes([...codes, p.code]); }} className="rounded-full border border-dashed border-sky-300 bg-white px-2.5 py-1 text-sky-800">+ {p.name}</button>)}</div>}
      <p className="mt-2 text-xs leading-relaxed text-slate-500">Kết quả ưu tiên địa bàn phù hợp, chuyến đã hoàn thành và tour đang cung cấp. Thông tin hoạt động không thay thế chứng nhận năng lực chuyên môn.</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Danh sách Agency" className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {[{ id: "all", label: "Tất cả Agency", count: searched.length }, { id: "matched", label: "Phù hợp điểm đến", count: matched.length }].map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} disabled={disabled || (t.id === "matched" && !codes.length)} onClick={() => setTab(t.id)} className={`rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50 ${tab === t.id ? "bg-white text-[#075985] shadow-sm" : "text-slate-600"}`}>{t.label} ({t.count})</button>)}
      </div>
      <div className="relative min-w-48 flex-1 sm:max-w-xs"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input id={searchId} aria-label="Tìm tên Agency" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tên Agency, địa chỉ..." className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs" /></div>
    </div>
    {uncovered.length > 0 && <div role="status" className="flex items-center gap-2.5 rounded-lg border border-sky-200 bg-[#F0F9FF] px-4 py-3 text-sm text-[#0C4A6E]">
      <Info size={16} className="shrink-0 text-[#075985]" />
      <p>Hiện TripOps chưa có Agency nào hoạt động tại <strong className="font-semibold">{uncovered.map(getProvinceName).join(", ")}</strong>.</p>
    </div>}
    {selected && <p className="flex items-center gap-2 text-xs text-[#075985]"><Check size={14} />Đã chọn: <strong>{selected.name}</strong></p>}
    {selectedUncovered && <p className="text-xs text-slate-500">Agency này chưa có tour hoặc chuyến đã hoàn thành tại điểm đến bạn chọn.</p>}
    {loading ? <p role="status" className="p-5 text-center text-slate-500">Đang tải hồ sơ Agency...</p> : error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}<button type="button" onClick={() => setRetry(n => n + 1)} className="ml-3 underline">Tải lại</button></div> : <>
      {!rows.length && <p className="rounded-lg border border-dashed p-6 text-center text-slate-500">{tab === "matched" ? "Chưa có bằng chứng hoạt động tại địa bàn này. Bạn vẫn có thể chọn trong tab Tất cả Agency." : "Không có Agency phù hợp với tìm kiếm."}</p>}
      <div className="grid max-h-[460px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
        {rows.map(a => { const e = a.evidence; return <article key={a.id} className={`rounded-xl border p-4 transition ${value === a.id ? "border-[#075985] bg-sky-50/70 ring-2 ring-[#075985]/15" : "border-slate-200 bg-white hover:border-slate-300"}`}>
          <div className="flex gap-3"><Logo agency={a} /><div className="min-w-0 flex-1"><h3 className="font-semibold text-slate-900">{a.name}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.address || "Chưa cập nhật địa chỉ"}</p></div>{value === a.id && <Check size={16} className="shrink-0 text-[#075985]" />}</div>
          <div className="my-3 grid grid-cols-2 gap-2 border-y border-slate-100 py-3 text-xs">
            <div><strong className="text-base text-[#075985]">{codes.length ? e?.matchedCompletedTrips ?? 0 : e?.completedTrips ?? 0}</strong><p className="mt-1 text-slate-600">Chuyến hoàn thành{codes.length ? " tại điểm đến" : " toàn hệ thống"}</p></div>
            <div><strong className="text-base text-slate-800">{codes.length ? e?.matchedTourCount ?? 0 : e?.publishedTourCount ?? 0}</strong><p className="mt-1 text-slate-600">Tour đang cung cấp{codes.length ? " tại điểm đến" : ""}</p></div>
          </div>
          <p className="flex items-center gap-1 text-xs text-slate-500"><Star size={13} className="fill-amber-400 text-amber-400" />{e?.reviewCount ? `${e.ratingAverage}/5 · ${e.reviewCount} đánh giá chung` : "Chưa có đánh giá"}</p>
          {!!e?.matchedProvinceCodes.length && <p className="mt-2 text-xs text-[#075985]">Có hoạt động: {e.matchedProvinceCodes.map(getProvinceName).join(", ")}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => setProfile(a)} className="text-xs font-medium text-[#075985] underline underline-offset-4">Xem hồ sơ năng lực</button><button type="button" disabled={disabled} onClick={() => onSelect(a)} aria-pressed={value === a.id} className="rounded-md bg-[#075985] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{value === a.id ? "Đã chọn" : "Chọn Agency"}</button></div>
        </article>; })}
      </div>
    </>}
    <Dialog open={!!profile} onOpenChange={open => { if (!open) setProfile(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
      {profile && <><DialogHeader><DialogTitle className="flex items-center gap-3 pr-6"><Logo agency={profile} />{profile.name}</DialogTitle><DialogDescription>Hồ sơ doanh nghiệp và bằng chứng hoạt động trên TripOps</DialogDescription></DialogHeader>
        <p className="whitespace-pre-line text-sm text-slate-600">{profile.description || "Doanh nghiệp chưa cập nhật giới thiệu."}</p>
        <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><p className="flex gap-2"><Building2 size={14} />{profile.address || "Chưa cập nhật địa chỉ"}</p>{profile.phone && <p>Điện thoại: {profile.phone}</p>}{profile.email && <p>Email: {profile.email}</p>}</div>
        <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border p-3"><strong className="text-xl text-[#075985]">{profile.evidence?.completedTrips ?? 0}</strong><p>Chuyến hoàn thành toàn hệ thống</p></div><div className="rounded-lg border p-3"><strong className="text-xl text-[#075985]">{profile.evidence?.publishedTourCount ?? 0}</strong><p>Tour công khai đang cung cấp</p></div></div>
        <p className="text-xs text-slate-500">Đánh giá chung: {profile.evidence?.reviewCount ? `${profile.evidence.ratingAverage}/5 (${profile.evidence.reviewCount} đánh giá)` : "Chưa có"}. Đánh giá này không phân loại theo địa bàn.</p>
        <h4 className="font-semibold">Kinh nghiệm theo địa bàn</h4>
        {profile.evidence?.areas.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">Tỉnh/thành</th><th className="p-2">Chuyến hoàn thành</th><th className="p-2">Gần nhất</th></tr></thead><tbody>{profile.evidence.areas.map(a => <tr key={a.provinceCode} className="border-b border-slate-100"><td className="p-2">{getProvinceName(a.provinceCode)}</td><td className="p-2">{a.completedTrips}</td><td className="p-2">{date(a.lastCompletedAt)}</td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-500">Chưa có chuyến hoàn thành xác định được địa bàn phụ trách.</p>}
        {!!profile.evidence?.unattributedCompletedTrips && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Có {profile.evidence.unattributedCompletedTrips} chuyến hoàn thành chưa đủ dữ liệu để xác định địa bàn. Các chuyến này chỉ được tính vào tổng chung.</p>}
        <p className="text-xs leading-relaxed text-slate-500">Mỗi booking hoàn thành được tính một chuyến; nhiều phiên bản tour không làm tăng số chuyến. Với tour liên minh, chỉ ghi nhận địa bàn có căn cứ trong dữ liệu đã chốt. Một chuyến có thể đi qua nhiều tỉnh, vì vậy không cộng các hàng để tính tổng chuyến.</p>
        <h4 className="font-semibold">{codes.length ? "Tour công khai tại điểm đến đang tìm" : "Tour công khai tiêu biểu"}</h4>
        {profile.evidence?.examples.length ? profile.evidence.examples.map(t => <a key={t.id} href={`/#/tours/${t.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border p-3 text-sm text-[#075985] hover:bg-sky-50">{t.thumbnailUrl && <img src={t.thumbnailUrl} alt="" className="h-12 w-16 rounded-md object-cover" />}<span className="flex-1"><strong>{t.name}</strong><span className="mt-1 block text-xs text-slate-500">{t.destination}</span></span><ExternalLink size={15} /></a>) : <p className="text-xs text-slate-500">Chưa có tour công khai phù hợp.</p>}
      </>}
    </DialogContent></Dialog>
  </div>;
}
