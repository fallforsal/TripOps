import { http } from "@/app/lib/http";
import type { ApiTour, TourConfiguration } from "@/app/services/wf02Tours";

/** UC-038: thông tin Agency nhập để AI soạn khung tour. */
export interface AiTourDraftRequest {
  destination: string;
  durationDays: number;
  style?: string | null;
  /** Số khách của đoàn, để AI chọn khách sạn, nhà hàng đủ chỗ. */
  groupSize?: number | null;
}

/** Giới hạn trùng với backend (OpenAiItineraryDraftGenerator.MaxDays). */
export const AI_TOUR_MAX_DAYS = 14;
export const AI_TOUR_MAX_GUESTS = 1000;

/** Sự kiện báo App tải lại danh sách tour sau khi lưu bản nháp từ cửa sổ AI. */
export const TOURS_CHANGED_EVENT = "tripops:tours-changed";

/** AI soạn khung tour để xem trước. Chưa lưu gì. Có thể mất vài chục giây. */
export const previewAiTour = (request: AiTourDraftRequest, signal?: AbortSignal) =>
  http<TourConfiguration>("/agency/ai/itinerary-drafts/preview", {
    method: "POST",
    body: JSON.stringify(request),
    signal,
  });

/** Lưu khung tour đã xem trước thành tour nháp, ẩn, đánh dấu do AI soạn. */
export const saveAiTour = (configuration: TourConfiguration) =>
  http<ApiTour>("/agency/ai/itinerary-drafts/save", {
    method: "POST",
    body: JSON.stringify(configuration),
  });

/** Mở trang sửa tour vừa lưu: App tải lại danh sách, trang Quản lý tour tự mở tour theo ?edit=. */
export function openAiDraftEditor(tourId: number) {
  window.dispatchEvent(new Event(TOURS_CHANGED_EVENT));
  window.location.hash = `#/agency/tours?edit=${tourId}`;
}

/** Đọc id tour cần mở từ hash dạng #/agency/tours?edit=12. */
export function editTourIdFromHash(hash = window.location.hash): string | null {
  const match = hash.match(/^#\/?agency\/tours\?(?:.*&)?edit=(\d+)/);
  return match ? match[1] : null;
}
