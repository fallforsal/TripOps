import { useState, useMemo } from "react";
import {
  Calendar,
  MapPin,
  Clock,
  Search,
  Users,
  CreditCard,
  Building2,
  Eye,
  XCircle,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Booking } from "@/app/types";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { StatusBadge } from "@/app/components/customer/StatusBadge";
import { EmptyState } from "@/app/components/customer/EmptyState";
import { CancelTourModal } from "./CancelTourModal";

interface MyBookingsProps {
  bookings: Booking[];
  onCancelBooking: (bookingId: string, reason: string) => void;
  onViewBookingDetail: (booking: Booking) => void;
  onSubmitRefundRequest?: (data: any) => void;
  onNavigateToExplore?: () => void;
}

export function MyBookings({
  bookings,
  onCancelBooking,
  onViewBookingDetail,
  onSubmitRefundRequest,
  onNavigateToExplore,
}: MyBookingsProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);

  const filterTabs = [
    { id: "all", label: "Tất cả booking" },
    { id: "pending", label: "Chờ xử lý / Cọc" },
    { id: "deposited", label: "Đã cọc" },
    { id: "confirmed", label: "Đã chốt đoàn" },
    { id: "paid", label: "Đã thanh toán đủ" },
    { id: "completed", label: "Hoàn thành" },
    { id: "cancelled", label: "Đã hủy" },
  ];

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchStatus = filterStatus === "all" || booking.status === filterStatus;
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchStatus;

      const matchSearch =
        booking.id.toLowerCase().includes(term) ||
        (booking.tour?.name || "").toLowerCase().includes(term) ||
        (booking.tour?.tourCode || "").toLowerCase().includes(term) ||
        (booking.tour?.destination || "").toLowerCase().includes(term);

      return matchStatus && matchSearch;
    });
  }, [bookings, filterStatus, searchTerm]);

  const formatVND = (n: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(n);
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      <PageHeader
        title="Danh sách booking của tôi"
        subtitle="Theo dõi tiến độ duyệt tour, trạng thái chốt dịch vụ và các đợt thanh toán"
      />

      {/* Filter and Search Container */}
      <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã booking, tên tour, điểm đến..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-[#F1F5F9] pt-3">
          {filterTabs.map((tab) => {
            const isActive = filterStatus === tab.id;
            const count = tab.id === "all" ? bookings.length : bookings.filter((b) => b.status === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#075985] text-white"
                    : "bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-[#CBD5E1] text-[#0F172A]"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const tour = booking.tour;
            return (
              <div
                key={booking.id}
                className="bg-white border border-[#CBD5E1] rounded-[6px] p-5 hover:border-[#075985] transition-colors space-y-4"
              >
                {/* Header row: Booking ID, Tour Company & Status Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[#075985] bg-[#F0F9FF] px-2.5 py-1 rounded-[4px] border border-[#BAE6FD]">
                      {booking.id}
                    </span>
                    <span className="text-xs text-[#475569] flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#075985]" />
                      <strong>{booking.companyName || tour?.companyName || "Travel Agency"}</strong>
                    </span>
                    <span className="text-xs text-[#94A3B8]">
                      • Ngày tạo: {booking.bookingDate}
                    </span>
                  </div>

                  {/* Two distinct status badges: Booking Status & Payment Status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-[#475569]">Tiến trình:</span>
                      <StatusBadge type="booking" status={booking.status} size="sm" />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-[#475569]">Thanh toán:</span>
                      <StatusBadge
                        type="payment"
                        status={booking.paymentStatus || (booking.depositPaid ? "partially_paid" : "unpaid")}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Tour Overview */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-8 space-y-2">
                    <h3
                      onClick={() => onViewBookingDetail(booking)}
                      className="text-base font-bold text-[#0F172A] hover:text-[#075985] cursor-pointer transition-colors leading-snug"
                    >
                      {tour?.name || "Chương trình tour theo đoàn"}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#075985]" />
                        <span>{tour?.destination || "Điểm đến thỏa thuận"}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#075985]" />
                        <span>Khởi hành: <strong>{booking.tourStartDate}</strong></span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#075985]" />
                        <span>{booking.numberOfGuests} khách</span>
                      </span>

                      {tour?.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#075985]" />
                          <span>{tour.duration}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="md:col-span-4 flex flex-col md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#F1F5F9]">
                    <div className="md:text-right">
                      <span className="text-[11px] text-[#475569] block">Tổng tiền booking:</span>
                      <span className="text-lg font-bold text-[#075985]">
                        {formatVND(booking.totalPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Chỉ tự hủy được đơn chưa có tiền (đơn đã có tiền: hủy kèm hoàn tiền do Admin xem xét). */}
                      {(booking.status === "pending" || booking.status === "confirmed") &&
                        (booking.paidAmount ?? 0) === 0 &&
                        !(booking.paymentTransactions ?? []).some((t) => t.status === "pending") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelModalBooking(booking)}
                          className="border-[#CBD5E1] text-[#B91C1C] hover:bg-[#FEF2F2] text-xs h-8 px-3 rounded-[6px]"
                        >
                          Hủy tour
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onViewBookingDetail(booking)}
                        className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-8 px-3.5 rounded-[6px] font-medium"
                      >
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="Không tìm thấy booking nào"
          description={
            searchTerm || filterStatus !== "all"
              ? "Không có booking nào thỏa mãn bộ lọc hiện tại. Bạn vui lòng thử tìm kiếm lại."
              : "Bạn chưa có booking nào trong hệ thống. Hãy khám phá danh sách tour để lên kế hoạch cho đoàn ngay hôm nay."
          }
          actionText={!searchTerm && filterStatus === "all" ? "Khám phá tour ngay" : "Xem tất cả booking"}
          onAction={() => {
            if (!searchTerm && filterStatus === "all") {
              if (onNavigateToExplore) onNavigateToExplore();
            } else {
              setSearchTerm("");
              setFilterStatus("all");
            }
          }}
        />
      )}

      {/* Cancel Modal */}
      {cancelModalBooking && (
        <CancelTourModal
          bookingId={cancelModalBooking.id}
          booking={cancelModalBooking}
          tourName={cancelModalBooking.tour?.name}
          onCancel={() => setCancelModalBooking(null)}
          onImmediateCancel={(id, reason) => {
            onCancelBooking(id, reason);
            setCancelModalBooking(null);
          }}
          onSubmitRefundRequest={(data) => {
            if (onSubmitRefundRequest) {
              onSubmitRefundRequest(data);
            }
            onCancelBooking(cancelModalBooking.id, data.reasonDetail);
            setCancelModalBooking(null);
          }}
        />
      )}
    </div>
  );
}
