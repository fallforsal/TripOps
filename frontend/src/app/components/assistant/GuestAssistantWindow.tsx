import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MapPin, RotateCcw, Send, Sparkles, Users, X } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { ApiError } from "@/app/lib/http";
import { askAgencyAssistant, askGuestAssistant, type AiTourCard } from "@/app/services/aiAssistant";
import type { TourConfiguration } from "@/app/services/wf02Tours";
import { openAiDraftEditor, previewAiTour, saveAiTour, type AiTourDraftRequest } from "@/app/services/aiTourDraft";
import { AiTourDesignForm, AiTourDraftCard } from "./AiTourDesigner";
import { nextTourContext } from "@/app/lib/guestTourContext";

interface Turn {
  id: number;
  role: "user" | "assistant";
  content: string;
  tours?: AiTourCard[];
  offline?: boolean;
  /** Lượt thuộc phần soạn tour: chỉ hiển thị, không gửi vào chatbot. */
  local?: boolean;
  /** UC-038 (chỉ Agency): ô nhập thông tin tour, hoặc khung tour AI vừa soạn. Không gửi vào chatbot. */
  design?: { kind: "form"; initial?: AiTourDraftRequest } | { kind: "draft"; request: AiTourDraftRequest; draft: TourConfiguration; savedTourId?: number };
}

const WELCOME =
  "Xin chào! Mình là Trợ lý TripOps. Mình có thể gợi ý tour theo điểm đến, ngân sách, số người và giải thích cách đặt tour, thanh toán, chính sách hủy.";

const SUGGESTIONS = [
  "Tour Đà Lạt 3 ngày dưới 5 triệu",
  "Gợi ý tour cho đoàn 20 người",
  "Chính sách hủy tour thế nào?",
  "Đặt tour và đặt cọc ra sao?",
];

const DESIGN_TOUR = "Lên thiết kế tour";
const AGENCY_WELCOME =
  "Xin chào! Mình là Trợ lý TripOps dành cho Agency. Mình có thể soạn khung tour mới từ điểm đến và số ngày, góp ý chỗ ở, ăn uống, lịch trình cho tour, hoặc giải thích chính sách thanh toán, hủy tour trên TripOps.";
const AGENCY_SUGGESTIONS = [DESIGN_TOUR, "Cách định giá tour theo độ tuổi?", "Chính sách hủy tour thế nào?"];
/** Agency gõ tay "thiết kế tour", "tạo tour"... cũng mở form thay vì hỏi chatbot. */
const DESIGN_INTENT = /(thiết kế|tạo|soạn|lên)\s+(1\s+|một\s+)?(khung\s+)?tour/i;

const MAX_LENGTH = 1000;

/** Phòng khi model vẫn dùng Markdown: bỏ **đậm** và # tiêu đề vì khung chat chỉ hiển thị chữ thường. */
function plainText(text: string) {
  return text
    .replace(/\*\*|__/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^(\s*)[*•]\s+/gm, "$1- ");
}

/** Chữ "Lưu ý:" trong câu trả lời luôn in đậm để khách không bỏ sót. */
function withBoldNotes(text: string) {
  return text.split(/(lưu ý\s*:)/i).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

/** Khung tour AI soạn gần nhất trong cửa sổ (để trợ lý Agency góp ý cho đúng tour đó). */
function latestDraft(turns: Turn[]): TourConfiguration | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const design = turns[i].design;
    if (design?.kind === "draft") return design.draft;
  }
  return null;
}
const money = (value: number) => `${Math.round(value).toLocaleString("vi-VN")}đ`;

function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 429) return "Bạn hỏi hơi nhanh, vui lòng đợi khoảng một phút rồi thử lại.";
  if (error instanceof ApiError && error.status === 403) return "Tài khoản Agency cần được duyệt hồ sơ trước khi tạo tour.";
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
  const isAgency = user?.role === "agency" || user?.role === "company_admin";
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [designing, setDesigning] = useState(false);
  const [error, setError] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [savingTurn, setSavingTurn] = useState<number | null>(null);
  // ID danh sách tour AI gợi ý gần nhất: gửi kèm câu hỏi sau để "tour rẻ nhất", "tour thứ hai" hiểu đúng danh sách đó.
  const contextTourIds = useRef<number[]>([]);
  // "Thử lại" gọi lại đúng thao tác vừa lỗi: câu hỏi chatbot hoặc lượt soạn tour.
  const retry = useRef<(() => void) | null>(null);
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
    setDesigning(false);
    setSavingTurn(null);
    retry.current = null;
    contextTourIds.current = [];
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

  /** Hiện form nhập thông tin tour trong khung chat (Agency chọn "Lên thiết kế tour"). */
  const showDesignForm = (question: string, initial?: AiTourDraftRequest) => {
    setError("");
    setDraft("");
    setTurns((old) => [
      ...old,
      { id: ++sequence.current, role: "user", content: question, local: true },
      { id: ++sequence.current, role: "assistant", content: "Bạn cho mình vài thông tin để soạn khung tour nhé:", design: { kind: "form", initial }, local: true },
    ]);
  };

  /** Gửi thông tin cho AI soạn khung tour. Chỉ xem trước, chưa lưu. */
  const designTour = async (input: AiTourDraftRequest, formTurnId?: number) => {
    if (sending) return;
    const summary = [
      `Điểm đến: ${input.destination}`,
      `${input.durationDays} ngày`,
      input.groupSize ? `${input.groupSize} khách` : null,
      input.style,
    ].filter(Boolean).join(" · ");
    // Form đã gửi thì thu lại thành tin nhắn tóm tắt, tránh bấm "Tạo" hai lần.
    setTurns((old) => [
      ...old.map((t) => (t.id === formTurnId ? { ...t, design: undefined } : t)),
      { id: ++sequence.current, role: "user", content: summary, local: true },
    ]);
    setError("");
    setSending(true);
    setDesigning(true);
    retry.current = () => void designTour(input);
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    // Soạn lịch trình nhiều ngày lâu hơn trả lời chat; backend tự thử lại khi AI quá tải.
    const timer = setTimeout(() => controller.abort(), 240000);
    try {
      const result = await previewAiTour(input, controller.signal);
      if (request.current !== controller) return;
      retry.current = null;
      setTurns((old) => [...old, {
        id: ++sequence.current,
        role: "assistant",
        content: "Mình đã soạn xong khung tour kèm chỗ ở và ăn uống, ưu tiên nhà cung cấp đã liên kết với bạn, rồi đến dịch vụ trên TripOps. Bạn xem qua, ưng thì mở để chỉnh sửa, chưa ưng thì tạo lại:",
        design: { kind: "draft", request: input, draft: result },
        local: true,
      }]);
    } catch (e) {
      if (request.current !== controller) return;
      setError(
        e instanceof DOMException && e.name === "AbortError"
          ? "AI soạn tour quá lâu. Vui lòng thử lại."
          : errorText(e),
      );
    } finally {
      clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        setSending(false);
        setDesigning(false);
      }
    }
  };

  /** "Mở để chỉnh sửa": lúc này mới lưu thành tour nháp, rồi mở trang sửa tour. */
  const openDraft = async (turn: Turn) => {
    if (turn.design?.kind !== "draft") return;
    if (turn.design.savedTourId) {
      openAiDraftEditor(turn.design.savedTourId);
      onClose();
      return;
    }
    setSavingTurn(turn.id);
    setError("");
    try {
      const saved = await saveAiTour(turn.design.draft);
      setTurns((old) => old.map((t) => (t.id === turn.id && t.design?.kind === "draft" ? { ...t, design: { ...t.design, savedTourId: saved.id } } : t)));
      retry.current = null;
      openAiDraftEditor(saved.id);
      onClose();
    } catch (e) {
      retry.current = () => void openDraft(turn);
      setError(errorText(e));
    } finally {
      setSavingTurn(null);
    }
  };

  const send = async (text: string) => {
    const question = text.trim().slice(0, MAX_LENGTH);
    if (!question || sending) return;
    if (isAgency && (question === DESIGN_TOUR || DESIGN_INTENT.test(question))) return showDesignForm(question);
    retry.current = () => void send(question);
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
      // Lượt soạn tour (form, thẻ khung tour) không gửi dạng tin nhắn.
      const chat = history.filter((t) => !t.local).map(({ role, content }) => ({ role, content }));
      // Agency hỏi trợ lý dành cho Agency, kèm khung tour mới nhất trong cửa sổ để góp ý đúng tour đó.
      const answer = isAgency
        ? await askAgencyAssistant(chat, latestDraft(history), controller.signal)
        : await askGuestAssistant(chat, contextTourIds.current, controller.signal);
      if (request.current !== controller) return;
      retry.current = null;
      // Giữ ID danh sách tour gợi ý gần nhất (máy chủ đã kiểm tra lại) cho câu hỏi tiếp theo.
      if (!isAgency) contextTourIds.current = nextTourContext(contextTourIds.current, answer);
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
            <small>{isAgency ? "Soạn tour, góp ý chỗ ở, ăn uống cho Agency" : "Tư vấn tour và chính sách"}</small>
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
          <p className="ai-bubble">{isAgency ? AGENCY_WELCOME : WELCOME}</p>
        </div>
        {turns.length === 0 && (
          <div className="ai-suggestions" aria-label="Câu hỏi gợi ý">
            {(isAgency ? AGENCY_SUGGESTIONS : SUGGESTIONS).map((s) => (
              <button key={s} type="button" onClick={() => void send(s)} disabled={sending}>{s}</button>
            ))}
          </div>
        )}
        {turns.map((turn) => (
          <div key={turn.id} className={`ai-turn ${turn.role}`}>
            <p className="ai-bubble">{withBoldNotes(plainText(turn.content))}</p>
            {turn.tours && turn.tours.length > 0 && (
              <div className="ai-tour-list">
                {turn.tours.map((tour) => <TourCard key={tour.id} tour={tour} onOpen={() => openTourCard(tour.id)} />)}
              </div>
            )}
            {turn.offline && <span className="ai-offline-note">Trả lời nhanh theo dữ liệu có sẵn</span>}
            {turn.design?.kind === "form" && (
              <AiTourDesignForm initial={turn.design.initial} disabled={sending} onSubmit={(r) => void designTour(r, turn.id)} />
            )}
            {turn.design?.kind === "draft" && (
              <AiTourDraftCard
                draft={turn.design.draft}
                busy={sending}
                saving={savingTurn === turn.id}
                savedTourId={turn.design.savedTourId}
                onOpen={() => void openDraft(turn)}
                onRegenerate={() => { if (turn.design?.kind === "draft") void designTour(turn.design.request); }}
                onAsk={(question) => void send(question)}
              />
            )}
          </div>
        ))}
        {sending && (
          <div className="ai-turn assistant">
            {designing ? (
              <p className="ai-bubble ai-progress">Đang soạn lịch trình và chọn chỗ ở, ăn uống cho đoàn. Việc này mất khoảng 30–60 giây…</p>
            ) : (
              <p className="ai-bubble ai-typing" aria-label="Trợ lý đang trả lời"><span /><span /><span /></p>
            )}
          </div>
        )}
        {error && (
          <div className="ai-error" role="alert">
            <span>{error}</span>
            {(retry.current || lastQuestion) && (
              <button type="button" onClick={() => (retry.current ? retry.current() : void send(lastQuestion))} disabled={sending || savingTurn !== null}>Thử lại</button>
            )}
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
            placeholder={isAgency ? "Hỏi về chỗ ở, ăn uống, lịch trình hoặc gõ \"Lên thiết kế tour\"…" : "Hỏi về tour, giá, chính sách…"}
            aria-label="Câu hỏi cho trợ lý AI"
          />
          <button type="submit" disabled={sending || !draft.trim()} aria-label="Gửi câu hỏi" title="Gửi">
            <Send size={17} />
          </button>
        </div>
        <small>{isAgency ? "AI có thể nhầm, hãy kiểm tra lại lịch trình và dịch vụ trước khi đăng tour." : "AI có thể nhầm, hãy xem kỹ thông tin tour trước khi đặt."} Không nhập số điện thoại, CCCD hay số tài khoản.</small>
      </form>
    </section>
  );
}
