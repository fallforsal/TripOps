import { useCallback, useEffect, useState } from "react";
import { Info, Loader2, MessageSquare, Star } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { StarRating } from "@/app/components/reviews/StarRating";
import {
  formatDate,
  getAgencyFeedbacks,
  replyToFeedback,
  type AgencyFeedback,
  type AgencyRating,
} from "@/app/services/reviews";

/**
 * Đánh giá từ khách: sao của Agency (tính từ đánh giá mọi tour) và trả lời công khai từng đánh giá.
 * Khiếu nại không hiện ở đây — khách trao đổi với Admin, Admin sẽ liên hệ Agency khi cần đối chiếu.
 */
export function AgencyReviewsPage() {
  const [rating, setRating] = useState<AgencyRating | null>(null);
  const [items, setItems] = useState<AgencyFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unreplied" | "low">("all");

  const load = useCallback(() => {
    setLoading(true);
    getAgencyFeedbacks()
      .then((data) => { setRating(data.rating); setItems(data.items); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được đánh giá."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const shown = items.filter((f) => filter === "all" || (filter === "unreplied" ? !f.agencyReply : f.rating <= 2));

  if (loading) return <div className="p-6 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải đánh giá...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 space-y-5">
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {rating && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row gap-6 items-center">
          <div className="text-center min-w-[140px]">
            <p className="text-5xl font-bold text-[#075985]">{rating.count > 0 ? rating.average.toFixed(1) : "–"}</p>
            <StarRating value={rating.average} />
            <p className="text-xs text-slate-500 mt-1">{rating.count} đánh giá trên các tour của bạn</p>
          </div>
          <div className="flex-1 w-full space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = rating.distribution[star - 1] ?? 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-slate-600">{star}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-amber-400 h-2 rounded-full" style={{ width: rating.count ? `${(count / rating.count) * 100}%` : "0%" }} />
                  </div>
                  <span className="w-6 text-right text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="sm:max-w-[220px] text-[11px] text-slate-500 flex gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              Điểm xếp hạng trên sàn: <strong className="text-slate-700">{rating.score.toFixed(2)}</strong>. Điểm này kéo về mức trung bình toàn sàn
              khi còn ít đánh giá, nên càng nhiều đánh giá tốt thì xếp hạng càng ổn định.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-[#075985]" /> Đánh giá của khách</h2>
          <div role="tablist" className="flex gap-1">
            {([["all", "Tất cả"], ["unreplied", "Chưa trả lời"], ["low", "1–2 sao"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === id ? "bg-[#075985] text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">{items.length === 0 ? "Chưa có khách nào đánh giá tour của bạn." : "Không có đánh giá nào trong mục này."}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {shown.map((f) => <ReviewRow key={f.id} feedback={f} onReplied={(next) => setItems((list) => list.map((x) => (x.id === next.id ? next : x)))} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ feedback, onReplied }: { feedback: AgencyFeedback; onReplied: (f: AgencyFeedback) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(feedback.agencyReply ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (text.trim().length < 2) return setError("Nội dung trả lời quá ngắn.");
    setSaving(true);
    setError("");
    try { onReplied(await replyToFeedback(feedback.id, text.trim())); setEditing(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Không lưu được câu trả lời."); }
    finally { setSaving(false); }
  };

  return (
    <div className="py-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-semibold text-slate-900">{feedback.customerName}</span>
          <span className="text-xs text-slate-500"> · {feedback.tourName ?? "Tour"} · {feedback.bookingCode} · {formatDate(feedback.createdAt)}</span>
        </div>
        <StarRating value={feedback.rating} size="sm" />
      </div>
      {feedback.comment && <p className="text-sm text-slate-700 whitespace-pre-line">{feedback.comment}</p>}

      {editing ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000}
            placeholder="Cảm ơn khách, giải thích hoặc nêu cách khắc phục. Câu trả lời hiển thị công khai dưới đánh giá." className="text-sm" />
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); setText(feedback.agencyReply ?? ""); }}>Hủy</Button>
            <Button type="button" size="sm" onClick={save} disabled={saving} className="bg-[#075985] hover:bg-[#0C4A6E] text-white gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Đăng trả lời
            </Button>
          </div>
        </div>
      ) : feedback.agencyReply ? (
        <div className="rounded-lg bg-[#F0F9FF] border border-[#BAE6FD] p-3 text-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-[#075985]">Trả lời công khai của bạn</p>
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-[#075985] hover:underline">Sửa</button>
          </div>
          <p className="text-slate-700 whitespace-pre-line">{feedback.agencyReply}</p>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)} className="text-xs">Trả lời công khai</Button>
      )}
    </div>
  );
}
