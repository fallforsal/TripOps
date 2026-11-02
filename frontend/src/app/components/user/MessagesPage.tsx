import {
  MessageSquare,
  Send,
  Clock,
  Check,
  CheckCheck,
} from "lucide-react";
import { useState } from "react";

interface Message {
  id: string;
  providerId: string;
  providerName: string;
  providerType: "hotel" | "restaurant" | "transport";
  messages: ChatMessage[];
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

interface ChatMessage {
  id: string;
  sender: "user" | "provider";
  content: string;
  time: string;
  read: boolean;
}

const mockMessages: Message[] = [
  {
    id: "msg-1",
    providerId: "provider-1",
    providerName: "Khách sạn Đà Lạt Palace",
    providerType: "hotel",
    lastMessage:
      "Cảm ơn bạn đã đặt phòng. Chúng tôi sẽ chuẩn bị phòng tốt nhất!",
    lastMessageTime: "10:30",
    unread: 2,
    messages: [
      {
        id: "chat-1",
        sender: "user",
        content: "Xin chào, tôi muốn hỏi về phòng deluxe",
        time: "09:15",
        read: true,
      },
      {
        id: "chat-2",
        sender: "provider",
        content:
          "Xin chào! Phòng deluxe của chúng tôi có view hồ Xuân Hương rất đẹp. Bạn muốn đặt ngày nào ạ?",
        time: "09:20",
        read: true,
      },
      {
        id: "chat-3",
        sender: "user",
        content:
          "Tôi muốn đặt từ 25/1 đến 27/1. Giá bao nhiêu vậy?",
        time: "09:25",
        read: true,
      },
      {
        id: "chat-4",
        sender: "provider",
        content:
          "Giá phòng là 1.500.000đ/đêm. Có bao gồm ăn sáng buffet. Bạn có muốn đặt không ạ?",
        time: "10:00",
        read: true,
      },
      {
        id: "chat-5",
        sender: "user",
        content: "Vâng, tôi muốn đặt. Cảm ơn!",
        time: "10:15",
        read: true,
      },
      {
        id: "chat-6",
        sender: "provider",
        content:
          "Cảm ơn bạn đã đặt phòng. Chúng tôi sẽ chuẩn bị phòng tốt nhất!",
        time: "10:30",
        read: false,
      },
    ],
  },
  {
    id: "msg-2",
    providerId: "provider-2",
    providerName: "Nhà hàng Hải Sản Biển Xanh",
    providerType: "restaurant",
    lastMessage:
      "Set menu hải sản của chúng tôi rất tươi ngon!",
    lastMessageTime: "Hôm qua",
    unread: 0,
    messages: [
      {
        id: "chat-7",
        sender: "user",
        content: "Nhà hàng có set menu cho 4 người không?",
        time: "Hôm qua 14:00",
        read: true,
      },
      {
        id: "chat-8",
        sender: "provider",
        content:
          "Có ạ! Set menu hải sản của chúng tôi rất tươi ngon!",
        time: "Hôm qua 14:30",
        read: true,
      },
    ],
  },
  {
    id: "msg-3",
    providerId: "provider-3",
    providerName: "Xe du lịch Phương Nam",
    providerType: "transport",
    lastMessage: "Chúng tôi sẽ đón bạn đúng giờ!",
    lastMessageTime: "2 ngày trước",
    unread: 0,
    messages: [
      {
        id: "chat-9",
        sender: "user",
        content: "Xe limousine có đón tận nhà không?",
        time: "2 ngày trước 08:00",
        read: true,
      },
      {
        id: "chat-10",
        sender: "provider",
        content: "Có ạ! Chúng tôi sẽ đón bạn đúng giờ!",
        time: "2 ngày trước 08:15",
        read: true,
      },
    ],
  },
];

export function MessagesPage() {
  const [selectedMessage, setSelectedMessage] =
    useState<Message | null>(mockMessages[0]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedMessage) return;

    // In real app, send message to server
    alert(`Tin nhắn đã gửi: "${newMessage}"`);
    setNewMessage("");
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case "hotel":
        return "🏨";
      case "restaurant":
        return "🍽️";
      case "transport":
        return "🚐";
      default:
        return "💼";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tin nhắn
              </h1>
              <p className="text-gray-600">
                Trao đổi với các cơ sở lưu trú và dịch vụ
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 h-[600px]">
            {/* Conversations List */}
            <div className="md:col-span-1 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">
                  Cuộc trò chuyện ({mockMessages.length})
                </h3>
              </div>

              <div className="divide-y divide-gray-200">
                {mockMessages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedMessage?.id === msg.id
                        ? "bg-[#F0F9FF] border-l-4 border-[#075985]"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">
                        {getProviderIcon(msg.providerType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {msg.providerName}
                          </h4>
                          {msg.unread > 0 && (
                            <span className="px-2 py-1 bg-[#075985] text-white text-xs font-bold rounded-full">
                              {msg.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {msg.lastMessage}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {msg.lastMessageTime}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="md:col-span-2 flex flex-col">
              {selectedMessage ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">
                        {getProviderIcon(
                          selectedMessage.providerType,
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedMessage.providerName}
                        </h3>
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Đang hoạt động
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedMessage.messages.map((chat) => (
                      <div
                        key={chat.id}
                        className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                            chat.sender === "user"
                              ? "bg-[#075985] text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">
                            {chat.content}
                          </p>
                          <div
                            className={`flex items-center gap-1 mt-1 justify-end text-xs ${
                              chat.sender === "user"
                                ? "text-blue-100"
                                : "text-gray-500"
                            }`}
                          >
                            <span>{chat.time}</span>
                            {chat.sender === "user" &&
                              (chat.read ? (
                                <CheckCheck className="w-4 h-4" />
                              ) : (
                                <Check className="w-4 h-4" />
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) =>
                          setNewMessage(e.target.value)
                        }
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          handleSendMessage()
                        }
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-3 bg-[#075985] text-white rounded-xl hover:bg-[#F97316] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-5 h-5" />
                        <span className="hidden sm:inline">
                          Gửi
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4" />
                    <p>Chọn một cuộc trò chuyện để bắt đầu</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}