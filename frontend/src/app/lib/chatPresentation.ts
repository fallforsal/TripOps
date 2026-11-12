import type { ChatContact, ChatContextInput } from '../services/chat.ts';

export const chatContactName = (contact: ChatContact) => contact.businessName?.trim() || contact.name;
export const chatRoleLabel = (role?: string | null) => ({ TravelAgency: 'Agency', Provider: 'Nhà cung cấp',
  TourGuide: 'Hướng dẫn viên', Admin: 'Hỗ trợ TripOps', User: 'Khách hàng', Customer: 'Khách hàng' }[role || ''] || 'Liên hệ');
export const chatContextLabel = (kind: ChatContextInput['kind']) => ({ tour: 'Tour đang trao đổi', service: 'Dịch vụ đang trao đổi',
  booking: 'Đơn đặt tour', 'design-request': 'Yêu cầu thiết kế' }[kind]);
export const chatContextIdentity = (context?: ChatContextInput | null) => context ? `${context.kind}:${context.id}:${context.version ?? ''}` : '';
export const chatContactMatches = (contact: ChatContact, query: string) =>
  `${chatContactName(contact)} ${contact.name}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'));
