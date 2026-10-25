import type { Tour } from "@/app/types";
import { createApiResponse, createErrorResponse, type ApiResponse } from "./api.config";
import { archiveAgencyTour, createAgencyTour, fromApiTour, fromConfiguration, getAgencyTour, getPublicTour, hideAgencyTour,
  publicTours, updateAgencyTour } from "./wf02Tours";

function failure(error: unknown) {
  return createErrorResponse(error instanceof Error ? error.message : "Không thể tải tour.");
}
export async function getAllTours(): Promise<ApiResponse<Tour[]>> {
  try { return createApiResponse(await publicTours()); } catch (error) { return failure(error); }
}
export async function getTourById(tourId: string): Promise<ApiResponse<Tour>> {
  try {
    const detail = await getPublicTour(tourId);
    return createApiResponse(fromConfiguration(detail.id, detail.code, detail.version, detail.configuration));
  } catch (error) { return failure(error); }
}
export interface TourSearchParams {
  keyword?: string; destination?: string; minPrice?: number; maxPrice?: number; duration?: string;
}
export async function searchTours(params: TourSearchParams): Promise<ApiResponse<Tour[]>> {
  try {
    const tours = await publicTours();
    return createApiResponse(tours.filter(tour =>
      (!params.keyword || `${tour.name} ${tour.description} ${tour.destination}`.toLowerCase().includes(params.keyword.toLowerCase())) &&
      (!params.destination || tour.destination.toLowerCase().includes(params.destination.toLowerCase())) &&
      (params.minPrice == null || tour.price >= params.minPrice) &&
      (params.maxPrice == null || tour.price <= params.maxPrice) &&
      (!params.duration || tour.duration === params.duration)));
  } catch (error) { return failure(error); }
}
export interface CreateTourRequest extends Partial<Tour> { name: string; }
export async function createTour(data: CreateTourRequest): Promise<ApiResponse<Tour>> {
  try { return createApiResponse(fromApiTour(await createAgencyTour(data)), "Đã lưu bản nháp."); }
  catch (error) { return failure(error); }
}
export async function updateTour(id: string, data: Partial<Tour>): Promise<ApiResponse<Tour>> {
  try {
    const current = await getAgencyTour(id);
    return createApiResponse(fromApiTour(await updateAgencyTour(id, current.version, { ...fromApiTour(current), ...data })), "Đã cập nhật tour.");
  } catch (error) { return failure(error); }
}
export async function deleteTour(id: string): Promise<ApiResponse<null>> {
  try {
    const current = await getAgencyTour(id);
    const version = current.visibility === "public"
      ? (await hideAgencyTour(id, current.version, "Agency lưu trữ tour.")).version : current.version;
    await archiveAgencyTour(id, version);
    return createApiResponse(null, "Đã lưu trữ tour.");
  } catch (error) { return failure(error); }
}
export interface AISearchRequest { query: string }
export async function aiSearchTours(request: AISearchRequest): Promise<ApiResponse<Tour[]>> {
  return searchTours({ keyword: request.query });
}
