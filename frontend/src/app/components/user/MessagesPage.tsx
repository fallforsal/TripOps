import { useState } from "react";
import {
  MessageSquare,
  Send,
  Search,
  Building2,
  Paperclip,
  Check,
  CheckCheck,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { PageHeader } from "@/app/components/customer/PageHeader";

interface ChatMessage {
  id: string;
  sender: "user" | "agency";
  content: string;
  time: string;
  status: "sent" | "delivered" | "failed";
}

interface Conversation {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyAvatar?: string;
  tourName?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

const initialConversations: Conversation[] = [
  {
    id: "conv-1",
    agencyId: "company-1",
    agencyName: "Viettravel",
    tourName: "Hành Trình Di Sản Miền Trung: Huế - Hội An - Đà Nẵng 4N3Đ",
    lastMessage: "Chúng tôi đã gửi hợp đồng và danh sách xe Limousine đón đoàn.",
    lastMessageTime: "10:30",
    unreadCount: 0,
    messages: [
      {
        id: "m-1",
        sender: "user",
        content: "Chào Viettravel, đoàn FPT dự kiến có 24 khách khởi hành ngày 20/11. Nhờ công ty tư vấn xe đưa đón từ sân bay Đà Nẵng.",
        time: "09:15",
        status: "delivered",
      },
      {
        id: "m-2",
        sender: "agency",
        content: "Xin chào quý khách! Viettravel đã bố trí xe Universe 35 chỗ cao cấp riêng cho đoàn để đảm bảo rộng rãi và tiện để hành lý.",
        time: "09:20",
        status: "delivered",
      },
      {
        id: "m-3",
        sender: "user",
        content: "Khách sạn đêm thứ 2 tại Huế đã chốt view sông Hương như thỏa thuận chưa?",
        time: "10:00",
        status: "delivered",
      },
      {
        id: "m-4",
        sender: "agency",
        content: "Chúng tôi đã gửi hợp đồng và danh sách xe Limousine đón đoàn. Khách sạn Hương Giang 4 sao view sông Hương đã được giữ chỗ ưu tiên.",
        time: "10:30",
        status: "delivered",
      },
    ],
  },
  {
    id: "conv-2",
    agencyId: "company-4",
    agencyName: "Hà Giang Discovery Travel",
    tourName: "Hoàng Su Phì – Ruộng Bậc Thang Mùa Lúa Chín 3N2Đ",
    lastMessage: "Thời tiết tuần tới tại Hoàng Su Phì rất đẹp, lúa đang chín vàng rực rỡ.",
    lastMessageTime: "Hôm qua",
    unreadCount: 0,
    messages: [
      {
        id: "m-201",
        sender: "user",
        content: "Cho mình hỏi cung đường đi Hoàng Su Phì mùa này xe 29 chỗ đi có thuận tiện không?",
        time: "14:10",
        status: "delivered",
      },
      {
        id: "m-202",
        sender: "agency",
        content: "Chào bạn, cung đường đã được làm mới, xe 29 chỗ vào tận bản thoải mái nhé.",
        time: "14:25",
        status: "delivered",
      },
      {
        id: "m-203",
        sender: "agency",
        content: "Thời tiết tuần tới tại Hoàng Su Phì rất đẹp, lúa đang chín vàng rực rỡ.",
        time: "15:00",
        status: "delivered",
      },
    ],
  },
];

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState<string>("conv-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");

  const activeConversation = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.agencyName.toLowerCase().includes(q) || (c.tourName || "").toLowerCase().includes(q);
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      content: inputText.trim(),
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      status: "delivered",
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              lastMessage: newMsg.content,
              lastMessageTime: newMsg.time,
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );

    setInputText("");
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      <PageHeader
        title="Tin nhắn trao đổi"
        subtitle="Trao đổi trực tiếp với các đơn vị lữ hành về lịch trình, dịch vụ và hỗ trợ chuyến đi"
      />

      {/* 2-Column Desktop Layout */}
      <div className="bg-white border border-[#CBD5E1] rounded-[6px] grid grid-cols-1 md:grid-cols-12 h-[650px] overflow-hidden">
        {/* Left Column: Conversations List (4 cols) */}
        <div className="md:col-span-4 border-r border-[#CBD5E1] flex flex-col h-full bg-[#F8FAFC]">
          {/* Search */}
          <div className="p-3 border-b border-[#CBD5E1] bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm hội thoại, đơn vị..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9]">
            {filteredConversations.map((c) => {
              const isSelected = c.id === activeConversation?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                    isSelected ? "bg-white border-l-4 border-l-[#075985]" : "hover:bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-[4px] bg-[#075985] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {c.agencyName.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#0F172A] truncate">
                        {c.agencyName}
                      </h4>
                      <span className="text-[10px] text-[#94A3B8] shrink-0">
                        {c.lastMessageTime}
                      </span>
                    </div>

                    {c.tourName && (
                      <p className="text-[11px] text-[#075985] font-medium truncate mt-0.5">
                        {c.tourName}
                      </p>
                    )}

                    <p className="text-xs text-[#475569] truncate mt-1">
                      {c.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chat Window (8 cols) */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[#CBD5E1] flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[4px] bg-[#075985] text-white flex items-center justify-center font-bold text-xs">
                    {activeConversation.agencyName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      {activeConversation.agencyName}
                    </h3>
                    {activeConversation.tourName && (
                      <p className="text-xs text-[#475569] truncate max-w-md">
                        {activeConversation.tourName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
                {activeConversation.messages.map((m) => {
                  const isUser = m.sender === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[75%] ${
                        isUser ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div
                        className={`p-3 rounded-[6px] text-xs leading-relaxed ${
                          isUser
                            ? "bg-[#075985] text-white rounded-br-none"
                            : "bg-white text-[#0F172A] border border-[#CBD5E1] rounded-bl-none"
                        }`}
                      >
                        {m.content}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] mt-1 px-1">
                        <span>{m.time}</span>
                        {isUser && <Check className="w-3 h-3 text-[#075985]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-[#CBD5E1] bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Nhập nội dung tin nhắn gửi công ty lữ hành..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 h-10 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                />

                <Button
                  type="submit"
                  className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-10 px-4 rounded-[6px] font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi</span>
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#94A3B8]">
              Chọn một cuộc hội thoại để xem nội dung
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
