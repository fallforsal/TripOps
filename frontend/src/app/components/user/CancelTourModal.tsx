import { useState } from "react";
import { XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface CancelTourModalProps {
  bookingId: string;
  tourName?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function CancelTourModal({
  bookingId,
  tourName,
  onConfirm,
  onCancel,
}: CancelTourModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do hủy tour");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Xác nhận hủy tour
        </h3>

        <p className="text-gray-600 text-center mb-6">
          Bạn đang yêu cầu hủy tour:{" "}
          <span className="font-semibold text-gray-900">
            {tourName}
          </span>
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">
                Lưu ý về chính sách hủy tour:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Hủy trước 7 ngày: hoàn 100%</li>
                <li>Hủy trước 3-6 ngày: hoàn 50%</li>
                <li>Hủy trong vòng 2 ngày: không hoàn tiền</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Lý do hủy tour{" "}
            <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
            placeholder="Vui lòng cho chúng tôi biết lý do bạn muốn hủy tour này..."
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none ${
              error
                ? "border-red-300 bg-red-50"
                : "border-gray-300"
            }`}
            rows={4}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Lý do của bạn sẽ được gửi đến quản lý và giúp chúng
            tôi cải thiện dịch vụ
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Không, giữ lại
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Xác nhận hủy tour
          </Button>
        </div>
      </div>
    </div>
  );
}