import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  XCircle,
  AlertTriangle,
  CreditCard,
  Building2,
  User as UserIcon,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Info,
  Banknote,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Booking, RefundReasonType } from "@/app/types";

interface CancelTourModalProps {
  bookingId: string;
  booking?: Booking;
  tourName?: string;
  onCancel: () => void;
  onConfirm?: (reason: string) => void;
  onImmediateCancel?: (bookingId: string, reason: string) => void;
  onSubmitRefundRequest?: (data: {
    bookingId: string;
    bookingCode?: string;
    tourId?: string;
    tourName: string;
    tourStartDate?: string;
    requestedBy: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    reason: RefundReasonType;
    reasonDetail: string;
    originalPaidAmount: number;
    approvedRefundAmount: number;
    refundFee: number;
    refundPercentage: number;
    refundBankName: string;
    refundAccountNumber: string;
    refundAccountHolder: string;
  }) => void;
}

const COMMON_BANKS = [
  "Vietcombank",
  "MB Bank",
  "Techcombank",
  "BIDV",
  "VietinBank",
  "ACB",
  "TPBank",
  "VPBank",
  "Agribank",
  "Sacombank",
  "HD Bank",
  "VIB",
  "SHB",
  "Khác",
];

const REASON_OPTIONS: { value: RefundReasonType; label: string; desc: string }[] = [
  {
    value: "CUSTOMER_REQUEST",
    label: "Kế hoạch cá nhân thay đổi",
    desc: "Bận việc đột xuất, sức khỏe hoặc gia đình thay đổi lịch trình",
  },
  {
    value: "WEATHER_FORCE_MAJEURE",
    label: "Thời tiết xấu / Bất khả kháng",
    desc: "Bão, thiên tai, cấm tàu xe hoặc khuyến cáo hạn chế di chuyển",
  },
  {
    value: "SERVICE_QUALITY",
    label: "Không đồng ý điều chỉnh dịch vụ",
    desc: "Thay đổi khách sạn, lịch trình hoặc hướng dẫn viên",
  },
  {
    value: "DUPLICATE_PAYMENT",
    label: "Đặt trùng đơn / Thanh toán lặp",
    desc: "Thanh toán 2 lần hoặc trùng với thành viên khác trong đoàn",
  },
  {
    value: "OTHER",
    label: "Lý do khác",
    desc: "Lý do riêng biệt cần Ban Quản trị xem xét",
  },
];

const QUICK_UNPAID_REASONS = [
  "Thay đổi kế hoạch cá nhân",
  "Tìm được tour khác phù hợp hơn",
  "Chưa sắp xếp được thời gian nghỉ phép",
  "Chờ thảo luận thêm với người thân / bạn bè",
  "Thời gian khởi hành không còn phù hợp",
];

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export function CancelTourModal({
  bookingId,
  booking,
  tourName = "Tour du lịch",
  onCancel,
  onConfirm,
  onImmediateCancel,
  onSubmitRefundRequest,
}: CancelTourModalProps) {
  // Xác định trạng thái đã thanh toán hay chưa theo nghiệp vụ:
  // "vì khi booking họ chưa có thanh toán liền mà phải chờ agency duyệt và tạo yêu cầu thanh toán
  // nên nếu agency chưa duyệt hoặc chưa thanh toán thì cho hủy liền không cần admin phê duyệt nữa"
  // Xác định có tiền thực đóng hay chưa theo BOOKING_STATUS_MATRIX.md:
  // - Nếu chưa thanh toán (unpaid) và chưa đóng cọc: Cho hủy liền không mất phí (0đ), không cần Admin duyệt!
  // - Nếu đã đặt cọc (status === "deposited" || paymentStatus === "partially_paid")
  //   hoặc đã thanh toán đủ (status === "paid" || paymentStatus === "paid"):
  //   -> Kích hoạt form Hoàn tiền (Refund Request) qua Admin!
  const hasPaidMoney =
    booking?.status === "deposited" ||
    booking?.status === "paid" ||
    booking?.paymentStatus === "paid" ||
    booking?.paymentStatus === "partially_paid" ||
    Boolean(booking?.depositPaid && (booking?.depositAmount || 0) > 0);

  const canCancelImmediately = !hasPaidMoney;
  const isDepositOnly = booking?.status === "deposited" || booking?.paymentStatus === "partially_paid";
  const actualPaidAmount = isDepositOnly
    ? (booking?.depositAmount || Math.round((booking?.totalPrice || 0) * 0.3))
    : (booking?.totalPrice || booking?.depositAmount || 0);

  // State cho hủy ngay (Unpaid)
  const [unpaidReason, setUnpaidReason] = useState("");
  const [unpaidError, setUnpaidError] = useState("");

  // State cho yêu cầu hoàn tiền (Paid)
  const [refundReasonType, setRefundReasonType] = useState<RefundReasonType>("CUSTOMER_REQUEST");
  const [reasonDetail, setReasonDetail] = useState("");
  const [bankName, setBankName] = useState("Vietcombank");
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState(
    booking?.contactName?.toUpperCase() || booking?.userName?.toUpperCase() || ""
  );
  const [paidErrors, setPaidErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tính số ngày còn lại đến ngày khởi hành để áp dụng chính sách hoàn hủy
  const departureDateStr = booking?.tourStartDate || booking?.tour?.departureDates?.[0]?.date || "2026-11-20";
  const { daysRemaining, refundPercentage, refundFee, approvedRefundAmount } = useMemo(() => {
    const depDate = new Date(departureDateStr);
    const today = new Date();
    depDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((depDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const paidAmount = actualPaidAmount;

    let percent = 0;
    if (diffDays >= 7) {
      percent = 100;
    } else if (diffDays >= 3) {
      percent = 50;
    } else {
      percent = 0;
    }

    const approved = (paidAmount * percent) / 100;
    const fee = paidAmount - approved;

    return {
      daysRemaining: diffDays,
      refundPercentage: percent,
      refundFee: fee,
      approvedRefundAmount: approved,
    };
  }, [departureDateStr, booking]);

  // Xử lý HỦY LIỀN (Chưa thanh toán)
  const handleImmediateSubmit = () => {
    if (!unpaidReason.trim()) {
      setUnpaidError("Vui lòng chọn hoặc nhập lý do hủy tour.");
      return;
    }

    if (onImmediateCancel) {
      onImmediateCancel(bookingId, unpaidReason.trim());
    } else if (onConfirm) {
      onConfirm(unpaidReason.trim());
    }
  };

  // Xử lý NỘP ĐƠN HOÀN TIỀN (Đã thanh toán)
  const handleRefundSubmit = () => {
    const errors: { [key: string]: string } = {};

    if (!reasonDetail.trim()) {
      errors.reasonDetail = "Vui lòng nhập mô tả chi tiết lý do hủy.";
    }
    if (!accountNumber.trim()) {
      errors.accountNumber = "Vui lòng nhập số tài khoản ngân hàng nhận tiền.";
    }
    if (!accountHolder.trim()) {
      errors.accountHolder = "Vui lòng nhập tên chủ tài khoản thụ hưởng.";
    }
    if (bankName === "Khác" && !customBankName.trim()) {
      errors.bankName = "Vui lòng nhập tên ngân hàng thụ hưởng.";
    }

    if (Object.keys(errors).length > 0) {
      setPaidErrors(errors);
      return;
    }

    setIsSubmitting(true);

    const finalBankName = bankName === "Khác" ? customBankName.trim() : bankName;
    const originalPaid = actualPaidAmount;

    if (onSubmitRefundRequest) {
      onSubmitRefundRequest({
        bookingId,
        bookingCode: booking?.id ? `BK-${booking.id}` : undefined,
        tourId: booking?.tourId,
        tourName: booking?.tour?.name || tourName,
        tourStartDate: departureDateStr,
        requestedBy: booking?.userId || "user-1",
        customerName: booking?.userName || booking?.contactName || "Khách hàng",
        customerEmail: booking?.userEmail || booking?.contactEmail || "",
        customerPhone: booking?.contactPhone || "",
        reason: refundReasonType,
        reasonDetail: reasonDetail.trim(),
        originalPaidAmount: originalPaid,
        approvedRefundAmount,
        refundFee,
        refundPercentage,
        refundBankName: finalBankName,
        refundAccountNumber: accountNumber.trim(),
        refundAccountHolder: accountHolder.trim().toUpperCase(),
      });
    } else if (onConfirm) {
      onConfirm(`[Yêu cầu hoàn tiền ${refundPercentage}%]: ${reasonDetail.trim()}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6"
      >
        {/* ========================================================================= */}
        {/* TRƯỜNG HỢP 1: CHƯA THANH TOÁN HOẶC AGENCY CHƯA DUYỆT -> CHO HỦY LIỀN    */}
        {/* ========================================================================= */}
        {canCancelImmediately ? (
          <div>
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-rose-50 via-slate-50 to-white border-b border-slate-200/80 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 mb-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Hủy trực tiếp · Không mất phí</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Xác nhận hủy đơn đặt tour
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    Tour: <strong className="text-slate-800">{tourName}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCancel}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 text-xs">
              {/* Thông báo chưa thanh toán */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-200 text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-2 text-amber-950">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Đơn đặt tour chưa phát sinh thanh toán (0đ)</span>
                </div>
                <p className="text-[11px] text-amber-900/85 leading-relaxed pl-6">
                  Vì bạn chưa thanh toán tiền cọc hoặc Agency chưa chốt yêu cầu thanh toán,
                  hệ thống sẽ <strong>hủy đơn ngay lập tức</strong> mà không cần qua Ban Quản trị phê duyệt
                  hoàn tiền.
                </p>
              </div>

              {/* Gợi ý lý do nhanh */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800">
                  Gợi ý lý do phổ biến (Bấm để chọn nhanh):
                </Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_UNPAID_REASONS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setUnpaidReason(preset);
                        setUnpaidError("");
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                        unpaidReason === preset
                          ? "bg-[#075985] text-white border-[#075985] font-bold shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ô nhập lý do chi tiết */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Lý do hủy đơn <span className="text-rose-600">*</span></span>
                  <span className="text-[11px] text-slate-400 font-normal">Tối thiểu 5 ký tự</span>
                </Label>
                <Textarea
                  value={unpaidReason}
                  onChange={(e) => {
                    setUnpaidReason(e.target.value);
                    setUnpaidError("");
                  }}
                  rows={3}
                  placeholder="Vui lòng cho chúng tôi biết lý do bạn hủy đơn này để sàn cải thiện chất lượng dịch vụ..."
                  className={`text-xs bg-slate-50 focus:bg-white resize-none ${
                    unpaidError ? "border-rose-500 focus:ring-rose-500" : ""
                  }`}
                />
                {unpaidError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{unpaidError}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="text-xs h-10 px-5 rounded-xl cursor-pointer"
              >
                Không, giữ lại
              </Button>
              <Button
                type="button"
                onClick={handleImmediateSubmit}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-5 rounded-xl gap-2 cursor-pointer shadow-xs"
              >
                <XCircle className="w-4 h-4" />
                <span>Xác nhận hủy đơn ngay</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* TRƯỜNG HỢP 2: ĐÃ THANH TOÁN -> FORM YÊU CẦU HOÀN TIỀN (REFUND_REQUESTS) */
          /* ========================================================================= */
          <div>
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-amber-500/10 via-sky-50/40 to-white border-b border-slate-200/80 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 mb-1">
                    <Clock className="w-3 h-3 text-amber-700" />
                    <span>Đã thanh toán · Yêu cầu hoàn tiền sàn TripOps</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Yêu cầu hủy tour & Hoàn tiền
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tour: <strong className="text-slate-800">{tourName}</strong> · Khởi hành:{" "}
                    <strong className="text-slate-800">{departureDateStr}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCancel}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto bg-slate-50/50">
              {/* KHỐI 1: CHÍNH SÁCH HOÀN TIỀN TỰ ĐỘNG THEO NGÀY KHỞI HÀNH */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>1. Chính sách hoàn tiền áp dụng</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#075985] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                    Còn {daysRemaining > 0 ? `${daysRemaining} ngày` : "Đã đến hạn"} tới khởi hành
                  </span>
                </div>

                {/* Box tính toán số tiền */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {isDepositOnly ? "Tiền cọc đã đóng" : "Đã thanh toán đủ"}
                    </span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {formatVND(booking?.totalPrice || booking?.depositAmount || 0)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Phí hủy tour / phạt giữ lại
                    </span>
                    <span className="font-bold text-rose-600 text-sm mt-0.5 block">
                      {refundFee > 0 ? `- ${formatVND(refundFee)}` : "0đ (Miễn phí)"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300">
                    <span className="text-[11px] text-emerald-800 font-medium block">
                      Thực nhận hoàn ({refundPercentage}%)
                    </span>
                    <span className="font-black text-emerald-700 text-base mt-0.5 block">
                      {formatVND(approvedRefundAmount)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                  <strong>Quy định hủy tour nền tảng TripOps:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                    <li className={daysRemaining >= 7 ? "text-emerald-700 font-bold" : ""}>
                      Hủy trước ≥ 7 ngày: Hoàn 100% số tiền đã thanh toán (0đ phí).
                    </li>
                    <li className={daysRemaining >= 3 && daysRemaining < 7 ? "text-amber-700 font-bold" : ""}>
                      Hủy trước 3 - 6 ngày: Hoàn 50% số tiền đã thanh toán.
                    </li>
                    <li className={daysRemaining < 3 ? "text-rose-700 font-bold" : ""}>
                      Hủy trong vòng 2 ngày / cận giờ: Không hoàn tiền (0%).
                    </li>
                  </ul>
                </div>
              </div>

              {/* KHỐI 2: LÝ DO YÊU CẦU HỦY (BẢNG REFUND_REQUESTS) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-100">
                  <AlertTriangle className="w-4 h-4 text-[#075985]" />
                  <span>2. Lý do hủy tour & Hoàn tiền</span>
                </span>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 mb-1.5 block">
                      Phân loại lý do hủy <span className="text-rose-600">*</span>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {REASON_OPTIONS.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setRefundReasonType(item.value)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            refundReasonType === item.value
                              ? "bg-sky-50 border-[#075985] text-slate-900 shadow-2xs ring-1 ring-[#075985]"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center justify-between">
                            <span>{item.label}</span>
                            {refundReasonType === item.value && (
                              <CheckCircle2 className="w-4 h-4 text-[#075985]" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                            {item.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Mô tả chi tiết nguyên nhân (reason_detail) <span className="text-rose-600">*</span></span>
                      <span className="text-[11px] text-slate-400 font-normal">Gửi tới Quản trị viên</span>
                    </Label>
                    <Textarea
                      value={reasonDetail}
                      onChange={(e) => {
                        setReasonDetail(e.target.value);
                        if (paidErrors.reasonDetail) {
                          setPaidErrors({ ...paidErrors, reasonDetail: "" });
                        }
                      }}
                      rows={3}
                      placeholder="Ghi rõ lý do bạn cần hủy để Ban Quản trị sàn đối chiếu chính sách và giải ngân hoàn tiền nhanh nhất..."
                      className={`text-xs bg-slate-50 focus:bg-white resize-none ${
                        paidErrors.reasonDetail ? "border-rose-500 focus:ring-rose-500" : ""
                      }`}
                    />
                    {paidErrors.reasonDetail && (
                      <p className="text-[11px] text-rose-600 font-semibold">{paidErrors.reasonDetail}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* KHỐI 3: THÔNG TIN TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG (REFUND_BANK_NAME, ACCOUNT_NUMBER, HOLDER) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-100">
                  <CreditCard className="w-4 h-4 text-[#075985]" />
                  <span>3. Tài khoản ngân hàng nhận tiền hoàn</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">
                      Ngân hàng thụ hưởng <span className="text-rose-600">*</span>
                    </Label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full text-xs h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075985]"
                    >
                      {COMMON_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>

                    {bankName === "Khác" && (
                      <Input
                        value={customBankName}
                        onChange={(e) => setCustomBankName(e.target.value)}
                        placeholder="Nhập tên ngân hàng của bạn..."
                        className="text-xs mt-1.5"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">
                      Số tài khoản nhận tiền (STK) <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ""));
                        if (paidErrors.accountNumber) {
                          setPaidErrors({ ...paidErrors, accountNumber: "" });
                        }
                      }}
                      placeholder="VD: 0011004329876..."
                      className={`text-xs h-10 font-mono ${
                        paidErrors.accountNumber ? "border-rose-500 focus:ring-rose-500" : ""
                      }`}
                    />
                    {paidErrors.accountNumber && (
                      <p className="text-[11px] text-rose-600 font-semibold">{paidErrors.accountNumber}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">
                      Tên chủ tài khoản (Viết in hoa không dấu) <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      value={accountHolder}
                      onChange={(e) => {
                        setAccountHolder(e.target.value.toUpperCase());
                        if (paidErrors.accountHolder) {
                          setPaidErrors({ ...paidErrors, accountHolder: "" });
                        }
                      }}
                      placeholder="VD: PHAM HAI DANG"
                      className={`text-xs h-10 font-bold uppercase ${
                        paidErrors.accountHolder ? "border-rose-500 focus:ring-rose-500" : ""
                      }`}
                    />
                    {paidErrors.accountHolder && (
                      <p className="text-[11px] text-rose-600 font-semibold">{paidErrors.accountHolder}</p>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  ℹ️ Số tiền hoàn trả sẽ được Ban Quản trị TripOps chuyển trực tiếp về tài khoản trên sau khi kiểm tra hợp lệ trong vòng 24h làm việc.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="text-xs h-10 px-5 rounded-xl cursor-pointer"
              >
                Đóng / Giữ lại
              </Button>

              <Button
                type="button"
                onClick={handleRefundSubmit}
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 px-6 rounded-xl gap-2 cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu hoàn tiền"}</span>
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
