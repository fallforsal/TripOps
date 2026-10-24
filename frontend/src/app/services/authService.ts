/**
 * Authentication Service
 * Xử lý đăng nhập, đăng xuất, và quản lý thông tin user
 */

import { User } from "@/app/types";
import { mockUsers } from "@/app/data/mockData";
import {
  mockApiCall,
  createApiResponse,
  createErrorResponse,
  ApiResponse,
} from "./api.config";

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  user: User;
  token: string; // JWT token sẽ được API thật trả về
}

/**
 * Đăng nhập
 * POST /api/auth/login
 */
export const login = async (
  credentials: LoginRequest,
): Promise<ApiResponse<LoginResponse>> => {
  try {
    // Tìm user theo email hoặc alias emails (trong production sẽ gọi API)
    const user = mockUsers.find(
      (u) =>
        u.email.toLowerCase() === credentials.email.trim().toLowerCase() ||
        (u.aliasEmails &&
          u.aliasEmails.some(
            (alias) => alias.toLowerCase() === credentials.email.trim().toLowerCase()
          ))
    );

    if (!user) {
      return createErrorResponse("Email không tồn tại");
    }

    // Mock: Mật khẩu mặc định là "1" cho tất cả tài khoản demo
    if (credentials.password !== "1") {
      return createErrorResponse("Mật khẩu không đúng");
    }

    // Simulate API call
    const response = await mockApiCall<LoginResponse>({
      user,
      token: "mock_jwt_token_" + user.id, // Mock JWT token
    });

    return createApiResponse(response, "Đăng nhập thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy thông tin user hiện tại
 * GET /api/auth/me
 */
export const getCurrentUser = async (
  userId: string,
): Promise<ApiResponse<User>> => {
  try {
    const user = mockUsers.find((u) => u.id === userId);

    if (!user) {
      return createErrorResponse("User không tồn tại");
    }

    const response = await mockApiCall<User>(user);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Đăng xuất
 * POST /api/auth/logout
 */
export const logout = async (): Promise<ApiResponse<null>> => {
  try {
    await mockApiCall(null, 300);
    return createApiResponse(null, "Đăng xuất thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Đăng ký tài khoản mới
 * POST /api/auth/register
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  companyId?: string;
  companyName?: string;
  providerType?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxCode?: string;
}

export const register = async (
  data: RegisterRequest,
): Promise<ApiResponse<User>> => {
  try {
    // Check if email already exists
    const existingUser = mockUsers.find(
      (u) => u.email === data.email,
    );
    if (existingUser) {
      return createErrorResponse("Email đã được sử dụng");
    }

    // Create new user with valid demo properties for their role
    const newUser: User = {
      id: "user-" + Date.now(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      ...(data.role === "agency" && {
        companyId: data.companyId || "company-1",
        companyName: data.companyName || "Viettravel",
      }),
      ...(data.role === "provider" && {
        providerType: (data.providerType as any) || "accommodation",
        businessName: data.businessName || "Heritage Resorts & Villas",
        businessAddress: data.businessAddress,
        businessPhone: data.businessPhone,
        businessEmail: data.businessEmail,
        taxCode: data.taxCode,
      }),
      ...(data.role === "guide" && {
        companyId: "company-1",
        companyName: "Viettravel",
      }),
    };

    const response = await mockApiCall<User>(newUser);
    return createApiResponse(response, "Đăng ký thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Lấy danh sách tất cả users (chỉ admin)
 * GET /api/users
 */
export const getAllUsers = async (): Promise<
  ApiResponse<User[]>
> => {
  try {
    const response = await mockApiCall<User[]>(mockUsers);
    return createApiResponse(response);
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};

/**
 * Cập nhật thông tin user
 * PUT /api/users/:id
 */
export const updateUser = async (
  userId: string,
  updates: Partial<User>,
): Promise<ApiResponse<User>> => {
  try {
    const userIndex = mockUsers.findIndex(
      (u) => u.id === userId,
    );

    if (userIndex === -1) {
      return createErrorResponse("User không tồn tại");
    }

    const updatedUser = { ...mockUsers[userIndex], ...updates };

    // In production, this would update the database
    // For now, just return the updated user
    const response = await mockApiCall<User>(updatedUser);
    return createApiResponse(response, "Cập nhật thành công");
  } catch (error) {
    return createErrorResponse("Lỗi kết nối đến server");
  }
};