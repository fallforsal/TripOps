import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { StarRating } from "@/app/components/reviews/StarRating";
import {
  createFeedback,
  formatDate,
  formatDateTime,
  isLowRating,
  listMyFeedbacks,
  listReviewableBookings,
  type MyFeedback,
  type ReviewableBooking,
} from "@/app/services/reviews";

/**
 * Viết đánh giá chuyến đi (chỉ chấm sao cho tour; sao Agency do hệ thống tính).
 * bookingId cố định khi mở từ chi tiết booking; bỏ trống thì khách chọn trong các booking còn được đánh giá.
 */
export function TourReviewDialog({
  open,
  onOpenChange,
  bookingId,
  onSubmitted,
  onComplain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId?: number;
  onSubmitted?: (feedback: MyFeedback) => void;
  onComplain?: (bookingId: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [reviewable, setReviewable] = useState<ReviewableBooking[]>([]);
  const [existing, setExisting] = useState<MyFeedback | null>(null);
  const [selected, setSelected] = useState<number | "">("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setRating(0);
    setComment("");
    setExisting(null);
    Promise.all([listReviewableBookings(), bookingId ? listMyFeedbacks() : Promise.resolve([] as MyFeedback[])])
      .then(([options, mine]) => {
        setReviewable(options);
        if (bookingId) {
          setExisting(mine.find((f) => f.bookingId === bookingId) ?? null);
          setSelected(options.some((o) => o.bookingId === bookingId) ? bookingId : "");
        } else setSelected(options[0]?.bookingId ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được dữ liệu đánh giá."))
      .finally(() => setLoading(false));
  }, [open, bookingId]);

  const booking = reviewable.find((b) => b.bookingId === selected);

  const submit = async () => {
    if (!booking) return setError("Vui lòng chọn chuyến đi.");
    if (rating < 1) return setError("Vui lòng chọn số sao.");
    setSaving(true);
    setError("");
    try {
      const saved = await createFeedback(booking.bookingId, rating, comment);
      onSubmitted?.(saved);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được đánh giá.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Đánh giá chuyến đi</DialogTitle>
          <DialogDescription>
            Chia sẻ cảm nhận để giúp khách khác chọn tour. Đánh giá được hiển thị công khai trên trang tour.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : existing ? (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-1.5 text-emerald-700 font-medium"><CheckCircle2 className="w-4 h-4" /> Bạn đã đánh giá chuyến đi này.</p>
            <StarRating value={existing.rating} />
            {existing.comment && <p className="text-slate-700 whitespace-pre-line">{existing.comment}</p>}
            {existing.agencyReply && (
              <div className="rounded-[6px] bg-slate-50 border border-slate-200 p-3">
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Phản hồi từ Agency</p>
                <p className="text-slate-700 whitespace-pre-line">{existing.agencyReply}</p>
              </div>
            )}
          </div>
        ) : bookingId && !booking ? (
          <p className="text-sm text-slate-600 py-2">
            Chuyến đi này không còn trong thời hạn đánh giá. Bạn có thể đánh giá trong 7 ngày kể từ khi tour kết thúc.
          </p>
        ) : reviewable.length === 0 ? (
          <p className="text-sm text-slate-600 py-2">
            Hiện không có chuyến đi nào cần đánh giá. Chỉ những tour đã hoàn thành trong 7 ngày gần nhất và chưa đánh giá mới hiện ở đây.
          </p>
        ) : (
          <div className="space-y-4">
            {!bookingId ? (
              <div className="space-y-1.5">
                <label htmlFor="review-booking" className="text-xs font-semibold text-[#0F172A]">Chuyến đi đã hoàn thành</label>
                <select
                  id="review-booking"
                  value={selected}
                  onChange={(e) => setSelected(Number(e.target.value))}
                  className="w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-[#075985]"
                >
                  {reviewable.map((b) => (
                    <option key={b.bookingId} value={b.bookingId}>
                      {b.bookingCode} – {b.tourName ?? "Tour"} (khởi hành {formatDate(b.startDate)})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm font-medium text-[#0F172A]">{booking?.bookingCode} – {booking?.tourName}</p>
            )}
            {booking && <p className="text-[11px] text-slate-500">Hạn đánh giá: {formatDateTime(booking.deadline)}</p>}

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#0F172A]">Bạn chấm chuyến đi này mấy sao? <span className="text-rose-600">*</span></p>
              <StarRating value={rating} onChange={setRating} size="lg" showLabel />
            </div>

            {isLowRating(rating) && booking && (
              <div className="rounded-[6px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
                <p className="flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  Chuyến đi có sự cố cần TripOps can thiệp (sai dịch vụ, cần hoàn tiền…)? Đánh giá chỉ để chia sẻ cảm nhận —
                  hãy gửi khiếu nại để Admin xử lý (trong 1 ngày sau khi tour kết thúc).
                </p>
                {onComplain && (
                  <Button type="button" variant="outline" size="sm" onClick={() => { onOpenChange(false); onComplain(booking.bookingId); }}
                    className="border-amber-300 text-amber-900 bg-white hover:bg-amber-100">
                    Gửi khiếu nại
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="review-comment" className="text-xs font-semibold text-[#0F172A]">Nhận xét (không bắt buộc)</label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Lịch trình, hướng dẫn viên, khách sạn, bữa ăn..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="button" onClick={submit} disabled={saving} className="bg-[#075985] hover:bg-[#0C4A6E] text-white gap-1.5">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Gửi đánh giá
              </Button>
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
