import { useEffect, useRef, useState } from "react";
import { http } from "@/app/lib/http";
import type { BookingPassenger, Tour } from "@/app/types";

import type { BookingQuotation as Quote, BookingSupplierRequest as SupplierRequest, BookingQuotationState } from "@/app/lib/bookingSupplierStatus";
const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " ₫";

export function BookingQuotationPanel({ bookingId, agency, plans = [], currentTourId, currentStartDate,
  currentTourSnapshot, currentSpecialRequests, passengers = [], canChange = false, onChanged,
  showSupplierRequests = true, onStateChange }:
  { bookingId: string; agency: boolean; plans?: Tour[]; currentTourId?: string;
    currentStartDate?: string; currentTourSnapshot?: Tour; currentSpecialRequests?: string;
    passengers?: BookingPassenger[]; canChange?: boolean; onChanged?: () => void;
    showSupplierRequests?: boolean; onStateChange?: (state: BookingQuotationState) => void }) {
  const stateCallback = useRef(onStateChange);
  stateCallback.current = onStateChange;
  const loadSequence = useRef(0);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [supplierRequests, setSupplierRequests] = useState<SupplierRequest[]>([]);
  const [profit, setProfit] = useState("");
  const [saleTotal, setSaleTotal] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [paymentPolicy, setPaymentPolicy] = useState("Đặt cọc 50% sau khi chấp nhận báo giá.");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [extraCosts, setExtraCosts] = useState<Array<{ name: string; quantity: string; unit: string; unitCost: string }>>([]);
  const [specialRequests, setSpecialRequests] = useState(currentSpecialRequests || "");
  const [startDate, setStartDate] = useState(currentStartDate?.slice(0, 10) || "");
  const [guests, setGuests] = useState<BookingPassenger[]>(passengers);
  const [guestsDirty, setGuestsDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState(currentTourId || "");
  const [hotelChoices, setHotelChoices] = useState<Record<string, string>>({});
  const [mealChoices, setMealChoices] = useState<Record<string, string>>({});
  const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
  useEffect(() => { setPlanId(currentTourId || ""); }, [currentTourId]);
  useEffect(() => { setStartDate(currentStartDate?.slice(0, 10) || ""); }, [currentStartDate]);
  useEffect(() => { setSpecialRequests(currentSpecialRequests || ""); }, [currentSpecialRequests]);
  useEffect(() => { setGuests(passengers); setGuestsDirty(false); }, [passengers]);
  const load = async (resetForm = true) => {
    const sequence = ++loadSequence.current;
    stateCallback.current?.({ bookingId, loading: true, quotes: [], requests: [] });
    let rows: Quote[], requests: SupplierRequest[];
    try {
      [rows, requests] = await Promise.all([
        http<Quote[]>(`/bookings/${Number(bookingId)}/quotations`),
        agency ? http<SupplierRequest[]>(`/bookings/${Number(bookingId)}/quotations/supplier-requests`) : Promise.resolve([]),
      ]);
    } catch (error) {
      if (sequence === loadSequence.current) stateCallback.current?.({ bookingId, loading: false,
        error: error instanceof Error ? error.message : "Không tải được dữ liệu.", quotes: [], requests: [] });
      throw error;
    }
    if (sequence !== loadSequence.current) return;
    setError("");
    setQuotes(rows);
    setSupplierRequests(requests);
    stateCallback.current?.({ bookingId, loading: false, quotes: rows, requests });
    if (resetForm && agency && rows[0]) {
      setQuantities(Object.fromEntries((rows[0].costs || []).map((l) => [l.slotKey, String(l.quantity)])));
      setProfit(String(rows[0].agencyProfit ?? 0));
      setSaleTotal(rows[0].saleTotal > 0 ? String(rows[0].saleTotal) : "");
      setCosts(Object.fromEntries((rows[0].costs || []).filter((l) => l.source === "AGENCY_SUPPLIER")
        .map((l) => [l.slotKey, String(l.unitCost)])));
      setExtraCosts((rows[0].costs || []).filter((l) => l.source === "AGENCY_OTHER").map((l) => ({
        name: l.name, quantity: String(l.quantity), unit: l.unit, unitCost: String(l.unitCost) })));
    }
  };
  useEffect(() => {
    const refresh = () => { void load(false).catch((e) => setError(e.message)); };
    void load().catch((e) => setError(e.message));
    window.addEventListener("focus", refresh);
    return () => { loadSequence.current++; window.removeEventListener("focus", refresh); };
  }, [bookingId, agency]);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await action(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Không thể xử lý báo giá."); }
    finally { setBusy(false); }
  };
  const latest = quotes[0];
  const currentHotelName = (destination: string) => selectedPlan?.id === currentTourId
    ? currentTourSnapshot?.hotels?.find((h) => h.destination === destination)?.name : undefined;
  const currentMealName = (day: number, type: string) => selectedPlan?.id === currentTourId
    ? currentTourSnapshot?.itinerary.find((d) => d.day === day)?.meals?.find((m) => m.type === type)?.serviceName : undefined;
  return <section className="rounded-lg border border-slate-300 bg-white p-5 space-y-4">
    <div className="flex justify-between items-center"><h3 className="font-bold text-sky-900">Báo giá theo Tour plan</h3>
      <button className="border rounded px-3 py-1 text-sm" onClick={() => void load().catch((e) => setError(e.message))}>Làm mới</button></div>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    {agency && showSupplierRequests && supplierRequests.filter((r) => r.status !== "Superseded").map((r) =>
      <p key={r.id} className="text-sm border-b pb-2">{r.serviceName}: {r.status} · Giá tham khảo {money(r.estimatedCost)}
        {r.quotedCost != null && ` · Giá xác nhận ${money(r.quotedCost)}`}{r.note && ` · ${r.note}`}
      </p>)}
      {!agency && (!latest || latest.status === "Superseded") &&
        <p className="text-sm text-slate-600">Agency đang lập báo giá mới cho phương án hiện tại.</p>}
      {agency && supplierRequests.filter((r) => r.status === "CounterOffered").map((r) => <div key={`counter-${r.id}`} className="text-sm border p-3 rounded">
        <p>{r.serviceName}: Provider đề nghị {money(r.quotedCost || 0)}</p>
        {[true, false].map((accept) => <button key={String(accept)} disabled={busy} className="border rounded px-3 py-1 mr-2" onClick={() => void run(() => http(`/bookings/${bookingId}/quotations/supplier-requests/${r.id}/counter/${accept}`, { method: "POST" }))}>{accept ? "Chấp nhận giá Provider" : "Từ chối giá Provider"}</button>)}
      </div>)}
      {agency && !latest && <p className="text-sm text-slate-600">Chưa có bảng tính chi phí cho booking.</p>}
    {canChange && selectedPlan && <div className="space-y-2 border-b pb-4 text-sm">
      <p className="font-semibold">Đổi plan hoặc phương án trước khi cọc sẽ làm báo giá cũ hết hiệu lực.</p>
      <select aria-label="Tour plan" className="border rounded p-2" value={selectedPlan.id}
        onChange={(e) => { setPlanId(e.target.value); setHotelChoices({}); setMealChoices({}); }}>
        {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(plan.price)}/khách dự kiến</option>)}
      </select>
      {(selectedPlan.hotels || []).map((hotel) => <label key={hotel.id || hotel.destination} className="block">
        Khách sạn {hotel.destination}: <select className="border rounded p-1 ml-2" aria-label={`Khách sạn ${hotel.destination}`}
          value={hotelChoices[hotel.destination || ""] || ""}
          onChange={(e) => setHotelChoices({ ...hotelChoices, [hotel.destination || ""]: e.target.value })}>
          <option value="">{currentHotelName(hotel.destination || "") || hotel.name} (hiện tại)</option>
          {currentHotelName(hotel.destination || "") && currentHotelName(hotel.destination || "") !== hotel.name &&
            <option value={JSON.stringify({ destination: hotel.destination || "", name: hotel.name,
              serviceId: hotel.serviceId ? Number(hotel.serviceId) : null })}>{hotel.name} (mặc định)</option>}
          {(hotel.alternativeHotels || []).map((alt) => <option key={alt.id} value={JSON.stringify({ destination: hotel.destination || "", name: alt.name,
            serviceId: alt.serviceId ? Number(alt.serviceId) : null })}>{alt.name}</option>)}
        </select>
      </label>)}
      {!agency && <div className="space-y-2">
        <label className="block">Ngày khởi hành: <input type="date" aria-label="Ngày khởi hành mới"
          className="border rounded p-1 ml-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <p className="font-medium">Hành khách ({guests.length})</p>
        {guests.map((guest, index) => <div key={guest.id || index} className="flex flex-wrap gap-2 items-center">
          <input aria-label={`Tên khách ${index + 1}`} className="border rounded p-1" placeholder="Họ tên"
            value={guest.fullName} onChange={(e) => { setGuests(guests.map((g, i) => i === index ? { ...g, fullName: e.target.value } : g)); setGuestsDirty(true); }} />
          <input type="date" aria-label={`Ngày sinh khách ${index + 1}`} className="border rounded p-1"
            value={guest.dateOfBirth?.slice(0, 10) || ""}
            onChange={(e) => { setGuests(guests.map((g, i) => i === index ? { ...g, dateOfBirth: e.target.value } : g)); setGuestsDirty(true); }} />
          <button className="border rounded px-2" disabled={guests.length === 1}
            onClick={() => { setGuests(guests.filter((_, i) => i !== index)); setGuestsDirty(true); }}>Xóa</button>
        </div>)}
        <button className="border rounded px-2 py-1" onClick={() => {
          setGuests([...guests, { id: `new-${Date.now()}`, fullName: "", ageGroup: "adult", price: 0 }]); setGuestsDirty(true);
        }}>Thêm khách</button>
      </div>}
      {selectedPlan.itinerary.flatMap((day) => (day.meals || []).map((meal) => ({ day, meal }))).map(({ day, meal }) =>
        <label key={`${day.day}:${meal.type}`} className="block">Ngày {day.day} · {meal.type}: <select
          aria-label={`Bữa ${meal.type} ngày ${day.day}`} className="border rounded p-1 ml-2"
          value={mealChoices[`${day.day}:${meal.type}`] || ""}
          onChange={(e) => setMealChoices({ ...mealChoices, [`${day.day}:${meal.type}`]: e.target.value })}>
          <option value="">{currentMealName(day.day, meal.type) || meal.serviceName || "Mặc định"} (hiện tại)</option>
          {meal.serviceName && currentMealName(day.day, meal.type) && currentMealName(day.day, meal.type) !== meal.serviceName &&
            <option value={JSON.stringify({ dayNumber: day.day, mealType: meal.type,
              name: meal.serviceName, serviceId: meal.serviceId ? Number(meal.serviceId) : null })}>
              {meal.serviceName} (mặc định)</option>}
          {(meal.alternativeMeals || []).map((alt) => <option key={alt.id} value={JSON.stringify({ dayNumber: day.day,
            mealType: meal.type, name: alt.restaurantName, serviceId: alt.serviceId ? Number(alt.serviceId) : null })}>{alt.restaurantName}</option>)}
        </select></label>)}
      {!agency && <textarea aria-label="Yêu cầu tùy chỉnh thêm" className="border rounded p-2 w-full"
        placeholder="Muốn đổi điểm tham quan, lịch trình hoặc dịch vụ khác? Ghi rõ để Agency báo giá lại."
        value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />}
      <button disabled={busy || (!agency && (guests.length < 1 || guests.some((g) => !g.fullName.trim())))}
        className="bg-sky-800 text-white rounded px-3 py-2" onClick={() => void run(async () => {
        await http(agency ? `/agency/bookings/${bookingId}/change-plan` : `/bookings/${bookingId}/quotations/change-plan`, { method: "POST", body: JSON.stringify({
          tourId: Number(selectedPlan.id), hotelChoices: Object.values(hotelChoices).filter(Boolean).map((value) => JSON.parse(value)),
          mealChoices: Object.values(mealChoices).filter(Boolean).map((value) => JSON.parse(value)),
          specialRequests: agency ? null : specialRequests,
          startDate: !agency && startDate && startDate !== currentStartDate?.slice(0, 10) ? startDate : null,
          participants: !agency && guestsDirty ? guests.map((g) => ({ fullName: g.fullName.trim(),
            dateOfBirth: g.dateOfBirth || null, gender: g.gender || null, identityNumber: g.idNumber || null,
            note: g.notes || null, roommateNote: g.roommateNote || null, restaurantNote: g.dietaryNote || null })) : null }) });
        onChanged?.();
      })}>{agency ? "Đổi Provider/phương án" : "Gửi thay đổi phương án"}</button>
    </div>}
    {agency && canChange && latest && <div className="space-y-3 text-sm">
      <p>Giá dự kiến khách đã xem: {money(latest.estimatedSale)}</p>
      {(latest.costs || []).map((line) => <div key={line.slotKey} className="flex flex-wrap items-center gap-2 border-b pb-2">
        <span className="grow">{line.name} · {line.quantity} {line.unit} · {line.source === "PLATFORM_PARTNER"
          ? "Provider trên sàn" : line.source === "AGENCY_OTHER" ? "Chi phí khác" : "Supplier của Agency"}</span>
        <input type="number" min="0.01" aria-label={`Số lượng ${line.name}`} className="w-20 border rounded p-1" value={quantities[line.slotKey] || String(line.quantity)} onChange={(e) => setQuantities({ ...quantities, [line.slotKey]: e.target.value })} />
        {line.source === "AGENCY_SUPPLIER" ? <input aria-label={`Chi phí ${line.name}`} type="number" min="0"
          className="w-32 border rounded p-1" value={costs[line.slotKey] ?? "0"}
          onChange={(e) => setCosts({ ...costs, [line.slotKey]: e.target.value })} /> : <strong>{money(line.total)}</strong>}
      </div>)}
      <label className="block">Tổng giá bán do Agency quyết định: <input type="number" min="1" className="border rounded p-1" value={saleTotal} onChange={(e) => setSaleTotal(e.target.value)} /></label>
      {latest.saleTotal > 0 && <p>Giá vốn/người: {money((latest.totalCost || 0) / Math.max(1, latest.numberOfGuests || passengers.length))} · Margin: {(((latest.agencyProfit || 0) / latest.saleTotal) * 100).toFixed(1)}% · Markup: {latest.totalCost ? (((latest.agencyProfit || 0) / latest.totalCost) * 100).toFixed(1) : "—"}%</p>}
      <label className="block">Hạn hiệu lực: <input type="datetime-local" className="border rounded p-1" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
      <textarea aria-label="Chính sách thanh toán" className="border rounded p-2 w-full" value={paymentPolicy} onChange={(e) => setPaymentPolicy(e.target.value)} />
      <label className="block">Lãi Agency (tổng đoàn): <input aria-label="Lãi Agency" type="number" min="0"
        className="border rounded p-1 ml-2" value={profit} onChange={(e) => setProfit(e.target.value)} /></label>
      <div className="space-y-2"><p className="font-medium">Chi phí khác do Agency tính</p>
        {extraCosts.map((cost, index) => <div key={index} className="flex flex-wrap gap-2">
          {(["name", "quantity", "unit", "unitCost"] as const).map((field) => <input key={field}
            aria-label={`Chi phí khác ${field} ${index + 1}`} type={field === "quantity" || field === "unitCost" ? "number" : "text"}
            min={field === "quantity" ? "0.01" : "0"} className="border rounded p-1 w-28" placeholder={field}
            value={cost[field]} onChange={(e) => setExtraCosts(extraCosts.map((row, i) => i === index ? { ...row, [field]: e.target.value } : row))} />)}
          <button onClick={() => setExtraCosts(extraCosts.filter((_, i) => i !== index))}>Xóa</button>
        </div>)}
        <button className="border rounded px-2 py-1" onClick={() => setExtraCosts([...extraCosts,
          { name: "", quantity: "1", unit: "lần", unitCost: "0" }])}>Thêm chi phí</button>
      </div>
      <input aria-label="Lý do báo giá" className="border rounded p-2 w-full" placeholder="Lý do thay đổi giá"
        value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2"><button disabled={busy} className="bg-sky-800 text-white rounded px-3 py-2"
        onClick={() => void run(() => http(`/bookings/${bookingId}/quotations/draft`, { method: "PUT", body: JSON.stringify({
          quantities: Object.entries(quantities).map(([slotKey, quantity]) => ({ slotKey, quantity: Number(quantity) })), saleTotal: saleTotal ? Number(saleTotal) : null, agencyProfit: Number(profit), agencyCosts: Object.entries(costs).map(([slotKey, unitCost]) => ({ slotKey, unitCost: Number(unitCost) })),
          extraCosts: extraCosts.map((c) => ({ name: c.name, quantity: Number(c.quantity), unit: c.unit, unitCost: Number(c.unitCost) })), reason }) }))}>Tính và lưu giá</button>
      <button disabled={busy || latest.status !== "Draft" || latest.saleTotal <= 0} className="border rounded px-3 py-2"
        onClick={() => void run(async () => {
          await http(`/bookings/${bookingId}/quotations/terms`, { method: "PUT", body: JSON.stringify({ validUntil: validUntil ? new Date(validUntil).toISOString() : new Date(Date.now() + 3 * 86400000).toISOString(), paymentPolicy }) });
          await http(`/bookings/${bookingId}/quotations/send`, { method: "POST" });
        })}>Gửi báo giá cho khách</button></div>
    </div>}
    {quotes.map((q, quoteIndex) => <div key={q.id} className="border-t pt-3 text-sm space-y-1">
      <p className="font-semibold">{plans.find((p) => p.id === String(q.tourId))?.name || `Plan #${q.tourId}`} · Báo giá v{q.version} · {q.status}</p>
      <p>Giá dự kiến {money(q.estimatedSale)} · Giá thực tế {money(q.saleTotal)}</p>
      {agency && <p>Chi phí {money(q.totalCost ?? 0)} · Lãi Agency {money(q.agencyProfit ?? 0)}</p>}
      {agency && quotes[quoteIndex + 1] && <details className="rounded border p-2"><summary>So sánh chi phí với báo giá v{quotes[quoteIndex + 1].version}: {money((q.totalCost || 0) - (quotes[quoteIndex + 1].totalCost || 0))}</summary>
        {q.costs?.map((line) => <p key={line.slotKey}>{line.name}: {money(line.total - (quotes[quoteIndex + 1].costs?.find((old) => old.slotKey === line.slotKey)?.total || 0))}</p>)}
      </details>}
      <p>{q.reason}</p>
      {q.validUntil && <p>Hiệu lực đến: {new Date(q.validUntil).toLocaleString("vi-VN")} · Cọc 50%: {money(q.depositAmount || 0)}</p>}
      {q.paymentPolicy && <p>{q.paymentPolicy}</p>}
      <QuotationSnapshot raw={q.planSnapshotJson} />
      {!agency && q.status === "Sent" && <div className="flex flex-wrap gap-2">
        <input aria-label="Lý do từ chối hoặc chỉnh sửa báo giá" className="border rounded p-2" value={decisionMessage} onChange={(e) => setDecisionMessage(e.target.value)} placeholder="Lý do / yêu cầu chỉnh sửa" />
        {(["reject", "revise"] as const).map((decision) => <button key={decision} disabled={busy || !decisionMessage.trim()} className="border rounded px-3" onClick={() => void run(() => http(`/bookings/${bookingId}/quotations/${q.version}/decision`, { method: "POST", body: JSON.stringify({ decision, message: decisionMessage }) }))}>{decision === "reject" ? "Từ chối" : "Yêu cầu sửa"}</button>)}
      </div>}
      {!agency && q.status === "Sent" && <button disabled={busy} className="bg-sky-800 text-white rounded px-3 py-2"
        onClick={() => void run(async () => { await http(`/bookings/${bookingId}/quotations/${q.version}/accept`, { method: "POST" });
          onChanged?.(); })}>Đồng ý báo giá này</button>}
    </div>)}
  </section>;
}

function QuotationSnapshot({ raw }: { raw?: string }) {
  if (!raw) return null;
  let snapshot: { name?: string; numberOfGuests?: number; startDate?: string; inclusions?: string; exclusions?: string; cancellationPolicy?: string;
    hotels?: { name: string; nightsCount?: number }[];
    itinerary?: { dayNumber: number; title: string; description?: string; activities?: { name: string }[]; meals?: { name: string }[] }[] };
  try { snapshot = JSON.parse(raw); } catch { return null; }
  if (!snapshot?.itinerary) return null;
  return <details className="rounded border p-3"><summary>Lịch trình và điều khoản của báo giá này</summary>
    <p>{snapshot.name} · {snapshot.numberOfGuests} khách · Khởi hành {snapshot.startDate?.slice(0, 10)}</p>
    {snapshot.itinerary.map((day) => <div key={day.dayNumber} className="border-t mt-2 pt-2"><strong>Ngày {day.dayNumber}: {day.title}</strong><p>{day.description}</p><p>{day.activities?.map((a) => a.name).join(" → ")}</p><p>{day.meals?.map((m) => m.name).join(", ")}</p></div>)}
    {snapshot.hotels?.map((hotel, i) => <p key={i}>{hotel.name} · {hotel.nightsCount} đêm</p>)}
    <p><strong>Bao gồm:</strong> {snapshot.inclusions || "Theo lịch trình"}</p>
    <p><strong>Không bao gồm:</strong> {snapshot.exclusions || "Theo thỏa thuận Agency"}</p>
    <p><strong>Điều kiện hoàn/hủy:</strong> {snapshot.cancellationPolicy || "Liên hệ Agency để làm rõ trước khi chấp nhận."}</p>
  </details>;
}
