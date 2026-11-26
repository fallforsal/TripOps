import { useEffect, useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useChat } from "@/app/contexts/ChatContext";
import { ChatWidget } from "@/app/components/chat/ChatPanel";
import { GuestAssistantWindow } from "./GuestAssistantWindow";
import "./assistant.css";

/**
 * Cụm nút tròn cố định góc dưới bên phải, dùng chung cho mọi trang:
 *  - Trên: Trợ lý AI (ẩn với Admin và Provider).
 *  - Dưới: Tin nhắn (chỉ khi đã đăng nhập; vẫn hiện khi chưa có hội thoại).
 * Vị trí từng nút cố định (không nhảy khi đổi role/chuyển trang). Mỗi lúc chỉ mở một cửa sổ,
 * cửa sổ mở bên trái cụm nút nên không che nút.
 */
export function FloatingAssistants() {
  const { user, loading } = useAuth();
  const chat = useChat();
  const [aiOpen, setAiOpen] = useState(false);
  const loggedIn = !loading && !!user;
  const aiEnabled = !loading && user?.role !== "admin" && user?.role !== "provider";

  // Tin nhắn được mở từ chỗ khác (nút "Nhắn tin" trong trang, header) thì đóng cửa sổ AI.
  useEffect(() => {
    if (chat.panelOpen) setAiOpen(false);
  }, [chat.panelOpen]);

  useEffect(() => {
    if (!aiEnabled) setAiOpen(false);
  }, [aiEnabled]);

  // Đăng xuất: đóng cửa sổ tin nhắn.
  useEffect(() => {
    if (!loggedIn) chat.setPanelOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const unread = loggedIn ? chat.conversations.reduce((total, c) => total + c.unreadCount, 0) : 0;
  const chatOpen = loggedIn && chat.panelOpen;
  const visibleAiOpen = aiEnabled && aiOpen;

  const toggleAi = () => {
    if (!aiOpen) chat.setPanelOpen(false);
    setAiOpen((open) => !open);
  };
  const toggleChat = () => {
    setAiOpen(false);
    chat.setPanelOpen(!chat.panelOpen);
  };

  return (
    <>
      <div className={`floating-dock${visibleAiOpen || chatOpen ? " has-open-window" : ""}`} role="group" aria-label={aiEnabled ? "Trợ lý AI và tin nhắn" : "Tin nhắn"}>
        {aiEnabled && (
          <button
            type="button"
            className={`floating-dock-button ai${aiOpen ? " is-active" : ""}`}
            onClick={toggleAi}
            aria-label={aiOpen ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
            aria-expanded={aiOpen}
            title="Trợ lý AI"
          >
            {aiOpen ? <X size={22} /> : <Sparkles size={22} />}
          </button>
        )}
        {loggedIn && (
          <button
            type="button"
            className={`floating-dock-button chat${chatOpen ? " is-active" : ""}`}
            onClick={toggleChat}
            aria-label={chatOpen ? "Đóng tin nhắn" : unread > 0 ? `Mở tin nhắn, ${unread} tin chưa đọc` : "Mở tin nhắn"}
            aria-expanded={chatOpen}
            title="Tin nhắn"
          >
            {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
            {unread > 0 && !chatOpen && <span className="floating-dock-badge">{unread > 99 ? "99+" : unread}</span>}
          </button>
        )}
      </div>
      {aiEnabled && <GuestAssistantWindow open={aiOpen} onClose={() => setAiOpen(false)} />}
      <ChatWidget />
    </>
  );
}
