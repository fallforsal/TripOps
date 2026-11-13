import { http } from "@/app/lib/http";

export type AiRole = "user" | "assistant";

export interface AiTourCard {
  id: number;
  name: string;
  destination: string | null;
  durationDays: number | null;
  durationNights: number | null;
  price: number | null;
  imageUrl: string | null;
  agencyName: string | null;
  minGuests: number | null;
  maxGuests: number | null;
}

export interface AiChatResponse {
  reply: string;
  tours: AiTourCard[];
  /** false = máy chủ chưa cấu hình AI (hoặc AI lỗi), câu trả lời do bộ quy tắc dự phòng tạo. */
  aiConfigured: boolean;
}

/** Hỏi trợ lý TripOps (không cần đăng nhập). Chỉ gửi nội dung hội thoại, không gửi thông tin tài khoản. */
export const askGuestAssistant = (messages: { role: AiRole; content: string }[], signal?: AbortSignal) =>
  http<AiChatResponse>("/ai/guest-chat", {
    method: "POST",
    body: JSON.stringify({ messages: messages.slice(-10) }),
    signal,
  });
