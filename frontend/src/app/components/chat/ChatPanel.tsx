import { useEffect, useId, useRef, useState } from 'react';
import { Alert, Badge, Button, Drawer, Input, Select, Spin } from 'antd';
import { ArrowDown, ArrowLeft, Check, CheckCheck, MessageCircle, PencilLine, Search, Send, X } from 'lucide-react';
import { HubConnectionState } from '@microsoft/signalr';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { chatApi, type ChatContact, type ChatMessage, type ReadReceipt } from '../../services/chat';
import { mergeMessages, chatTime } from '../../lib/chatMessages';
import './chat.css';
const merge = mergeMessages;
function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(-2).map(word => Array.from(word)[0]).join('');
  return <span className="chat-avatar" aria-hidden="true">{initials.toLocaleUpperCase('vi') || '?'}</span>;
}
export function ChatPanel() {
  const { user } = useAuth();
  const chat = useChat();
  const viewId = useId();
  useEffect(() => chat.registerView(viewId), [chat.registerView, viewId]);
  const [query, setQuery] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [rows, setRows] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false), [sending, setSending] = useState(false);
  const [content, setContent] = useState(''), [error, setError] = useState('');
  const [atBottom, setAtBottom] = useState(true), [visible, setVisible] = useState(document.visibilityState === 'visible' && document.hasFocus());
  const historyVersion = useRef(0);
  const scroll = useRef<HTMLDivElement>(null), bottom = useRef(true), pending = useRef<{id:number; content:string; key:string} | null>(null);
  const current = chat.conversations.find(c => c.id === selected);
  useEffect(() => { let active = true; chatApi.contacts().then(c => {if(active) setContacts(c);}).catch(e => {if(active) setError(e.message);}); return () => {active=false;}; }, [chat.sync, retry]);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible' && document.hasFocus());
    document.addEventListener('visibilitychange',update); window.addEventListener('focus',update); window.addEventListener('blur',update);
    return () => {document.removeEventListener('visibilitychange',update); window.removeEventListener('focus',update); window.removeEventListener('blur',update);};
  }, []);
  useEffect(() => {setContent('');pending.current=null;},[selected]);
  useEffect(() => {setSelected(null);},[user?.id]);
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
    if (!selected || !last || !visible || !atBottom || !unreadVisible || loading || chat.activeView !== viewId) return;
    let active = true;
    chatApi.read(selected,last).then(receipt => { if(active) setRows(old => old.map(m => m.senderId !== user?.id && m.id <= receipt.throughMessageId ? {...m,readAt:receipt.readAt} : m)); void chat.refresh(); })
      .catch(e => {if(active) setError(e.message);});
    return () => {active=false;};
  }, [selected,last,visible,atBottom,unreadVisible,loading,chat.activeView,viewId]);
  async function create(id: string) {
    setCreating(true);
    setError('');
    try {
      const conversation = await chatApi.create(id);
      await chat.refresh();
      setSelected(conversation.id);
      setShowContacts(false);
      setQuery('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }
  async function older() {
    if(!selected || !cursor || loading) return;
    setLoading(true);const height=scroll.current?.scrollHeight ?? 0, top=scroll.current?.scrollTop ?? 0; const id=selected, version=historyVersion.current;
    try {const page=await chatApi.history(id,cursor);if(version !== historyVersion.current) return;setRows(old => merge(page.items,old));setCursor(page.nextCursor);requestAnimationFrame(() => {if(scroll.current) scroll.current.scrollTop=scroll.current.scrollHeight-height+top;});}
    catch(e) {if(version === historyVersion.current) setError((e as Error).message);} finally {if(version === historyVersion.current) setLoading(false);}
  }
  async function send() {
    if(!selected || !content.trim() || sending) return;
    const text=content.trim();
    const attempt=pending.current?.id===selected && pending.current.content===text ? pending.current : {id:selected,content:text,key:crypto.randomUUID()};
    pending.current=attempt; setSending(true);setError('');
    try {const message=await chatApi.send(attempt.id,text,attempt.key);setRows(old => merge(old,[message]));setContent('');pending.current=null;bottom.current=true;setAtBottom(true);await chat.refresh();}
    catch(e) {setError(`${(e as Error).message} Bấm Gửi để thử lại với cùng mã tin nhắn.`);} finally {setSending(false);}
  }
  if (!user) return null;

  const search = query.trim().toLocaleLowerCase('vi');
  const conversations = chat.conversations.filter(conversation =>
    conversation.contact.name.toLocaleLowerCase('vi').includes(search));
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
            <Button
              className="chat-compose-button"
              icon={showContacts ? <X size={16} /> : <PencilLine size={16} />}
              aria-label={showContacts ? 'Đóng chọn liên hệ' : 'Tin nhắn mới'}
              aria-expanded={showContacts}
              title="Tin nhắn mới"
              onClick={() => setShowContacts(open => !open)}
            />
          </div>
          <span className="chat-connection" role="status" data-connected={chat.status === 'Đã kết nối'}>
            <span aria-hidden="true" />
            {chat.status}
          </span>
          <Input
            className="chat-search"
            prefix={<Search size={16} />}
            placeholder="Tìm theo tên"
            aria-label="Tìm hội thoại theo tên"
            allowClear
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
          {showContacts && (
            <Select<string>
              className="chat-contact-picker"
              aria-label="Chọn người nhận"
              placeholder="Chọn người nhận"
              showSearch
              optionFilterProp="label"
              disabled={creating || sending}
              loading={creating}
              options={contacts.map(contact => ({ value: contact.id, label: contact.name }))}
              onChange={id => { if (id) void create(id); }}
              notFoundContent="Không tìm thấy người nhận"
            />
          )}
          {problem && selected === null && <Alert type="error" showIcon message={problem} action={retryButton} />}
        </div>
        <div className="chat-conversations">
          {conversations.map(conversation => (
            <button
              type="button"
              className="chat-conversation"
              aria-current={conversation.id === selected ? 'true' : undefined}
              key={conversation.id}
              disabled={sending || creating}
              onClick={() => setSelected(conversation.id)}
            >
              <Avatar name={conversation.contact.name} />
              <span className="chat-conversation-detail">
                <strong>{conversation.contact.name}</strong>
                <span>{conversation.lastMessage?.content || 'Chưa có tin nhắn'}</span>
                {conversation.lastMessage && <small>{chatTime(conversation.lastMessage.createdAt)}</small>}
              </span>
              {conversation.unreadCount > 0 && <Badge count={conversation.unreadCount} color="#087c73" />}
            </button>
          ))}
          {!conversations.length && (
            <div className="chat-list-empty">
              {search ? 'Không tìm thấy hội thoại.' : 'Chưa có cuộc trò chuyện.'}
              {!search && !showContacts && (
                <button type="button" onClick={() => setShowContacts(true)}>Chọn người nhận</button>
              )}
            </div>
          )}
        </div>
      </aside>

      <section className="chat-thread" aria-label="Nội dung hội thoại">
        {selected === null ? (
          <div className="chat-empty">
            <span className="chat-empty-icon"><MessageCircle size={34} strokeWidth={1.5} /></span>
            <h3>Chọn một cuộc trò chuyện</h3>
            <p>Chọn hội thoại bên trái hoặc gửi tin nhắn mới.</p>
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
              <Avatar name={current?.contact.name || '?'} />
              <h3>{current?.contact.name || 'Cuộc trò chuyện'}</h3>
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
                      <div className="chat-bubble">{message.content}</div>
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
              <Button type="primary" htmlType="submit" icon={<Send size={16} />} loading={sending} disabled={!content.trim()}>Gửi</Button>
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
      <div className="chat-launcher"><ChatButton /></div>
      <Drawer
        className="chat-drawer"
        title="Hộp thư"
        open={chat.panelOpen}
        onClose={() => chat.setPanelOpen(false)}
        width="min(880px, 100vw)"
        styles={{ body: { padding: 0, overflow: 'hidden' } }}
        destroyOnHidden
      >
        {chat.panelOpen && <ChatPanel />}
      </Drawer>
    </>
  );
}
