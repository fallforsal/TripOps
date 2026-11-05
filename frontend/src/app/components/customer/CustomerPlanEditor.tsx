import { useState } from "react";
import type { Tour } from "@/app/types";
import { useServiceCatalogue } from "@/app/contexts/ServiceCatalogue";
import { submitPlanProposal } from "@/app/services/customTourRequests";

export function CustomerPlanEditor({ requestId, plan, onDone, onCancel }: {
  requestId: string; plan: Tour; onDone: () => void; onCancel: () => void;
}) {
  const catalogue = useServiceCatalogue().filter((s) => s.status === "approved" && /^\d+$/.test(s.id));
  const [draft, setDraft] = useState(() => ({ itinerary: structuredClone(plan.itinerary), hotels: structuredClone(plan.hotels || []) }));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const hotels = catalogue.filter((s) => s.category === "hotel");
  const restaurants = catalogue.filter((s) => s.category === "fnb");
  const attractions = catalogue.filter((s) => s.category === "attraction");
  const updateDay = (index: number, change: Partial<Tour["itinerary"][number]>) =>
    setDraft((prev) => ({ ...prev, itinerary: prev.itinerary.map((d, i) => i === index ? { ...d, ...change } : d) }));
  const submit = async () => {
    if (!message.trim()) { setError("Hãy ghi rõ Agency cần xem hoặc thay đổi điều gì."); return; }
    setBusy(true); setError("");
    try { await submitPlanProposal(requestId, plan, draft, message.trim()); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không gửi được bản tùy biến."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-4 rounded-lg border-2 border-sky-300 bg-white p-5 text-sm">
    <div><h3 className="font-bold text-sky-900">Bản tùy biến của bạn · {plan.name}</h3>
      <p className="text-slate-600">Bạn đang sửa một bản sao. Agency sẽ xem, xác nhận dịch vụ và gửi plan cùng giá mới.</p></div>
    {draft.hotels.map((hotel, index) => <div key={hotel.id || index} className="rounded border p-3 space-y-2">
      <strong>Khách sạn · {hotel.destination || plan.destination}</strong>
      <input aria-label={`Khách sạn ngày ${index + 1}`} className="w-full rounded border p-2" value={hotel.name}
        onChange={(e) => setDraft((prev) => ({ ...prev, hotels: prev.hotels.map((h, i) => i === index
          ? { ...h, name: e.target.value, serviceId: undefined, agencySupplierId: undefined,
            supplier: undefined, providerName: undefined, supplierSource: "AGENCY_SUPPLIER", isCustom: true } : h) }))} />
      <input aria-label={`Địa chỉ khách sạn ${index + 1}`} className="w-full rounded border p-2"
        placeholder="Địa chỉ hoặc khu vực mong muốn" value={hotel.address || ""}
        onChange={(e) => setDraft((prev) => ({ ...prev, hotels: prev.hotels.map((h, i) => i === index
          ? { ...h, address: e.target.value, serviceId: undefined, agencySupplierId: undefined,
            supplier: undefined, providerName: undefined, supplierSource: "AGENCY_SUPPLIER", isCustom: true } : h) }))} />
      <select aria-label={`Chọn Provider khách sạn ${index + 1}`} className="w-full rounded border p-2" value=""
        onChange={(e) => { const service = hotels.find((s) => s.id === e.target.value); if (service) setDraft((prev) => ({
          ...prev, hotels: prev.hotels.map((h, i) => i === index ? { ...h, name: service.name,
            serviceId: service.id, agencySupplierId: undefined, supplier: undefined,
            supplierSource: "PLATFORM_PARTNER", isCustom: false, providerName: service.providerName,
            address: service.location || "",
            pricePerNight: service.price } : h) })); }}>
        <option value="">Chọn khách sạn Provider trên sàn…</option>
        {hotels.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.price.toLocaleString("vi-VN")}đ tham khảo</option>)}
      </select>
    </div>)}
    {draft.itinerary.map((day, dayIndex) => <div key={day.id || dayIndex} className="rounded border p-3 space-y-3">
      <strong>Ngày {day.day}: {day.title}</strong>
      <input aria-label={`Tiêu đề ngày ${day.day}`} className="w-full rounded border p-2" value={day.title}
        onChange={(e) => updateDay(dayIndex, { title: e.target.value })} />
      <div className="space-y-1"><p>Điểm tham quan</p>{(day.locations || []).map((loc, locIndex) =>
        <div key={loc.id || locIndex} className="flex gap-2"><input aria-label={`Điểm tham quan ${day.day}-${locIndex + 1}`}
          className="grow rounded border p-2" value={loc.name} onChange={(e) => updateDay(dayIndex, {
            locations: day.locations.map((l, i) => i === locIndex ? { ...l, name: e.target.value } : l) })} />
          <button className="rounded border px-2" onClick={() => updateDay(dayIndex, {
            locations: day.locations.filter((_, i) => i !== locIndex) })}>Xóa</button></div>)}
        <select aria-label={`Thêm điểm tham quan ngày ${day.day}`} className="w-full rounded border p-2" value=""
          onChange={(e) => { const service = attractions.find((s) => s.id === e.target.value); if (service) updateDay(dayIndex, {
            locations: [...(day.locations || []), { id: `proposal-${Date.now()}`, name: service.name,
              address: service.location || "", time: "14:00" }] }); }}>
          <option value="">Thêm điểm tham quan trên sàn…</option>{attractions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="rounded border px-2 py-1" onClick={() => updateDay(dayIndex, { locations: [
          ...(day.locations || []), { id: `proposal-${Date.now()}`, name: "Điểm tham quan mới", address: "", time: "14:00" }] })}>+ Tự đề xuất địa điểm</button>
      </div>
      {(day.meals || []).map((meal, mealIndex) => <div key={meal.id || mealIndex} className="space-y-1">
        <label className="block">{meal.type}: <input className="w-full rounded border p-2" value={meal.serviceName || ""}
          onChange={(e) => updateDay(dayIndex, { meals: day.meals!.map((m, i) => i === mealIndex
            ? { ...m, serviceName: e.target.value, serviceId: undefined, agencySupplierId: undefined,
              supplier: undefined, providerName: undefined, supplierSource: "AGENCY_SUPPLIER", isCustom: true } : m) })} /></label>
        <select aria-label={`Chọn nhà hàng ngày ${day.day} ${meal.type}`} className="w-full rounded border p-2" value=""
          onChange={(e) => { const service = restaurants.find((s) => s.id === e.target.value); if (service) updateDay(dayIndex, {
            meals: day.meals!.map((m, i) => i === mealIndex ? { ...m, serviceName: service.name,
              serviceId: service.id, agencySupplierId: undefined, supplier: undefined,
              supplierSource: "PLATFORM_PARTNER", isCustom: false,
              providerName: service.providerName, pricePerPerson: service.price } : m) }); }}>
          <option value="">Chọn nhà hàng Provider trên sàn…</option>{restaurants.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>)}
      {(["breakfast", "lunch", "dinner"] as const).filter((type) => !(day.meals || []).some((meal) => meal.type === type))
        .map((type) => <button key={type} type="button" className="rounded border px-2 py-1"
          onClick={() => updateDay(dayIndex, { meals: [...(day.meals || []), { id: `proposal-meal-${Date.now()}`,
            type, serviceName: "", supplierSource: "AGENCY_SUPPLIER", isCustom: true }] })}>
          + Thêm bữa {type === "breakfast" ? "sáng" : type === "lunch" ? "trưa" : "tối"}
        </button>)}
    </div>)}
    <label className="block">Lời nhắn cho Agency<textarea aria-label="Lời nhắn cho Agency" className="mt-1 w-full rounded border p-2" rows={4}
      placeholder="Nêu lý do thay đổi, nhu cầu đặc biệt hoặc dịch vụ cần Agency tìm thêm…"
      value={message} onChange={(e) => setMessage(e.target.value)} /></label>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="flex gap-2"><button disabled={busy} className="rounded bg-sky-800 px-4 py-2 text-white" onClick={() => void submit()}>
      {busy ? "Đang gửi…" : "Gửi bản tùy biến cho Agency"}</button><button className="rounded border px-4 py-2" onClick={onCancel}>Hủy</button></div>
  </div>;
}
