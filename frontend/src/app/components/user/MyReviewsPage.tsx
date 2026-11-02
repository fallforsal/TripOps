import { useState } from "react";
import {
  Star,
  MapPin,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Edit2,
  Trash2,
  MessageSquare,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { EmptyState } from "@/app/components/customer/EmptyState";
import { Button } from "@/app/components/ui/button";

interface SubmittedReview {
  id: string;
  bookingId: string;
  tourName: string;
  destination: string;
  agencyName: string;
  departureDate: string;
  rating: number;
  comment: string;
  createdAt: string;
  agencyReply?: string;
}

const initialSubmittedReviews: SubmittedReview[] = [
  {
    id: "rev-1",
    bookingId: "booking-matrix-1",
    tourName: "Hành Trình Di Sản Miền Trung: Huế - Hội An - Đà Nẵng 4N3Đ",
    destination: "Đà Nẵng – Huế – Hội An",
    agencyName: "Viettravel",
    departureDate: "2026-11-20",
    rating: 5,
    comment:
      "Chuyến đi rất thành công cho đoàn công ty! Hướng dẫn viên am hiểu lịch sử văn hóa Huế và ẩm thực Hội An. Lịch trình hợp lý, xe di chuyển đúng giờ.",
    createdAt: "2026-11-25",
    agencyReply:
      "Cảm ơn quý đoàn đã tin tưởng lựa chọn Viettravel. Rất mong được tiếp tục đồng hành cùng quý doanh nghiệp trong các hành trình tiếp theo!",
  },
  {
    id: "rev-2",
    bookingId: "booking-matrix-4",
    tourName: "Nghỉ Dưỡng Thượng Lưu Nha Trang - Vịnh Cam Ranh 3N2Đ",
    destination: "Nha Trang",
    agencyName: "Hà Giang Discovery Travel",
    departureDate: "2026-10-05",
    rating: 4,
    comment:
      "Resort đẹp, cảnh biển tuyệt vời, thực đơn tiệc tối phong phú. Điểm trừ nhỏ là ngày đầu xe đón tại sân bay hơi cập rập nhưng đã được công ty hỗ trợ kịp thời.",
    createdAt: "2026-10-09",
    agencyReply:
      "Hà Giang Discovery Travel xin ghi nhận phản hồi và đã tăng cường phương án điều phối xe trung chuyển để phục vụ chu đáo hơn.",
  },
];

export function MyReviewsPage() {
  const [reviews, setReviews] = useState<SubmittedReview[]>(initialSubmittedReviews);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [selectedBookingName, setSelectedBookingName] = useState("Tour Tây Bắc Mùa Hoa Mận Trắng 3N2Đ");

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newRev: SubmittedReview = {
      id: `rev-${Date.now()}`,
      bookingId: `BK-${Date.now().toString().slice(-4)}`,
      tourName: selectedBookingName,
      destination: "Tây Bắc",
      agencyName: "Hà Giang Discovery Travel",
      departureDate: "2026-09-15",
      rating: selectedRating,
      comment: commentText.trim(),
      createdAt: new Date().toISOString().split("T")[0],
    };

    setReviews([newRev, ...reviews]);
    setShowReviewModal(false);
    setCommentText("");
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      <PageHeader
        title="Đánh giá &amp; Nhận xét của tôi"
        subtitle="Chia sẻ trải nghiệm thực tế về chất lượng phục vụ của Travel Agency và hướng dẫn viên sau chuyến đi"
        actions={
          <Button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Viết đánh giá mới</span>
          </Button>
        }
      />

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-[#CBD5E1] rounded-[6px] p-5 space-y-3"
            >
              {/* Tour and rating header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-[#0F172A]">{rev.tourName}</h3>
                  <div className="flex items-center gap-3 text-xs text-[#475569]">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#075985]" />
                      <strong>{rev.agencyName}</strong>
                    </span>
                    <span>• Khởi hành: {rev.departureDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-[4px] self-start sm:self-auto">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating
                          ? "fill-[#B45309] text-[#B45309]"
                          : "text-[#CBD5E1]"
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-[#B45309] ml-1">
                    {rev.rating}/5
                  </span>
                </div>
              </div>

              {/* Review Comment */}
              <p className="text-xs text-[#0F172A] leading-relaxed bg-[#F8FAFC] p-3 rounded-[4px] border border-[#F1F5F9]">
                "{rev.comment}"
              </p>

              {/* Agency Reply if present */}
              {rev.agencyReply && (
                <div className="p-3 bg-[#F0F9FF] border border-[#BAE6FD] rounded-[4px] text-xs text-[#075985] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#075985]" />
                    <span>Phản hồi từ {rev.agencyName}:</span>
                  </div>
                  <p className="leading-relaxed pl-5">{rev.agencyReply}</p>
                </div>
              )}

              <div className="text-[11px] text-[#94A3B8]">
                Đã gửi ngày: {rev.createdAt}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Star}
          title="Bạn chưa có đánh giá nào"
          description="Sau khi hoàn thành chuyến đi, bạn có thể gửi phản hồi để giúp các đơn vị lữ hành cải thiện chất lượng phục vụ."
        />
      )}

      {/* Review Dialog */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-[6px] max-w-md w-full p-6 space-y-4 shadow-sm animate-in fade-in-50 duration-100">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-base font-bold text-[#0F172A]">
                Viết đánh giá chuyến đi
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">Chuyến đi cần đánh giá:</label>
                <input
                  type="text"
                  value={selectedBookingName}
                  onChange={(e) => setSelectedBookingName(e.target.value)}
                  className="w-full h-9 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none"
                />
              </div>

              {/* Star selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">Mức độ hài lòng:</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedRating(s)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= selectedRating
                            ? "fill-[#B45309] text-[#B45309]"
                            : "text-[#CBD5E1]"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-[#B45309] ml-2">
                    {selectedRating === 5 ? "Rất hài lòng" : selectedRating === 4 ? "Hài lòng" : selectedRating === 3 ? "Bình thường" : "Chưa hài lòng"}
                  </span>
                </div>
              </div>

              {/* Comment text */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">Nhận xét chi tiết:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Chia sẻ về khách sạn, chất lượng bữa ăn, thái độ của hướng dẫn viên..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full p-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  className="border-[#CBD5E1] text-[#0F172A] text-xs h-9 px-4 rounded-[6px]"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] font-semibold"
                >
                  Gửi đánh giá
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
