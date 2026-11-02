import { useState } from "react";
import { CustomTourRequest, Tour, TourCompany } from "@/app/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Handshake,
  Building2,
  Calendar,
  Users,
  ShieldCheck,
  DollarSign,
  MapPin,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

interface CoHostInvitationModalProps {
  open: boolean;
  onClose: () => void;
  customRequest?: CustomTourRequest | null;
  tour?: Tour | null;
  currentCompany: TourCompany;
  availableCompanies: TourCompany[];
  onSendInvitation: (invitation: {
    partnerCompanyId: string;
    partnerCompanyName: string;
    partnerCompanyLogo?: string;
    partnerCompanyPhone?: string;
    partnerCompanyEmail?: string;
    assignedSegments: string;
    assignedDays?: number[];
    revenueSharePercentage?: number;
    notes: string;
    estimatedBudgetPerGuest?: number;
    fixedPayoutAmount?: number;
  }) => void;
}

function formatVND(n: number) {
  return (n || 0).toLocaleString("vi-VN") + " ₫";
}

export function CoHostInvitationModal({
  open,
  onClose,
  customRequest,
  tour,
  currentCompany,
  availableCompanies,
  onSendInvitation,
}: CoHostInvitationModalProps) {
  // Filter out current company and already invited partners
  const existingCoHosts = customRequest?.coHosts || tour?.coHosts || [];
  const partnerCandidates = availableCompanies.filter(
    (c) => c.id !== currentCompany.id && !existingCoHosts.some((ch) => ch.companyId === c.id)
  );

  // Form states
  const [selectedPartnerId, setSelectedPartnerId] = useState(
    partnerCandidates[0]?.id || ""
  );
  const [assignedSegments, setAssignedSegments] = useState("");
  const [estimatedBudgetPerGuest, setEstimatedBudgetPerGuest] = useState<number>(() => {
    if (customRequest?.budgetPerPerson) {
      return Math.round(Number(customRequest.budgetPerPerson) * 0.55);
    }
    return 3000000;
  });
  const [notes, setNotes] = useState(
    "Đã trao đổi sơ bộ qua điện thoại/Zalo. Kính mời Quý công ty tham gia đồng thiết kế lịch trình và gửi báo giá chi phí chặng địa phương."
  );

  // Determine total days
  let totalDays = 3;
  if (tour?.numberOfDays) {
    totalDays = tour.numberOfDays;
  } else if (customRequest?.departureDate && customRequest?.returnDate) {
    const d1 = new Date(customRequest.departureDate).getTime();
    const d2 = new Date(customRequest.returnDate).getTime();
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0 && diff <= 30) totalDays = diff;
  }

  const selectedPartner = partnerCandidates.find(
    (c) => c.id === selectedPartnerId
  );

  const guestCount =
    Number(customRequest?.numberOfPeople) || tour?.maxGuests || 10;
  const clientBudgetPerGuest =
    customRequest?.budgetPerPerson ? Number(customRequest.budgetPerPerson) : (tour?.price || 5500000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

    onSendInvitation({
      partnerCompanyId: selectedPartner.id,
      partnerCompanyName: selectedPartner.name,
      partnerCompanyLogo: selectedPartner.logo,
      partnerCompanyPhone: selectedPartner.phone,
      partnerCompanyEmail: selectedPartner.email,
      assignedSegments:
        assignedSegments.trim() ||
        `Chặng địa phương tại ${customRequest?.destinations || tour?.destination || "điểm đến"}`,
      notes: notes.trim(),
      estimatedBudgetPerGuest: Number(estimatedBudgetPerGuest) || 0,
      // Default initial placeholder share (will be recalculated automatically when quotes are submitted)
      revenueSharePercentage: 50,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#F97316]/15 flex items-center justify-center text-[#EA580C] shadow-xs">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Mời Đối Tác Lữ Hành Liên Minh Cùng Dẫn Tour
              </DialogTitle>
              <p className="text-xs text-gray-500">
                Mô hình hợp tác đồng kiến tạo: Hai bên tự tạo lịch trình chặng mình và báo giá độc lập theo chi phí thực tế.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
          {/* Tour/Request Context Banner */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50 border border-[#CBD5E1] rounded-xl p-3.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#075985]" />
                {customRequest?.destinations || tour?.destination || "Hành trình liên tỉnh"}
              </span>
              <span className="bg-blue-200/80 text-blue-900 font-bold px-2.5 py-0.5 rounded text-[11px]">
                {guestCount} khách · {totalDays} ngày
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-600 text-[11px] pt-0.5">
              <span>
                Khách hàng: <strong>{customRequest?.contactName || "Đoàn khách"}</strong>
                {customRequest?.businessName && ` (${customRequest.businessName})`}
              </span>
              <span>
                Ngân sách dự kiến của khách:{" "}
                <strong className="text-emerald-700">{formatVND(clientBudgetPerGuest)} / khách</strong>
              </span>
            </div>
          </div>

          {/* Partner Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#F97316]" />
              Chọn Công ty Lữ hành Đối tác muốn mời: <span className="text-red-500">*</span>
            </Label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-purple-400 font-medium"
              required
            >
              {partnerCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.address} ({c.rating}⭐)
                </option>
              ))}
            </select>
            {selectedPartner && (
              <div className="bg-[#F0F9FF]/70 border border-[#F97316]/30 rounded-lg p-2.5 flex items-center gap-3">
                {selectedPartner.logo ? (
                  <img
                    src={selectedPartner.logo}
                    alt={selectedPartner.name}
                    className="w-10 h-10 rounded-lg object-cover border border-[#F97316]/30 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-200 flex items-center justify-center font-bold text-purple-800 flex-shrink-0">
                    {selectedPartner.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-xs truncate">{selectedPartner.name}</p>
                  <p className="text-[11px] text-gray-500">
                    Hotline: {selectedPartner.phone} · Email: {selectedPartner.email}
                  </p>
                  <p className="text-[11px] text-[#EA580C] font-medium mt-0.5">
                    Thế mạnh: Chuyên gia du lịch &amp; điều phối dịch vụ địa phương am hiểu bản địa
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Segment Name & Estimated Budget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-800">
                Chặng/Khu vực mời đối tác phối hợp:
              </Label>
              <Input
                value={assignedSegments}
                onChange={(e) => setAssignedSegments(e.target.value)}
                placeholder="VD: Chặng Cao nguyên đá Đồng Văn – Sông Nho Quế"
                className="text-xs"
              />
              <p className="text-[10px] text-gray-400">
                Khu vực đối tác phụ trách đón tiếp đoàn và điều hành.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Ngân sách gợi ý cho chặng của đối tác (VNĐ/khách):
              </Label>
              <Input
                type="number"
                step={50000}
                value={estimatedBudgetPerGuest}
                onChange={(e) => setEstimatedBudgetPerGuest(Number(e.target.value))}
                placeholder="3000000"
                className="text-xs font-semibold text-emerald-700"
              />
              <p className="text-[10px] text-gray-400">
                Khung ngân sách để đối tác cân đối khách sạn, nhà hàng phù hợp.
              </p>
            </div>
          </div>

          {/* Notes / Message to Partner */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-[#075985]" />
                Nội dung đã trao đổi ngoài hệ thống (Zalo / Điện thoại):
              </Label>
              <span className="text-[10px] text-gray-400">Không bắt buộc chọn trước buổi</span>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Đã trao đổi với anh Hùng qua điện thoại sáng nay. Nhờ công ty bạn bố trí xe gầm cao đón đoàn tại cột mốc số 0 và chuẩn bị bữa tối đặc sản bản địa..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* 3-Step Collaborative Quotation Flow Explanation */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-[11px] text-amber-950">
            <p className="font-bold flex items-center gap-1.5 text-amber-900 text-xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Quy trình Đồng Kiến Tạo &amp; Báo Giá Chi Phí Thực Tế (Không chia % đoán mò):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-gray-700">
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60 shadow-2xs">
                <p className="font-bold text-amber-900 mb-0.5">1. Gửi lời mời</p>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Đối tác nhận lời mời và truy cập cùng tạo tour mà không bị ràng buộc cứng nhắc.
                </p>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60 shadow-2xs">
                <p className="font-bold text-amber-900 mb-0.5">2. Lên dịch vụ &amp; Ghi nhận</p>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Cả 2 bên tự chọn Khách sạn, Nhà ăn chặng mình. Hệ thống tự động ghi nhận ai phụ trách gì.
                </p>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60 shadow-2xs">
                <p className="font-bold text-amber-900 mb-0.5">3. Báo giá &amp; Cộng dồn</p>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Mỗi bên nhập báo giá thực tế của mình. Hệ thống tự cộng dồn để ra giá bán trọn gói cho khách (Hiện đang miễn phí sàn 0%).
                </p>
              </div>
            </div>
          </div>

          {/* Escrow Reassurance */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-950">
                Bảo chứng Ký quỹ Escrow từ Nền tảng:
              </p>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Khách thanh toán 100% vào tài khoản ký quỹ của Sàn. Sau khi tour hoàn thành, Sàn giải ngân chính xác số tiền theo báo giá của mỗi công ty vào tài khoản ngân hàng riêng biệt, bảo vệ tuyệt đối quyền lợi và xóa bỏ nỗi lo công nợ.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#F97316] hover:bg-[#EA580C] text-white font-bold gap-1.5 shadow-xs"
            >
              <Handshake className="w-4 h-4" />
              Gửi lời mời hợp tác
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
