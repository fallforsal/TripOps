import { Tour, Booking, Service, User } from "@/app/types";
import {
  Package,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Map,
} from "lucide-react";

interface AdminDashboardOverviewProps {
  tours: Tour[];
  bookings: Booking[];
  services: Service[];
  guides: User[];
  guideSchedules: any[];
}

export function AdminDashboardOverview({
  tours,
  bookings,
  services,
  guides,
  guideSchedules,
}: AdminDashboardOverviewProps) {
  // Statistics
  const pendingBookings = bookings.filter(
    (b) => b.status === "pending",
  ).length;
  const confirmedBookings = bookings.filter(
    (b) => b.status === "confirmed",
  ).length;
  const completedBookings = bookings.filter(
    (b) => b.status === "completed",
  ).length;
  const cancelledBookings = bookings.filter(
    (b) => b.status === "cancelled",
  ).length;

  const pendingServices = services.filter(
    (s) => s.status === "pending",
  ).length;
  const approvedServices = services.filter(
    (s) => s.status === "approved",
  ).length;
  const rejectedServices = services.filter(
    (s) => s.status === "rejected",
  ).length;

  const activeTours = guideSchedules.length;
  const availableGuides = guides.length;

  const totalRevenue = bookings
    .filter(
      (b) =>
        b.status === "confirmed" || b.status === "completed",
    )
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Recent bookings
  const recentBookings = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.bookingDate).getTime() -
        new Date(a.bookingDate).getTime(),
    )
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-[#E0F2FE] text-blue-800",
      cancelled: "bg-red-100 text-red-800",
    };
    const labels = {
      pending: "Chờ duyệt",
      confirmed: "Đã xác nhận",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-[#075985] rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Chào mừng Admin!
        </h1>
        <p className="text-blue-100">
          Tổng quan hệ thống booking tour
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#E0F2FE] rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-[#075985]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {tours.length}
          </p>
          <p className="text-sm text-gray-600">Tổng số tour</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            {pendingBookings > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                {pendingBookings}
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {bookings.length}
          </p>
          <p className="text-sm text-gray-600">Tổng booking</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {formatPrice(totalRevenue)}
          </p>
          <p className="text-sm text-gray-600">Doanh thu</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#F97316]/15 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-[#F97316]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {availableGuides}
          </p>
          <p className="text-sm text-gray-600">
            Hướng dẫn viên
          </p>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Booking Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#075985]" />
            Trạng thái Booking
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Chờ duyệt
                </span>
              </div>
              <span className="font-bold text-yellow-600">
                {pendingBookings}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Đã xác nhận
                </span>
              </div>
              <span className="font-bold text-green-600">
                {confirmedBookings}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Hoàn thành
                </span>
              </div>
              <span className="font-bold text-[#075985]">
                {completedBookings}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Đã hủy
                </span>
              </div>
              <span className="font-bold text-red-600">
                {cancelledBookings}
              </span>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Trạng thái Dịch vụ
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Chờ duyệt
                </span>
              </div>
              <span className="font-bold text-yellow-600">
                {pendingServices}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Đã duyệt
                </span>
              </div>
              <span className="font-bold text-green-600">
                {approvedServices}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Từ chối
                </span>
              </div>
              <span className="font-bold text-red-600">
                {rejectedServices}
              </span>
            </div>
          </div>
        </div>

        {/* Active Tours */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Map className="w-5 h-5 text-[#F97316]" />
            Tour đang diễn ra
          </h3>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-[#F97316] mb-2">
              {activeTours}
            </p>
            <p className="text-sm text-gray-600">
              Tour đang được hướng dẫn
            </p>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#075985]" />
          Booking gần đây
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Khách hàng
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Tour
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Ngày đặt
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Số khách
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Tổng tiền
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {booking.userName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {booking.userEmail}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">
                      {booking.tour.name}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {booking.bookingDate}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {booking.numberOfGuests}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                    {formatPrice(booking.totalPrice)}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(booking.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-xl transition-shadow">
          <AlertCircle className="w-8 h-8 mb-3" />
          <h3 className="font-bold mb-1">Cần xử lý</h3>
          <p className="text-blue-100 text-sm mb-3">
            {pendingBookings} booking chờ duyệt
          </p>
          <button className="text-sm font-semibold underline">
            Xem ngay →
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-xl transition-shadow">
          <CheckCircle className="w-8 h-8 mb-3" />
          <h3 className="font-bold mb-1">Dịch vụ mới</h3>
          <p className="text-purple-100 text-sm mb-3">
            {pendingServices} dịch vụ chờ duyệt
          </p>
          <button className="text-sm font-semibold underline">
            Kiểm duyệt →
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-xl transition-shadow">
          <Map className="w-8 h-8 mb-3" />
          <h3 className="font-bold mb-1">Tour đang dẫn</h3>
          <p className="text-green-100 text-sm mb-3">
            {activeTours} tour đang hoạt động
          </p>
          <button className="text-sm font-semibold underline">
            Theo dõi →
          </button>
        </div>
      </div>
    </div>
  );
}