import { Booking, User } from "@/app/types";
import {
  Check,
  X,
  UserCheck,
  Calendar,
  MapPin,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Phone,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  History,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

interface AdminBookingManagementProps {
  bookings: Booking[];
  guides: User[];
  onApproveBooking: (bookingId: string) => void;
  onRejectBooking: (bookingId: string, reason?: string) => void;
  onAssignGuide: (bookingId: string, guideId: string) => void;
}

export function AdminBookingManagement({
  bookings,
  guides,
  onApproveBooking,
  onRejectBooking,
  onAssignGuide,
}: AdminBookingManagementProps) {
  const [filterStatus, setFilterStatus] =
    useState<string>("all");
  const [rejectingBooking, setRejectingBooking] =
    useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedBookingId, setExpandedBookingId] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const formatPrice = (price: number) => {
    return price.toLocaleString("vi-VN") + "đ";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-[#E0F2FE] text-blue-800",
    rejected: "bg-gray-100 text-gray-800",
  };

  const statusLabels: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
    completed: "Hoàn thành",
    rejected: "Đã từ chối",
  };

  const paymentStatusColors: Record<string, string> = {
    unpaid: "bg-orange-100 text-orange-800",
    paid: "bg-emerald-100 text-emerald-800",
    refunded: "bg-[#F97316]/15 text-purple-800",
  };

  const paymentStatusLabels: Record<string, string> = {
    unpaid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
  };

  const filteredBookings = bookings.filter(
    (booking) =>
      filterStatus === "all" || booking.status === filterStatus,
  );

  // Statistics & Filter Counts
  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending")
      .length,
    confirmed: bookings.filter((b) => b.status === "confirmed")
      .length,
    completed: bookings.filter((b) => b.status === "completed")
      .length,
    cancelled: bookings.filter((b) => b.status === "cancelled")
      .length,
    rejected: bookings.filter((b) => b.status === "rejected")
      .length,
  };

  const filterOptions = [
    {
      value: "all",
      label: "Tất cả",
      color: "bg-[#F0F9FF]0",
      icon: Users,
    },
    {
      value: "pending",
      label: "Chờ xác nhận",
      color: "bg-yellow-500",
      icon: Clock,
    },
    {
      value: "confirmed",
      label: "Đã xác nhận",
      color: "bg-green-500",
      icon: Check,
    },
    {
      value: "completed",
      label: "Hoàn thành",
      color: "bg-blue-500",
      icon: UserCheck,
    },
    {
      value: "cancelled",
      label: "Đã hủy",
      color: "bg-red-500",
      icon: X,
    },
    {
      value: "rejected",
      label: "Đã từ chối",
      color: "bg-gray-600",
      icon: X,
    },
  ];

  const totalPages = Math.ceil(
    filteredBookings.length / itemsPerPage,
  );
  const currentBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const toggleExpand = (id: string) => {
    setExpandedBookingId(expandedBookingId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quản lý Booking
        </h1>
        <p className="text-gray-600">
          Xem xét và duyệt các booking từ khách hàng
        </p>
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {filterOptions.map((option) => {
          const isSelected = filterStatus === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => {
                setFilterStatus(option.value);
                setCurrentPage(1);
              }}
              className={`relative overflow-hidden p-4 rounded-2xl text-left transition-all duration-200 border-2 ${
                isSelected
                  ? "border-blue-500 shadow-md transform scale-105"
                  : "border-transparent hover:bg-[#F0F9FF] bg-white shadow-sm"
              }`}
            >
              <div
                className={`absolute top-0 right-0 p-2 opacity-10`}
              >
                <Icon className="w-12 h-12" />
              </div>
              <div className="relative z-10">
                <p className="text-sm text-gray-500 font-medium mb-1">
                  {option.label}
                </p>
                <div className="flex items-end gap-2">
                  <span
                    className={`text-2xl font-bold ${isSelected ? "text-[#075985]" : "text-gray-900"}`}
                  >
                    {
                      counts[
                        option.value as keyof typeof counts
                      ]
                    }
                  </span>
                </div>
              </div>
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {currentBookings.map((booking) => {
          const isExpanded = expandedBookingId === booking.id;

          return (
            <div
              key={booking.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${isExpanded ? "border-blue-300 ring-1 ring-blue-100" : "border-[#CBD5E1] hover:shadow-md"}`}
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <img
                    src={booking.tour.image}
                    alt={booking.tour.name}
                    className="w-full lg:w-48 h-32 object-cover rounded-lg"
                  />

                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {booking.tour.name}
                        </h3>
                        <div className="text-sm text-gray-600 mt-1">
                          Booking ID: {booking.id}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}
                        >
                          {statusLabels[booking.status]}
                        </span>
                        {booking.paymentStatus && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${paymentStatusColors[booking.paymentStatus]}`}
                          >
                            {
                              paymentStatusLabels[
                                booking.paymentStatus
                              ]
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">
                          Khách hàng:
                        </span>
                        <span className="ml-2 font-medium">
                          {booking.userName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Email:
                        </span>
                        <span className="ml-2 font-medium">
                          {booking.userEmail}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Khởi hành:{" "}
                          {formatDate(booking.tourStartDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>
                          {booking.numberOfGuests} người
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.tour.destination}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Tổng giá:
                        </span>
                        <span className="ml-2 font-bold text-[#075985]">
                          {formatPrice(booking.totalPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Rejected Reason in Card */}
                    {booking.status === "rejected" &&
                      booking.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-800">
                            <span className="font-semibold">
                              Lý do từ chối:
                            </span>{" "}
                            {booking.rejectionReason}
                          </p>
                        </div>
                      )}

                    <div className="flex items-center justify-between pt-2">
                      {/* Action Buttons for Pending */}
                      {booking.status === "pending" ? (
                        <div className="flex gap-2 w-full md:w-auto">
                          <button
                            onClick={() => {
                              onApproveBooking(booking.id);
                              setExpandedBookingId(booking.id);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                            Chấp nhận & Điều HDV
                          </button>
                          <button
                            onClick={() =>
                              setRejectingBooking(booking)
                            }
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <X className="w-4 h-4" />
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <div></div>
                      )}

                      <button
                        onClick={() => toggleExpand(booking.id)}
                        className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Thu gọn
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            Xem chi tiết
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content (Inline) */}
              {isExpanded && (
                <div className="bg-[#F0F9FF] border-t border-[#CBD5E1] p-6 rounded-b-xl -mt-2 mx-0.5">
                  <div className="space-y-6">
                    {/* Guide Assignment Section */}
                    {booking.status === "confirmed" && (
                      <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                            <UserCheck className="w-5 h-5" />
                            Thông tin hướng dẫn viên
                          </h4>
                        </div>

                        <div className="space-y-4">
                          {/* Rejected Guide History */}
                          {booking.rejectedGuideName && (
                            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
                              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                              <div>
                                <p className="font-medium">
                                  HDV đã từ chối trước đó:
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {booking.rejectedGuideAvatar && (
                                    <img
                                      src={
                                        booking.rejectedGuideAvatar
                                      }
                                      className="w-6 h-6 rounded-full"
                                    />
                                  )}
                                  <span className="font-semibold">
                                    {booking.rejectedGuideName}
                                  </span>
                                </div>
                                <p className="mt-1 italic">
                                  "
                                  {booking.rejectedGuideReason ||
                                    "Bận lịch cá nhân"}
                                  "
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Guide Selection */}
                          <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full">
                              <Label className="mb-2 block text-sm text-gray-600">
                                Chọn hướng dẫn viên phụ trách:
                              </Label>
                              <Select
                                value={booking.guideId || ""}
                                onValueChange={(value) =>
                                  onAssignGuide(
                                    booking.id,
                                    value,
                                  )
                                }
                              >
                                <SelectTrigger className="w-full h-auto py-2">
                                  <SelectValue placeholder="Chọn hướng dẫn viên..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {guides.map((guide) => (
                                    <SelectItem
                                      key={guide.id}
                                      value={guide.id}
                                    >
                                      <div className="flex items-center gap-3 py-1">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                          {guide.avatar ? (
                                            <img
                                              src={guide.avatar}
                                              alt={guide.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                              IMG
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-medium">
                                            {guide.name}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {guide.phone ||
                                              "Chưa có SĐT"}
                                          </div>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {booking.guideId && (
                              <div className="w-full md:w-auto flex justify-end mt-4 md:mt-0">
                                {/* Button to simulate clearing or changing guide if needed, currently select handles change */}
                                <div className="text-sm text-green-600 flex items-center gap-1 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                                  <Check className="w-4 h-4" />{" "}
                                  Đã phân công
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Itinerary */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-gray-500" />
                        Lộ trình chi tiết
                      </h4>
                      {booking.tour.itinerary &&
                      booking.tour.itinerary.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {booking.tour.itinerary.map((day) => (
                            <div
                              key={day.id}
                              className="bg-white p-4 rounded-lg border border-[#CBD5E1]"
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <span className="bg-[#075985] text-white text-xs font-bold px-2 py-1 rounded">
                                  Ngày {day.day}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {day.title}
                                </span>
                              </div>
                              <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                                {day.locations.map((loc) => (
                                  <div
                                    key={loc.id}
                                    className="flex justify-between items-center text-sm"
                                  >
                                    <div>
                                      <div className="font-medium text-gray-800">
                                        {loc.name}
                                      </div>
                                      <div className="text-gray-500 text-xs">
                                        {loc.address}
                                      </div>
                                    </div>
                                    <div className="text-gray-500 font-mono bg-[#F0F9FF] px-2 py-1 rounded">
                                      {loc.time}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">
                          Chưa có thông tin lộ trình.
                        </p>
                      )}
                    </div>

                    {/* Customer Details Full */}
                    <div className="bg-white p-4 rounded-lg border border-[#CBD5E1]">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Thông tin chi tiết khách hàng
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 block">
                            Họ tên:
                          </span>{" "}
                          {booking.userName}
                        </div>
                        <div>
                          <span className="text-gray-500 block">
                            Email:
                          </span>{" "}
                          {booking.userEmail}
                        </div>
                        <div>
                          <span className="text-gray-500 block">
                            Số lượng khách:
                          </span>{" "}
                          {booking.numberOfGuests}
                        </div>
                        <div>
                          <span className="text-gray-500 block">
                            Ngày đặt:
                          </span>{" "}
                          {formatDate(booking.bookingDate)}
                        </div>
                        <div>
                          <span className="text-gray-500 block">
                            Tổng tiền:
                          </span>{" "}
                          {formatPrice(booking.totalPrice)}
                        </div>
                        <div>
                          <span className="text-gray-500 block">
                            Trạng thái thanh toán:
                          </span>{" "}
                          {
                            paymentStatusLabels[
                              booking.paymentStatus || "unpaid"
                            ]
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredBookings.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#CBD5E1] p-12 text-center">
          <p className="text-gray-500">
            Không có booking nào trong trạng thái này
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-4">
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.max(prev - 1, 1))
            }
            className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="mx-4 text-gray-600">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(prev + 1, totalPages),
              )
            }
            className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reject Booking Dialog */}
      <Dialog
        open={rejectingBooking !== null}
        onOpenChange={() => setRejectingBooking(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Từ chối Booking</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn từ chối booking này? Bạn có
              thể cung cấp lý do từ chối.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Label htmlFor="rejectReason">Lý do từ chối:</Label>
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              className="mt-2"
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => setRejectingBooking(null)}
              variant="outline"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={() => {
                if (rejectingBooking) {
                  onRejectBooking(
                    rejectingBooking.id,
                    rejectReason,
                  );
                  setRejectingBooking(null);
                }
              }}
              variant="destructive"
            >
              Từ chối
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}