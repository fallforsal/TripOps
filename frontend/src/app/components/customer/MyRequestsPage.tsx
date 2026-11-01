import { useState } from "react";
import {
  FileQuestion,
  Plus,
  Calendar,
  Users,
  MapPin,
  Building2,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { CustomTourRequest, Tour } from "@/app/types";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { StatusBadge } from "@/app/components/customer/StatusBadge";
import { EmptyState } from "@/app/components/customer/EmptyState";
import { Button } from "@/app/components/ui/button";

interface MyRequestsPageProps {
  requests: CustomTourRequest[];
  tours?: Tour[];
  onCancelRequest: (requestId: string) => void;
  onNavigateToCreate: () => void;
  onViewTour?: (tour: Tour) => void;
  onBookTour?: (tour: Tour) => void;
}

export function MyRequestsPage({
  requests,
  tours = [],
  onCancelRequest,
  onNavigateToCreate,
  onViewTour,
  onBookTour,
}: MyRequestsPageProps) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);
  const matchedTour = selectedRequest?.designedTourId
    ? tours.find((t) => t.id === selectedRequest.designedTourId)
    : null;

  const formatVND = (n: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(n);
  };

  // If a request is selected, show detail view (7.9)
  if (selectedRequest) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16 font-sans">
        <PageHeader
          title={`Chi tiết yêu cầu thiết kế #${selectedRequest.id}`}
          subtitle={`Gửi tới: ${selectedRequest.targetCompanyName || "Travel Agency"}`}
          onBack={() => setSelectedRequestId(null)}
          backText="Quay lại danh sách yêu cầu"
          actions={
            <StatusBadge type="custom_request" status={selectedRequest.status} />
          }
        />

        {/* Request Overview Card */}
        <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#075985]" />
              <h2 className="text-base font-bold text-[#0F172A]">
                {selectedRequest.destinations}
              </h2>
            </div>
            <span className="text-xs text-[#475569]">
              Gửi ngày: {new Date(selectedRequest.createdAt).toLocaleDateString("vi-VN")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px]">
              <span className="text-[#475569] block">Thời gian mong muốn:</span>
              <strong className="text-[#0F172A] font-semibold block mt-0.5">
                {selectedRequest.departureDate} – {selectedRequest.returnDate}
              </strong>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px]">
              <span className="text-[#475569] block">Quy mô đoàn:</span>
              <strong className="text-[#0F172A] font-semibold block mt-0.5">
                {selectedRequest.numberOfPeople} khách
              </strong>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px]">
              <span className="text-[#475569] block">Ngân sách dự kiến / người:</span>
              <strong className="text-[#075985] font-bold block mt-0.5">
                {selectedRequest.budgetPerPerson
                  ? formatVND(Number(selectedRequest.budgetPerPerson))
                  : "Chưa định mức"}
              </strong>
            </div>
          </div>

          {selectedRequest.additionalInfo && (
            <div className="pt-2 text-xs text-[#475569]">
              <span className="font-semibold text-[#0F172A]">Yêu cầu riêng / Lưu ý đoàn:</span>
              <p className="mt-1 p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] leading-relaxed">
                {selectedRequest.additionalInfo}
              </p>
            </div>
          )}
        </div>

        {/* Agency Proposal Card */}
        {selectedRequest.companyNote || selectedRequest.quotedPricePerPerson || matchedTour ? (
          <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
              <Sparkles className="w-4 h-4 text-[#075985]" />
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
                Phương án đề xuất từ {selectedRequest.targetCompanyName}
              </h3>
            </div>

            {selectedRequest.companyNote && (
              <div className="p-3.5 bg-[#F0F9FF] border border-[#BAE6FD] rounded-[4px] text-xs text-[#075985] leading-relaxed">
                <strong>Phản hồi từ công ty:</strong> {selectedRequest.companyNote}
              </div>
            )}

            {selectedRequest.quotedPricePerPerson && (
              <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px]">
                <div>
                  <span className="text-xs text-[#475569] block">Báo giá chính thức / một khách:</span>
                  <span className="text-lg font-bold text-[#075985]">
                    {formatVND(selectedRequest.quotedPricePerPerson)}
                  </span>
                </div>

                {matchedTour && (
                  <div className="flex items-center gap-2">
                    {onViewTour && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onViewTour(matchedTour)}
                        className="border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] text-xs h-8 px-3 rounded-[6px]"
                      >
                        Xem lịch trình chi tiết
                      </Button>
                    )}

                    {onBookTour && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onBookTour(matchedTour)}
                        className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-8 px-3.5 rounded-[6px] font-semibold"
                      >
                        Chấp nhận &amp; Đặt tour này
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[6px] p-5 text-xs text-[#B45309] space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#B45309]" />
              Yêu cầu đang được xử lý
            </p>
            <p className="leading-relaxed">
              Agency {selectedRequest.targetCompanyName} đang liên hệ đơn vị vận chuyển và lưu trú để lập phương án tối ưu nhất. Bạn sẽ nhận được thông báo ngay khi có báo giá.
            </p>
          </div>
        )}

        {/* Actions footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#CBD5E1]">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedRequestId(null)}
            className="border-[#CBD5E1] text-[#0F172A] text-xs h-9 px-4 rounded-[6px]"
          >
            Quay lại danh sách
          </Button>

          {selectedRequest.status !== "cancelled" && selectedRequest.status !== "accepted" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (confirm("Bạn có chắc chắn muốn hủy yêu cầu thiết kế này?")) {
                  onCancelRequest(selectedRequest.id);
                  setSelectedRequestId(null);
                }
              }}
              className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] text-xs h-9 px-4 rounded-[6px]"
            >
              Hủy yêu cầu
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 font-sans">
      <PageHeader
        title="Yêu cầu thiết kế tour của tôi"
        subtitle="Theo dõi tiến độ báo giá và phản hồi lịch trình từ các đơn vị lữ hành"
        actions={
          <Button
            type="button"
            onClick={onNavigateToCreate}
            className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo yêu cầu mới</span>
          </Button>
        }
      />

      {requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-[#CBD5E1] rounded-[6px] p-5 hover:border-[#075985] transition-colors space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-[#075985] bg-[#F0F9FF] px-2 py-0.5 rounded-[4px] border border-[#BAE6FD]">
                    {req.id}
                  </span>
                  <span className="text-xs text-[#475569] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#075985]" />
                    <span>Agency: <strong>{req.targetCompanyName}</strong></span>
                  </span>
                </div>

                <StatusBadge type="custom_request" status={req.status} size="sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-8 space-y-1.5">
                  <h3
                    onClick={() => setSelectedRequestId(req.id)}
                    className="text-base font-bold text-[#0F172A] hover:text-[#075985] cursor-pointer transition-colors"
                  >
                    {req.destinations}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#075985]" />
                      <span>{req.departureDate} đến {req.returnDate}</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#075985]" />
                      <span>{req.numberOfPeople} người</span>
                    </span>

                    <span className="text-[#94A3B8]">
                      Gửi ngày: {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  {req.companyNote && (
                    <p className="text-xs text-[#075985] bg-[#F0F9FF] px-2.5 py-1 rounded-[4px] line-clamp-1 border border-[#BAE6FD]/50">
                      <strong>Phản hồi mới:</strong> {req.companyNote}
                    </p>
                  )}
                </div>

                <div className="md:col-span-4 flex items-center md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#F1F5F9]">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setSelectedRequestId(req.id)}
                    className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-8 px-3 rounded-[6px]"
                  >
                    Xem chi tiết phương án
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileQuestion}
          title="Bạn chưa có yêu cầu thiết kế nào"
          description="Nếu các tour có sẵn chưa phù hợp với đoàn, bạn có thể gửi yêu cầu riêng để các Travel Agency thiết kế lịch trình và báo giá theo ý muốn."
          actionText="Tạo yêu cầu thiết kế tour"
          onAction={onNavigateToCreate}
        />
      )}
    </div>
  );
}
