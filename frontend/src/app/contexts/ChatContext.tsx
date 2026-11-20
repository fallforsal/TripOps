import { ConfigProvider } from 'antd';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { chatApi, type Conversation, type ChatBusinessContext, type ChatContact } from '../services/chat';
interface State {
  panelOpen: boolean; setPanelOpen: (open: boolean) => void; conversations: Conversation[]; error: string; status: string; sync: number;
  connection: HubConnection | null;
  refresh: () => Promise<void>; activeView: string | undefined; registerView: (id: string) => () => void;
  composeRequest: { id: number; contact: ChatContact; context?: ChatBusinessContext; nonce: number } | null;
  openChat: (userId: string, context?: ChatBusinessContext) => Promise<void>;
  dismissContext: () => void;
}
const ChatContext = createContext<State | null>(null);
export function ChatProvider({children}: {children: ReactNode}) {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Đang kết nối');
  const [sync, setSync] = useState(0);
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [views, setViews] = useState<string[]>([]);
  const [composeRequest, setComposeRequest] = useState<State['composeRequest']>(null);
  const dismissContext = useCallback(() => setComposeRequest(old => old ? { ...old, context: undefined } : old), []);
  const actorRef = useRef(user?.id);
  const composeSequence = useRef(0);
  actorRef.current = user?.id;
  const openChat = useCallback(async (userId: string, context?: ChatBusinessContext) => {
    const actor = actorRef.current;
    if (!actor) throw new Error('Vui lòng đăng nhập để nhắn tin.');
    if (!userId || userId === actor) throw new Error('Hãy chọn người nhận khác.');
    const result = await chatApi.create(userId);
    if (actorRef.current !== actor) return;
    await refreshRef.current();
    if (actorRef.current !== actor) return;
    setComposeRequest({ id: result.id, contact: result.contact, context, nonce: ++composeSequence.current });
    setPanelOpen(true);
  }, []);
  const registerView = useCallback((id: string) => {
    setViews(old => [...old.filter(v => v !== id), id]);
    return () => setViews(old => old.filter(v => v !== id));
  }, []);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    setPanelOpen(false); setConversations([]); setError(''); setComposeRequest(null);
    if (!user) return;
    let disposed = false, timer: ReturnType<typeof setTimeout> | undefined, sequence = 0;
    const hub = new HubConnectionBuilder()
      .withUrl(`${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/hubs/chat`, {withCredentials:true})
      .withAutomaticReconnect({nextRetryDelayInMilliseconds: c => Math.min(30000, 1000 * 2 ** Math.min(c.previousRetryCount, 5))})
      .configureLogging(LogLevel.None).build();
    const refresh = async () => {
      const request = ++sequence;
      try { const data = await chatApi.list(); if (!disposed && request === sequence) { setConversations(data); setError(''); } }
      catch(e) { if (!disposed && request === sequence) setError((e as Error).message); }
    };
    refreshRef.current = refresh;
    hub.on('ConversationUpdated', () => { void refresh(); });
    hub.onreconnecting(() => { if (!disposed) setStatus('Đang kết nối lại'); });
    hub.onreconnected(() => { if (!disposed) {setStatus('Đã kết nối'); setSync(v => v+1); void refresh();} });
    const start = async () => {
      if (disposed || hub.state !== HubConnectionState.Disconnected) return;
      clearTimeout(timer);
      try { await hub.start(); if (disposed) { await hub.stop(); return; } setStatus('Đã kết nối'); setSync(v => v+1); await refresh(); }
      catch { if (!disposed) { clearTimeout(timer); setStatus('Mất kết nối — đang thử lại'); timer = setTimeout(() => void start(), 5000); } }
    };
    hub.onclose(() => { if (!disposed) {clearTimeout(timer); timer = setTimeout(() => void start(), 5000);} });
    setConnection(hub); void refresh(); void start();
    return () => { disposed = true; clearTimeout(timer); refreshRef.current = async () => {}; hub.off('ConversationUpdated'); void hub.stop(); setConnection(null); };
  }, [user?.id]);
  return <ConfigProvider theme={{token:{colorPrimary:'#075985',borderRadius:8,fontFamily:'inherit'}}}><ChatContext.Provider value={{panelOpen,setPanelOpen,conversations,error,status,sync,connection,activeView:views.at(-1),registerView,composeRequest,openChat,dismissContext,refresh: () => refreshRef.current()}}>{children}</ChatContext.Provider></ConfigProvider>;
}
export function useChat() { const value = useContext(ChatContext); if (!value) throw new Error('ChatProvider required'); return value; }
