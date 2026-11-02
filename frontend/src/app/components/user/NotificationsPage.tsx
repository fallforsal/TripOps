import {
  Bell,
  Check,
  CheckCheck,
  Tag,
  MessageSquare,
  Calendar,
  Star,
  Trash2,
} from "lucide-react";
import { useState } from "react";

interface Notification {
  id: string;
  type:
    | "booking"
    | "promotion"
    | "message"
    | "review"
    | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    type: "booking",
    title: "Đặt tour thành công",
    message:
      'Tour "Đà Lạt Romantic 3N2Đ" của bạn đã được xác nhận. Hẹn gặp bạn ngày 25/01/2026!',
    time: "2 giờ trước",
    read: false,
  },
  {
    id: "notif-2",
    type: "promotion",
    title: "Khuyến mãi mới",
    message:
      "Giảm 20% cho tất cả tour Đà Lạt trong tháng 2! Sử dụng mã DALAT2026",
    time: "5 giờ trước",
    read: false,
  },
  {
    id: "notif-3",
    type: "message",
    title: "Tin nhắn mới từ Khách sạn Đà Lạt Palace",
    message:
      "Cảm ơn bạn đã đặt phòng. Chúng tôi sẽ chuẩn bị phòng tốt nhất!",
    time: "1 ngày trước",
    read: true,
  },
  {
    id: "notif-4",
    type: "review",
    title: "Nhắc nhở đánh giá",
    message:
      'Bạn đã hoàn thành tour "Phú Quốc Tropical 4N3Đ". Hãy chia sẻ trải nghiệm của bạn!',
    time: "2 ngày trước",
    read: true,
  },
  {
    id: "notif-5",
    type: "system",
    title: "Cập nhật hệ thống",
    message:
      "Chúng tôi đã cải thiện tính năng AI search để phục vụ bạn tốt hơn!",
    time: "3 ngày trước",
    read: true,
  },
];

export function NotificationsPage() {
  const [notifications, setNotifications] = useState(
    mockNotifications,
  );

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif,
      ),
    );
  };

  const markAllAsRead = () => {
    setNotifications(
      notifications.map((notif) => ({ ...notif, read: true })),
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(
      notifications.filter((notif) => notif.id !== id),
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Calendar className="w-6 h-6" />;
      case "promotion":
        return <Tag className="w-6 h-6" />;
      case "message":
        return <MessageSquare className="w-6 h-6" />;
      case "review":
        return <Star className="w-6 h-6" />;
      default:
        return <Bell className="w-6 h-6" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "booking":
        return "from-blue-500 to-blue-600";
      case "promotion":
        return "from-orange-500 to-pink-500";
      case "message":
        return "from-purple-500 to-purple-600";
      case "review":
        return "from-yellow-500 to-orange-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const unreadCount = notifications.filter(
    (n) => !n.read,
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Thông báo
                </h1>
                <p className="text-gray-600">
                  {unreadCount > 0
                    ? `${unreadCount} thông báo chưa đọc`
                    : "Tất cả đã đọc"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-xl p-5 shadow-md border-2 transition-all ${
                notif.read
                  ? "border-gray-200"
                  : "border-blue-500 bg-[#F0F9FF]/30"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getIconColor(notif.type)} flex items-center justify-center text-white flex-shrink-0`}
                >
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-[#075985] rounded-full flex-shrink-0 mt-2"></span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    {notif.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {notif.time}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="p-2 hover:bg-[#E0F2FE] rounded-lg transition-colors"
                      title="Đánh dấu đã đọc"
                    >
                      <Check className="w-4 h-4 text-[#075985]" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Không có thông báo nào
            </h3>
            <p className="text-gray-600">
              Bạn đã xem tất cả thông báo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}