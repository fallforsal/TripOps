import { Booking, Location } from "@/app/types";
import {
  X,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Circle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface BookingDetailsProps {
  booking: Booking;
  onClose: () => void;
  completedLocations?: string[];
}

export function BookingDetails({
  booking,
  onClose,
  completedLocations = [],
}: BookingDetailsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Chi tiết booking
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tour info */}
          <div className="flex gap-4">
            <img
              src={booking.tour.image}
              alt={booking.tour.name}
              className="w-48 h-32 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-xl text-gray-900 mb-2">
                {booking.tour.name}
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{booking.tour.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Khởi hành:{" "}
                    {formatDate(booking.tourStartDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{booking.numberOfGuests} người</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
            <div className="flex justify-between">
              <span className="text-gray-600">Mã booking:</span>
              <span className="font-bold text-gray-900">{booking.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ngày đặt:</span>
              <span className="font-medium">
                {formatDate(booking.bookingDate)}
              </span>
            </div>
            {booking.guideName && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Hướng dẫn viên:
                </span>
                <span className="font-medium">
                  {booking.guideName}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Đơn giá theo người:</span>
              <span className="font-semibold text-gray-800">
                {formatPrice(Math.round(booking.totalPrice / (booking.numberOfGuests || 1)))} / khách
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Trạng thái thanh toán:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                booking.paymentStatus === "paid"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : booking.paymentStatus === "refunded"
                  ? "bg-[#F0F9FF] text-[#EA580C] border-[#F97316]/30"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}>
                {booking.paymentStatus === "paid"
                  ? "Đã thanh toán"
                  : booking.paymentStatus === "refunded"
                  ? "Đã hoàn tiền"
                  : "Chưa thanh toán (Thanh toán sau)"}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-2">
              <span className="text-gray-700 font-bold">Tổng giá tour dự kiến:</span>
              <span className="font-bold text-xl text-[#075985]">
                {formatPrice(booking.totalPrice)}
              </span>
            </div>
          </div>

          {/* Pending Price Check Notice */}
          {booking.status === "pending" && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-950 mb-0.5">
                  Đang chờ công ty du lịch xác nhận &amp; chốt giá dịch vụ
                </p>
                <p className="leading-relaxed text-amber-800">
                  Bạn không cần thanh toán ngay khi đặt tour. Công ty lữ hành đang liên hệ các bên cung ứng bên ngoài (khách sạn lưu trú, quán ăn) để kiểm tra phòng/chỗ và chốt giá thực tế. Sau khi công ty duyệt và chốt giá, bạn sẽ nhận được thông tin để thanh toán.
                </p>
              </div>
            </div>
          )}

          {/* Cancellation/Rejection Reason */}
          {(booking.status === "cancelled" ||
            booking.status === "rejected") && (
            <div
              className={`rounded-xl p-5 border-2 ${
                booking.rejectedBy === "customer"
                  ? "bg-amber-50 border-amber-300"
                  : "bg-red-50 border-red-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 ${
                    booking.rejectedBy === "customer"
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {booking.rejectedBy === "customer" ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h4
                    className={`font-bold mb-2 ${
                      booking.rejectedBy === "customer"
                        ? "text-amber-900"
                        : "text-red-900"
                    }`}
                  >
                    {booking.rejectedBy === "customer"
                      ? "Lý do hủy booking"
                      : "Lý do từ chối booking"}
                  </h4>
                  <p
                    className={`${
                      booking.rejectedBy === "customer"
                        ? "text-amber-800"
                        : "text-red-800"
                    }`}
                  >
                    {booking.rejectedBy === "customer"
                      ? booking.cancellationReason
                      : booking.rejectionReason ||
                        "Không có lý do cụ thể"}
                  </p>
                  {booking.rejectedBy === "customer" && (
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <p className="text-sm text-amber-700">
                        <strong>Chính sách hoàn tiền:</strong>{" "}
                        Tiền sẽ được hoàn lại trong vòng 7-14
                        ngày làm việc tùy theo chính sách hủy và
                        thời gian hủy booking.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Itinerary */}
          {booking.tour.itinerary &&
            booking.tour.itinerary.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-4">
                  Lịch trình chi tiết
                </h3>
                <div className="space-y-4">
                  {booking.tour.itinerary.map((day) => (
                    <div
                      key={day.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-[#E0F2FE] text-[#075985] flex items-center justify-center font-bold flex-shrink-0">
                          {day.day}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {day.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {day.description}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(day.date)}
                          </p>
                        </div>
                      </div>

                      {day.locations &&
                        day.locations.length > 0 && (
                          <div className="ml-15 space-y-2">
                            <h5 className="text-sm font-medium text-gray-700">
                              Địa điểm ({day.locations.length}):
                            </h5>
                            <div className="space-y-2">
                              {day.locations.map(
                                (location: Location) => {
                                  const isCheckedIn =
                                    completedLocations.includes(
                                      location.id,
                                    );
                                  return (
                                    <div
                                      key={location.id}
                                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                                    >
                                      {isCheckedIn ? (
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900">
                                          {location.name}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          {location.address}
                                        </div>
                                        {isCheckedIn &&
                                          location.checkInTime && (
                                            <div className="text-xs text-green-600 mt-1">
                                              Đã check-in:{" "}
                                              {
                                                location.checkInTime
                                              }
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Highlights */}
          {booking.tour.highlights &&
            booking.tour.highlights.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-3">
                  Điểm nổi bật
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {booking.tour.highlights.map(
                    (highlight, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-gray-700"
                      >
                        <span className="text-[#075985] mt-1">
                          •
                        </span>
                        <span>{highlight}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}