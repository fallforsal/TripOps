import { useState, useMemo } from "react";
import {
  ShieldAlert,
  Plus,
  Calendar,
  Building2,
  FileText,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { CustomerComplaint, Booking, User } from "@/app/types";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { StatusBadge } from "@/app/components/customer/StatusBadge";
import { EmptyState } from "@/app/components/customer/EmptyState";
import { Button } from "@/app/components/ui/button";

interface MyComplaintsPageProps {
  complaints: CustomerComplaint[];
  userBookings: Booking[];
  currentUser: User | null;
  initialSelectedBooking?: Booking | null;
  onAddComplaint: (newComplaint: Omit<CustomerComplaint, "id" | "createdAt" | "status">) => void;
  onAddComplaintMessage?: (complaintId: string, content: string) => void;
  onViewBookingDetail?: (booking: Booking) => void;
}

export function MyComplaintsPage({
  complaints,
  userBookings,
  currentUser,
  initialSelectedBooking,
  onAddComplaint,
  onAddComplaintMessage,
  onViewBookingDetail,
}: MyComplaintsPageProps) {
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(Boolean(initialSelectedBooking));
  const [selectedBookingId, setSelectedBookingId] = useState(
    initialSelectedBooking?.id || (userBookings[0]?.id ?? "")
  );
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CustomerComplaint["category"]>("service_quality");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [replyText, setReplyText] = useState("");

  const selectedComplaint = complaints.find((c) => c.id === selectedComplaintId);

  const selectedBooking = useMemo(() => {
    return userBookings.find((b) => b.id === selectedBookingId);
  }, [userBookings, selectedBookingId]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !selectedBooking) return;

    onAddComplaint({
      bookingId: selectedBooking.id,
      bookingCode: selectedBooking.tour?.tourCode || selectedBooking.id,
      tourName: selectedBooking.tour?.name || "Chương trình tour đoàn",
      departureDate: selectedBooking.tourStartDate,
      agencyName: selectedBooking.companyName || selectedBooking.tour?.companyName || "Travel Agency",
      userId: currentUser?.id || "user-1",
      customerName: currentUser?.name || selectedBooking.userName,
      customerPhone: currentUser?.phone || selectedBooking.contactPhone,
      title: title.trim(),
      category,
      description: description.trim(),
      evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
      messages: [
        {
          id: `cmsg-${Date.now()}`,
          senderName: currentUser?.name || "Khách hàng",
          senderRole: "customer",
          content: description.trim(),
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
        },
      ],
    });

    setShowCreateModal(false);
    setTitle("");
    setDescription("");
    setEvidenceUrl("");
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedComplaint || !onAddComplaintMessage) return;

    onAddComplaintMessage(selectedComplaint.id, replyText.trim());
    setReplyText("");
  };

  // Detail View (7.13)
  if (selectedComplaint) {
    const relatedBooking = userBookings.find((b) => b.id === selectedComplaint.bookingId);

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16 font-sans">
        <PageHeader
          title={`Chi tiết khiếu nại #${selectedComplaint.id}`}
          subtitle={`Booking: ${selectedComplaint.bookingCode} • ${selectedComplaint.tourName}`}
          onBack={() => setSelectedComplaintId(null)}
          backText="Quay lại danh sách khiếu nại"
          actions={
            <StatusBadge type="complaint" status={selectedComplaint.status} />
          }
        />

        {/* Complaint Overview Card */}
        <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
            <div>
              <span className="text-xs font-semibold text-[#075985] uppercase tracking-wide">
                Tiêu đề khiếu nại:
              </span>
              <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">
                {selectedComplaint.title}
              </h2>
            </div>

            <span className="text-xs text-[#475569]">
              Ngày gửi: {new Date(selectedComplaint.createdAt).toLocaleDateString("vi-VN")}
            </span>
          </div>

          {/* Related Booking Summary */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[#475569] block">Đơn vị lữ hành phụ trách:</span>
              <strong className="text-[#0F172A] font-semibold">{selectedComplaint.agencyName}</strong>
            </div>
            <div>
              <span className="text-[#475569] block">Ngày khởi hành tour:</span>
              <strong className="text-[#0F172A] font-semibold">{selectedComplaint.departureDate}</strong>
            </div>
            <div>
              <span className="text-[#475569] block">Mã đơn đặt tour:</span>
              <span className="font-mono text-[#075985] font-semibold">{selectedComplaint.bookingCode}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 text-xs text-[#0F172A]">
            <span className="font-semibold text-[#475569]">Nội dung sự việc:</span>
            <div className="p-3 bg-white border border-[#CBD5E1] rounded-[4px] leading-relaxed">
              {selectedComplaint.description}
            </div>
          </div>

          {/* Evidence if any */}
          {selectedComplaint.evidenceUrls && selectedComplaint.evidenceUrls.length > 0 && (
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-[#475569]">Hình ảnh / Bằng chứng đính kèm:</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedComplaint.evidenceUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-24 h-24 rounded-[4px] overflow-hidden border border-[#CBD5E1] hover:border-[#075985] transition-colors"
                  >
                    <img src={url} alt="Bằng chứng" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Result if resolved */}
          {selectedComplaint.status === "resolved" && selectedComplaint.resolutionNote && (
            <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] space-y-1 text-xs text-[#15803D]">
              <p className="font-bold flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Kết quả giải quyết thỏa đáng:
              </p>
              <p className="leading-relaxed text-[#14532D]">
                {selectedComplaint.resolutionNote}
              </p>
              {selectedComplaint.resolvedAt && (
                <span className="text-[11px] text-[#15803D] block pt-1">
                  Đã chốt ngày: {new Date(selectedComplaint.resolvedAt).toLocaleDateString("vi-VN")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Message Exchange / Progress Timeline */}
        <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <MessageSquare className="w-4 h-4 text-[#075985]" />
            <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
              Trao đổi phản hồi giữa Khách hàng, Agency &amp; Quản trị sàn
            </h3>
          </div>

          <div className="space-y-3">
            {selectedComplaint.messages && selectedComplaint.messages.length > 0 ? (
              selectedComplaint.messages.map((msg) => {
                const isCustomer = msg.senderRole === "customer";
                const isAdmin = msg.senderRole === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-[6px] text-xs space-y-1 ${
                      isCustomer
                        ? "bg-[#F0F9FF] border border-[#BAE6FD] ml-4 sm:ml-8"
                        : isAdmin
                        ? "bg-[#FFFBEB] border border-[#FDE68A] mr-4 sm:mr-8"
                        : "bg-[#F8FAFC] border border-[#CBD5E1] mr-4 sm:mr-8"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className={isCustomer ? "text-[#075985]" : isAdmin ? "text-[#B45309]" : "text-[#0F172A]"}>
                        {msg.senderName} {isAdmin ? "(Admin TripOps)" : !isCustomer ? "(Travel Agency)" : "(Khách hàng)"}
                      </span>
                      <span className="text-[11px] text-[#94A3B8] font-normal">
                        {msg.timestamp}
                      </span>
                    </div>
                    <p className="text-[#334155] leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[#475569] italic">
                Chưa có trao đổi nào thêm. Yêu cầu đang được lưu trữ trên hệ thống kiểm duyệt.
              </p>
            )}
          </div>

          {/* Send Response form if active */}
          {selectedComplaint.status !== "resolved" && onAddComplaintMessage && (
            <form onSubmit={handleSendReply} className="pt-3 border-t border-[#F1F5F9] flex gap-2">
              <input
                type="text"
                placeholder="Nhập nội dung phản hồi tiếp theo..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 h-9 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
              <Button
                type="submit"
                className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi phản hồi</span>
              </Button>
            </form>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedComplaintId(null)}
            className="border-[#CBD5E1] text-[#0F172A] text-xs h-9 px-4 rounded-[6px]"
          >
            Quay lại danh sách khiếu nại
          </Button>

          {relatedBooking && onViewBookingDetail && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onViewBookingDetail(relatedBooking)}
              className="border-[#075985] text-[#075985] hover:bg-[#F0F9FF] text-xs h-9 px-4 rounded-[6px] flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Xem hồ sơ booking gốc</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 font-sans">
      <PageHeader
        title="Khiếu nại chuyến đi của tôi"
        subtitle="Quản lý các phản ánh chất lượng dịch vụ, khách sạn, xe hoặc hướng dẫn viên gắn với đơn đặt tour"
        actions={
          userBookings.length > 0 ? (
            <Button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gửi khiếu nại mới</span>
            </Button>
          ) : null
        }
      />

      {/* Complaints List */}
      {complaints.length > 0 ? (
        <div className="space-y-4">
          {complaints.map((comp) => (
            <div
              key={comp.id}
              className="bg-white border border-[#CBD5E1] rounded-[6px] p-5 hover:border-[#075985] transition-colors space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-[#075985] bg-[#F0F9FF] px-2 py-0.5 rounded-[4px] border border-[#BAE6FD]">
                    {comp.id}
                  </span>
                  <span className="text-xs text-[#475569] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#075985]" />
                    <span>Agency: <strong>{comp.agencyName}</strong></span>
                  </span>
                </div>

                <StatusBadge type="complaint" status={comp.status} size="sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-8 space-y-1.5">
                  <h3
                    onClick={() => setSelectedComplaintId(comp.id)}
                    className="text-base font-bold text-[#0F172A] hover:text-[#075985] cursor-pointer transition-colors"
                  >
                    {comp.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#075985]" />
                      <span>Tour: {comp.tourName}</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#075985]" />
                      <span>Khởi hành: {comp.departureDate}</span>
                    </span>

                    <span className="text-[#94A3B8]">
                      Gửi: {new Date(comp.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  <p className="text-xs text-[#475569] line-clamp-2 bg-[#F8FAFC] p-2 rounded-[4px] border border-[#F1F5F9]">
                    {comp.description}
                  </p>
                </div>

                <div className="md:col-span-4 flex items-center md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#F1F5F9]">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setSelectedComplaintId(comp.id)}
                    className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-8 px-3 rounded-[6px]"
                  >
                    Xem chi tiết xử lý
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="Không có khiếu nại nào"
          description="Bạn chưa có phản ánh hay khiếu nại nào về chuyến đi. Nếu có bất kỳ vấn đề gì về dịch vụ khách sạn, xe hoặc hướng dẫn viên, bạn có thể gửi phản ánh để được hỗ trợ giải quyết."
          actionText={userBookings.length > 0 ? "Gửi khiếu nại mới" : undefined}
          onAction={() => setShowCreateModal(true)}
        />
      )}

      {/* Create Complaint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-[6px] max-w-xl w-full p-6 space-y-4 shadow-sm animate-in fade-in-50 duration-100">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#B91C1C]" />
                Gửi khiếu nại phản ánh chuyến đi
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Select Booking */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">
                  Chọn đơn đặt tour cần khiếu nại <span className="text-[#B91C1C]">*</span>
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                >
                  {userBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.id} – {b.tour?.name} (Khởi hành: {b.tourStartDate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Prefilled booking preview */}
              {selectedBooking && (
                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#475569] block">Agency phụ trách:</span>
                    <strong className="text-[#0F172A] font-semibold">
                      {selectedBooking.companyName || selectedBooking.tour?.companyName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#475569] block">Số khách tham gia:</span>
                    <strong className="text-[#0F172A] font-semibold">
                      {selectedBooking.numberOfGuests} khách
                    </strong>
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">
                  Phân loại vấn đề <span className="text-[#B91C1C]">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                >
                  <option value="accommodation_food">Khách sạn lưu trú & Bữa ăn không đúng cam kết</option>
                  <option value="schedule_change">Thay đổi lịch trình / Xe đón trễ giờ</option>
                  <option value="guide_attitude">Thái độ hoặc chất lượng hướng dẫn viên</option>
                  <option value="service_quality">Chất lượng dịch vụ tham quan</option>
                  <option value="pricing_billing">Chi phí / Yêu cầu thanh toán không hợp lệ</option>
                  <option value="other">Vấn đề khác</option>
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">
                  Tóm tắt nội dung khiếu nại <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Phòng khách sạn đêm 2 bị đổi sang khu phụ không đạt 4 sao..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">
                  Mô tả chi tiết sự việc <span className="text-[#B91C1C]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ghi rõ thời gian, địa điểm, sự việc diễn ra và yêu cầu bồi hoàn/xử lý của đoàn..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                />
              </div>

              {/* Evidence URL */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">
                  Đường dẫn ảnh bằng chứng (nếu có):
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-[#CBD5E1] text-[#0F172A] text-xs h-9 px-4 rounded-[6px]"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  className="bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs h-9 px-5 rounded-[6px] font-semibold"
                >
                  Gửi khiếu nại
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
