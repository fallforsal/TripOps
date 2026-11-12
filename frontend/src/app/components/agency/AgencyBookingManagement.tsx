import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from "@/app/components/ui/alert-dialog";
import { useMemo, useState } from "react";
import { Booking, User } from "@/app/types";
import {
  ArrowUpDown,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  Eye,
  Printer,
  Sparkles,
  Building2,
  AlertCircle,
  Filter,
  Handshake,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export interface AgencyBookingManagementProps {
  bookings: Booking[];
  guides: User[];
  companyName: string;
  onApproveBooking: (bookingId: string) => void;
  onRejectBooking: (bookingId: string, reason?: string) => void;
  onAssignGuide: (bookingId: string, guideId: string) => void;
  onMarkDepositPaid?: (bookingId: string) => void;
  onMarkFullyPaid?: (bookingId: string) => void;
  onGenerateContract?: (bookingId: string) => void;
  onViewBookingDetail?: (booking: Booking) => void;
}

const statusMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: "Chờ duyệt", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300" },
  confirmed: { label: "Đã xác nhận", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  in_progress: { label: "Đang diễn ra", bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" },
  cancelled: { label: "Đã hủy", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  completed: { label: "Hoàn thành", bg: "bg-[#F0F9FF]", text: "text-[#075985]", border: "border-[#CBD5E1]" },
  rejected: { label: "Từ chối", bg: "bg-gray-100", text: "text-gray-700", border: "border-[#CBD5E1]" },
};

const paymentStatusMap: Record<NonNullable<Booking["paymentStatus"]>, { label: string; color: string; badgeBg: string }> = {
  unpaid: { label: "Chưa thanh toán", color: "text-amber-800", badgeBg: "bg-amber-50 border-amber-200" },
  partially_paid: { label: "Đã thanh toán một phần", color: "text-sky-800", badgeBg: "bg-sky-50 border-sky-200" },
  paid: { label: "Đã thanh toán", color: "text-emerald-700", badgeBg: "bg-emerald-50 border-emerald-200" },
  refunded: { label: "Đã hoàn tiền", color: "text-[#EA580C]", badgeBg: "bg-[#F0F9FF] border-[#F97316]/30" },
};

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function ContractModal({
  booking,
  companyName,
  open,
  onClose,
}: {
  booking: Booking;
  companyName: string;
  open: boolean;
  onClose: () => void;
}) {
  const contractNo = `HD-${booking.id.replace("booking-", "").toUpperCase()}`;
  const today = new Date().toLocaleDateString("vi-VN");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#075985]" />
            Hợp đồng Dịch vụ Tour – {contractNo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm text-gray-700" id="contract-print">
          <div className="text-center border-b pb-4">
            <p className="font-bold text-base text-gray-900 uppercase">{companyName}</p>
            <p className="text-xs text-gray-500">Đơn vị cung cấp dịch vụ lữ hành</p>
            <p className="text-lg font-bold mt-2 text-blue-800">HỢP ĐỒNG DỊCH VỤ DU LỊCH</p>
            <p className="text-xs text-gray-500">Số: {contractNo} – Ngày lập: {today}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-[#F0F9FF] p-3 rounded-lg border">
            <div>
              <p className="font-bold text-gray-800 uppercase mb-1">BÊN CUNG CẤP (BÊN A):</p>
              <p className="font-semibold text-gray-900">{companyName}</p>
              <p className="text-gray-500">Hotline: 1900 1800</p>
            </div>
            <div>
              <p className="font-bold text-gray-800 uppercase mb-1">KHÁCH HÀNG (BÊN B):</p>
              <p className="font-semibold text-gray-900">{booking.contactName || booking.userName}</p>
              <p className="text-gray-500">SĐT: {booking.contactPhone || "—"}</p>
              <p className="text-gray-500">Email: {booking.contactEmail || booking.userEmail}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-bold text-gray-800">ĐIỀU 1: THÔNG TIN TOUR</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
              <li>Tên chương trình: <strong>{booking.tour.name}</strong></li>
              <li>Thời gian: <strong>{booking.tour.duration}</strong></li>
              <li>Ngày khởi hành: <strong>{booking.tourStartDate || "Theo thỏa thuận"}</strong></li>
              <li>Số lượng khách: <strong>{booking.numberOfGuests} người</strong></li>
              <li>Tổng giá trị hợp đồng: <strong className="text-[#075985] font-bold">{formatVND(booking.totalPrice)}</strong></li>
              <li>Phương thức thanh toán: <strong>Thanh toán trực tiếp theo các đợt yêu cầu từ công ty</strong></li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-700 mb-8">ĐẠI DIỆN BÊN A</p>
              <p className="text-xs text-gray-500">{companyName}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-700 mb-8">ĐẠI DIỆN BÊN B</p>
              <p className="text-xs text-gray-500">{booking.contactName || booking.userName}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button className="bg-[#075985] hover:bg-[#F97316] text-white gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            In hợp đồng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function formatDisplayDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function AgencyBookingManagement({
  bookings,
  guides,
  companyName,
  onApproveBooking,
  onRejectBooking,
  onAssignGuide,
  onMarkDepositPaid,
  onMarkFullyPaid,
  onGenerateContract,
  onViewBookingDetail,
}: AgencyBookingManagementProps) {
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [contractBooking, setContractBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => (filterStatus === "all" ? true : b.status === filterStatus))
      .filter(
        (b) =>
          (b.contactName ?? b.userName).toLowerCase().includes(search.toLowerCase()) ||
          b.tour.name.toLowerCase().includes(search.toLowerCase()) ||
          b.id.toLowerCase().includes(search.toLowerCase()) ||
          (b.contactPhone ?? "").includes(search)
      )
      .sort((a, b) => {
        const timeA = new Date(a.bookingDate || 0).getTime();
        const timeB = new Date(b.bookingDate || 0).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [bookings, filterStatus, search, sortOrder]);

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#075985] flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#075985]" />
            Đặt tour & Khách hàng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Quản lý và điều hành các booking tour theo đoàn, phân bổ hướng dẫn viên và xuất phiếu thanh toán
          </p>
        </div>
      </div>

      {/* Control bar: Search & Filters */}
      <div className="bg-white rounded-2xl border border-[#CBD5E1] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 bg-[#F0F9FF] border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#075985] focus:bg-white transition-all"
            placeholder="Tìm theo mã đơn, tên khách, SĐT, tên tour..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Lọc:
          </span>
          {[
            { id: "all", label: "Tất cả" },
            { id: "pending", label: "Chờ duyệt" },
            { id: "confirmed", label: "Đã xác nhận" },
            { id: "in_progress", label: "Đang diễn ra" },
            { id: "completed", label: "Hoàn thành" },
            { id: "cancelled", label: "Đã hủy" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === tab.id
                  ? "bg-[#075985] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
              {tab.id === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Bookings Table */}
      <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Không tìm thấy đơn đặt tour nào</p>
            <p className="text-gray-400 text-xs mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-[#F0F9FF]/80 text-xs font-bold text-gray-600 uppercase border-b border-[#CBD5E1] tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>Mã đơn & Ngày đặt</span>
                      <button
                        type="button"
                        onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-[#075985] bg-white border border-[#CBD5E1] hover:bg-[#F0F9FF] transition-colors cursor-pointer"
                        title={sortOrder === "desc" ? "Sắp xếp: Mới nhất trước. Bấm để đổi sang Cũ nhất trước" : "Sắp xếp: Cũ nhất trước. Bấm để đổi sang Mới nhất trước"}
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        <span>{sortOrder === "desc" ? "Mới nhất" : "Cũ nhất"}</span>
                      </button>
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3.5">Khách hàng</th>
                  <th scope="col" className="px-4 py-3.5">Thông tin Tour & Khởi hành</th>
                  <th scope="col" className="px-4 py-3.5">Giá trị & Thanh toán</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Trạng thái</th>
                  <th scope="col" className="px-4 py-3.5">Hướng dẫn viên</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((booking) => {
                  const st = statusMap[booking.status] ?? {
                    label: booking.status,
                    bg: "bg-gray-100",
                    text: "text-gray-700",
                    border: "border-[#CBD5E1]",
                  };
                  const pst = paymentStatusMap[booking.paymentStatus ?? "unpaid"] ?? {
                    label: "Chưa xác định", color: "text-gray-700", badgeBg: "bg-gray-100 border-gray-200",
                  };
                  const assignedGuide = guides.find((g) => g.id === booking.guideId);
                  const hasCustom = booking.hasLocationCustomization || (booking.customHotelChanges && booking.customHotelChanges.length > 0);

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-[#F0F9FF]/40 transition-colors group"
                    >
                      {/* Mã đơn */}
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#075985] bg-[#F0F9FF] px-2 py-0.5 rounded border border-[#CBD5E1]">
                          {booking.id.toUpperCase()}
                        </span>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDisplayDate(booking.bookingDate)}
                        </div>
                      </td>

                      {/* Khách hàng */}
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-gray-900">
                          {booking.contactName || booking.userName}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>{booking.contactPhone || "—"}</span>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5 truncate max-w-[180px]">
                          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>{booking.contactEmail || booking.userEmail}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          <Users className="w-3 h-3 text-gray-500" />
                          {booking.numberOfGuests} khách
                        </div>
                      </td>

                      {/* Tour & Khởi hành */}
                      <td className="px-4 py-4 align-top max-w-[260px]">
                        <p className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-[#075985] transition-colors" title={booking.tour.name}>
                          {booking.tour.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-blue-800 font-medium bg-[#F0F9FF] px-2 py-0.5 rounded border border-blue-100">
                            <Calendar className="w-3 h-3 text-[#075985]" />
                            Khởi hành: {formatDisplayDate(booking.tourStartDate)}
                          </span>
                          <span className="text-gray-400">· {booking.tour.duration}</span>
                        </div>

                        {/* Customization Badge */}
                        {hasCustom && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#F97316]/15 text-purple-800 px-2 py-0.5 rounded-full border border-[#F97316]/30">
                              <Sparkles className="w-3 h-3 text-[#F97316]" />
                              Lịch trình có tùy chỉnh
                            </span>
                            {(booking.customHotelChanges?.some((h) => h.mode === "provider" || h.isProviderService) ||
                              booking.customMealChanges?.some((m) => m.mode === "provider" || m.isProviderService)) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                                🌟 Đối tác Nền tảng
                              </span>
                            )}
                          </div>
                        )}

                        {/* Co-Hosting Alliance Badge */}
                        {(booking.isCoHosted ?? booking.tour?.isCoHosted ?? false) && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                              <Handshake className="w-3 h-3 text-amber-700" />
                              Tour Liên Minh ({(booking.coHosts ?? booking.tour?.coHosts)?.map((c) => c.companyName).join(" & ") || "2 Bên Phối Hợp"})
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Tài chính */}
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-sm">
                          {formatVND(booking.totalPrice)}
                        </div>
                        {booking.isPartnerView?<p className="mt-1 text-xs text-sky-700">Doanh thu chặng của bạn</p>:<div className="mt-1">
                          <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${pst.badgeBg} ${pst.color}`}>
                            {pst.label}
                          </span>
                        </div>}
                        {!booking.isPartnerView && booking.remainingAmount !== undefined && booking.remainingAmount > 0 && (
                          <div className="text-[11px] text-amber-700 mt-1 font-medium">
                            Còn lại: {formatVND(booking.remainingAmount)}
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-4 align-top text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${st.bg} ${st.text} ${st.border}`}>
                          {st.label}
                        </span>
                      </td>

                      {/* HDV */}
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        {assignedGuide ? (
                          <div className="flex items-center gap-2">
                            {assignedGuide.avatar ? (
                              <img
                                src={assignedGuide.avatar}
                                alt={assignedGuide.name}
                                className="w-7 h-7 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#E0F2FE] text-[#075985] flex items-center justify-center text-xs font-bold">
                                {assignedGuide.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{assignedGuide.name}</p>
                              <p className="text-[10px] text-gray-400">{assignedGuide.phone || "HDV chính"}</p>
                            </div>
                          </div>
                        ) : booking.status === "confirmed" ? (
                          <button
                            onClick={() => setAssignTarget(booking.id)}
                            className="text-xs font-medium text-[#075985] hover:text-blue-800 hover:underline flex items-center gap-1 bg-[#F0F9FF] px-2 py-1 rounded border border-[#CBD5E1]"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            + Gán HDV
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa phân công</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <Button
                            size="sm"
                            className="w-[120px] h-8 bg-[#075985] hover:bg-[#0C4A6E] text-white font-medium text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer rounded-[6px]"
                            onClick={() => onViewBookingDetail?.(booking)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="px-4 py-3 bg-[#F0F9FF] border-t border-[#CBD5E1] flex items-center justify-between text-xs text-gray-500">
          <span>Hiển thị <strong>{filtered.length}</strong> / {bookings.length} đặt tour</span>
          <span>Bấm <strong>"Xem chi tiết"</strong> để mở toàn trang chi tiết đầy đủ thông tin hành khách, lịch trình thay đổi, khách sạn & hợp đồng</span>
        </div>
      </div>

      {/* Reject modal */}
      <AlertDialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <AlertDialogContent aria-describedby={undefined} tone="error" className="max-w-sm">
          <AlertDialogHeader><AlertDialogTitle>Từ chối đặt tour</AlertDialogTitle></AlertDialogHeader>
          <Textarea
            placeholder="Lý do từ chối (sẽ thông báo đến khách hàng)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel asChild><Button data-slot="alert-dialog-cancel" variant="outline" onClick={() => setRejectTarget(null)}>Hủy</Button></AlertDialogCancel>
            <Button data-slot="alert-dialog-action"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (rejectTarget) {
                  onRejectBooking(rejectTarget, rejectReason);
                  setRejectTarget(null);
                  setRejectReason("");
                }
              }}
            >
              Xác nhận từ chối
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign guide modal */}
      <Dialog open={!!assignTarget} onOpenChange={() => setAssignTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Giao Hướng dẫn viên phụ trách</DialogTitle></DialogHeader>
          {guides.length === 0 ? (
            <p className="text-sm text-gray-500">Công ty chưa có hướng dẫn viên.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {guides.map((guide) => (
                <button
                  key={guide.id}
                  onClick={() => {
                    if (assignTarget) {
                      onAssignGuide(assignTarget, guide.id);
                      setAssignTarget(null);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-[#CBD5E1] hover:border-blue-300 hover:bg-[#F0F9FF] transition-colors text-left"
                >
                  {guide.avatar ? (
                    <img src={guide.avatar} alt={guide.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#E0F2FE] text-[#075985] flex items-center justify-center font-bold text-sm">
                      {guide.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{guide.name}</p>
                    <p className="text-xs text-gray-500">{guide.phone || guide.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={() => setAssignTarget(null)}>Đóng</Button>
        </DialogContent>
      </Dialog>

      {/* Contract modal */}
      {contractBooking && (
        <ContractModal
          booking={contractBooking}
          companyName={companyName}
          open={!!contractBooking}
          onClose={() => setContractBooking(null)}
        />
      )}
    </div>
  );
}
