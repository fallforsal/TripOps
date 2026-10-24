/**
 * Service Service (Provider Services)
 * Quản lý các dịch vụ/bài đăng của providers
 */

import { Service } from "@/app/types";
import { mockServices } from "@/app/data/mockData";
import {
  mockApiCall,
  createApiResponse,
  createErrorResponse,
  ApiResponse,
} from "./api.config";

/**
 * Lấy tất cả services (Admin)
 * GET /api/services
 */
export const getAllServices = async (): Promise<
  ApiResponse<Service[]>
> => {
  try {
    const response = await mockApiCall<Service[]>(mockServices);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy services theo provider ID
 * GET /api/services/provider/:providerId
 */
export const getServicesByProviderId = async (
  providerId: string,
): Promise<ApiResponse<Service[]>> => {
  try {
    const providerServices = mockServices.filter(
      (s) => s.providerId === providerId,
    );
    const response =
      await mockApiCall<Service[]>(providerServices);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy chi tiết một service
 * GET /api/services/:id
 */
export const getServiceById = async (
  serviceId: string,
): Promise<ApiResponse<Service>> => {
  try {
    const service = mockServices.find(
      (s) => s.id === serviceId,
    );

    if (!service) {
      return createErrorResponse("Service không tồn tại");
    }

    const response = await mockApiCall<Service>(service);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy services chưa duyệt (Admin)
 * GET /api/services/pending
 */
export const getPendingServices = async (): Promise<
  ApiResponse<Service[]>
> => {
  try {
    const pendingServices = mockServices.filter(
      (s) => s.status === "pending",
    );
    const response =
      await mockApiCall<Service[]>(pendingServices);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Tạo service mới (Provider)
 * POST /api/services
 */
export interface CreateServiceRequest {
  providerId: string;
  providerName: string;
  name: string;
  category:
    | "hotel"
    | "restaurant"
    | "eatery"
    | "transportation"
    | "activity";
  description: string;
  price: number;
  pricePerPerson?: number;
  location: string;
  province?: string;
  district?: string;
  ward?: string;
  street?: string;
  image: string;
  images?: string[];
  capacity?: number;
  // Category-specific fields
  stars?: number;
  amenities?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  cuisine?: string;
  openingHours?: string;
  priceRange?: string;
  vehicleType?: string;
  seats?: number;
  duration?: string;
  difficulty?: string;
  ageRestriction?: string;
}

export const createService = async (
  data: CreateServiceRequest,
): Promise<ApiResponse<Service>> => {
  try {
    const newService: Service = {
      id: "service-" + Date.now(),
      ...data,
      rating: 0,
      status: "pending",
      createdAt: new Date().toLocaleDateString("vi-VN"),
    };

    const response = await mockApiCall<Service>(newService);
    return createApiResponse(
      response,
      "Tạo bài đăng thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Cập nhật service (Provider)
 * PUT /api/services/:id
 */
export const updateService = async (
  serviceId: string,
  updates: Partial<Service>,
): Promise<ApiResponse<Service>> => {
  try {
    const serviceIndex = mockServices.findIndex(
      (s) => s.id === serviceId,
    );

    if (serviceIndex === -1) {
      return createErrorResponse("Service không tồn tại");
    }

    const updatedService = {
      ...mockServices[serviceIndex],
      ...updates,
    };

    const response = await mockApiCall<Service>(updatedService);
    return createApiResponse(
      response,
      "Cập nhật bài đăng thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Xóa service (Provider)
 * DELETE /api/services/:id
 */
export const deleteService = async (
  serviceId: string,
): Promise<ApiResponse<null>> => {
  try {
    const serviceIndex = mockServices.findIndex(
      (s) => s.id === serviceId,
    );

    if (serviceIndex === -1) {
      return createErrorResponse("Service không tồn tại");
    }

    await mockApiCall(null);
    return createApiResponse(null, "Xóa bài đăng thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Duyệt service (Admin)
 * PUT /api/services/:id/approve
 */
export const approveService = async (
  serviceId: string,
): Promise<ApiResponse<Service>> => {
  try {
    const serviceIndex = mockServices.findIndex(
      (s) => s.id === serviceId,
    );

    if (serviceIndex === -1) {
      return createErrorResponse("Service không tồn tại");
    }

    const updatedService = {
      ...mockServices[serviceIndex],
      status: "approved" as const,
    };

    const response = await mockApiCall<Service>(updatedService);
    return createApiResponse(
      response,
      "Duyệt bài đăng thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Từ chối service (Admin)
 * PUT /api/services/:id/reject
 */
export const rejectService = async (
  serviceId: string,
): Promise<ApiResponse<Service>> => {
  try {
    const serviceIndex = mockServices.findIndex(
      (s) => s.id === serviceId,
    );

    if (serviceIndex === -1) {
      return createErrorResponse("Service không tồn tại");
    }

    const updatedService = {
      ...mockServices[serviceIndex],
      status: "rejected" as const,
    };

    const response = await mockApiCall<Service>(updatedService);
    return createApiResponse(
      response,
      "Từ chối bài đăng thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Tìm kiếm services
 * GET /api/services/search?keyword=...&category=...&location=...
 */
export interface ServiceSearchParams {
  keyword?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: "pending" | "approved" | "rejected";
}

export const searchServices = async (
  params: ServiceSearchParams,
): Promise<ApiResponse<Service[]>> => {
  try {
    let filtered = [...mockServices];

    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(keyword) ||
          s.description.toLowerCase().includes(keyword),
      );
    }

    if (params.category) {
      filtered = filtered.filter(
        (s) => s.category === params.category,
      );
    }

    if (params.location) {
      filtered = filtered.filter((s) =>
        s.location
          .toLowerCase()
          .includes(params.location!.toLowerCase()),
      );
    }

    if (params.minPrice !== undefined) {
      filtered = filtered.filter(
        (s) => s.price >= params.minPrice!,
      );
    }

    if (params.maxPrice !== undefined) {
      filtered = filtered.filter(
        (s) => s.price <= params.maxPrice!,
      );
    }

    if (params.status) {
      filtered = filtered.filter(
        (s) => s.status === params.status,
      );
    }

    const response = await mockApiCall<Service[]>(filtered);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};