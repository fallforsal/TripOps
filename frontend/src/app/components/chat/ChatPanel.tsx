import { useEffect, useId, useRef, useState } from 'react';
import { Alert, Badge, Button, Input, Spin } from 'antd';
import { ArrowDown, ArrowLeft, Check, CheckCheck, MessageCircle, Minus, Search, Send, X } from 'lucide-react';
import { HubConnectionState } from '@microsoft/signalr';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { chatApi, type ChatMessage, type ReadReceipt, type ChatBusinessContext } from '../../services/chat';
import { mergeMessages, chatTime } from '../../lib/chatMessages';
import { chatContactName, chatRoleLabel, chatContextLabel, chatContextIdentity, chatContactMatches } from '../../lib/chatPresentation';
import './chat.css';
import { ChatTourPreview } from './ChatTourPreview';
const merge = mergeMessages;
function Avatar({ name, image }: { name: string; image?: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  const initials = name.trim().split(/\s+/).slice(-2).map(word => Array.from(word)[0]).join('');
  return <span className="chat-avatar" aria-hidden="true">{image && !failed ? <img src={image} alt="" onError={() => setFailed(true)} /> : initials.toLocaleUpperCase('vi') || '?'}</span>;
}
function BusinessCard({ context, onRemove, onOpen }: { context: ChatBusinessContext; onRemove?: () => void; onOpen?: () => void }) {
  const details = <>
    {context.thumbnailUrl && <img src={context.thumbnailUrl} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}
    <div><small>{chatContextLabel(context.kind)}{context.version ? ` · v${context.version}` : ''}</small><strong>{context.title}</strong>{context.subtitle && <span>{context.subtitle}</span>}{onOpen && <small className="chat-card-action">Xem chi tiết tour ↗</small>}</div>
  </>;
  return <article className="chat-business-card">
    {onOpen ? <button type="button" className="chat-card-open" onClick={onOpen} aria-label={`Xem thông tin tour ${context.title}`}>{details}</button> : details}
    {onRemove && <button type="button" aria-label="Bỏ thông tin đính kèm" onClick={onRemove}><X size={15}/></button>}
  </article>;
}
export function ChatPanel({ active: isActive = true }: { active?: boolean } = {}) {
  const { user } = useAuth();
  const chat = useChat();
  const viewId = useId();
  useEffect(() => { if (isActive) return chat.registerView(viewId); }, [chat.registerView, viewId, isActive]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(chat.composeRequest?.id ?? null);
  const previousUser = useRef(user?.id);
  const [rows, setRows] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false), [sending, setSending] = useState(false);
  const [content, setContent] = useState(''), [error, setError] = useState('');
  const [atBottom, setAtBottom] = useState(true), [visible, setVisible] = useState(document.visibilityState === 'visible' && document.hasFocus());
  const historyVersion = useRef(0);
  const scroll = useRef<HTMLDivElement>(null), bottom = useRef(true), pending = useRef<{id:number; content:string; key:string; contextKey:string} | null>(null);
  const currentContact = chat.conversations.find(c => c.id === selected)?.contact ?? (chat.composeRequest?.id === selected ? chat.composeRequest.contact : undefined);
  const draftContext = chat.composeRequest?.id === selected ? chat.composeRequest.context : undefined;
  useEffect(() => {
    if (chat.composeRequest) { setSelected(chat.composeRequest.id); }
  }, [chat.composeRequest?.nonce]);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible' && document.hasFocus());
    document.addEventListener('visibilitychange',update); window.addEventListener('focus',update); window.addEventListener('blur',update);
    return () => {document.removeEventListener('visibilitychange',update); window.removeEventListener('focus',update); window.removeEventListener('blur',update);};
  }, []);
  useEffect(() => {setContent('');pending.current=null;},[selected]);
  useEffect(() => { if (previousUser.current !== user?.id) { setSelected(null); previousUser.current = user?.id; } }, [user?.id]);
  useEffect(() => {
    let active = true;
    ++historyVersion.current;
    setLoading(false);
    setRows([]); setCursor(null); setError(''); bottom.current = true; setAtBottom(true);
    if (selected === null) return;
    setLoading(true);
    chatApi.history(selected).then(page => {if(active) {setRows(old => merge(page.items,old));setCursor(page.nextCursor);}})
      .catch(e => {if(active) setError(e.message);}).finally(() => {if(active) setLoading(false);});
    if (chat.connection?.state === HubConnectionState.Connected) void chat.connection.invoke('JoinConversation',selected).catch(e => {if(active) setError(e.message);});
    return () => { active=false; if(chat.connection?.state === HubConnectionState.Connected) void chat.connection.invoke('LeaveConversation',selected).catch(() => {}); };
  }, [selected, chat.sync, chat.connection, retry]);
  useEffect(() => {
    const connection = chat.connection;
    if (!connection || selected === null) return;
    // Functional updates consume every event, including several messages in one React batch.
    const receive = (message: ChatMessage) => {
      if (message.conversationId === selected) setRows(old => merge(old, [message]));
    };
    const read = (receipt: ReadReceipt) => {
      if (receipt.conversationId === selected) setRows(old => old.map(m =>
        m.senderId !== receipt.userId && m.id <= receipt.throughMessageId ? {...m, readAt:receipt.readAt} : m));
    };
    connection.on('ReceiveMessage', receive);
    connection.on('MessagesRead', read);
    return () => {connection.off('ReceiveMessage', receive); connection.off('MessagesRead', read);};
  }, [selected, chat.connection]);
  useEffect(() => { if (bottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [rows]);
  const last = rows.at(-1)?.id;
  const unreadVisible = rows.some(m => m.senderId !== user?.id && !m.readAt);
  useEffect(() => {
    if (!isActive || !selected || !last || !visible || !atBottom || !unreadVisible || loading || chat.activeView !== viewId) return;
    let active = true;
    chatApi.read(selected,last).then(receipt => { if(active) setRows(old => old.map(m => m.senderId !== user?.id && m.id <= receipt.throughMessageId ? {...m,readAt:receipt.readAt} : m)); void chat.refresh(); })
      .catch(e => {if(active) setError(e.message);});
    return () => {active=false;};
  }, [selected,last,visible,atBottom,unreadVisible,loading,chat.activeView,viewId,isActive]);
  async function older() {
    if(!selected || !cursor || loading) return;
    setLoading(true);const height=scroll.current?.scrollHeight ?? 0, top=scroll.current?.scrollTop ?? 0; const id=selected, version=historyVersion.current;
    try {const page=await chatApi.history(id,cursor);if(version !== historyVersion.current) return;setRows(old => merge(page.items,old));setCursor(page.nextCursor);requestAnimationFrame(() => {if(scroll.current) scroll.current.scrollTop=scroll.current.scrollHeight-height+top;});}
    catch(e) {if(version === historyVersion.current) setError((e as Error).message);} finally {if(version === historyVersion.current) setLoading(false);}
  }
  async function send() {
    if(!selected || (!content.trim() && !draftContext) || sending) return;
    const text=content.trim(); const contextKey=chatContextIdentity(draftContext);
    const attempt=pending.current?.id===selected && pending.current.content===text && pending.current.contextKey===contextKey ? pending.current : {id:selected,content:text,key:crypto.randomUUID(),contextKey};
    pending.current=attempt; setSending(true);setError('');
    try {const message=await chatApi.send(attempt.id,text,attempt.key,draftContext);setRows(old => merge(old,[message]));setContent('');chat.dismissContext();pending.current=null;bottom.current=true;setAtBottom(true);await chat.refresh();}
    catch(e) {setError(`${(e as Error).message} Bấm Gửi để thử lại với cùng mã tin nhắn.`);} finally {setSending(false);}
  }
  if (!user) return null;

  const search = query.trim().toLocaleLowerCase('vi');
  const conversations = chat.conversations.filter(conversation =>
    conversation.lastMessage && chatContactMatches(conversation.contact, search));
  const problem = error || chat.error;
  const retryButton = (
    <Button size="small" onClick={() => { void chat.refresh(); setRetry(value => value + 1); }}>
      Tải lại
    </Button>
  );

  return (
    <div className={`tripops-chat ${selected !== null ? 'has-selection' : ''}`}>
      <aside className="chat-sidebar" aria-label="Danh sách hội thoại">
        <div className="chat-sidebar-top">
          <div className="chat-sidebar-heading">
            <h2>Tin nhắn</h2>

          </div>
          <span className="chat-connection" role="status" data-connected={chat.status === 'Đã kết nối'}>
            <span aria-hidden="true" />
            {chat.status}
          </span>
          <Input
            className="chat-search"
            prefix={<Search size={16} />}
            placeholder="Tìm cuộc trò chuyện…"
            aria-label="Tìm hội thoại theo tên"
            allowClear
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
          {problem && selected === null && <Alert type="error" showIcon message={problem} action={retryButton} />}
        </div>
        <div className="chat-conversations">
          {conversations.map(conversation => (
            <button
              type="button"
              className="chat-conversation"
              aria-current={conversation.id === selected ? 'true' : undefined}
              key={conversation.id}
              disabled={sending}
              onClick={() => setSelected(conversation.id)}
            >
              <Avatar name={chatContactName(conversation.contact)} image={conversation.contact.avatar} />
              <span className="chat-conversation-detail">
                <strong>{chatContactName(conversation.contact)}</strong><small className="chat-contact-role">{chatRoleLabel(conversation.contact.role)}</small>
                <span>{conversation.lastMessage?.content || conversation.lastMessage?.context?.title || 'Chưa có tin nhắn'}</span>
                {conversation.lastMessage && <small>{chatTime(conversation.lastMessage.createdAt)}</small>}
              </span>
              {conversation.unreadCount > 0 && <Badge count={conversation.unreadCount} color="#087c73" />}
            </button>
          ))}
          {!conversations.length && (
            <div className="chat-list-empty">
              {search ? 'Không tìm thấy hội thoại.' : 'Chưa có cuộc trò chuyện.'}
              {!search && <p>Mở tour hoặc bài dịch vụ và bấm Tin nhắn để bắt đầu.</p>}
            </div>
          )}
        </div>
      </aside>

      <section className="chat-thread" aria-label="Nội dung hội thoại">
        {selected === null ? (
          <div className="chat-empty">
            <span className="chat-empty-icon"><MessageCircle size={34} strokeWidth={1.5} /></span>
            <h3>Chọn một cuộc trò chuyện</h3>
            <p>Chọn hội thoại bên trái để tiếp tục trao đổi.</p>
          </div>
        ) : (
          <>
            <div className="chat-thread-header">
              <Button
                className="chat-back"
                type="text"
                icon={<ArrowLeft size={20} />}
                aria-label="Quay lại danh sách hội thoại"
                disabled={sending}
                onClick={() => setSelected(null)}
              />
              <Avatar name={currentContact ? chatContactName(currentContact) : '?'} image={currentContact?.avatar}/>
              <div><h3>{currentContact ? chatContactName(currentContact) : 'Cuộc trò chuyện'}</h3><small>{chatRoleLabel(currentContact?.role)}</small></div>
            </div>
            {problem && <Alert className="chat-thread-alert" type="error" showIcon message={problem} action={retryButton} />}
            <div className="chat-thread-body">
              <div className="chat-history" ref={scroll} onScroll={event => {
                const element = event.currentTarget;
                bottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 60;
                setAtBottom(bottom.current);
              }}>
                {cursor && <Button className="chat-older" size="small" disabled={loading} onClick={() => void older()}>Tải tin nhắn cũ</Button>}
                {loading && <div className="chat-loading"><Spin size="small" /></div>}
                {!loading && !rows.length && !problem && (
                  <div className="chat-empty">
                    <span className="chat-empty-icon"><MessageCircle size={30} strokeWidth={1.5} /></span>
                    <h3>Gửi lời chào đầu tiên</h3>
                  </div>
                )}
                {rows.map(message => {
                  const mine = message.senderId === user.id;
                  return (
                    <div key={message.id} className={`chat-message ${mine ? 'mine' : ''}`}>
                      <div className="chat-bubble">{message.context && <BusinessCard context={message.context} onOpen={message.context.kind === 'tour' ? () => { chat.setTourPreview({conversationId:message.conversationId,messageId:message.id}); chat.setPanelOpen(false); } : undefined}/>} {message.content && <span>{message.content}</span>}</div>
                      <small className="chat-message-meta">
                        {chatTime(message.createdAt)}
                        {mine && (
                          <span className="chat-receipt">
                            {message.readAt ? <CheckCheck size={13} /> : <Check size={13} />}
                            {message.readAt ? 'Đã đọc' : 'Đã gửi'}
                          </span>
                        )}
                      </small>
                    </div>
                  );
                })}
              </div>
              {!atBottom && rows.length > 0 && (
                <Button
                  className="chat-latest"
                  icon={<ArrowDown size={15} />}
                  onClick={() => {
                    bottom.current = true;
                    setAtBottom(true);
                    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
                  }}
                >
                  Tin mới nhất
                </Button>
              )}
            </div>
            {draftContext && <div className="chat-context-draft"><BusinessCard context={draftContext} onRemove={chat.dismissContext}/><small>Thông tin này sẽ được gửi cùng tin nhắn.</small></div>}
            <form className="chat-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
              <Input.TextArea
                aria-label="Nội dung tin nhắn"
                placeholder="Nhập tin nhắn…"
                value={content}
                maxLength={2000}
                disabled={sending}
                autoSize={{ minRows: 1, maxRows: 4 }}
                onChange={event => setContent(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <Button type="primary" htmlType="submit" icon={<Send size={16} />} loading={sending} disabled={!content.trim() && !draftContext}>Gửi</Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export function ChatButton() {
  const { user } = useAuth();
  const chat = useChat();
  if (!user) return null;
  const unreadCount = chat.conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  return (
    <Badge count={unreadCount}>
      <Button type="primary" icon={<MessageCircle size={17} />} onClick={() => chat.setPanelOpen(true)}>
        Tin nhắn
      </Button>
    </Badge>
  );
}

export function ChatWidget() {
  const { user } = useAuth();
  const chat = useChat();
  if (!user) return null;
  return (
    <>
      <section hidden={!chat.panelOpen} className="chat-floating-window" role="region" aria-label="Cửa sổ tin nhắn">
        <header className="chat-floating-header"><div><MessageCircle size={18}/><strong>Tin nhắn</strong></div><div>
          <button type="button" onClick={() => chat.setPanelOpen(false)} aria-label="Thu gọn tin nhắn" title="Thu gọn"><Minus size={19}/></button>
          <button type="button" onClick={() => chat.setPanelOpen(false)} aria-label="Đóng tin nhắn" title="Đóng"><X size={18}/></button>
        </div></header>
        <ChatPanel active={chat.panelOpen} />
      </section>
      {chat.tourPreview && <ChatTourPreview reference={chat.tourPreview} onClose={() => { chat.setTourPreview(null); chat.setPanelOpen(true); }} />}
    </>
  );
}
