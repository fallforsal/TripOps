/**
 * API Configuration
 * Thay đổi BASE_URL để trỏ đến API thật sau này
 */

// Cấu hình base URL - sau này thay đổi thành URL API thật
export const API_CONFIG = {
  BASE_URL: '/api', // Thay bằng URL API thật: 'https://your-api-domain.com/api'
  TIMEOUT: 10000, // 10 seconds
  // Có thể thêm headers mặc định, authentication token, etc.
};

/**
 * Simulate API delay for mock responses
 * Set to 0 for instant responses
 */
export const MOCK_DELAY = 500; // milliseconds

/**
 * Mock API call helper
 * Simulates network delay and potential errors
 */
export const mockApiCall = async <T>(
  data: T,
  delay: number = MOCK_DELAY,
  errorRate: number = 0 // 0-1, probability of error (0 = no errors)
): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate random errors based on errorRate
      if (Math.random() < errorRate) {
        reject(new Error('Network error'));
      } else {
        resolve(data);
      }
    }, delay);
  });
};

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Wrap data in standard API response format
 */
export const createApiResponse = <T>(
  data: T,
  message?: string
): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

/**
 * Create error response
 */
export const createErrorResponse = (error: string): ApiResponse<never> => ({
  success: false,
  error,
});
