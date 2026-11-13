import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MapPin, RotateCcw, Send, Sparkles, Users, X } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { ApiError } from "@/app/lib/http";
import { askGuestAssistant, type AiTourCard } from "@/app/services/aiAssistant";

interface Turn {
  id: number;
  role: "user" | "assistant";
  content: string;
  tours?: AiTourCard[];
  offline?: boolean;
}

const WELCOME =
  "Xin chào! Mình là Trợ lý TripOps. Mình có thể gợi ý tour theo điểm đến, ngân sách, số người và giải thích cách đặt tour, thanh toán, chính sách hủy.";

const SUGGESTIONS = [
  "Tour Đà Lạt 3 ngày dưới 5 triệu",
  "Gợi ý tour cho đoàn 20 người",
  "Chính sách hủy tour thế nào?",
  "Đặt tour và đặt cọc ra sao?",
];

const MAX_LENGTH = 1000;
const money = (value: number) => `${Math.round(value).toLocaleString("vi-VN")}đ`;

function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 429) return "Bạn hỏi hơi nhanh, vui lòng đợi khoảng một phút rồi thử lại.";
  if (error instanceof ApiError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") return "Trợ lý phản hồi quá lâu. Vui lòng thử lại.";
  return "Không kết nối được máy chủ. Vui lòng thử lại.";
}

function openTour(id: number) {
  const target = `#/tours/${id}`;
  if (window.location.hash === target) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else window.location.hash = target;
}

function TourCard({ tour, onOpen }: { tour: AiTourCard; onOpen: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const duration = tour.durationDays
    ? `${tour.durationDays} ngày${tour.durationNights ? ` ${tour.durationNights} đêm` : ""}`
    : null;
  return (
    <button type="button" className="ai-tour-card" onClick={onOpen} aria-label={`Xem tour ${tour.name}`}>
      {tour.imageUrl && !imageFailed ? (
        <img src={tour.imageUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
      ) : (
        <span className="ai-tour-card-placeholder" aria-hidden="true"><MapPin size={18} /></span>
      )}
      <span className="ai-tour-card-body">
        <strong>{tour.name}</strong>
        <span className="ai-tour-card-meta">
          {[tour.destination, duration].filter(Boolean).join(" · ") || "Tour trọn gói"}
        </span>
        <span className="ai-tour-card-meta">
          {tour.price ? <b>Từ {money(tour.price)}/khách</b> : <b>Liên hệ giá</b>}
          {tour.maxGuests ? <span className="ai-tour-card-guests"><Users size={12} aria-hidden="true" /> {tour.minGuests ?? 1}–{tour.maxGuests}</span> : null}
        </span>
        {tour.agencyName && <span className="ai-tour-card-agency">{tour.agencyName}</span>}
      </span>
    </button>
  );
}

/**
 * Cửa sổ chat với Trợ lý AI (khách vãng lai). Hội thoại giữ nguyên khi chuyển trang,
 * tự xóa khi đăng nhập/đăng xuất để người sau không thấy câu hỏi của người trước.
 */
export function GuestAssistantWindow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const sequence = useRef(0);
  const request = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const reset = () => {
    request.current?.abort();
    request.current = null;
    setTurns([]);
    setDraft("");
    setError("");
    setSending(false);
  };

  // Đổi tài khoản (đăng nhập/đăng xuất) thì bắt đầu cuộc trò chuyện mới.
  useEffect(reset, [user?.id]);
  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [turns, sending, error, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = async (text: string) => {
    const question = text.trim().slice(0, MAX_LENGTH);
    if (!question || sending) return;
    const history = [...turns, { id: ++sequence.current, role: "user" as const, content: question }];
    setTurns(history);
    setDraft("");
    setError("");
    setLastQuestion(question);
    setSending(true);
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    // Model có suy luận + gọi công cụ có thể mất vài chục giây.
    const timer = setTimeout(() => controller.abort(), 150000);
    try {
      const answer = await askGuestAssistant(history.map(({ role, content }) => ({ role, content })), controller.signal);
      if (request.current !== controller) return;
      setTurns((old) => [...old, { id: ++sequence.current, role: "assistant", content: answer.reply, tours: answer.tours, offline: !answer.aiConfigured }]);
    } catch (e) {
      if (request.current !== controller) return;
      // Bỏ câu hỏi vừa gửi khỏi lịch sử để "Thử lại" không bị lặp.
      setTurns((old) => old.filter((t) => t.id !== history[history.length - 1].id));
      setError(errorText(e));
    } finally {
      clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        setSending(false);
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(draft);
    }
  };

  const openTourCard = (id: number) => {
    openTour(id);
    if (window.matchMedia("(max-width: 640px)").matches) onClose();
  };

  return (
    <section hidden={!open} className="ai-floating-window" role="dialog" aria-modal="false" aria-label="Trợ lý AI TripOps">
      <header className="ai-floating-header">
        <div className="ai-floating-title">
          <span className="ai-floating-avatar" aria-hidden="true"><Sparkles size={17} /></span>
          <div>
            <strong>Trợ lý TripOps</strong>
            <small>Tư vấn tour và chính sách</small>
          </div>
        </div>
        <div className="ai-floating-actions">
          <button type="button" onClick={reset} disabled={turns.length === 0 && !error} title="Cuộc trò chuyện mới" aria-label="Bắt đầu cuộc trò chuyện mới">
            <RotateCcw size={16} />
          </button>
          <button type="button" onClick={onClose} title="Đóng" aria-label="Đóng trợ lý AI">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="ai-messages" ref={listRef} aria-live="polite">
        <div className="ai-turn assistant">
          <p className="ai-bubble">{WELCOME}</p>
        </div>
        {turns.length === 0 && (
          <div className="ai-suggestions" aria-label="Câu hỏi gợi ý">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => void send(s)} disabled={sending}>{s}</button>
            ))}
          </div>
        )}
        {turns.map((turn) => (
          <div key={turn.id} className={`ai-turn ${turn.role}`}>
            <p className="ai-bubble">{turn.content}</p>
            {turn.tours && turn.tours.length > 0 && (
              <div className="ai-tour-list">
                {turn.tours.map((tour) => <TourCard key={tour.id} tour={tour} onOpen={() => openTourCard(tour.id)} />)}
              </div>
            )}
            {turn.offline && <span className="ai-offline-note">Trả lời nhanh theo dữ liệu có sẵn</span>}
          </div>
        ))}
        {sending && (
          <div className="ai-turn assistant">
            <p className="ai-bubble ai-typing" aria-label="Trợ lý đang trả lời"><span /><span /><span /></p>
          </div>
        )}
        {error && (
          <div className="ai-error" role="alert">
            <span>{error}</span>
            {lastQuestion && <button type="button" onClick={() => void send(lastQuestion)} disabled={sending}>Thử lại</button>}
          </div>
        )}
      </div>

      <form className="ai-composer" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
        <div className="ai-composer-row">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Hỏi về tour, giá, chính sách…"
            aria-label="Câu hỏi cho trợ lý AI"
          />
          <button type="submit" disabled={sending || !draft.trim()} aria-label="Gửi câu hỏi" title="Gửi">
            <Send size={17} />
          </button>
        </div>
        <small>AI có thể nhầm, hãy xem kỹ thông tin tour trước khi đặt. Không nhập số điện thoại, CCCD hay số tài khoản.</small>
      </form>
    </section>
  );
}
