import { useState } from "react";
import { Booking, SystemBankAccount } from "@/app/types";
import {
  Landmark,
  CreditCard,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Building2,
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  Handshake,
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
} from "@/app/components/ui/dialog";

interface AdminFinancialManagementProps {
  systemBank: SystemBankAccount;
  onUpdateSystemBank: (bank: SystemBankAccount) => void;
  bookings: Booking[];
  onSettleBooking: (
    bookingId: string,
    settledAmount: number,
    platformFee: number,
    targetAgencyId?: string,
    bankReference?: string
  ) => void;
}

const COMMON_BANKS = [
  "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)",
  "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)",
  "Ngân hàng TMCP Quân đội (MB Bank)",
  "Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)",
  "Ngân hàng TMCP Công thương Việt Nam (VietinBank)",
  "Ngân hàng Nông nghiệp và PT Nông thôn Việt Nam (Agribank)",
  "Ngân hàng TMCP Á Châu (ACB)",
  "Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)",
  "Ngân hàng TMCP Tiên Phong (TPBank)",
];

function formatVND(n: number) {
  return (n || 0).toLocaleString("vi-VN") + "đ";
}

export function AdminFinancialManagement({
  systemBank,
  onUpdateSystemBank,
  bookings,
  onSettleBooking,
}: AdminFinancialManagementProps) {
  // Bank form state
  const [bankName, setBankName] = useState(systemBank.bankName);
  const [accountNumber, setAccountNumber] = useState(systemBank.accountNumber);
  const [accountHolder, setAccountHolder] = useState(systemBank.accountHolder);
  const [branch, setBranch] = useState(systemBank.branch || "");
  const [defaultCommissionRate, setDefaultCommissionRate] = useState(
    systemBank.defaultCommissionRate ?? 0,
  );
  const [notes, setNotes] = useState(systemBank.notes || "");
  const [bankSavedToast, setBankSavedToast] = useState(false);

  // Settlement modal state
  const [selectedBookingForSettlement, setSelectedBookingForSettlement] =
    useState<Booking | null>(null);
  const [settlementTransactionCode, setSettlementTransactionCode] =
    useState("");
  const [settlementNote, setSettlementNote] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "settled">(
    "all",
  );

  const handleSaveBankInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSystemBank({
      bankName,
      accountNumber,
      accountHolder: accountHolder.toUpperCase(),
      branch,
      defaultCommissionRate: Number(defaultCommissionRate),
      notes,
    });
    setBankSavedToast(true);
    setTimeout(() => setBankSavedToast(false), 3500);
  };

  // Helper to compute paid amount from customer for a booking
  const getPaidAmount = (b: Booking) => {
    if (!b.paymentRequests || b.paymentRequests.length === 0) {
      if (b.paymentStatus === "paid") return b.totalPrice;
      if (b.depositPaid) return b.depositAmount ?? Math.ceil(b.totalPrice * 0.5);
      return 0;
    }
    return b.paymentRequests
      .filter((pr) => pr.status === "paid")
      .reduce((sum, pr) => sum + pr.amount, 0);
  };

  // Financial stats
  const totalHeldInEscrow = bookings.reduce((sum, b) => {
    if (b.settlementStatus === "settled") return sum;
    return sum + getPaidAmount(b);
  }, 0);

  const totalSettledAmount = bookings
    .filter((b) => b.settlementStatus === "settled")
    .reduce((sum, b) => sum + (b.settledAmount || 0), 0);

  const totalPlatformFeesCollected = bookings
    .filter((b) => b.settlementStatus === "settled")
    .reduce((sum, b) => sum + (b.platformFeeAmount || 0), 0);

  const completedToursPendingSettlement = bookings.filter(
    (b) =>
      b.status === "completed" &&
      b.settlementStatus !== "settled" &&
      getPaidAmount(b) > 0,
  ).length;

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    const paid = getPaidAmount(b);
    if (paid === 0) return false; // Only show bookings with payments in escrow
    const matchesSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.companyName &&
        b.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

    const isSettled = b.settlementStatus === "settled";
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "settled"
        ? isSettled
        : !isSettled;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="border-b border-gray-200 pb-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center shadow-xs">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Tài chính, STK Ngân hàng Sàn & Quyết toán
                </h1>
                <p className="text-sm text-gray-500">
                  Quản lý tài khoản ngân hàng trung gian của hệ thống và giải ngân chi trả cho công ty du lịch
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Hệ thống Quản lý Dòng tiền Escrow An toàn
          </div>
        </div>
      </div>

      {/* SUCCESS TOAST ALERT */}
      {bankSavedToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>
              <strong>Cập nhật thành công!</strong> Thông tin STK Hệ thống đã được lưu. Tất cả khách hàng khi thanh toán tour sẽ thấy STK mới này.
            </span>
          </div>
          <button
            onClick={() => setBankSavedToast(false)}
            className="text-white hover:text-emerald-100 text-xs underline ml-4"
          >
            Đóng
          </button>
        </div>
      )}

      {/* TOP SECTION: SYSTEM BANK ACCOUNT CONFIGURATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Bank config */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#075985]" />
              <h2 className="text-base font-bold text-gray-900">
                Cấu hình Tài khoản Ngân hàng Sàn (Hệ thống)
              </h2>
            </div>
            <span className="text-xs text-gray-400">Dùng chung cho toàn hệ thống</span>
          </div>

          <form onSubmit={handleSaveBankInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold text-gray-700">
                  Tên ngân hàng thụ hưởng <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    list="banks-list"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Chọn hoặc nhập tên ngân hàng"
                    required
                    className="text-xs"
                  />
                  <datalist id="banks-list">
                    {COMMON_BANKS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">
                  Số tài khoản nhận tiền <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ""))}
                  placeholder="Ví dụ: 9888666888"
                  required
                  className="font-mono font-bold text-[#075985] text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">
                  Tên chủ tài khoản <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                  placeholder="CONG TY CP CONG NGHE DU LICH..."
                  required
                  className="font-bold uppercase text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">
                  Chi nhánh ngân hàng
                </Label>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="Hội sở TP. Hồ Chí Minh"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Phí hoa hồng sàn mặc định (%)</span>
                  <span className="text-[11px] text-[#075985] font-bold">Khấu trừ khi kết thúc tour</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={defaultCommissionRate}
                    onChange={(e) => setDefaultCommissionRate(Number(e.target.value))}
                    className="font-bold text-xs pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">%</span>
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold text-gray-700">
                  Thông điệp / Ghi chú hiển thị cho khách hàng khi chuyển khoản
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú hướng dẫn cho khách chuyển khoản..."
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="bg-[#075985] hover:bg-[#F97316] text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Lưu cấu hình tài khoản Hệ thống
              </Button>
            </div>
          </form>
        </div>

        {/* Right Preview Card: Simulated Bank Card & QR */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md space-y-4 relative overflow-hidden border border-blue-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300">
                  Tài khoản trung gian (Escrow)
                </span>
                <p className="text-sm font-bold text-white mt-0.5 line-clamp-1">{bankName}</p>
              </div>
              <Landmark className="w-6 h-6 text-blue-300" />
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-gray-300 block">Số tài khoản hệ thống</span>
              <p className="text-xl font-mono font-extrabold tracking-wider text-amber-300">
                {accountNumber || "Chưa thiết lập"}
              </p>
            </div>

            <div className="flex justify-between items-end pt-2 border-t border-blue-800/80 text-xs">
              <div>
                <span className="text-[10px] text-gray-300 block">Chủ tài khoản</span>
                <p className="font-bold uppercase tracking-wide text-white text-xs line-clamp-1">
                  {accountHolder || "TÊN CÔNG TY SÀN DU LỊCH"}
                </p>
              </div>
              {branch && (
                <div className="text-right">
                  <span className="text-[10px] text-gray-300 block">Chi nhánh</span>
                  <p className="text-[11px] text-gray-200 line-clamp-1">{branch}</p>
                </div>
              )}
            </div>
          </div>

          {/* Escrow Mechanism Explanation */}
          <div className="bg-[#F0F9FF]/70 border border-[#CBD5E1] rounded-2xl p-4 text-xs space-y-2 text-blue-950">
            <p className="font-bold flex items-center gap-1.5 text-blue-900">
              <Info className="w-4 h-4 text-[#075985] flex-shrink-0" />
              Quy trình Dòng tiền Hệ thống:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-gray-700 text-[11px] leading-relaxed">
              <li>
                <strong>Khách thanh toán:</strong> Tiền được chuyển vào STK sàn này và lưu giữ an toàn.
              </li>
              <li>
                <strong>Công ty tổ chức tour:</strong> Khách đi tour theo đúng lộ trình đã cam kết.
              </li>
              <li>
                <strong>Kết thúc tour:</strong> Admin kiểm tra và bấm quyết toán chuyển tiền lại cho Công ty lữ hành (miễn phí sàn 0%).
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* KPI STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-medium">Tiền đang tạm giữ tại Sàn</span>
          <p className="text-2xl font-extrabold text-[#075985]">{formatVND(totalHeldInEscrow)}</p>
          <p className="text-[11px] text-gray-400">Các tour chưa quyết toán</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-medium">Tour hoàn thành chờ quyết toán</span>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-extrabold text-amber-600">
              {completedToursPendingSettlement}
            </p>
            {completedToursPendingSettlement > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full animate-pulse">
                Cần xử lý
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">Đã đi tour xong, sẵn sàng chuyển tiền</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-medium">Tổng đã chuyển cho Cty lữ hành</span>
          <p className="text-2xl font-extrabold text-emerald-700">{formatVND(totalSettledAmount)}</p>
          <p className="text-[11px] text-emerald-600 font-medium">Đã thanh toán đầy đủ</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-medium">Hoa hồng sàn đã thu</span>
          <p className="text-2xl font-extrabold text-[#EA580C]">
            {formatVND(totalPlatformFeesCollected)}
          </p>
          <p className="text-[11px] text-[#F97316] font-medium">Doanh thu sàn thực tế</p>
        </div>
      </div>

      {/* SETTLEMENT TABLE: BOOKINGS WITH MONEY IN ESCROW */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Danh sách Booking Tạm giữ Tiền &amp; Quyết toán cho Công ty Du lịch
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sau khi kết thúc tour, Admin thực hiện kiểm tra và xác nhận chuyển trả tiền cho Công ty lữ hành (áp dụng chính sách miễn phí sàn hiện tại).
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã booking, cty, khách..."
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white h-9"
            >
              <option value="all">Tất cả ({filteredBookings.length})</option>
              <option value="pending">Chờ quyết toán</option>
              <option value="settled">Đã quyết toán</option>
            </select>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-gray-400 space-y-2">
            <Landmark className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-medium">Không tìm thấy giao dịch nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Booking / Tour</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Công ty lữ hành</th>
                  <th className="py-3 px-4 text-right">Tổng giá trị</th>
                  <th className="py-3 px-4 text-right">Đã nộp vào TK Sàn</th>
                  <th className="py-3 px-4 text-center">Trạng thái Tour</th>
                  <th className="py-3 px-4 text-center">Trạng thái Quyết toán</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((b) => {
                  const paid = getPaidAmount(b);
                  const isSettled = b.settlementStatus === "settled";
                  const isTourCompleted = b.status === "completed";
                  const feeRate = b.platformFeeRate ?? defaultCommissionRate;
                  const estimatedFee = Math.round((paid * feeRate) / 100);
                  const estimatedSettled = paid - estimatedFee;

                  return (
                    <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#075985] block">#{b.id}</span>
                        <span className="font-semibold text-gray-900 block max-w-xs truncate">
                          {b.tour.name}
                        </span>
                        <span className="text-[11px] text-gray-400">Khởi hành: {b.tourStartDate}</span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900">{b.userName}</p>
                        <p className="text-[11px] text-gray-400">{b.contactPhone || b.userEmail}</p>
                      </td>

                      <td className="py-3 px-4">
                        {b.isCoHosted || b.tour?.isCoHosted ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-[#F97316]/15 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#F97316]/30">
                              <Handshake className="w-3 h-3 text-[#F97316]" />
                              Tour Liên Minh (2 Cty)
                            </span>
                            <div className="space-y-0.5 text-[11px]">
                              <p className="font-bold text-gray-900 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#075985] flex-shrink-0"></span>
                                <span className="truncate">
                                  {b.coHosts?.find((c) => c.role === "lead")?.companyName || b.companyName} ({b.coHosts?.find((c) => c.role === "lead")?.revenueSharePercentage ?? 40}%)
                                </span>
                              </p>
                              <p className="font-bold text-purple-900 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] flex-shrink-0"></span>
                                <span className="truncate">
                                  {b.coHosts?.find((c) => c.role === "partner")?.companyName || "Đối tác"} ({b.coHosts?.find((c) => c.role === "partner")?.revenueSharePercentage ?? 60}%)
                                </span>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-gray-800 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            {b.companyName || b.tour.companyName || "Viettravel"}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-gray-700">
                        {formatVND(b.totalPrice)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-extrabold text-[#075985] text-sm block">
                          {formatVND(paid)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">Trong TK Sàn</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === "completed"
                              ? "bg-[#E0F2FE] text-blue-800"
                              : b.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.status === "completed"
                            ? "Đã hoàn thành tour"
                            : b.status === "confirmed"
                            ? "Đang chuẩn bị/Dẫn tour"
                            : "Chờ duyệt"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isSettled ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã quyết toán
                            </span>
                            <p className="text-[10px] text-gray-400">
                              Đã chuyển: {formatVND(b.settledAmount ?? 0)}
                            </p>
                          </div>
                        ) : isTourCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Sẵn sàng quyết toán
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                            <ShieldCheck className="w-3 h-3 text-[#075985]" />
                            Đang tạm giữ Escrow
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isSettled ? (
                          <span className="text-xs text-gray-400 font-medium">Hoàn tất</span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!isTourCompleted}
                            onClick={() => {
                              setSelectedBookingForSettlement(b);
                              setSettlementTransactionCode(`UNC-${Date.now().toString().slice(-6)}`);
                            }}
                            className={`text-xs h-8 gap-1.5 font-bold shadow-xs ${
                              isTourCompleted
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                            }`}
                            title={
                              isTourCompleted
                                ? "Bấm để quyết toán và chuyển tiền cho công ty du lịch"
                                : "Tour chưa hoàn thành. Tiền được tạm giữ để bảo vệ khách hàng."
                            }
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Quyết toán cho Cty
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: QUYẾT TOÁN & CHUYỂN TIỀN CHO CÔNG TY DU LỊCH */}
      <Dialog
        open={Boolean(selectedBookingForSettlement)}
        onOpenChange={(open) => !open && setSelectedBookingForSettlement(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedBookingForSettlement && (() => {
            const b = selectedBookingForSettlement;
            const paid = getPaidAmount(b);
            const feeRate = defaultCommissionRate;
            const platformFee = Math.round((paid * feeRate) / 100);
            const finalSettledAmount = paid - platformFee;

            const isCoHosted = Boolean(b.isCoHosted || b.tour?.isCoHosted);
            const hasBookingAgencies = Boolean(b.bookingAgencies && b.bookingAgencies.length > 0);
            const coHosts = b.coHosts || b.tour?.coHosts || [];

            const agencyShares = hasBookingAgencies
              ? b.bookingAgencies!.map((a) => {
                  const fee = a.platformFee !== undefined ? a.platformFee : Math.round((a.finalAmount * feeRate) / 100);
                  const net = a.netPayout !== undefined ? a.netPayout : a.finalAmount - fee;
                  return {
                    id: a.id,
                    agencyId: a.agencyId,
                    agencyName: a.agencyName,
                    isHost: a.isHost,
                    finalAmount: a.finalAmount,
                    platformFee: fee,
                    netPayout: net,
                    settlementStatus: a.settlementStatus || "ready",
                    bankReference: a.bankReferenceCode,
                  };
                })
              : coHosts.map((host) => {
                  let amount = 0;
                  if (host.fixedPayoutAmount) {
                    amount = host.fixedPayoutAmount;
                  } else if (host.quotePerGuest) {
                    amount = host.quotePerGuest * b.numberOfGuests;
                  } else if (host.revenueSharePercentage) {
                    amount = Math.round((finalSettledAmount * host.revenueSharePercentage) / 100);
                  } else {
                    amount = Math.round(finalSettledAmount / (coHosts.length || 1));
                  }
                  const fee = Math.round((amount * feeRate) / 100);
                  return {
                    id: host.id,
                    agencyId: host.companyId,
                    agencyName: host.companyName,
                    isHost: host.role === "lead",
                    finalAmount: amount,
                    platformFee: fee,
                    netPayout: amount - fee,
                    settlementStatus: host.settlementStatus || "ready",
                    bankReference: undefined,
                  };
                });

            return (
              <div className="space-y-4 text-xs">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base text-gray-900">
                    <Landmark className="w-5 h-5 text-emerald-600" />
                    {isCoHosted
                      ? `Quyết toán Tiền Tour Liên Minh Đối Tác (${agencyShares.length} Đơn Vị Phối Hợp)`
                      : "Quyết toán Tiền Tour cho Công ty Du lịch"}
                  </DialogTitle>
                </DialogHeader>

                {/* Tour & Partner info */}
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 space-y-1.5">
                  <p className="font-bold text-gray-900 text-sm">
                    {b.tour.name}
                  </p>
                  <div className="flex justify-between text-gray-600">
                    <span>Mã Booking: <strong>#{b.id}</strong></span>
                    <span>Khách: <strong>{b.userName}</strong></span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>
                      Công ty thụ hưởng:{" "}
                      <strong className="text-[#075985]">
                        {isCoHosted && agencyShares.length > 0
                          ? agencyShares.map((c) => c.agencyName).join(" + ")
                          : b.companyName || b.tour.companyName}
                      </strong>
                    </span>
                    <span>Số khách: <strong>{b.numberOfGuests}</strong></span>
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="bg-[#F0F9FF]/60 rounded-xl p-4 border border-[#CBD5E1] space-y-2.5">
                  <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wide">
                    Bảng Kê Chi Tiết Dòng Tiền Escrow Sàn:
                  </h4>
                  <div className="space-y-1.5 text-gray-700">
                    <div className="flex justify-between items-center">
                      <span>1. Tổng tiền khách đã thanh toán vào TK Hệ thống:</span>
                      <span className="font-bold text-gray-900 text-sm">{formatVND(paid)}</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-700">
                      <span>2. Khấu trừ Phí hoa hồng sàn ({feeRate}%):</span>
                      <span className="font-bold">{feeRate === 0 ? "0đ (Miễn phí sàn)" : `- ${formatVND(platformFee)}`}</span>
                    </div>
                    <div className="border-t border-[#CBD5E1] pt-2 flex justify-between items-center text-sm">
                      <span className="font-bold text-gray-900">
                        3. Tổng tiền chuyển cho các đơn vị tổ chức:
                      </span>
                      <span className="text-base font-extrabold text-emerald-700">
                        {formatVND(finalSettledAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CO-HOSTED SPLIT BREAKDOWN */}
                {isCoHosted && agencyShares.length > 0 && (
                  <div className="bg-[#F0F9FF]/80 rounded-xl p-3.5 border border-[#F97316]/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5 uppercase">
                        <Handshake className="w-4 h-4 text-[#F97316]" />
                        Phân Chia Quyết Toán Cho {agencyShares.length} Công Ty Liên Minh:
                      </span>
                      <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded">
                        Độc lập theo từng chặng
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {agencyShares.map((agency) => {
                        const isAgencySettled = agency.settlementStatus === "settled";
                        return (
                          <div key={agency.id} className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 text-xs truncate max-w-[150px]">
                                {agency.agencyName}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${agency.isHost ? "bg-[#E0F2FE] text-blue-800" : "bg-[#F97316]/15 text-purple-800"}`}>
                                {agency.isHost ? "🏢 Chủ trì (Lead)" : "🤝 Đối tác (Partner)"}
                              </span>
                            </div>

                            <div className="space-y-1 text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Doanh thu chặng:</span>
                                <span className="font-semibold text-gray-800">{formatVND(agency.finalAmount)}</span>
                              </div>
                              <div className="flex justify-between text-rose-600">
                                <span>Phí sàn ({feeRate}%):</span>
                                <span>- {formatVND(agency.platformFee)}</span>
                              </div>
                              <div className="flex justify-between font-bold pt-1 border-t border-gray-200 text-emerald-700">
                                <span>Thực nhận giải ngân:</span>
                                <span>{formatVND(agency.netPayout)}</span>
                              </div>
                            </div>

                            <div className="pt-1">
                              {isAgencySettled ? (
                                <span className="inline-flex items-center justify-center w-full gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Đã quyết toán ({agency.bankReference || settlementTransactionCode})
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  disabled={!settlementTransactionCode}
                                  onClick={() => {
                                    onSettleBooking(
                                      b.id,
                                      agency.netPayout,
                                      agency.platformFee,
                                      agency.agencyId,
                                      settlementTransactionCode
                                    );
                                    setSettlementTransactionCode(`UNC-${Date.now().toString().slice(-6)}`);
                                  }}
                                  className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white text-[11px] h-7 font-bold gap-1 shadow-2xs"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  Giải ngân riêng chặng này ({formatVND(agency.netPayout)})
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Transaction details inputs */}
                <div className="space-y-3 pt-1">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">
                      Mã giao dịch / Mã Ủy nhiệm chi (UNC) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={settlementTransactionCode}
                      onChange={(e) => setSettlementTransactionCode(e.target.value)}
                      placeholder="VD: UNC-982144"
                      className="mt-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">
                      Ghi chú quyết toán (Tùy chọn)
                    </Label>
                    <Input
                      value={settlementNote}
                      onChange={(e) => setSettlementNote(e.target.value)}
                      placeholder="VD: Đã chuyển khoản qua Vietcombank số lệnh #..."
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedBookingForSettlement(null)}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                    disabled={!settlementTransactionCode}
                    onClick={() => {
                      onSettleBooking(b.id, finalSettledAmount, platformFee, undefined, settlementTransactionCode);
                      setSelectedBookingForSettlement(null);
                      setSettlementNote("");
                    }}
                  >
                    <Check className="w-4 h-4" />
                    {isCoHosted && agencyShares.length > 0
                      ? `Xác nhận chuyển toàn bộ ${formatVND(finalSettledAmount)} cho tất cả đơn vị`
                      : `Xác nhận đã chuyển ${formatVND(finalSettledAmount)} cho Cty`}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
