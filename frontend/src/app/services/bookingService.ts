/**
 * Booking Service
 * Quản lý bookings - CRUD operations
 */

import { Booking } from "@/app/types";
import { mockBookings } from "@/app/data/mockData";
import {
  mockApiCall,
  createApiResponse,
  createErrorResponse,
  ApiResponse,
} from "./api.config";

/**
 * Lấy tất cả bookings (Admin)
 * GET /api/bookings
 */
export const getAllBookings = async (): Promise<
  ApiResponse<Booking[]>
> => {
  try {
    const response = await mockApiCall<Booking[]>(mockBookings);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy bookings của một user
 * GET /api/bookings/user/:userId
 */
export const getBookingsByUserId = async (
  userId: string,
): Promise<ApiResponse<Booking[]>> => {
  try {
    const userBookings = mockBookings.filter(
      (b) => b.userId === userId,
    );
    const response = await mockApiCall<Booking[]>(userBookings);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy chi tiết một booking
 * GET /api/bookings/:id
 */
export const getBookingById = async (
  bookingId: string,
): Promise<ApiResponse<Booking>> => {
  try {
    const booking = mockBookings.find(
      (b) => b.id === bookingId,
    );

    if (!booking) {
      return createErrorResponse("Booking không tồn tại");
    }

    const response = await mockApiCall<Booking>(booking);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Tạo booking mới
 * POST /api/bookings
 */
export interface CreateBookingRequest {
  tourId: string;
  userId: string;
  userName: string;
  userEmail: string;
  numberOfGuests: number;
  totalPrice: number;
  tourStartDate: string;
  tour: any; // Tour object
}

export const createBooking = async (
  data: CreateBookingRequest,
): Promise<ApiResponse<Booking>> => {
  try {
    const newBooking: Booking = {
      id: "booking-" + Date.now(),
      ...data,
      status: "pending",
      paymentStatus: "unpaid",
      bookingDate: new Date().toLocaleDateString("vi-VN"),
    };

    const response = await mockApiCall<Booking>(newBooking);
    return createApiResponse(response, "Đặt tour thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Cập nhật trạng thái booking (Admin)
 * PUT /api/bookings/:id/status
 */
export interface UpdateBookingStatusRequest {
  status: "confirmed" | "cancelled" | "completed" | "rejected";
  rejectionReason?: string;
}

export const updateBookingStatus = async (
  bookingId: string,
  data: UpdateBookingStatusRequest,
): Promise<ApiResponse<Booking>> => {
  try {
    const bookingIndex = mockBookings.findIndex(
      (b) => b.id === bookingId,
    );

    if (bookingIndex === -1) {
      return createErrorResponse("Booking không tồn tại");
    }

    const updatedBooking = {
      ...mockBookings[bookingIndex],
      status: data.status,
      ...(data.rejectionReason && {
        rejectionReason: data.rejectionReason,
      }),
    };

    const response = await mockApiCall<Booking>(updatedBooking);
    return createApiResponse(
      response,
      "Cập nhật trạng thái thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Phân công hướng dẫn viên (Admin)
 * PUT /api/bookings/:id/assign-guide
 */
export interface AssignGuideRequest {
  guideId: string;
  guideName: string;
  guideAvatar?: string;
  guidePhone?: string;
}

export const assignGuide = async (
  bookingId: string,
  data: AssignGuideRequest,
): Promise<ApiResponse<Booking>> => {
  try {
    const bookingIndex = mockBookings.findIndex(
      (b) => b.id === bookingId,
    );

    if (bookingIndex === -1) {
      return createErrorResponse("Booking không tồn tại");
    }

    const updatedBooking = {
      ...mockBookings[bookingIndex],
      guideId: data.guideId,
      guideName: data.guideName,
      guideAvatar: data.guideAvatar,
      guidePhone: data.guidePhone,
      status: "confirmed" as const,
    };

    const response = await mockApiCall<Booking>(updatedBooking);
    return createApiResponse(
      response,
      "Phân công hướng dẫn viên thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Hủy booking (User)
 * PUT /api/bookings/:id/cancel
 */
export const cancelBooking = async (
  bookingId: string,
): Promise<ApiResponse<Booking>> => {
  try {
    const bookingIndex = mockBookings.findIndex(
      (b) => b.id === bookingId,
    );

    if (bookingIndex === -1) {
      return createErrorResponse("Booking không tồn tại");
    }

    const updatedBooking = {
      ...mockBookings[bookingIndex],
      status: "cancelled" as const,
    };

    const response = await mockApiCall<Booking>(updatedBooking);
    return createApiResponse(
      response,
      "Hủy booking thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy bookings đang active (có guide assigned)
 * GET /api/bookings/active
 */
export const getActiveBookings = async (): Promise<
  ApiResponse<Booking[]>
> => {
  try {
    const activeBookings = mockBookings.filter(
      (b) => b.status === "confirmed" && b.guideId,
    );
    const response =
      await mockApiCall<Booking[]>(activeBookings);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy bookings theo guide ID
 * GET /api/bookings/guide/:guideId
 */
export const getBookingsByGuideId = async (
  guideId: string,
): Promise<ApiResponse<Booking[]>> => {
  try {
    const guideBookings = mockBookings.filter(
      (b) => b.guideId === guideId,
    );
    const response =
      await mockApiCall<Booking[]>(guideBookings);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Cập nhật thông tin thanh toán
 * PUT /api/bookings/:id/payment
 */
export interface UpdatePaymentRequest {
  paymentStatus: "paid" | "unpaid" | "refunded";
}

export const updatePaymentStatus = async (
  bookingId: string,
  data: UpdatePaymentRequest,
): Promise<ApiResponse<Booking>> => {
  try {
    const bookingIndex = mockBookings.findIndex(
      (b) => b.id === bookingId,
    );

    if (bookingIndex === -1) {
      return createErrorResponse("Booking không tồn tại");
    }

    const updatedBooking = {
      ...mockBookings[bookingIndex],
      paymentStatus: data.paymentStatus,
    };

    const response = await mockApiCall<Booking>(updatedBooking);
    return createApiResponse(
      response,
      "Cập nhật trạng thái thanh toán thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};