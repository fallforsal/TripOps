import { http } from '@/app/lib/http';
export interface ChatContact { id: string; name: string }
export interface ChatMessage { id: number; conversationId: number; senderId: string; content: string; createdAt: string | null; readAt: string | null; clientMessageId: string | null }
export interface Conversation { id: number; contact: ChatContact; lastMessage: ChatMessage | null; unreadCount: number }
export interface MessagePage { items: ChatMessage[]; nextCursor: number | null }
export interface ReadReceipt { conversationId: number; userId: string; throughMessageId: number; readAt: string }
const root = '/chat/conversations';
export const chatApi = {
  contacts: () => http<ChatContact[]>('/chat/contacts'),
  list: () => http<Conversation[]>(root),
  create: (userId: string) => http<{id: number}>(root, { method: 'POST', body: JSON.stringify({userId}) }),
  history: (id: number, cursor?: number) => http<MessagePage>(`${root}/${id}/messages?limit=50${cursor ? `&cursor=${cursor}` : ''}`),
  send: (id: number, content: string, clientMessageId: string) => http<ChatMessage>(`${root}/${id}/messages`, {method:'POST', body:JSON.stringify({content, clientMessageId})}),
  read: (id: number, throughMessageId: number) => http<ReadReceipt>(`${root}/${id}/read`, {method:'PATCH', body:JSON.stringify({throughMessageId})}),
};
