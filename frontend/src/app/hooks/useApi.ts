/**
 * Custom Hook for API calls
 * Quản lý loading state, error handling cho API calls
 */

import { useState, useCallback } from "react";
import { ApiResponse } from "@/app/services/api.config";

/**
 * Hook state interface
 */
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook return interface
 */
interface UseApiReturn<T, P extends any[]> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: P) => Promise<T | null>;
  reset: () => void;
}

/**
 * Generic hook for API calls với loading và error handling
 *
 * Usage:
 * ```
 * const { data, loading, error, execute } = useApi(getAllTours);
 *
 * useEffect(() => {
 *   execute();
 * }, []);
 * ```
 */
export function useApi<T, P extends any[] = []>(
  apiFunction: (...args: P) => Promise<ApiResponse<T>>,
): UseApiReturn<T, P> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const response = await apiFunction(...args);

        if (response.success && response.data !== undefined) {
          setState({
            data: response.data,
            loading: false,
            error: null,
          });
          return response.data;
        } else {
          const errorMsg = response.error || "Có lỗi xảy ra";
          setState({
            data: null,
            loading: false,
            error: errorMsg,
          });
          return null;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Có lỗi xảy ra";
        setState({
          data: null,
          loading: false,
          error: errorMsg,
        });
        return null;
      }
    },
    [apiFunction],
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for immediate API call (chạy ngay khi component mount)
 *
 * Usage:
 * ```
 * const { data, loading, error, refetch } = useApiImmediate(getAllTours);
 * ```
 */
export function useApiImmediate<T, P extends any[] = []>(
  apiFunction: (...args: P) => Promise<ApiResponse<T>>,
  ...args: P
): UseApiReturn<T, P> & { refetch: () => Promise<T | null> } {
  const api = useApi(apiFunction);

  // Execute on mount
  const refetch = useCallback(() => {
    return api.execute(...args);
  }, [api, args]);

  // Auto-execute on mount
  useState(() => {
    refetch();
  });

  return {
    ...api,
    refetch,
  };
}