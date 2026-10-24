import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Booking } from "@/app/types";

interface CancelBookingModalProps {
  booking: Booking;
  onClose: () => void;
  onCancel: (bookingId: string, reason: string) => void;
}

export function CancelBookingModal({
  booking,
  onClose,
  onCancel,
}: CancelBookingModalProps) {
  const [reason, setReason] = useState("");
  const [selectedReason, setSelectedReason] = useState("");

  const predefinedReasons = [
    "Thay đổi kế hoạch cá nhân",
    "Tìm được tour phù hợp hơn",
    "Vấn đề về chi phí",
    "Lý do sức khỏe",
    "Điều kiện thời tiết không thuận lợi",
    "Khác",
  ];

  const handleConfirm = () => {
    const finalReason =
      selectedReason === "Khác" ? reason : selectedReason;
    if (!finalReason.trim()) {
      alert("Vui lòng nhập lý do hủy tour");
      return;
    }
    onCancel(booking.id, finalReason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Hủy booking
              </h2>
              <p className="text-sm text-gray-600">
                {booking.tour.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">
                  Lưu ý quan trọng:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Việc hủy booking có thể áp dụng phí hủy tùy
                    theo chính sách
                  </li>
                  <li>
                    Nếu đã thanh toán, tiền sẽ được hoàn lại sau
                    7-14 ngày làm việc
                  </li>
                  <li>
                    Bạn sẽ nhận email xác nhận hủy booking
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Predefined Reasons */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Vui lòng chọn lý do hủy tour{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {predefinedReasons.map((item) => (
                <label
                  key={item}
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedReason === item
                      ? "border-[#075985] bg-[#F0F9FF]"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={item}
                    checked={selectedReason === item}
                    onChange={(e) =>
                      setSelectedReason(e.target.value)
                    }
                    className="w-4 h-4 text-[#075985] focus:ring-[#075985]"
                  />
                  <span className="text-gray-900">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === "Khác" && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Lý do chi tiết{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Vui lòng mô tả chi tiết lý do hủy tour của bạn..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:border-transparent resize-none"
                rows={4}
              />
            </div>
          )}

          {/* Info */}
          <div className="bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl p-4">
            <p className="text-sm text-blue-900">
              <strong>Chính sách hoàn tiền:</strong>
              <br />
              • Hủy trước 7 ngày: Hoàn 100% giá trị booking
              <br />
              • Hủy trước 3-6 ngày: Hoàn 50% giá trị booking
              <br />• Hủy trong vòng 2 ngày: Không hoàn tiền
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
          >
            Đóng
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              !selectedReason ||
              (selectedReason === "Khác" && !reason.trim())
            }
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Xác nhận hủy
          </button>
        </div>
      </div>
    </div>
  );
}