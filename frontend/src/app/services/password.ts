import { http } from "@/app/lib/http";

/** developmentCode chỉ có khi backend chạy Development mà chưa cấu hình SMTP (để demo). */
export interface ForgotPasswordResponse {
  message: string;
  resendAfterSeconds: number;
  expiresInMinutes: number;
  developmentCode?: string | null;
}

export const requestPasswordReset = (email: string) =>
  http<ForgotPasswordResponse>("/auth/password/forgot", { method: "POST", body: JSON.stringify({ email: email.trim() }) });

export const verifyResetCode = (email: string, code: string) =>
  http<void>("/auth/password/verify", { method: "POST", body: JSON.stringify({ email: email.trim(), code }) });

export const resetPassword = (email: string, code: string, newPassword: string, confirmPassword: string) =>
  http<void>("/auth/password/reset", { method: "POST", body: JSON.stringify({ email: email.trim(), code, newPassword, confirmPassword }) });

/** Đổi mật khẩu khi đang đăng nhập; các thiết bị khác bị đăng xuất, thiết bị này vẫn giữ đăng nhập. */
export const changePassword = (currentPassword: string, newPassword: string, confirmPassword: string) =>
  http<void>("/me/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });

/** Lỗi kiểm tra mật khẩu mới phía giao diện (khớp quy tắc backend: 8–128 ký tự). */
export function newPasswordProblem(password: string, confirm: string): string | null {
  if (password.trim().length < 8) return "Mật khẩu mới cần ít nhất 8 ký tự.";
  if (password.length > 128) return "Mật khẩu mới tối đa 128 ký tự.";
  if (password !== confirm) return "Xác nhận mật khẩu không khớp.";
  return null;
}
