import type { ChatBusinessContext } from "../services/chat";
// Internal, role-specific links only; no URL supplied by a chat message is trusted.
export function chatContextHref(context: ChatBusinessContext, role: string, conversationId: number, messageId: number) {
  const id = context.id;
  if (!Number.isSafeInteger(id) || id <= 0) return undefined;
  switch(context.kind) {
    case "tour": return `#/chat-tour/${conversationId}/${messageId}`;
    case "service": return role === "provider" ? `#/provider/detail/${id}` : `#/agency/services/${id}`;
    case "booking": return role === "provider" ? `#/provider/room-requests?bookingId=${id}` : role === "user" ? `#/my-bookings/${id}` : `#/agency/bookings/${id}`;
    case "design-request": return role === "user" ? `#/my-requests?requestId=${id}` : `#/agency/custom-requests?requestId=${id}`;
  }
}
