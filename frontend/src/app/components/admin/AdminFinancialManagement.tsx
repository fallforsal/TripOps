import { AdminAllianceAllocationLedger } from "./AdminAllianceAllocationLedger";
import { useEffect, useState } from "react";
import { toast } from "@/app/lib/notifications";
import { getPlatformBankAccount, savePlatformBankAccount } from "@/app/services/settlements";
import { Booking, SystemBankAccount } from "@/app/types";
import {
  Landmark,
  CreditCard,
  DollarSign,
  ArrowRight,
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

/** "Failed to fetch" = trình duyệt không gọi được API (backend chưa chạy / đang khởi động lại). */
function apiErrorText(err: unknown, fallback: string) {
  if (err instanceof TypeError) return "Không kết nối được máy chủ API. Kiểm tra backend đã chạy chưa rồi thử lại.";
  return err instanceof Error && err.message ? err.message : fallback;
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

  const [savingBank, setSavingBank] = useState(false);
  const [bankError, setBankError] = useState("");

  // Đọc cấu hình đã lưu ở backend (STK sàn + phí sàn đang áp dụng).
  useEffect(() => {
    let alive = true;
    getPlatformBankAccount()
      .then((saved) => {
        if (!alive) return;
        if (saved.configured) {
          setBankName(saved.bankName ?? "");
          setAccountNumber(saved.accountNumber ?? "");
          setAccountHolder(saved.accountHolder ?? "");
          setBranch(saved.branch ?? "");
          setNotes(saved.notes ?? "");
        }
        setDefaultCommissionRate(saved.commissionPercent);
      })
      .catch((err) => alive && setBankError(apiErrorText(err, "Không tải được cấu hình.")));
    return () => {
      alive = false;
    };
  }, []);

  const handleSaveBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setBankError("");
    try {
      const saved = await savePlatformBankAccount({
        bankName,
        accountNumber,
        accountHolder,
        branch,
        notes,
        commissionPercent: Number(defaultCommissionRate),
      });
      setAccountNumber(saved.accountNumber ?? accountNumber);
      setAccountHolder(saved.accountHolder ?? accountHolder);
      setDefaultCommissionRate(saved.commissionPercent);
      toast.success("Đã lưu tài khoản ngân hàng sàn và phí sàn.", {
        description: "Phí sàn mới áp dụng cho các tour hoàn thành từ bây giờ.",
      });
    } catch (err) {
      const text = apiErrorText(err, "Không lưu được cấu hình.");
      setBankError(text);
      toast.error(text);
    } finally {
      setSavingBank(false);
    }
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

        </div>
      </div>

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
                <Label className="text-xs font-semibold text-gray-700">Phí sàn (%)</Label>
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
                <p className="text-[11px] text-gray-500">Áp dụng cho tour hoàn thành sau khi lưu.</p>
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

            <div className="flex items-center justify-end gap-3 pt-2">
              {bankError && <p role="alert" className="text-xs text-rose-600 mr-auto">{bankError}</p>}
              <Button
                type="submit"
                disabled={savingBank}
                className="bg-[#075985] hover:bg-[#0C4A6E] text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                {savingBank ? "Đang lưu..." : "Lưu"}
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
                <strong>Kết thúc tour:</strong> sau 2 ngày hệ thống tự quyết toán cho Công ty lữ hành (trừ phí sàn 10%); có khiếu nại thì Admin xử lý và chuyển thủ công.
              </li>
            </ol>
          </div>
        </div>
      </div>

      <AdminAllianceAllocationLedger />
    </div>
  );
}
