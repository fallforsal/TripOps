import { useState, useMemo } from "react";
import {
  Calendar,
  MapPin,
  Clock,
  XCircle,
  Eye,
  Search,
  Filter,
  Users,
  CreditCard,
  Building2,
  Sparkles,
  CheckCircle,
  Handshake,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { CancelTourModal } from "./CancelTourModal";
import type { Booking } from "@/app/types";

interface MyBookingsProps {
  bookings: Booking[];
  onCancelBooking: (bookingId: string, reason: string) => void;
  onViewBookingDetail: (booking: Booking) => void;
}

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export function MyBookings({
  bookings,
  onCancelBooking,
  onViewBookingDetail,
}: MyBookingsProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);

  const filterTabs = [
    { id: "all", label: "Tất cả" },
    { id: "pending", label: "Chờ xác nhận" },
    { id: "deposited", label: "Đã đặt cọc" },
    { id: "confirmed", label: "Đã xác nhận" },
    { id: "paid", label: "Đã thanh toán đủ" },
    { id: "completed", label: "Hoàn thành" },
    { id: "cancelled", label: "Đã hủy" },
    { id: "rejected", label: "Đã từ chối" },
  ];

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchStatus = filterStatus === "all" || booking.status === filterStatus;
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchStatus;

      const matchSearch =
        booking.id.toLowerCase().includes(term) ||
        (booking.bookingCode || "").toLowerCase().includes(term) ||
        (booking.tour?.name || "").toLowerCase().includes(term) ||
        (booking.tour?.tourCode || "").toLowerCase().includes(term) ||
        (booking.tour?.destination || "").toLowerCase().includes(term);

      return matchStatus && matchSearch;
    });
  }, [bookings, filterStatus, searchTerm]);

  const handleConfirmCancel = (reason: string) => {
    if (showCancelModal) {
      onCancelBooking(showCancelModal, reason);
      setShowCancelModal(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "deposited":
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Đã đặt cọc
          </span>
        );
      case "confirmed":
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Đã xác nhận
          </span>
        );
      case "paid":
        return (
          <span className="px-2.5 py-1 bg-teal-100 text-teal-800 border border-teal-300 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-teal-600" />
            Đã thanh toán đủ
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 bg-[#E0F2FE] text-blue-800 border border-blue-300 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Hoàn thành
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Đã hủy
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-300 rounded-full text-xs font-bold inline-flex items-center gap-1">
            Đã từ chối
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Chờ xác nhận &amp; chốt giá
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case "paid":
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
            Đã thanh toán
          </span>
        );
      case "refunded":
        return (
          <span className="px-2.5 py-1 bg-[#F0F9FF] text-[#EA580C] border border-[#F97316]/30 rounded-full text-xs font-bold">
            Đã hoàn tiền
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
            Chưa thanh toán
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Lịch sử đặt tour
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Quản lý và theo dõi toàn bộ các tour du lịch của bạn theo danh sách bảng
            </p>
          </div>
          <div className="text-xs font-semibold bg-white border border-gray-200 px-3 py-2 rounded-xl text-gray-700 shadow-2xs self-start sm:self-auto">
            Tổng cộng: <strong className="text-teal-700 text-sm">{bookings.length}</strong> đơn đặt tour
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => {
              const count =
                tab.id === "all"
                  ? bookings.length
                  : bookings.filter((b) => b.status === tab.id).length;
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-teal-600 text-white shadow-2xs"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Tìm kiếm theo tên tour, mã tour hoặc mã đơn booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:bg-white"
            />
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">Không tìm thấy tour nào</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Không có dữ liệu phù hợp với trạng thái hoặc từ khóa tìm kiếm bạn đã chọn.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Mã đơn</th>
                    <th className="py-3.5 px-4 min-w-[240px]">Tour du lịch</th>
                    <th className="py-3.5 px-4">Khởi hành</th>
                    <th className="py-3.5 px-4 text-center">Số khách</th>
                    <th className="py-3.5 px-4 text-right">Tổng tiền</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái đơn</th>
                    <th className="py-3.5 px-4 text-center">Thanh toán</th>
                    <th className="py-3.5 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.map((b) => {
                    const canCancel = b.status === "pending" || b.status === "deposited" || b.status === "confirmed";

                    return (
                      <tr key={b.id} className="hover:bg-teal-50/20 transition-colors group">
                        {/* 1. Mã đơn */}
                        <td className="py-4 px-4 font-mono text-gray-700 font-bold whitespace-nowrap">
                          {b.bookingCode ? b.bookingCode : `#${b.id.replace("booking-", "")}`}
                        </td>

                        {/* 2. Tour du lịch */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={b.tour?.image || b.tour?.images?.[0] || "https://images.unsplash.com/photo-1528127269322-539801943592?w=800"}
                              alt={b.tour?.name || "Tour"}
                              className="w-14 h-11 rounded-lg object-cover flex-shrink-0 shadow-2xs border border-gray-100"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-1 group-hover:text-teal-700 transition-colors">
                                {b.tour?.name || "Tour du lịch"}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded font-semibold">
                                  {b.tour?.tourCode}
                                </span>
                                <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-gray-400" />
                                  {b.tour?.destination}
                                </span>
                                {b.hasLocationCustomization && (
                                  <span className="text-[10px] text-[#EA580C] font-bold bg-[#F97316]/15 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5 text-[#F97316]" />
                                    Tùy chỉnh
                                  </span>
                                )}
                                {(b.customHotelChanges?.some((h) => h.mode === "provider" || h.isProviderService) ||
                                  b.customMealChanges?.some((m) => m.mode === "provider" || m.isProviderService)) && (
                                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                    🌟 Đối tác Nền tảng
                                  </span>
                                )}
                                {(b.isCoHosted || b.tour?.isCoHosted) && (
                                  <span className="text-[10px] text-amber-900 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded flex items-center gap-1 shadow-2xs">
                                    <Handshake className="w-2.5 h-2.5 text-amber-700" />
                                    Liên minh 2 công ty
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Khởi hành */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="font-bold text-gray-800 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-teal-600" />
                              {b.tourStartDate || "Chưa chọn"}
                            </p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {b.tour?.duration}
                            </p>
                          </div>
                        </td>

                        {/* 4. Số khách */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg">
                            <Users className="w-3.5 h-3.5 text-gray-500" />
                            {b.numberOfGuests} khách
                          </span>
                        </td>

                        {/* 5. Tổng tiền */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <p className="font-bold text-[#075985] text-sm">
                            {formatVND(b.totalPrice)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {Math.round(b.totalPrice / (b.numberOfGuests || 1)).toLocaleString("vi-VN")}đ/khách
                          </p>
                        </td>

                        {/* 6. Trạng thái đơn */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(b.status)}
                        </td>

                        {/* 7. Trạng thái thanh toán */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {getPaymentStatusBadge(b.paymentStatus)}
                        </td>

                        {/* 8. Thao tác */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              type="button"
                              onClick={() => onViewBookingDetail(b)}
                              className="h-8 px-3 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1 shadow-2xs rounded-lg"
                              title="Xem chi tiết đơn đặt tour này"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem chi tiết
                            </Button>

                            {canCancel && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCancelModal(b.id)}
                                className="h-8 px-2 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg"
                                title="Yêu cầu hủy tour"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal &&
        (() => {
          const booking = bookings.find((b) => b.id === showCancelModal);
          if (!booking) return null;

          return (
            <CancelTourModal
              bookingId={showCancelModal}
              tourName={booking.tour?.name || "Tour"}
              onCancel={() => setShowCancelModal(null)}
              onConfirm={handleConfirmCancel}
            />
          );
        })()}
    </div>
  );
}