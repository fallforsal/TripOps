import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Sparkles,
  RotateCcw,
  Check,
} from "lucide-react";

type BadgeType = "booking" | "payment" | "custom_request" | "complaint" | "refund";

interface StatusBadgeProps {
  type: BadgeType;
  status: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  type,
  status,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  let label = status;
  let bg = "bg-[#F1F5F9]";
  let text = "text-[#475569]";
  let border = "border-[#CBD5E1]";
  let Icon = Clock;

  if (type === "booking") {
    switch (status) {
      case "pending":
        label = "Chờ xử lý / Chưa cọc";
        bg = "bg-[#FFFBEB]";
        text = "text-[#B45309]";
        border = "border-[#FDE68A]";
        Icon = Clock;
        break;
      case "deposited":
        label = "Đã cọc đợt 1";
        bg = "bg-[#F0F9FF]";
        text = "text-[#0369A1]";
        border = "border-[#BAE6FD]";
        Icon = CheckCircle2;
        break;
      case "confirmed":
        label = "Đã chốt đoàn";
        bg = "bg-[#F0FDF4]";
        text = "text-[#15803D]";
        border = "border-[#BBF7D0]";
        Icon = CheckCircle2;
        break;
      case "paid":
        label = "Đã thanh toán đủ";
        bg = "bg-[#F0FDF4]";
        text = "text-[#15803D]";
        border = "border-[#BBF7D0]";
        Icon = Check;
        break;
      case "in_progress":
        label = "Đang diễn ra";
        bg = "bg-[#F0F9FF]";
        text = "text-[#075985]";
        border = "border-[#BAE6FD]";
        Icon = Clock;
        break;
      case "completed":
        label = "Hoàn thành chuyến đi";
        bg = "bg-[#F8FAFC]";
        text = "text-[#334155]";
        border = "border-[#CBD5E1]";
        Icon = CheckCircle2;
        break;
      case "cancelled":
        label = "Đã hủy";
        bg = "bg-[#FEF2F2]";
        text = "text-[#B91C1C]";
        border = "border-[#FECACA]";
        Icon = XCircle;
        break;
      case "rejected":
        label = "Bị từ chối";
        bg = "bg-[#FEF2F2]";
        text = "text-[#B91C1C]";
        border = "border-[#FECACA]";
        Icon = AlertCircle;
        break;
      default:
        label = status;
    }
  } else if (type === "payment") {
    switch (status) {
      case "unpaid":
        label = "Chưa thanh toán";
        bg = "bg-[#FEF2F2]";
        text = "text-[#B91C1C]";
        border = "border-[#FECACA]";
        Icon = CreditCard;
        break;
      case "partially_paid":
        label = "Đã cọc giai đoạn 1";
        bg = "bg-[#FFFBEB]";
        text = "text-[#B45309]";
        border = "border-[#FDE68A]";
        Icon = CreditCard;
        break;
      case "paid":
        label = "Thanh toán hoàn tất 100%";
        bg = "bg-[#F0FDF4]";
        text = "text-[#15803D]";
        border = "border-[#BBF7D0]";
        Icon = CheckCircle2;
        break;
      case "refunded":
        label = "Đã hoàn tiền";
        bg = "bg-[#F8FAFC]";
        text = "text-[#475569]";
        border = "border-[#CBD5E1]";
        Icon = RotateCcw;
        break;
      default:
        label = status;
    }
  } else if (type === "custom_request") {
    switch (status) {
      case "pending":
        label = "Chờ Agency tiếp nhận";
        bg = "bg-[#FFFBEB]";
        text = "text-[#B45309]";
        border = "border-[#FDE68A]";
        Icon = Clock;
        break;
      case "reviewing":
        label = "Đang thẩm định lịch trình";
        bg = "bg-[#F0F9FF]";
        text = "text-[#0369A1]";
        border = "border-[#BAE6FD]";
        Icon = Clock;
        break;
      case "designed":
        label = "Đã lên phương án tour";
        bg = "bg-[#F0FDF4]";
        text = "text-[#15803D]";
        border = "border-[#BBF7D0]";
        Icon = Sparkles;
        break;
      case "quoted":
        label = "Đã có báo giá chi tiết";
        bg = "bg-[#F0F9FF]";
        text = "text-[#075985]";
        border = "border-[#BAE6FD]";
        Icon = CheckCircle2;
        break;
      case "accepted":
        label = "Đã chốt & chuyển đặt tour";
        bg = "bg-[#F0FDF4]";
        text = "text-[#15803D]";
        border = "border-[#BBF7D0]";
        Icon = CheckCircle2;
        break;
      case "rejected":
        label = "Agency không nhận";
        bg = "bg-[#FEF2F2]";
        text = "text-[#B91C1C]";
        border = "border-[#FECACA]";
        Icon = XCircle;
        break;
      case "cancelled":
        label = "Đã hủy yêu cầu";
        bg = "bg-[#F8FAFC]";
        text = "text-[#64748B]";
        border = "border-[#CBD5E1]";
        Icon = XCircle;
        break;
      default:
        label = status;
    }
  } else if (type === "complaint") {
    switch (status) {
      case "pending":
        label = "Chờ tiếp nhận khiếu nại";
        bg = "bg-[#FFFBEB]";
        text = "text-[#B45309]";
        border = "border-[#FDE68A]";
        Icon = Clock;
        break;
      case "processing":
        label = "Đang xử lý & đối soát";
        bg = "bg-[#F0F9FF]";
        text = "text-[#0369A1]";
        border = "border-[#BAE6FD]";
        Icon = Clock;
        break;
      case "resolved":
        label = "Đã giải quyết xong";
        bg = "bg-[#F0FDF4]";
        text = "text-[#15803D]";
        border = "border-[#BBF7D0]";
        Icon = CheckCircle2;
        break;
      case "rejected":
        label = "Khiếu nại không hợp lệ";
        bg = "bg-[#FEF2F2]";
        text = "text-[#B91C1C]";
        border = "border-[#FECACA]";
        Icon = XCircle;
        break;
      default:
        label = status;
    }
  } else if (type === "refund") {
    switch (status) {
      case "PENDING":
        label = "Chờ Admin xét duyệt hoàn tiền";
        bg = "bg-[#FFFBEB]";
        text = "text-[#B45309]";
        border = "border-[#FDE68A]";
        Icon = Clock;
        break;
      case "REVIEWING":
        label = "Đang đối soát chứng từ thanh toán";
        bg = "bg-[#F0F9FF]";
        text = "text-[#0369A1]";
        border = "border-[#BAE6FD]";
        Icon = Clock;
        break;
      case "APPROVED":
        label = "Đã duyệt hoàn tiền (Chờ chuyển khoản)";
        bg = "bg-[#F0FDF4]";
        text = "text-[#15803D]";
        border = "border-[#BBF7D0]";
        Icon = CheckCircle2;
        break;
      case "COMPLETED":
        label = "Đã chuyển tiền hoàn tất";
        bg = "bg-[#F0FDF4]";
        text = "text-[#15803D]";
        border = "border-[#BBF7D0]";
        Icon = Check;
        break;
      case "REJECTED":
        label = "Từ chối hoàn tiền";
        bg = "bg-[#FEF2F2]";
        text = "text-[#B91C1C]";
        border = "border-[#FECACA]";
        Icon = XCircle;
        break;
      default:
        label = status;
    }
  }

  const paddingClass = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-[6px] ${bg} ${text} ${border} ${paddingClass} ${className}`}
    >
      <Icon className={iconSize} />
      <span>{label}</span>
    </span>
  );
}
