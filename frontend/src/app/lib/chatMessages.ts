import type { ChatMessage } from '../services/chat';
/** Merge REST responses, retries and hub events without losing an earlier read receipt. */
export function mergeMessages(old: ChatMessage[], rows: ChatMessage[]): ChatMessage[] {
  const byId = new Map(old.map(m => [m.id, m]));
  for (const row of rows) {
    const previous = byId.get(row.id);
    byId.set(row.id, {...row, readAt: row.readAt ?? previous?.readAt ?? null});
  }
  return [...byId.values()].sort((a,b) => a.id-b.id);
}
export function chatTime(value: string | null): string {
  if (!value) return '';
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`).toLocaleString('vi-VN');
}
