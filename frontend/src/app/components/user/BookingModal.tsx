import { useState } from "react";
import { Tour } from "@/app/types";
import { X, Calendar, Users, MapPin, Handshake, ShieldCheck } from "lucide-react";

interface BookingModalProps {
  tour: Tour;
  onClose: () => void;
  onConfirm: (
    numberOfGuests: number,
    startDate: string,
  ) => void;
}

export function BookingModal({
  tour,
  onClose,
  onConfirm,
}: BookingModalProps) {
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [startDate, setStartDate] = useState("");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const totalPrice = tour.price * numberOfGuests;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      alert("Vui lòng chọn ngày khởi hành");
      return;
    }
    onConfirm(numberOfGuests, startDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Đặt tour
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-4">
            <img
              src={tour.image}
              alt={tour.name}
              className="w-32 h-32 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                {tour.name}
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{tour.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{tour.duration}</span>
                </div>
              </div>
            </div>
          </div>

          {tour.isCoHosted && (
            <div className="bg-gradient-to-r from-amber-50 to-purple-50 border border-amber-300 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <Handshake className="w-3 h-3" />
                  Tour Liên Minh 2 Công Ty
                </span>
                <span className="font-bold text-amber-950">
                  {tour.coHosts?.map((c) => c.companyName).join(" & ") || "2 Bên phối hợp thực hiện"}
                </span>
              </div>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Tour được dẫn và điều phối bởi 2 đơn vị lữ hành. Toàn bộ tiền thanh toán được bảo chứng an toàn qua Tài khoản Ký quỹ (Escrow) của Sàn Du Lịch.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày khởi hành
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng khách (Tối đa {tour.maxGuests} người)
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setNumberOfGuests(
                      Math.max(1, numberOfGuests - 1),
                    )
                  }
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  -
                </button>
                <span className="text-xl font-semibold w-12 text-center">
                  {numberOfGuests}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setNumberOfGuests(
                      Math.min(
                        tour.maxGuests,
                        numberOfGuests + 1,
                      ),
                    )
                  }
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-[#F0F9FF] rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                Điểm nổi bật
              </h4>
              <ul className="space-y-2">
                {tour.highlights.map((highlight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="text-[#075985]">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">
                  Giá tour/người
                </span>
                <span className="font-medium">
                  {formatPrice(tour.price)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">
                  Số lượng khách
                </span>
                <span className="font-medium">
                  {numberOfGuests} người
                </span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-[#075985]">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors"
              >
                Xác nhận đặt tour
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}