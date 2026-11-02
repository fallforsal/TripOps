import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Banknote,
  Building2,
  User as UserIcon,
  Calendar,
  Check,
  X,
  CreditCard,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Sparkles,
  QrCode,
  DollarSign,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { RefundRequest, RefundStatus, RefundReasonType } from "@/app/types";

interface AdminRefundManagementProps {
  refundRequests: RefundRequest[];
  onApproveRefund: (refundId: string, bankTransactionCode: string, note?: string) => void;
  onRejectRefund: (refundId: string, reason: string) => void;
  onReviewRefund: (refundId: string, note?: string) => void;
}

const BANK_CODE_MAP: Record<string, string> = {
  Vietcombank: "VCB",
  "MB Bank": "MB",
  Techcombank: "TCB",
  BIDV: "BIDV",
  VietinBank: "CTG",
  ACB: "ACB",
  TPBank: "TPB",
  VPBank: "VPB",
  Agribank: "VBA",
  Sacombank: "STB",
  "HD Bank": "HDB",
  VIB: "VIB",
  SHB: "SHB",
};

const REASON_LABELS: Record<RefundReasonType, { label: string; color: string }> = {
  CUSTOMER_REQUEST: { label: "Khách đổi kế hoạch", color: "bg-blue-50 text-blue-700 border-blue-200" },
  WEATHER_FORCE_MAJEURE: { label: "Thời tiết / Bất khả kháng", color: "bg-amber-50 text-amber-700 border-amber-200" },
  SERVICE_QUALITY: { label: "Chất lượng dịch vụ", color: "bg-purple-50 text-purple-700 border-purple-200" },
  DUPLICATE_PAYMENT: { label: "Thanh toán trùng lặp", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  TOUR_CANCELLED: { label: "Tour bị hủy từ Cty", color: "bg-orange-50 text-orange-700 border-orange-200" },
  OTHER: { label: "Lý do khác", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

const REJECTION_PRESETS = [
  "Khách thông báo hủy sau khi đoàn đã xuất phát (No-show), không đủ điều kiện hoàn trả theo quy chế sàn.",
  "Hủy sát giờ khởi hành (trong vòng 48h), chính sách nền tảng quy định không hoàn tiền (0%).",
  "Thông tin tài khoản ngân hàng hoặc tên chủ tài khoản không chính xác, vui lòng cung cấp lại.",
  "Đã thỏa thuận với đơn vị lữ hành dời chuyến khởi hành sang đợt tiếp theo.",
];

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export function AdminRefundManagement({
  refundRequests,
  onApproveRefund,
  onRejectRefund,
  onReviewRefund,
}: AdminRefundManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RefundStatus>("ALL");
  const [reasonFilter, setReasonFilter] = useState<"ALL" | RefundReasonType>("ALL");

  // Modals
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [approvingRefund, setApprovingRefund] = useState<RefundRequest | null>(null);
  const [rejectingRefund, setRejectingRefund] = useState<RefundRequest | null>(null);

  // Form states for approval
  const [bankTransCode, setBankTransCode] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalError, setApprovalError] = useState("");

  // Form states for rejection
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  // Copied state indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // KPIs
  const stats = useMemo(() => {
    const total = refundRequests.length;
    const pending = refundRequests.filter((r) => r.status === "PENDING").length;
    const reviewing = refundRequests.filter((r) => r.status === "REVIEWING").length;
    const completed = refundRequests.filter((r) => r.status === "COMPLETED").length;
    const rejected = refundRequests.filter((r) => r.status === "REJECTED").length;

    const pendingAmount = refundRequests
      .filter((r) => r.status === "PENDING" || r.status === "REVIEWING")
      .reduce((sum, r) => sum + r.approvedRefundAmount, 0);

    const completedAmount = refundRequests
      .filter((r) => r.status === "COMPLETED")
      .reduce((sum, r) => sum + r.approvedRefundAmount, 0);

    return { total, pending, reviewing, completed, rejected, pendingAmount, completedAmount };
  }, [refundRequests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return refundRequests.filter((item) => {
      const matchSearch =
        searchTerm === "" ||
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customerPhone && item.customerPhone.includes(searchTerm)) ||
        item.tourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.bookingCode && item.bookingCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.refundAccountNumber.includes(searchTerm);

      const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchReason = reasonFilter === "ALL" || item.reason === reasonFilter;

      return matchSearch && matchStatus && matchReason;
    });
  }, [refundRequests, searchTerm, statusFilter, reasonFilter]);

  // Confirm approve
  const handleConfirmApprove = () => {
    if (!approvingRefund) return;
    if (!bankTransCode.trim()) {
      setApprovalError("Vui lòng nhập Mã giao dịch ngân hàng / Ủy nhiệm chi.");
      return;
    }

    onApproveRefund(approvingRefund.id, bankTransCode.trim(), approvalNote.trim() || undefined);
    setApprovingRefund(null);
    setBankTransCode("");
    setApprovalNote("");
    setApprovalError("");
  };

  // Confirm reject
  const handleConfirmReject = () => {
    if (!rejectingRefund) return;
    if (!rejectReason.trim()) {
      setRejectError("Bắt buộc phải nhập lý do từ chối để thông báo cho khách hàng.");
      return;
    }

    onRejectRefund(rejectingRefund.id, rejectReason.trim());
    setRejectingRefund(null);
    setRejectReason("");
    setRejectError("");
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
              Module Tài chính & Hoàn hủy (Escrow)
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-[#075985]" />
            <span>Quản lý & Xử lý Yêu cầu Hoàn tiền</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Thẩm định yêu cầu hủy tour từ khách hàng, đối chiếu chính sách hoàn tiền và thực hiện chuyển khoản giải ngân.
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700">
              <Clock className="w-4 h-4" />
              {stats.pending > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Chờ giải ngân:</div>
              <div className="text-sm font-black text-slate-900">
                {formatVND(stats.pendingAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Tổng đơn */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổng yêu cầu</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[10px] text-slate-400">Đơn hủy tour phát sinh</p>
        </div>

        {/* Card 2: Chờ duyệt */}
        <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-300/80 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-900 text-xs font-bold">
            <span>Chờ duyệt (PENDING)</span>
            <div className="relative">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">{stats.pending}</div>
          <p className="text-[10px] text-amber-800/80 font-medium">Cần xử lý trong 24h</p>
        </div>

        {/* Card 3: Đang kiểm tra */}
        <div className="bg-sky-500/5 rounded-2xl p-4 border border-sky-300/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#075985] text-xs font-bold">
            <span>Đang kiểm tra</span>
            <ShieldAlert className="w-4 h-4 text-[#075985]" />
          </div>
          <div className="text-2xl font-black text-[#075985]">{stats.reviewing}</div>
          <p className="text-[10px] text-sky-700/80 font-medium">Đối chiếu bằng chứng</p>
        </div>

        {/* Card 4: Đã hoàn tất */}
        <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-300/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-900 text-xs font-bold">
            <span>Đã hoàn tiền</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{stats.completed}</div>
          <p className="text-[10px] text-emerald-800/80 font-medium">
            Đã chi: {formatVND(stats.completedAmount)}
          </p>
        </div>

        {/* Card 5: Đã từ chối */}
        <div className="bg-rose-500/5 rounded-2xl p-4 border border-rose-300/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-900 text-xs font-bold">
            <span>Từ chối</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{stats.rejected}</div>
          <p className="text-[10px] text-rose-800/80 font-medium">Vi phạm chính sách hủy</p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã booking, tên khách, số tài khoản..."
            className="pl-9.5 text-xs h-10 bg-slate-50 focus:bg-white border-slate-200 rounded-xl"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabs Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end text-xs">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500"
              }`}
            >
              Tất cả ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === "PENDING"
                  ? "bg-amber-500 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Chờ duyệt</span>
              {stats.pending > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-amber-700 text-[10px] flex items-center justify-center font-bold">
                  {stats.pending}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("REVIEWING")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "REVIEWING"
                  ? "bg-[#075985] text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đang kiểm tra
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "COMPLETED"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đã hoàn tiền
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("REJECTED")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "REJECTED"
                  ? "bg-rose-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Từ chối
            </button>
          </div>
        </div>
      </div>

      {/* MAIN REFUND TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy yêu cầu hoàn tiền nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Mã đơn & Khách hàng</th>
                  <th className="py-3.5 px-4">Tour du lịch & Lý do</th>
                  <th className="py-3.5 px-4">Tiền thanh toán & Tỷ lệ hoàn</th>
                  <th className="py-3.5 px-4">Tài khoản nhận tiền</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((item) => (
                  <tr key={item.id} className="hover:bg-sky-50/30 transition-colors group">
                    {/* Cột 1: Mã đơn & Khách */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-[#075985] bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                            {item.bookingCode || item.bookingId}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm">{item.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {item.customerPhone || item.customerEmail}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Gửi lúc: {new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Tour & Lý do */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-[#075985] transition-colors">
                          {item.tourName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Khởi hành: <strong>{item.tourStartDate || "N/A"}</strong></span>
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              REASON_LABELS[item.reason]?.color || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <span>{REASON_LABELS[item.reason]?.label || item.reason}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                          "{item.reasonDetail}"
                        </p>
                      </div>
                    </td>

                    {/* Cột 3: Tiền tệ & Chính sách */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="text-[11px] text-slate-500">
                          Đã thanh toán:{" "}
                          <span className="font-semibold text-slate-700">
                            {formatVND(item.originalPaidAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              item.refundPercentage === 100
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : item.refundPercentage === 50
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-rose-100 text-rose-800 border-rose-300"
                            }`}
                          >
                            Hoàn {item.refundPercentage}%
                          </span>
                          {item.refundFee > 0 && (
                            <span className="text-[10px] text-rose-600 font-medium">
                              (Phí -{formatVND(item.refundFee)})
                            </span>
                          )}
                        </div>
                        <div className="font-black text-sm text-emerald-700">
                          Thực nhận: {formatVND(item.approvedRefundAmount)}
                        </div>
                      </div>
                    </td>

                    {/* Cột 4: Tài khoản ngân hàng nhận tiền */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-200">
                          <Building2 className="w-3 h-3 text-[#075985]" />
                          <span>{item.refundBankName}</span>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-xs">
                          <span>{item.refundAccountNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.refundAccountNumber, item.id)}
                            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Sao chép số tài khoản"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="text-[11px] font-bold text-slate-700 uppercase">
                          {item.refundAccountHolder}
                        </div>
                      </div>
                    </td>

                    {/* Cột 5: Trạng thái */}
                    <td className="py-4 px-4">
                      {item.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Chờ duyệt</span>
                        </span>
                      )}
                      {item.status === "REVIEWING" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-[#075985] border border-sky-300">
                          <Clock className="w-3.5 h-3.5 text-[#075985]" />
                          <span>Đang kiểm tra</span>
                        </span>
                      )}
                      {item.status === "COMPLETED" && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đã hoàn tiền</span>
                          </span>
                          {item.bankTransactionCode && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Mã GD: {item.bankTransactionCode}
                            </div>
                          )}
                        </div>
                      )}
                      {item.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Từ chối</span>
                        </span>
                      )}
                    </td>

                    {/* Cột 6: Hành động */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedRefund(item)}
                          className="h-8 px-2.5 text-xs text-[#075985] hover:bg-sky-50 border-slate-200 rounded-xl font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
                        </Button>

                        {item.status !== "COMPLETED" && item.status !== "REJECTED" && (
                          <>
                            <Button
                              type="button"
                              onClick={() => {
                                setApprovingRefund(item);
                                setBankTransCode("");
                                setApprovalNote("");
                                setApprovalError("");
                              }}
                              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold gap-1 shadow-2xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Duyệt chi</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setRejectingRefund(item);
                                setRejectReason("");
                                setRejectError("");
                              }}
                              className="h-8 px-2.5 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: XEM CHI TIẾT HỒ SƠ HOÀN TIỀN & MÃ VIETQR                         */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(selectedRefund)} onOpenChange={(open) => !open && setSelectedRefund(null)}>
        <DialogContent className="sm:max-w-4xl md:max-w-4xl w-[94vw] max-w-4xl rounded-3xl p-0 bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden block">
          {selectedRefund && (
            <div className="flex flex-col max-h-[88vh]">
              {/* Header */}
              <div className="px-7 py-5 border-b border-slate-200/80 bg-gradient-to-r from-amber-500/10 via-sky-50/40 to-white pr-14">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                      Hồ sơ hoàn tiền #{selectedRefund.id}
                    </span>
                    <span className="font-mono font-bold text-xs bg-white text-[#075985] px-2.5 py-1 rounded-full border border-slate-200">
                      Booking: {selectedRefund.bookingCode || selectedRefund.bookingId}
                    </span>
                  </div>

                  <div>
                    {selectedRefund.status === "PENDING" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
                        ⏳ Đang chờ xét duyệt & chuyển tiền
                      </span>
                    )}
                    {selectedRefund.status === "COMPLETED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                        ✓ Đã hoàn tất giải ngân
                      </span>
                    )}
                    {selectedRefund.status === "REJECTED" && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
                        ✕ Bị từ chối
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {selectedRefund.tourName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Khách hàng: <strong className="text-slate-800">{selectedRefund.customerName}</strong> ·{" "}
                    Khởi hành: <strong className="text-slate-800">{selectedRefund.tourStartDate || "N/A"}</strong>
                  </p>
                </div>
              </div>

              {/* 2-Column Body */}
              <div className="p-7 space-y-5 overflow-y-auto bg-slate-50/60 flex-1 text-xs">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Cột trái (7 cols): Thông tin hoàn tiền & lý do */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Bảng số tiền & chính sách */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <Banknote className="w-4 h-4 text-[#075985]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          1. Đối chiếu số tiền & Chính sách hoàn trả
                        </h3>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[11px] text-slate-400 font-semibold block">Tiền khách đã trả</span>
                          <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                            {formatVND(selectedRefund.originalPaidAmount)}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                          <span className="text-[11px] text-rose-600 font-semibold block">Phí hủy giữ lại</span>
                          <span className="font-bold text-rose-700 text-sm mt-0.5 block">
                            -{formatVND(selectedRefund.refundFee)}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300">
                          <span className="text-[11px] text-emerald-800 font-semibold block">
                            Thực hoàn ({selectedRefund.refundPercentage}%)
                          </span>
                          <span className="font-black text-emerald-700 text-sm mt-0.5 block">
                            {formatVND(selectedRefund.approvedRefundAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-600 leading-relaxed text-[11px]">
                        <strong>Căn cứ điều khoản hoàn hủy:</strong> Yêu cầu gửi lúc{" "}
                        {new Date(selectedRefund.createdAt).toLocaleDateString("vi-VN")}. Tỷ lệ khấu trừ được tự động tính
                        toán theo thời gian cách ngày khởi hành ({selectedRefund.refundPercentage}% hoàn trả).
                      </div>
                    </div>

                    {/* Lý do hủy chi tiết */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <AlertTriangle className="w-4 h-4 text-[#075985]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          2. Lý do hủy tour từ khách hàng
                        </h3>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                          Phân loại lý do
                        </span>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${
                              REASON_LABELS[selectedRefund.reason]?.color || "bg-slate-100"
                            }`}
                          >
                            <span>{REASON_LABELS[selectedRefund.reason]?.label || selectedRefund.reason}</span>
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                          Nội dung mô tả chi tiết (reason_detail)
                        </span>
                        <div className="mt-1 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                          "{selectedRefund.reasonDetail}"
                        </div>
                      </div>

                      {/* Nếu có lý do từ chối */}
                      {selectedRefund.rejectionReason && (
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-rose-950">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>Lý do Ban Quản trị từ chối:</span>
                          </div>
                          <p className="text-rose-800 italic pl-5.5">"{selectedRefund.rejectionReason}"</p>
                        </div>
                      )}

                      {/* Nếu đã hoàn tất */}
                      {selectedRefund.bankTransactionCode && (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Giao dịch ngân hàng đã giải ngân:</span>
                          </div>
                          <p className="text-emerald-800 pl-5.5">
                            Mã tham chiếu / Ủy nhiệm chi:{" "}
                            <strong className="font-mono text-emerald-950">{selectedRefund.bankTransactionCode}</strong>
                          </p>
                          {selectedRefund.reviewNote && (
                            <p className="text-emerald-800 pl-5.5 italic">Ghi chú: "{selectedRefund.reviewNote}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cột phải (5 cols): Tài khoản ngân hàng & VietQR */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Thẻ tài khoản thụ hưởng */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <CreditCard className="w-4 h-4 text-[#075985]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          3. Tài khoản thụ hưởng của khách
                        </h3>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                            Ngân hàng nhận
                          </span>
                          <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                            {selectedRefund.refundBankName}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                            Số tài khoản (STK)
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-black text-slate-900 text-base bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                              {selectedRefund.refundAccountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedRefund.refundAccountNumber, "modal-stk")}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {copiedId === "modal-stk" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                            Tên chủ tài khoản
                          </span>
                          <span className="font-black text-slate-900 text-sm uppercase mt-0.5 block">
                            {selectedRefund.refundAccountHolder}
                          </span>
                        </div>
                      </div>

                      {/* VIETQR TỰ ĐỘNG SINH ĐỂ ADMIN QUÉT MÃ CHUYỂN TIỀN NHANH */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/50 border border-slate-200 text-center space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-[#075985]" />
                          <span>Mã VietQR chuyển tiền tự động</span>
                        </span>

                        <div className="w-40 h-40 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs mx-auto flex items-center justify-center">
                          <img
                            src={`https://img.vietqr.io/image/${
                              BANK_CODE_MAP[selectedRefund.refundBankName] || "VCB"
                            }-${selectedRefund.refundAccountNumber}-compact2.png?amount=${
                              selectedRefund.approvedRefundAmount
                            }&addInfo=${encodeURIComponent(
                              `Hoan tien ${selectedRefund.bookingCode || selectedRefund.bookingId}`
                            )}&accountName=${encodeURIComponent(selectedRefund.refundAccountHolder)}`}
                            alt="VietQR Chuyển tiền"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              // Fallback nếu không tải được ảnh QR
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Quét mã trên App ngân hàng để tự động điền STK & Số tiền
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-7 py-4.5 bg-white border-t border-slate-200/80 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRefund(null)}
                  className="text-xs h-10 px-5 rounded-xl cursor-pointer"
                >
                  Đóng
                </Button>

                <div className="flex items-center gap-2">
                  {selectedRefund.status !== "COMPLETED" && selectedRefund.status !== "REJECTED" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRejectingRefund(selectedRefund);
                          setSelectedRefund(null);
                        }}
                        className="h-10 px-4.5 border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1.5 cursor-pointer rounded-xl"
                      >
                        <X className="w-4 h-4" />
                        <span>Từ chối</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={() => {
                          setApprovingRefund(selectedRefund);
                          setSelectedRefund(null);
                        }}
                        className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 cursor-pointer shadow-xs rounded-xl"
                      >
                        <Check className="w-4 h-4" />
                        <span>Duyệt chi & Chuyển tiền</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: DUYỆT HOÀN TIỀN & XÁC NHẬN MÃ GIAO DỊCH NGÂN HÀNG                */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(approvingRefund)} onOpenChange={(open) => !open && setApprovingRefund(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white text-slate-900 border border-slate-200 shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <Banknote className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Xác nhận Đã hoàn tiền cho Khách hàng
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Khách hàng: <strong className="text-slate-900">{approvingRefund?.customerName}</strong> ·{" "}
              Số tiền: <strong className="text-emerald-700">{formatVND(approvingRefund?.approvedRefundAmount || 0)}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Tài khoản nhận tiền:</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                {approvingRefund?.refundBankName} · STK: <strong>{approvingRefund?.refundAccountNumber}</strong> (
                {approvingRefund?.refundAccountHolder})
              </p>
            </div>

            {/* Ô nhập mã giao dịch ngân hàng */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-900">
                Mã tham chiếu ngân hàng / Mã giao dịch (bank_transaction_code) <span className="text-rose-600">*</span>
              </Label>
              <Input
                value={bankTransCode}
                onChange={(e) => {
                  setBankTransCode(e.target.value.toUpperCase());
                  setApprovalError("");
                }}
                placeholder="VD: FT26298VCB098877, MBB20261025..."
                className={`text-xs h-10 font-mono font-bold uppercase ${
                  approvalError ? "border-rose-500 focus:ring-rose-500" : ""
                }`}
              />
              {approvalError && <p className="text-[11px] text-rose-600 font-semibold">{approvalError}</p>}
            </div>

            {/* Ghi chú duyệt */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Ghi chú nội bộ của Quản trị viên (Tùy chọn):
              </Label>
              <Textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                rows={2}
                placeholder="Ghi chú xác nhận chuyển khoản..."
                className="text-xs bg-slate-50 focus:bg-white resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApprovingRefund(null)}
              className="text-xs h-10 px-4 rounded-xl cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              onClick={handleConfirmApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận Hoàn tất giải ngân</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: TỪ CHỐI HOÀN TIỀN (BẮT BUỘC NHẬP LÝ DO)                          */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(rejectingRefund)} onOpenChange={(open) => !open && setRejectingRefund(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white text-slate-900 border border-slate-200 shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-2">
              <XCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Từ chối Yêu cầu Hoàn tiền
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Khách hàng: <strong className="text-slate-900">{rejectingRefund?.customerName}</strong> (Tour:{" "}
              {rejectingRefund?.tourName})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            {/* Nhập lý do từ chối */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-900">
                Lý do từ chối hoàn tiền (Bắt buộc) <span className="text-rose-600">*</span>
              </Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  setRejectError("");
                }}
                rows={3}
                placeholder="Ghi rõ lý do tại sao không thể giải ngân hoàn tiền để thông báo cho khách hàng..."
                className={`text-xs bg-slate-50 focus:bg-white resize-none ${
                  rejectError ? "border-rose-500 focus:ring-rose-500" : ""
                }`}
              />
              {rejectError && <p className="text-[11px] text-rose-600 font-semibold">{rejectError}</p>}
            </div>

            {/* Gợi ý lý do nhanh */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý lý do phổ biến (Bấm để chọn nhanh):</span>
              </span>
              <div className="flex flex-col gap-1.5">
                {REJECTION_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRejectReason(preset);
                      setRejectError("");
                    }}
                    className="text-left text-[11px] p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    • {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectingRefund(null)}
              className="text-xs h-10 px-4 rounded-xl cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-5 rounded-xl gap-1.5 cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
              <span>Xác nhận Từ chối</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
