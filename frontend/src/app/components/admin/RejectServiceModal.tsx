import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/app/components/ui/radio-group";
import { XCircle } from "lucide-react";

interface RejectServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  serviceName?: string;
}

const REJECTION_REASONS = [
  "Thông tin không chính xác hoặc không đầy đủ",
  "Hình ảnh không phù hợp hoặc không rõ ràng",
  "Giá cả không hợp lý hoặc không minh bạch",
  "Vi phạm chính sách nền tảng",
  "Dịch vụ không đáp ứng tiêu chuẩn chất lượng",
  "Thông tin liên hệ không chính xác",
];

export function RejectServiceModal({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
}: RejectServiceModalProps) {
  const [selectedReason, setSelectedReason] =
    useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);

  const handleReasonChange = (value: string) => {
    if (value === "custom") {
      setIsCustom(true);
      setSelectedReason("");
    } else {
      setIsCustom(false);
      setSelectedReason(value);
      setCustomReason("");
    }
  };

  const handleConfirm = () => {
    const finalReason = isCustom
      ? customReason.trim()
      : selectedReason;
    if (finalReason) {
      onConfirm(finalReason);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setCustomReason("");
    setIsCustom(false);
    onClose();
  };

  const isValid = isCustom
    ? customReason.trim().length > 0
    : selectedReason.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            Từ chối bài đăng
          </DialogTitle>
          <DialogDescription>
            {serviceName
              ? `Vui lòng chọn lý do từ chối bài đăng "${serviceName}"`
              : "Vui lòng chọn lý do từ chối bài đăng này"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Lý do từ chối{" "}
              <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={isCustom ? "custom" : selectedReason}
              onValueChange={handleReasonChange}
              className="space-y-3"
            >
              {REJECTION_REASONS.map((reason) => (
                <div
                  key={reason}
                  className="flex items-start space-x-3"
                >
                  <RadioGroupItem
                    value={reason}
                    id={reason}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={reason}
                    className="font-normal cursor-pointer leading-relaxed"
                  >
                    {reason}
                  </Label>
                </div>
              ))}
              <div className="flex items-start space-x-3">
                <RadioGroupItem
                  value="custom"
                  id="custom"
                  className="mt-0.5"
                />
                <Label
                  htmlFor="custom"
                  className="font-normal cursor-pointer leading-relaxed"
                >
                  Lý do khác (tùy chỉnh)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {isCustom && (
            <div className="space-y-2 pl-7">
              <Label
                htmlFor="custom-reason"
                className="text-sm font-medium"
              >
                Nhập lý do của bạn
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Vui lòng nhập lý do từ chối..."
                value={customReason}
                onChange={(e) =>
                  setCustomReason(e.target.value)
                }
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                {customReason.length}/500 ký tự
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-red-600 hover:bg-red-700"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Xác nhận từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}