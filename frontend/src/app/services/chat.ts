import { http } from '@/app/lib/http';
import type { ApiTour } from './wf02Tours';
export interface ChatContact { id: string; name: string; businessName?: string | null; role?: string | null; avatar?: string | null }
export interface ChatContextInput { kind: 'tour' | 'service' | 'booking' | 'design-request'; id: number; version?: number }
export interface ChatBusinessContext extends ChatContextInput { title: string; thumbnailUrl?: string | null; subtitle?: string | null }
export interface ChatMessage { id: number; conversationId: number; senderId: string; content: string; createdAt: string | null; readAt: string | null; clientMessageId: string | null; context?: ChatBusinessContext | null }
export interface Conversation { id: number; contact: ChatContact; lastMessage: ChatMessage | null; unreadCount: number }
export interface MessagePage { items: ChatMessage[]; nextCursor: number | null }
export interface ReadReceipt { conversationId: number; userId: string; throughMessageId: number; readAt: string }
const root = '/chat/conversations';
export const chatApi = {
  list: () => http<Conversation[]>(root),
  create: (userId: string) => http<{id: number; contact: ChatContact}>(root, { method: 'POST', body: JSON.stringify({userId}) }),
  tour: (id: number, messageId: number, signal?: AbortSignal) => http<ApiTour>(`${root}/${id}/messages/${messageId}/tour`, {signal}),
  history: (id: number, cursor?: number) => http<MessagePage>(`${root}/${id}/messages?limit=50${cursor ? `&cursor=${cursor}` : ''}`),
  send: (id: number, content: string, clientMessageId: string, context?: ChatContextInput) => http<ChatMessage>(`${root}/${id}/messages`, {method:'POST', body:JSON.stringify({content, clientMessageId, context})}),
  read: (id: number, throughMessageId: number) => http<ReadReceipt>(`${root}/${id}/read`, {method:'PATCH', body:JSON.stringify({throughMessageId})}),
};
