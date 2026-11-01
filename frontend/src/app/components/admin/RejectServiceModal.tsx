import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { XCircle, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";

interface RejectServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  serviceName?: string;
}

const REJECTION_REASONS = [
  "Thông tin không chính xác hoặc không đầy đủ",
  "Hình ảnh không phù hợp hoặc chất lượng kém / mờ",
  "Giá cả không hợp lý hoặc có phụ thu bất minh",
  "Vi phạm chính sách nền tảng TripOps",
  "Dịch vụ không đáp ứng tiêu chuẩn đón đoàn tour",
  "Thông tin địa chỉ hoặc tọa độ GPS không chính xác",
];

export function RejectServiceModal({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
}: RejectServiceModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelectReason = (reason: string) => {
    setIsCustom(false);
    setSelectedReason(reason);
    setCustomReason("");
  };

  const handleSelectCustom = () => {
    setIsCustom(true);
    setSelectedReason("");
  };

  const handleConfirm = async () => {
    if (saving) return;
    const finalReason = isCustom ? customReason.trim() : selectedReason;
    if (finalReason) {
      setSaving(true);
      try {
        await onConfirm(finalReason);
        handleClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể từ chối bài đăng.");
      } finally {
        setSaving(false);
      }
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setCustomReason("");
    setIsCustom(false);
    onClose();
  };

  const isValid = isCustom ? customReason.trim().length > 0 : selectedReason.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl bg-white text-gray-900 border border-gray-200 shadow-2xl rounded-2xl p-6">
        {/* Crisp Header - No translucent liquid glass */}
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl mb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-rose-950">Từ chối bài đăng dịch vụ</h3>
            <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
              {serviceName
                ? `Vui lòng chọn lý do từ chối bài đăng "${serviceName}". Lý do sẽ được thông báo trực tiếp đến đối tác cung ứng.`
                : "Vui lòng chọn lý do từ chối bài đăng này."}
            </p>
          </div>
        </div>

        {/* Reasons list as solid crisp cards */}
        <div className="space-y-2 py-2 max-h-[55vh] overflow-y-auto pr-1">
          <Label className="text-xs font-bold text-gray-800 uppercase tracking-wider block mb-2">
            Chọn lý do từ chối <span className="text-rose-500">*</span>
          </Label>

          <div className="space-y-2">
            {REJECTION_REASONS.map((reason) => {
              const isSelected = selectedReason === reason && !isCustom;
              return (
                <div
                  key={reason}
                  onClick={() => handleSelectReason(reason)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "border-rose-500 bg-rose-50/80 text-rose-950 font-semibold ring-2 ring-rose-500/20 shadow-2xs"
                      : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="leading-snug">{reason}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-2 ${
                      isSelected
                        ? "border-rose-600 bg-rose-600 text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}

            {/* Custom option */}
            <div
              onClick={handleSelectCustom}
              className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                isCustom
                  ? "border-rose-500 bg-rose-50/80 text-rose-950 font-semibold ring-2 ring-rose-500/20 shadow-2xs"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Lý do khác (tùy chỉnh nội dung)</span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-2 ${
                    isCustom
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isCustom && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>

              {isCustom && (
                <div className="mt-3 pt-2 border-t border-rose-200/60" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    placeholder="Nhập cụ thể lý do từ chối để đối tác biết và chỉnh sửa lại..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="text-xs bg-white border-rose-300 focus:border-rose-500 focus:ring-rose-500 text-gray-900 resize-none rounded-xl"
                  />
                  <p className="text-[10px] text-rose-600 mt-1 text-right font-medium">
                    {customReason.length}/500 ký tự
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <DialogFooter className="gap-2 sm:gap-3 pt-3 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="rounded-xl text-xs font-semibold px-4 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || saving}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-5 shadow-xs"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            {saving ? "Đang xử lý..." : "Xác nhận từ chối bài đăng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
