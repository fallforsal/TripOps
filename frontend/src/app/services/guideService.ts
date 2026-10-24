/**
 * Guide Service
 * Quản lý lịch trình và hoạt động của hướng dẫn viên
 */

import { GuideSchedule, Location } from "@/app/types";
import { mockGuideSchedules } from "@/app/data/mockData";
import {
  mockApiCall,
  createApiResponse,
  createErrorResponse,
  ApiResponse,
} from "./api.config";

/**
 * Lấy lịch trình của một guide
 * GET /api/guides/:guideId/schedules
 */
export const getGuideSchedules = async (
  guideId: string,
): Promise<ApiResponse<GuideSchedule[]>> => {
  try {
    const schedules = mockGuideSchedules.filter(
      (s) => s.booking.guideId === guideId,
    );
    const response =
      await mockApiCall<GuideSchedule[]>(schedules);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy chi tiết một schedule
 * GET /api/schedules/:scheduleId
 */
export const getScheduleById = async (
  scheduleId: string,
): Promise<ApiResponse<GuideSchedule>> => {
  try {
    const schedule = mockGuideSchedules.find(
      (s) => s.id === scheduleId,
    );

    if (!schedule) {
      return createErrorResponse("Schedule không tồn tại");
    }

    const response = await mockApiCall<GuideSchedule>(schedule);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Cập nhật ngày hiện tại của tour
 * PUT /api/schedules/:scheduleId/current-day
 */
export interface UpdateCurrentDayRequest {
  currentDay: number;
}

export const updateCurrentDay = async (
  scheduleId: string,
  data: UpdateCurrentDayRequest,
): Promise<ApiResponse<GuideSchedule>> => {
  try {
    const scheduleIndex = mockGuideSchedules.findIndex(
      (s) => s.id === scheduleId,
    );

    if (scheduleIndex === -1) {
      return createErrorResponse("Schedule không tồn tại");
    }

    const updatedSchedule = {
      ...mockGuideSchedules[scheduleIndex],
      currentDay: data.currentDay,
    };

    const response =
      await mockApiCall<GuideSchedule>(updatedSchedule);
    return createApiResponse(
      response,
      "Cập nhật ngày thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Check-in tại một địa điểm
 * POST /api/schedules/:scheduleId/checkin
 */
export interface CheckInRequest {
  locationId: string;
  checkInTime: string;
  checkInImage?: string;
  checkInNote?: string;
}

export const checkInLocation = async (
  scheduleId: string,
  data: CheckInRequest,
): Promise<ApiResponse<GuideSchedule>> => {
  try {
    const scheduleIndex = mockGuideSchedules.findIndex(
      (s) => s.id === scheduleId,
    );

    if (scheduleIndex === -1) {
      return createErrorResponse("Schedule không tồn tại");
    }

    const schedule = mockGuideSchedules[scheduleIndex];

    // Add location to completed list
    const updatedSchedule = {
      ...schedule,
      completedLocations: [
        ...schedule.completedLocations,
        data.locationId,
      ],
    };

    const response =
      await mockApiCall<GuideSchedule>(updatedSchedule);
    return createApiResponse(response, "Check-in thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Hủy check-in tại một địa điểm
 * DELETE /api/schedules/:scheduleId/checkin/:locationId
 */
export const uncheckLocation = async (
  scheduleId: string,
  locationId: string,
): Promise<ApiResponse<GuideSchedule>> => {
  try {
    const scheduleIndex = mockGuideSchedules.findIndex(
      (s) => s.id === scheduleId,
    );

    if (scheduleIndex === -1) {
      return createErrorResponse("Schedule không tồn tại");
    }

    const schedule = mockGuideSchedules[scheduleIndex];

    // Remove location from completed list
    const updatedSchedule = {
      ...schedule,
      completedLocations: schedule.completedLocations.filter(
        (id) => id !== locationId,
      ),
    };

    const response =
      await mockApiCall<GuideSchedule>(updatedSchedule);
    return createApiResponse(
      response,
      "Hủy check-in thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy thông tin check-in chi tiết của một location
 * GET /api/schedules/:scheduleId/locations/:locationId/checkin
 */
export interface LocationCheckInInfo {
  locationId: string;
  checkedIn: boolean;
  checkInTime?: string;
  checkInImage?: string;
  checkInNote?: string;
}

export const getLocationCheckInInfo = async (
  scheduleId: string,
  locationId: string,
): Promise<ApiResponse<LocationCheckInInfo>> => {
  try {
    const schedule = mockGuideSchedules.find(
      (s) => s.id === scheduleId,
    );

    if (!schedule) {
      return createErrorResponse("Schedule không tồn tại");
    }

    const isCheckedIn =
      schedule.completedLocations.includes(locationId);

    // In production, this would fetch detailed check-in info from database
    const checkInInfo: LocationCheckInInfo = {
      locationId,
      checkedIn: isCheckedIn,
    };

    const response =
      await mockApiCall<LocationCheckInInfo>(checkInInfo);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy danh sách tất cả schedules (Admin)
 * GET /api/schedules
 */
export const getAllSchedules = async (): Promise<
  ApiResponse<GuideSchedule[]>
> => {
  try {
    const response = await mockApiCall<GuideSchedule[]>(
      mockGuideSchedules,
    );
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Cập nhật toàn bộ schedule
 * PUT /api/schedules/:scheduleId
 */
export const updateSchedule = async (
  scheduleId: string,
  updates: Partial<GuideSchedule>,
): Promise<ApiResponse<GuideSchedule>> => {
  try {
    const scheduleIndex = mockGuideSchedules.findIndex(
      (s) => s.id === scheduleId,
    );

    if (scheduleIndex === -1) {
      return createErrorResponse("Schedule không tồn tại");
    }

    const updatedSchedule = {
      ...mockGuideSchedules[scheduleIndex],
      ...updates,
    };

    const response =
      await mockApiCall<GuideSchedule>(updatedSchedule);
    return createApiResponse(
      response,
      "Cập nhật lịch trình thành công",
    );
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};