import type { Tour } from "../types/index";
import { toTourApiTime } from "./tourClockTime.ts";

export type TourFormTab = "general" | "itinerary" | "pricing" | "regulations" | "preview";
export type TourFormIssue = { tab: TourFormTab; message: string };
export const tourFormTabLabels: Record<TourFormTab, string> = {
  general: "Thông tin chung", itinerary: "Chỗ ở, Chỗ ăn & Lịch trình",
  pricing: "Bảng giá vé", regulations: "Quy định & Chính sách", preview: "Xem trước",
};

export function validateTourForm(tour: Partial<Tour>, complete: boolean): TourFormIssue[] {
  const issues: TourFormIssue[] = [];
  const add = (tab: TourFormTab, message: string) => issues.push({ tab, message });
  const required = (value: string | undefined, label: string, tab: TourFormTab) => {
    if (!value?.trim()) add(tab, `Vui lòng nhập ${label}.`);
  };
  const range = (value: number | undefined, min: number, max: number, label: string, tab: TourFormTab, integer = false) => {
    if (value == null || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))
      add(tab, `${label} phải ${integer ? "là số nguyên " : ""}từ ${min.toLocaleString("vi-VN")} đến ${max.toLocaleString("vi-VN")}.`);
  };
  const clock = (value: string | undefined, label: string) => {
    try { toTourApiTime(value, label); }
    catch (error) { add("itinerary", (error as Error).message); }
  };
  required(tour.name, "tên tour", "general");
  if ((tour.name?.trim().length || 0) > 255) add("general", "Tên tour không được vượt quá 255 ký tự.");
  range(tour.numberOfDays, 1, 365, "Số ngày", "general", true);
  range(tour.numberOfNights, 0, tour.numberOfDays || 365, "Số đêm", "general", true);
  range(tour.price, 0, 9999999999, "Giá tour", "general");
  if (tour.minGuests != null || complete) range(tour.minGuests, 1, 100000, "Số khách tối thiểu", "general", true);
  if (tour.maxGuests != null || complete) range(tour.maxGuests, 1, 100000, "Số khách tối đa", "general", true);
  if (tour.minGuests != null && tour.maxGuests != null && tour.minGuests > tour.maxGuests)
    add("general", "Số khách tối đa phải lớn hơn hoặc bằng số khách tối thiểu.");
  if (complete) {
    required(tour.destination, "điểm đến chính", "general");
    if (!tour.provinceCodes?.length) add("general", "Vui lòng chọn ít nhất một tỉnh/thành tour đi qua.");
    if (!tour.regulations?.some(value => value.trim())) add("regulations", "Vui lòng bổ sung quy định/chính sách hủy tour.");
    if (!tour.priceTable?.length) add("pricing", "Vui lòng thêm ít nhất một khung giá vé.");
  }
  for (const day of tour.itinerary || []) {
    const hasContent = day.title?.trim() || day.locations?.length || day.meals?.length || day.hotel;
    if (complete || hasContent) required(day.title, `tiêu đề lịch trình ngày ${day.day}`, "itinerary");
    for (const [index, place] of (day.locations || []).entries()) {
      required(place.name, `tên điểm ${index + 1} trong ngày ${day.day}`, "itinerary");
      clock(place.time, `Ngày ${day.day}, điểm ${index + 1}`);
    }
    for (const meal of day.meals || []) {
      const label = `Ngày ${day.day}, bữa ${meal.type === "breakfast" ? "sáng" : meal.type === "lunch" ? "trưa" : "tối"}`;
      required(meal.serviceName, `nhà hàng cho ${label.toLowerCase()}`, "itinerary");
      clock(meal.time, label);
    }
  }
  if ((tour.hotels || []).reduce((sum, hotel) => sum + (hotel.nights ?? 1), 0) > (tour.numberOfNights ?? 0))
    add("itinerary", "Tổng số đêm lưu trú tại khách sạn không được vượt quá số đêm của tour.");
  const tiers = tour.priceTable || [];
  for (const [index, tier] of tiers.entries()) {
    required(tier.ageGroupLabel, `tên khung giá vé ${index + 1}`, "pricing");
    range(tier.minAge, 0, 150, `Tuổi tối thiểu của khung vé ${index + 1}`, "pricing", true);
    if (tier.maxAge != null) range(tier.maxAge, tier.minAge ?? 0, 150, `Tuổi tối đa của khung vé ${index + 1}`, "pricing", true);
    range(tier.price, 0, 9999999999, `Giá khung vé ${index + 1}`, "pricing");
  }
  return issues;
}

export function tourSaveErrorMessage(message: string): string {
  const fields: Record<string, string> = { Name: "tên tour/điểm tham quan", Title: "tiêu đề ngày", RestaurantName: "tên nhà hàng", HotelName: "tên khách sạn", DestinationName: "khu vực lưu trú", MinAge: "tuổi tối thiểu của khung vé" };
  return message.replace(/The (\w+) field is required\./g, (original, field: string) => fields[field] ? `Vui lòng nhập ${fields[field]}.` : original)
    .replace("Invalid guest range.", "Số khách tối đa phải lớn hơn hoặc bằng số khách tối thiểu.")
    .replace("Pricing age ranges overlap.", "Độ tuổi giữa các khung giá vé đang bị trùng nhau.")
    .replace("Selected Provider service is unavailable or has the wrong category.", "Dịch vụ đã chọn hiện không khả dụng hoặc không đúng loại. Vui lòng kiểm tra lại khách sạn/nhà hàng.");
}
