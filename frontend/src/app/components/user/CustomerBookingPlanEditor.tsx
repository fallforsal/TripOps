import { useEffect, useState } from "react";
import { http } from "@/app/lib/http";
import type { BookingPassenger, Tour } from "@/app/types";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " ₫";

export function CustomerBookingPlanEditor({ bookingId, plans = [], currentTourId, currentStartDate,
  currentTourSnapshot, currentSpecialRequests, passengers = [], canChange = false, onChanged }:
  { bookingId: string; plans?: Tour[]; currentTourId?: string; currentStartDate?: string;
    currentTourSnapshot?: Tour; currentSpecialRequests?: string; passengers?: BookingPassenger[];
    canChange?: boolean; onChanged?: () => void }) {
  const [specialRequests, setSpecialRequests] = useState(currentSpecialRequests || "");
  const [startDate, setStartDate] = useState(currentStartDate?.slice(0, 10) || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState(currentTourId || "");
  const [hotelChoices, setHotelChoices] = useState<Record<string, string>>({});
  const [mealChoices, setMealChoices] = useState<Record<string, string>>({});
  const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
  useEffect(() => { setPlanId(currentTourId || ""); }, [currentTourId]);
  useEffect(() => { setStartDate(currentStartDate?.slice(0, 10) || ""); }, [currentStartDate]);
  useEffect(() => { setSpecialRequests(currentSpecialRequests || ""); }, [currentSpecialRequests]);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Không thể đổi phương án tour."); }
    finally { setBusy(false); }
  };
  const currentHotelName = (destination: string) => selectedPlan?.id === currentTourId
    ? currentTourSnapshot?.hotels?.find((h) => h.destination === destination)?.name : undefined;
  const currentMealName = (day: number, type: string) => selectedPlan?.id === currentTourId
    ? currentTourSnapshot?.itinerary.find((d) => d.day === day)?.meals?.find((m) => m.type === type)?.serviceName : undefined;
  if (!canChange || !selectedPlan) return null;
  return <section className="rounded-lg border border-slate-300 bg-white p-5 space-y-4">
    <h3 className="font-bold text-sky-900">Thay đổi phương án tour</h3>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    <div className="space-y-2 border-b pb-4 text-sm">
      <p className="font-semibold">Chỉ thay đổi toàn bộ phương án trước khi Agency duyệt. Sau khi duyệt, vui lòng liên hệ Agency để đổi dịch vụ hoặc bổ sung phụ thu.</p>
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
      <div className="space-y-2">
        <label className="block">Ngày khởi hành: <input type="date" aria-label="Ngày khởi hành mới"
          className="border rounded p-1 ml-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <p className="text-slate-600">Danh sách {passengers.length} hành khách do Agency quản lý. Vui lòng liên hệ Agency nếu cần thay đổi.</p>

      </div>
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
      <textarea aria-label="Yêu cầu tùy chỉnh thêm" className="border rounded p-2 w-full"
        placeholder="Muốn đổi điểm tham quan, lịch trình hoặc dịch vụ khác? Ghi rõ để Agency báo giá lại."
        value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />
      <button disabled={busy}
        className="bg-sky-800 text-white rounded px-3 py-2" onClick={() => void run(async () => {
        await http(`/bookings/${bookingId}/quotations/change-plan`, { method: "POST", body: JSON.stringify({
          tourId: Number(selectedPlan.id), hotelChoices: Object.values(hotelChoices).filter(Boolean).map((value) => JSON.parse(value)),
          mealChoices: Object.values(mealChoices).filter(Boolean).map((value) => JSON.parse(value)),
          specialRequests,
          startDate: startDate && startDate !== currentStartDate?.slice(0, 10) ? startDate : null,
          participants: null }) });
        onChanged?.();
      })}>Gửi thay đổi phương án</button>
    </div>
  </section>;
}
