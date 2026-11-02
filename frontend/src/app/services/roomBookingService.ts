/**
 * Room Booking Service
 * Quản lý đặt phòng cho accommodation providers
 */

import { RoomBooking } from "@/app/types";
import { mockRoomBookings } from "@/app/data/mockData";
import {
  mockApiCall,
  createApiResponse,
  createErrorResponse,
  ApiResponse,
} from "./api.config";

/**
 * Lấy tất cả room bookings (Admin)
 * GET /api/room-bookings
 */
export const getAllRoomBookings = async (): Promise<
  ApiResponse<RoomBooking[]>
> => {
  try {
    const response =
      await mockApiCall<RoomBooking[]>(mockRoomBookings);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy room bookings theo provider ID
 * GET /api/room-bookings/provider/:providerId
 */
export const getRoomBookingsByProviderId = async (
  providerId: string,
): Promise<ApiResponse<RoomBooking[]>> => {
  try {
    const providerBookings = mockRoomBookings.filter(
      (b) => b.providerId === providerId,
    );
    const response =
      await mockApiCall<RoomBooking[]>(providerBookings);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy chi tiết một room booking
 * GET /api/room-bookings/:id
 */
export const getRoomBookingById = async (
  bookingId: string,
): Promise<ApiResponse<RoomBooking>> => {
  try {
    const booking = mockRoomBookings.find(
      (b) => b.id === bookingId,
    );

    if (!booking) {
      return createErrorResponse("Booking không tồn tại");
    }

    const response = await mockApiCall<RoomBooking>(booking);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Tạo room booking mới
 * POST /api/room-bookings
 */
export interface CreateRoomBookingRequest {
  serviceId: string;
  serviceName: string;
  providerId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfRooms: number;
  numberOfGuests: number;
  roomType?: string;
  totalPrice: number;
  specialRequests?: string;
}

export const createRoomBooking = async (
  data: CreateRoomBookingRequest,
): Promise<ApiResponse<RoomBooking>> => {
  try {
    const newBooking: RoomBooking = {
      id: "room-booking-" + Date.now(),
      ...data,
      status: "pending",
      paymentStatus: "unpaid",
      bookingDate: new Date().toLocaleDateString("vi-VN"),
    };

    const response = await mockApiCall<RoomBooking>(newBooking);
    return createApiResponse(response, "Đặt phòng thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Xác nhận room booking (Provider)
 * PUT /api/room-bookings/:id/confirm
 */
export const confirmRoomBooking = async (
  bookingId: string,
): Promise<ApiResponse<RoomBooking>> => {
  try {
    const bookingIndex = mockRoomBookings.findIndex(
      (b) => b.id === bookingId,
    );

    if (bookingIndex === -1) {
      return createErrorResponse("Booking không tồn tại");
    }

    const updatedBooking = {
      ...mockRoomBookings[bookingIndex],
      status: "confirmed" as const,
    };

    const response =
      await mockApiCall<RoomBooking>(updatedBooking);
    return createApiResponse(
      response,
      "Xác nhận đặt phòng thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Từ chối room booking (Provider)
 * PUT /api/room-bookings/:id/reject
 */
export interface RejectRoomBookingRequest {
  rejectionReason: string;
}

export const rejectRoomBooking = async (
  bookingId: string,
  data: RejectRoomBookingRequest,
): Promise<ApiResponse<RoomBooking>> => {
  try {
    const bookingIndex = mockRoomBookings.findIndex(
      (b) => b.id === bookingId,
    );

    if (bookingIndex === -1) {
      return createErrorResponse("Booking không tồn tại");
    }

    const updatedBooking = {
      ...mockRoomBookings[bookingIndex],
      status: "rejected" as const,
      rejectionReason: data.rejectionReason,
    };

    const response =
      await mockApiCall<RoomBooking>(updatedBooking);
    return createApiResponse(
      response,
      "Từ chối đặt phòng thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Hủy room booking (Guest hoặc Provider)
 * PUT /api/room-bookings/:id/cancel
 */
export const cancelRoomBooking = async (
  bookingId: string,
): Promise<ApiResponse<RoomBooking>> => {
  try {
    const bookingIndex = mockRoomBookings.findIndex(
      (b) => b.id === bookingId,
    );

    if (bookingIndex === -1) {
      return createErrorResponse("Booking không tồn tại");
    }

    const updatedBooking = {
      ...mockRoomBookings[bookingIndex],
      status: "cancelled" as const,
    };

    const response =
      await mockApiCall<RoomBooking>(updatedBooking);
    return createApiResponse(
      response,
      "Hủy đặt phòng thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Cập nhật trạng thái thanh toán
 * PUT /api/room-bookings/:id/payment
 */
export interface UpdateRoomPaymentRequest {
  paymentStatus: "paid" | "unpaid" | "refunded";
}

export const updateRoomPaymentStatus = async (
  bookingId: string,
  data: UpdateRoomPaymentRequest,
): Promise<ApiResponse<RoomBooking>> => {
  try {
    const bookingIndex = mockRoomBookings.findIndex(
      (b) => b.id === bookingId,
    );

    if (bookingIndex === -1) {
      return createErrorResponse("Booking không tồn tại");
    }

    const updatedBooking = {
      ...mockRoomBookings[bookingIndex],
      paymentStatus: data.paymentStatus,
    };

    const response =
      await mockApiCall<RoomBooking>(updatedBooking);
    return createApiResponse(
      response,
      "Cập nhật trạng thái thanh toán thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Cập nhật thông tin room booking
 * PUT /api/room-bookings/:id
 */
export const updateRoomBooking = async (
  bookingId: string,
  updates: Partial<RoomBooking>,
): Promise<ApiResponse<RoomBooking>> => {
  try {
    const bookingIndex = mockRoomBookings.findIndex(
      (b) => b.id === bookingId,
    );

    if (bookingIndex === -1) {
      return createErrorResponse("Booking không tồn tại");
    }

    const updatedBooking = {
      ...mockRoomBookings[bookingIndex],
      ...updates,
    };

    const response =
      await mockApiCall<RoomBooking>(updatedBooking);
    return createApiResponse(
      response,
      "Cập nhật thông tin đặt phòng thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Tìm kiếm room bookings
 * GET /api/room-bookings/search?keyword=...&status=...
 */
export interface RoomBookingSearchParams {
  keyword?: string;
  status?:
    | "pending"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "rejected";
  checkInDate?: string;
  checkOutDate?: string;
}

export const searchRoomBookings = async (
  providerId: string,
  params: RoomBookingSearchParams,
): Promise<ApiResponse<RoomBooking[]>> => {
  try {
    let filtered = mockRoomBookings.filter(
      (b) => b.providerId === providerId,
    );

    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.guestName.toLowerCase().includes(keyword) ||
          b.guestEmail.toLowerCase().includes(keyword) ||
          b.id.toLowerCase().includes(keyword),
      );
    }

    if (params.status) {
      filtered = filtered.filter(
        (b) => b.status === params.status,
      );
    }

    if (params.checkInDate) {
      filtered = filtered.filter(
        (b) => b.checkInDate === params.checkInDate,
      );
    }

    if (params.checkOutDate) {
      filtered = filtered.filter(
        (b) => b.checkOutDate === params.checkOutDate,
      );
    }

    const response = await mockApiCall<RoomBooking[]>(filtered);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};