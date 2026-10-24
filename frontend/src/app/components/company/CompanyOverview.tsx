import {
  Tour,
  Booking,
  User,
  TourCompany,
} from "@/app/types";
import {
  Package,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  AlertCircle,
  Compass,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface CompanyOverviewProps {
  company: TourCompany;
  tours: Tour[];
  bookings: Booking[];
  guides: User[];
  onNavigate?: (section: string) => void;
}

export function CompanyOverview({
  company,
  tours,
  bookings,
  guides,
  onNavigate,
}: CompanyOverviewProps) {
  const pendingBookings = bookings.filter(
    (b) => b.status === "pending",
  ).length;
  const confirmedBookings = bookings.filter(
    (b) => b.status === "confirmed",
  ).length;
  const totalRevenue = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const recentBookings = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.bookingDate).getTime() -
        new Date(a.bookingDate).getTime(),
    )
    .slice(0, 5);

  const isApproved = company.status === "approved";

  return (
    <div className="space-y-6">
      {/* Warning if not approved */}
      {!isApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">
              Tài khoản đang chờ phê duyệt
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Công ty của bạn đang được xem xét bởi nền tảng. Bạn
              có thể xem trước dashboard nhưng chưa thể đăng tour
              cho đến khi được phê duyệt.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-600">
          {company.coverImage && (
            <img
              src={company.coverImage}
              alt=""
              className="w-full h-full object-cover opacity-40"
            />
          )}
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8">
            <img
              src={company.logo}
              alt={company.name}
              className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-md"
            />
            <div className="pb-1">
              <h1 className="text-xl font-bold text-gray-900">
                {company.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                {company.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {company.rating}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {company.address}
                </span>
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-3 leading-relaxed">
            {company.description}
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Phone className="w-4 h-4" /> {company.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" /> {company.email}
            </span>
            {company.website && (
              <span className="flex items-center gap-1.5 text-[#075985]">
                <Globe className="w-4 h-4" /> {company.website}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Tổng Tour",
            value: tours.length,
            icon: Package,
            color: "text-[#075985]",
            bg: "bg-[#F0F9FF]",
          },
          {
            label: "Đặt tour",
            value: bookings.length,
            icon: Calendar,
            color: "text-[#F97316]",
            bg: "bg-[#F0F9FF]",
          },
          {
            label: "Chờ xử lý",
            value: pendingBookings,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "HDV",
            value: guides.length,
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div
                className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}
              >
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Revenue */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 opacity-80" />
          <p className="text-sm opacity-80">Doanh thu ước tính</p>
        </div>
        <p className="text-3xl font-bold">
          {totalRevenue.toLocaleString("vi-VN")}
          <span className="text-lg font-normal opacity-70 ml-1">
            đ
          </span>
        </p>
        <p className="text-sm opacity-60 mt-1">
          Từ {confirmedBookings} booking đã xác nhận
        </p>
      </div>

      {/* Services Discovery Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-[#CBD5E1] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#075985] text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              Mạng lưới Dịch vụ Đối tác & Định vị OpenStreetMap
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Khám phá các khách sạn, nhà hàng, điểm tham quan và đội xe đối tác trên toàn quốc. Tra cứu tọa độ GPS trực quan trên OpenStreetMap và đưa trực tiếp vào lịch trình tour.
            </p>
          </div>
        </div>
        {onNavigate && (
          <Button
            onClick={() => onNavigate("services")}
            className="rounded-xl bg-[#075985] hover:bg-[#F97316] text-white text-xs font-semibold px-4 py-2.5 flex-shrink-0 shadow-xs"
          >
            Khám phá Dịch vụ Đối tác
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            Đặt tour gần đây
          </h3>
        </div>
        {recentBookings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Chưa có đặt tour nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {booking.userName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {booking.tour.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {booking.totalPrice.toLocaleString("vi-VN")}đ
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      booking.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : booking.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {booking.status === "confirmed"
                      ? "Đã xác nhận"
                      : booking.status === "pending"
                        ? "Chờ xử lý"
                        : booking.status === "cancelled"
                          ? "Đã hủy"
                          : booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
