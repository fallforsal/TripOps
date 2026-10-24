/**
 * Tour Service
 * Quản lý tours - CRUD operations
 */

import { Tour } from "@/app/types";
import { mockTours } from "@/app/data/mockData";
import {
  mockApiCall,
  createApiResponse,
  createErrorResponse,
  ApiResponse,
} from "./api.config";

/**
 * Lấy danh sách tất cả tours
 * GET /api/tours
 */
export const getAllTours = async (): Promise<
  ApiResponse<Tour[]>
> => {
  try {
    const response = await mockApiCall<Tour[]>(mockTours);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy chi tiết một tour
 * GET /api/tours/:id
 */
export const getTourById = async (
  tourId: string,
): Promise<ApiResponse<Tour>> => {
  try {
    const tour = mockTours.find((t) => t.id === tourId);

    if (!tour) {
      return createErrorResponse("Tour không tồn tại");
    }

    const response = await mockApiCall<Tour>(tour);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Tìm kiếm tours
 * GET /api/tours/search?q=keyword&destination=...
 */
export interface TourSearchParams {
  keyword?: string;
  destination?: string;
  minPrice?: number;
  maxPrice?: number;
  duration?: string;
}

export const searchTours = async (
  params: TourSearchParams,
): Promise<ApiResponse<Tour[]>> => {
  try {
    let filteredTours = [...mockTours];

    // Filter by keyword
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filteredTours = filteredTours.filter(
        (t) =>
          t.name.toLowerCase().includes(keyword) ||
          t.description.toLowerCase().includes(keyword) ||
          t.destination.toLowerCase().includes(keyword),
      );
    }

    // Filter by destination
    if (params.destination) {
      filteredTours = filteredTours.filter((t) =>
        t.destination
          .toLowerCase()
          .includes(params.destination!.toLowerCase()),
      );
    }

    // Filter by price range
    if (params.minPrice) {
      filteredTours = filteredTours.filter(
        (t) => t.price >= params.minPrice!,
      );
    }
    if (params.maxPrice) {
      filteredTours = filteredTours.filter(
        (t) => t.price <= params.maxPrice!,
      );
    }

    // Filter by duration
    if (params.duration) {
      filteredTours = filteredTours.filter(
        (t) => t.duration === params.duration,
      );
    }

    const response = await mockApiCall<Tour[]>(filteredTours);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Tạo tour mới (Admin only)
 * POST /api/tours
 */
export interface CreateTourRequest {
  name: string;
  destination: string;
  duration: string;
  numberOfDays?: number;
  numberOfNights?: number;
  price: number;
  description: string;
  image: string;
  maxGuests: number;
  highlights: string[];
  itinerary: any[];
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
}

export const createTour = async (
  tourData: CreateTourRequest,
): Promise<ApiResponse<Tour>> => {
  try {
    // Generate tour code
    const tourNumber = mockTours.length + 1;
    const tourCode = `T${tourNumber.toString().padStart(3, "0")}`;

    const newTour: Tour = {
      id: "tour-" + Date.now(),
      tourCode,
      ...tourData,
      rating: 0,
      bookings: 0,
      createdAt: new Date().toLocaleDateString("vi-VN"),
    };

    // In production, this would POST to API
    const response = await mockApiCall<Tour>(newTour);
    return createApiResponse(response, "Tạo tour thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Cập nhật tour (Admin only)
 * PUT /api/tours/:id
 */
export const updateTour = async (
  tourId: string,
  updates: Partial<Tour>,
): Promise<ApiResponse<Tour>> => {
  try {
    const tourIndex = mockTours.findIndex(
      (t) => t.id === tourId,
    );

    if (tourIndex === -1) {
      return createErrorResponse("Tour không tồn tại");
    }

    const updatedTour = { ...mockTours[tourIndex], ...updates };

    // In production, this would PUT to API
    const response = await mockApiCall<Tour>(updatedTour);
    return createApiResponse(
      response,
      "Cập nhật tour thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Xóa tour (Admin only)
 * DELETE /api/tours/:id
 */
export const deleteTour = async (
  tourId: string,
): Promise<ApiResponse<null>> => {
  try {
    const tourIndex = mockTours.findIndex(
      (t) => t.id === tourId,
    );

    if (tourIndex === -1) {
      return createErrorResponse("Tour không tồn tại");
    }

    // In production, this would DELETE from API
    await mockApiCall(null);
    return createApiResponse(null, "Xóa tour thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * AI Search - Tìm kiếm tour bằng câu tự nhiên
 * POST /api/tours/ai-search
 */
export interface AISearchRequest {
  query: string; // Câu mô tả tự nhiên của user
}

export const aiSearchTours = async (
  request: AISearchRequest,
): Promise<ApiResponse<Tour[]>> => {
  try {
    // Trong production, API sẽ xử lý NLP và trả về kết quả phù hợp
    // Mock: Tìm kiếm đơn giản dựa trên keywords
    const keywords = request.query.toLowerCase().split(" ");

    const matchedTours = mockTours.filter((tour) => {
      const searchText =
        `${tour.name} ${tour.description} ${tour.destination} ${tour.highlights.join(" ")}`.toLowerCase();
      return keywords.some((keyword) =>
        searchText.includes(keyword),
      );
    });

    // Simulate AI processing delay (longer than normal API)
    const response = await mockApiCall<Tour[]>(
      matchedTours,
      1000,
    );
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};