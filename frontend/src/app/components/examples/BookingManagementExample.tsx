/**
 * Example Component: Booking Management with API
 * Ví dụ quản lý bookings với API services
 */

import { useEffect, useState } from "react";
import { useApi } from "@/app/hooks/useApi";
import {
  getBookingsByUserId,
  getAllBookings,
  updateBookingStatus,
  assignGuide,
  cancelBooking,
} from "@/app/services";
import { Booking } from "@/app/types";
import {
  Calendar,
  MapPin,
  Users,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

/**
 * Example 1: User Bookings (Khách hàng xem bookings của mình)
 */
export function UserBookingsExample({
  userId,
}: {
  userId: string;
}) {
  const {
    data: bookings,
    loading,
    error,
    execute,
  } = useApi(getBookingsByUserId);

  useEffect(() => {
    execute(userId);
  }, [userId]);

  const handleCancelBooking = async (bookingId: string) => {
    const response = await cancelBooking(bookingId);

    if (response.success) {
      alert("Hủy booking thành công!");
      // Refresh bookings
      execute(userId);
    } else {
      alert("Lỗi: " + response.error);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorMessage
        error={error}
        onRetry={() => execute(userId)}
      />
    );
  if (!bookings || bookings.length === 0) {
    return <EmptyState message="Bạn chưa có booking nào" />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Bookings của tôi</h2>
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onCancel={() => handleCancelBooking(booking.id)}
          showCancelButton={
            booking.status === "pending" ||
            booking.status === "confirmed"
          }
        />
      ))}
    </div>
  );
}

/**
 * Example 2: Admin Booking Management
 */
export function AdminBookingManagementExample() {
  const {
    data: bookings,
    loading,
    error,
    execute,
  } = useApi(getAllBookings);
  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);
  const [filterStatus, setFilterStatus] =
    useState<string>("all");

  useEffect(() => {
    execute();
  }, []);

  const handleApprove = async (bookingId: string) => {
    const response = await updateBookingStatus(bookingId, {
      status: "confirmed",
    });

    if (response.success) {
      alert("Duyệt booking thành công!");
      execute(); // Refresh
    } else {
      alert("Lỗi: " + response.error);
    }
  };

  const handleReject = async (bookingId: string) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (!reason) return;

    const response = await updateBookingStatus(bookingId, {
      status: "rejected",
      rejectionReason: reason,
    });

    if (response.success) {
      alert("Từ chối booking thành công!");
      execute(); // Refresh
    } else {
      alert("Lỗi: " + response.error);
    }
  };

  const handleAssignGuide = async (bookingId: string) => {
    // In real app, this would open a modal to select guide
    const guideName = prompt("Nhập tên hướng dẫn viên:");
    if (!guideName) return;

    const response = await assignGuide(bookingId, {
      guideId: "guide-" + Date.now(),
      guideName,
      guidePhone: "0987654321",
    });

    if (response.success) {
      alert("Phân công HDV thành công!");
      execute(); // Refresh
    } else {
      alert("Lỗi: " + response.error);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorMessage error={error} onRetry={() => execute()} />
    );

  // Filter bookings
  const filteredBookings =
    bookings?.filter((b) => {
      if (filterStatus === "all") return true;
      return b.status === filterStatus;
    }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quản lý Bookings</h2>
        <button
          onClick={() => execute()}
          className="px-4 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316]"
        >
          Làm mới
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          "all",
          "pending",
          "confirmed",
          "cancelled",
          "rejected",
        ].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === status
                ? "bg-[#075985] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {status === "all" ? "Tất cả" : status}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mã booking
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tour
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Khách hàng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {booking.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {booking.tour.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div className="font-medium">
                      {booking.userName}
                    </div>
                    <div className="text-gray-500">
                      {booking.userEmail}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={booking.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    {booking.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            handleApprove(booking.id)
                          }
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() =>
                            handleReject(booking.id)
                          }
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    {booking.status === "confirmed" &&
                      !booking.guideId && (
                        <button
                          onClick={() =>
                            handleAssignGuide(booking.id)
                          }
                          className="px-3 py-1 bg-[#075985] text-white rounded hover:bg-[#F97316]"
                        >
                          Phân công HDV
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredBookings.length === 0 && (
        <EmptyState
          message={`Không có booking nào với trạng thái: ${filterStatus}`}
        />
      )}
    </div>
  );
}

/**
 * Booking Card Component
 */
function BookingCard({
  booking,
  onCancel,
  showCancelButton = false,
}: {
  booking: Booking;
  onCancel?: () => void;
  showCancelButton?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {booking.tour.name}
          </h3>
          <p className="text-sm text-gray-500">
            Mã booking: {booking.id}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Ngày đi: {booking.tourStartDate}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span>{booking.numberOfGuests} người</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{booking.tour.destination}</span>
        </div>
        {booking.guideName && (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-4 h-4" />
            <span>HDV: {booking.guideName}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Tổng tiền</p>
          <p className="text-2xl font-bold text-[#075985]">
            {booking.totalPrice.toLocaleString("vi-VN")}đ
          </p>
        </div>
        {showCancelButton && onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Hủy booking
          </button>
        )}
      </div>

      {booking.rejectionReason && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-600">
            <strong>Lý do từ chối:</strong>{" "}
            {booking.rejectionReason}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({
  status,
}: {
  status: Booking["status"];
}) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    completed: "bg-[#E0F2FE] text-blue-800",
    rejected: "bg-red-100 text-red-800",
  };

  const icons = {
    pending: <Clock className="w-4 h-4" />,
    confirmed: <CheckCircle className="w-4 h-4" />,
    cancelled: <XCircle className="w-4 h-4" />,
    completed: <CheckCircle className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
    >
      {icons[status]}
      {status}
    </span>
  );
}

/**
 * Loading Spinner
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#075985]"></div>
    </div>
  );
}

/**
 * Error Message
 */
function ErrorMessage({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-600 mb-2">Lỗi: {error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Thử lại
      </button>
    </div>
  );
}

/**
 * Empty State
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center p-12">
      <p className="text-gray-500">{message}</p>
    </div>
  );
}