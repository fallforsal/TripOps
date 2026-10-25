import { useState } from "react";
import { Compass, Eye, EyeOff, Search, ArrowLeft } from "lucide-react";
import type { Service, Tour } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";

interface Props {
  tours: Tour[];
  services?: Service[];
  onToggleHideTour?: (id: string, reason: string) => void | Promise<void>;
}
const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

export function AdminTourModeration({ tours, onToggleHideTour }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visible = tours.filter(tour => `${tour.name} ${tour.tourCode} ${tour.destination}`.toLowerCase().includes(search.toLowerCase()));
  const selected = tours.find(tour => tour.id === selectedId);

  async function hide() {
    if (!confirmId || !onToggleHideTour) return;
    setBusy(true); setError("");
    try {
      await onToggleHideTour(confirmId, reason.trim() || "Admin tạm ẩn tour để kiểm tra nội dung.");
      setConfirmId(null); setSelectedId(null); setReason("");
      setNotice("Tour đã được tạm ẩn khỏi danh sách công khai.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Không thể tạm ẩn tour."); }
    finally { setBusy(false); }
  }

  if (selected) return <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
    <Button variant="outline" onClick={() => setSelectedId(null)}><ArrowLeft className="mr-2 h-4 w-4" />Quay lại</Button>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-slate-500">{selected.tourCode} · v{selected.version}</p>
        <h2 className="text-2xl font-bold text-[#075985]">{selected.name}</h2>
        <p className="text-slate-600">{selected.destination} · {selected.duration} · {money(selected.price)}</p></div>
      {selected.visibility === "public" && <Button onClick={() => setConfirmId(selected.id)} className="bg-amber-600 hover:bg-amber-700"><EyeOff className="mr-2 h-4 w-4" />Tạm ẩn</Button>}
    </div>
    <p className="text-sm text-slate-700">{selected.description || "Chưa có mô tả."}</p>
    {!!selected.images?.length && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{selected.images.map((url, index) => <img key={url + index} src={url} alt={`${selected.name} ${index + 1}`} className="aspect-video w-full rounded-xl object-cover" />)}</div>}
    <div className="grid gap-4 md:grid-cols-2">
      <div><h3 className="font-semibold">Lịch trình</h3>{selected.itinerary.map(day => <div key={day.id} className="mt-2 rounded-lg border p-3 text-sm"><strong>Ngày {day.day}: {day.title}</strong><p>{day.description}</p><p>{day.locations.map(item => item.name).join(" · ")}</p></div>)}</div>
      <div><h3 className="font-semibold">Giá và chính sách</h3>{selected.priceTable?.map((tier, index) => <p key={index} className="mt-2 text-sm">{tier.ageGroupLabel}: {money(tier.price)}</p>)}<p className="mt-3 text-sm">{selected.regulations?.join("\n")}</p></div>
    </div>
    {confirmId && <div role="dialog" aria-label="Xác nhận tạm ẩn" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="mb-2 font-medium">Tạm ẩn tour này khỏi trang công khai?</p>
      <Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Lý do kiểm duyệt" />
      <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => setConfirmId(null)}>Hủy</Button><Button disabled={busy} onClick={hide}>Xác nhận tạm ẩn</Button></div>
    </div>}
  </section>;

  return <section className="space-y-5">
    <div><h2 className="flex items-center gap-2 text-2xl font-bold text-[#075985]"><Compass className="h-6 w-6" />Quản lý Tour</h2>
      <p className="text-sm text-slate-500">Kiểm tra tour đã đăng và tạm ẩn nội dung vi phạm.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-700">{notice}</p>}
    <div className="relative max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên, mã hoặc điểm đến" className="pl-9" /></div>
    {!visible.length && <div className="rounded-xl border bg-white p-10 text-center text-slate-500">Chưa có tour để kiểm duyệt.</div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(tour => <article key={tour.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      {tour.image ? <img src={tour.image} alt={tour.name} className="aspect-video w-full object-cover" /> : <div className="aspect-video bg-[#F0F9FF]" />}
      <div className="space-y-2 p-4"><p className="text-xs text-slate-500">{tour.tourCode} · {tour.visibility === "public" ? "Công khai" : "Đã ẩn"}</p>
        <h3 className="font-semibold text-[#075985]">{tour.name}</h3><p className="text-sm text-slate-600">{tour.destination} · {tour.duration}</p>
        <p className="font-bold text-[#075985]">{money(tour.price)}</p>
        <div className="flex gap-2"><Button variant="outline" onClick={() => setSelectedId(tour.id)}><Eye className="mr-1 h-4 w-4" />Chi tiết</Button>
          {tour.visibility === "public" && <Button variant="outline" onClick={() => { setSelectedId(tour.id); setConfirmId(tour.id); }}><EyeOff className="mr-1 h-4 w-4" />Tạm ẩn</Button>}</div>
      </div></article>)}</div>
  </section>;
}
