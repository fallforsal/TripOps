import { useCallback, useEffect, useState } from "react";
import { Building2, Info, Loader2, MessageSquare, Plus, Star } from "lucide-react";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { EmptyState } from "@/app/components/customer/EmptyState";
import { Button } from "@/app/components/ui/button";
import { StarRating } from "@/app/components/reviews/StarRating";
import { TourReviewDialog } from "@/app/components/reviews/TourReviewDialog";
import { formatDate, listMyFeedbacks, type MyFeedback } from "@/app/services/reviews";

/** Đánh giá của tôi: danh sách đánh giá đã gửi; "Viết đánh giá mới" chỉ cho chọn tour đã hoàn thành còn trong hạn 7 ngày. */
export function MyReviewsPage({ onComplain }: { onComplain?: (bookingId: number) => void }) {
  const [reviews, setReviews] = useState<MyFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [writing, setWriting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listMyFeedbacks()
      .then((list) => { setReviews(list); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được đánh giá."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="space-y-6 pb-16 font-sans">
      <PageHeader
        title="Đánh giá của tôi"
        subtitle="Chấm sao và nhận xét chuyến đi sau khi tour kết thúc. Sao của Agency được tính tự động từ đánh giá các tour."
        actions={
          <Button
            type="button"
            onClick={() => setWriting(true)}
            className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Viết đánh giá </span>
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-[6px] border border-[#BAE6FD] bg-[#F0F9FF] p-3 text-xs text-[#075985]">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>Đánh giá</strong> là chia sẻ cảm nhận.
          Nếu chuyến đi có sự cố cần TripOps xử lý, hãy dùng <strong>Gửi khiếu nại</strong> trong mục Khiếu nại.
        </p>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : error ? (
        <p role="alert" className="text-sm text-rose-700">{error}</p>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-white border border-[#CBD5E1] rounded-[6px] p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-[#0F172A]">{rev.tourName ?? "Tour"}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569]">
                    {rev.agencyName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#075985]" />
                        <strong>{rev.agencyName}</strong>
                      </span>
                    )}
                    <span>• Booking {rev.bookingCode}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-[4px] self-start sm:self-auto">
                  <StarRating value={rev.rating} size="sm" />
                  <span className="text-xs font-bold text-[#B45309] ml-1">{rev.rating}/5</span>
                </div>
              </div>

              {rev.comment && (
                <p className="text-xs text-[#0F172A] leading-relaxed bg-[#F8FAFC] p-3 rounded-[4px] border border-[#F1F5F9] whitespace-pre-line">
                  “{rev.comment}”
                </p>
              )}

              {rev.agencyReply && (
                <div className="p-3 bg-[#F0F9FF] border border-[#BAE6FD] rounded-[4px] text-xs text-[#075985] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#075985]" />
                    <span>Phản hồi từ {rev.agencyName ?? "Agency"}:</span>
                  </div>
                  <p className="leading-relaxed pl-5 whitespace-pre-line">{rev.agencyReply}</p>
                </div>
              )}

              <div className="text-[11px] text-[#94A3B8]">Đã gửi ngày {formatDate(rev.createdAt)}</div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Star}
          title="Bạn chưa có đánh giá nào"
          description="Sau khi tour hoàn thành, bạn có 7 ngày để chấm sao và nhận xét chuyến đi."
          actionText="Viết đánh giá"
          onAction={() => setWriting(true)}
        />
      )}

      <TourReviewDialog
        open={writing}
        onOpenChange={setWriting}
        onSubmitted={load}
        onComplain={onComplain}
      />
    </div>
  );
}
