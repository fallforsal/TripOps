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
  /**
   * ID danh sách tour gợi ý gần nhất (theo thứ tự đã hiển thị) để gửi lại ở lượt sau.
   * Máy chủ tự kiểm tra lại; rỗng = không còn danh sách nào.
   */
  contextTourIds?: number[] | null;
}

/**
 * UC-038: trợ lý cho Agency. Góp ý thiết kế tour (chỗ ở, ăn uống, lịch trình) thay vì tư vấn như khách mua tour.
 * Gửi kèm khung tour AI vừa soạn (nếu có) để trợ lý trả lời đúng tour đó.
 */
export const askAgencyAssistant = (
  messages: { role: AiRole; content: string }[],
  draft: import("@/app/services/wf02Tours").TourConfiguration | null,
  signal?: AbortSignal,
) =>
  http<AiChatResponse>("/agency/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages: messages.slice(-10), draft }),
    signal,
  });

/**
 * Hỏi trợ lý TripOps (không cần đăng nhập). Chỉ gửi nội dung hội thoại và ID các tour vừa gợi ý,
 * không gửi thông tin tài khoản hay dữ liệu tour (máy chủ tự tải lại tour theo ID).
 */
export const askGuestAssistant = (
  messages: { role: AiRole; content: string }[],
  contextTourIds: number[],
  signal?: AbortSignal,
) =>
  http<AiChatResponse>("/ai/guest-chat", {
    method: "POST",
    body: JSON.stringify({ messages: messages.slice(-10), contextTourIds: contextTourIds.slice(0, 8) }),
    signal,
  });

/**
 * Khách hàng đã đăng nhập: như trợ lý khách vãng lai, máy chủ tự thêm dữ liệu đơn của chính tài khoản đang đăng nhập
 * để trả lời "đơn của tôi" (trạng thái, thanh toán, hợp đồng, phí hủy). Frontend không gửi dữ liệu đơn.
 */
export const askCustomerAssistant = (
  messages: { role: AiRole; content: string }[],
  contextTourIds: number[],
  signal?: AbortSignal,
) =>
  http<AiChatResponse>("/ai/customer-chat", {
    method: "POST",
    body: JSON.stringify({ messages: messages.slice(-10), contextTourIds: contextTourIds.slice(0, 8) }),
    signal,
  });
