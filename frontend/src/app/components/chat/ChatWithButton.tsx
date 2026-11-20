import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../lib/notifications';
import type { ChatBusinessContext } from '../../services/chat';

export function ChatWithButton({ userId, context, children = 'Nhắn tin', className = '', onRequireLogin }: {
  userId?: string | null; context?: ChatBusinessContext; children?: React.ReactNode; className?: string; onRequireLogin?: () => void;
}) {
  const { user } = useAuth();
  const { openChat } = useChat();
  const [busy, setBusy] = useState(false);
  if (!userId || user?.id === userId) return null;
  return <Button type="button" size="sm" variant="outline" className={`gap-1.5 border-sky-200 text-sky-800 hover:bg-sky-50 ${className}`} disabled={busy}
    onClick={async () => { if (!user && onRequireLogin) { onRequireLogin(); return; } setBusy(true); try { await openChat(userId, context); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không mở được cuộc trò chuyện.'); } finally { setBusy(false); } }}>
    <MessageCircle className="h-4 w-4" />{busy ? 'Đang mở…' : children}
  </Button>;
}
