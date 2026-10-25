export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export async function http<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${baseUrl}/api/v1${path}`, {
      ...options,
      credentials: "include",
      signal: options.signal ?? controller.signal,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errors = data?.errors
        ? Object.values(data.errors).flat().join(" ")
        : "";
      throw new ApiError(
        response.status,
        errors || data?.title || `Yêu cầu thất bại (${response.status})`,
      );
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}
