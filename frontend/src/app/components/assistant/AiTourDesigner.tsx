import { useState, type FormEvent } from "react";
import { BedDouble, CalendarDays, Loader2, MapPin, RefreshCw, SquarePen, Users, UtensilsCrossed } from "lucide-react";
import type { TourConfiguration } from "@/app/services/wf02Tours";
import { AI_TOUR_MAX_DAYS, AI_TOUR_MAX_GUESTS, type AiTourDraftRequest } from "@/app/services/aiTourDraft";

/**
 * UC-038: form trong khung chat AI để Agency nhập điểm đến, số ngày và mô tả.
 * Ô nhập là giao diện vẽ sẵn; AI chỉ chạy khi Agency bấm "Tạo".
 */
export function AiTourDesignForm({
  initial,
  disabled,
  onSubmit,
}: {
  initial?: AiTourDraftRequest;
  disabled: boolean;
  onSubmit: (request: AiTourDraftRequest) => void;
}) {
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [days, setDays] = useState(String(initial?.durationDays ?? 3));
  const [style, setStyle] = useState(initial?.style ?? "");
  const [guests, setGuests] = useState(initial?.groupSize ? String(initial.groupSize) : "");
  const [problem, setProblem] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const place = destination.trim();
    const count = Number(days);
    if (!place) return setProblem("Vui lòng nhập điểm đến.");
    if (!Number.isInteger(count) || count < 1 || count > AI_TOUR_MAX_DAYS)
      return setProblem(`Số ngày phải từ 1 đến ${AI_TOUR_MAX_DAYS}.`);
    const size = Number(guests);
    if (!guests.trim() || !Number.isInteger(size) || size < 1 || size > AI_TOUR_MAX_GUESTS)
      return setProblem(`Số khách phải từ 1 đến ${AI_TOUR_MAX_GUESTS}.`);
    setProblem("");
    onSubmit({ destination: place, durationDays: count, groupSize: size, style: style.trim() || null });
  };

  return (
    <form className="ai-design-form" onSubmit={submit} noValidate>
      <label>
        <span>Điểm đến <b aria-hidden="true">*</b></span>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value.slice(0, 255))}
          placeholder="Ví dụ: Đà Lạt"
          disabled={disabled}
          required
        />
      </label>
      <label>
        <span>Số ngày <b aria-hidden="true">*</b></span>
        <input
          type="number"
          min={1}
          max={AI_TOUR_MAX_DAYS}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          disabled={disabled}
          required
        />
      </label>
      <label>
        <span>Số khách <b aria-hidden="true">*</b></span>
        <input
          type="number"
          min={1}
          max={AI_TOUR_MAX_GUESTS}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          placeholder="Ví dụ: 40"
          disabled={disabled}
          required
        />
      </label>
      <label>
        <span>Mô tả thêm</span>
        <textarea
          rows={3}
          value={style}
          onChange={(e) => setStyle(e.target.value.slice(0, 2000))}
          placeholder="Ví dụ: đoàn công ty 40 người, có team building, ăn đặc sản, không đi quá xa"
          disabled={disabled}
        />
      </label>
      {problem && <p className="ai-design-problem" role="alert">{problem}</p>}
      <button type="submit" disabled={disabled}>
        {disabled ? <Loader2 size={14} className="ai-spin" aria-hidden="true" /> : null}
        Tạo
      </button>
    </form>
  );
}

const MEAL_LABEL: Record<string, string> = { breakfast: "Sáng", lunch: "Trưa", dinner: "Tối" };

type ServiceItem = { supplierSource?: string | null; serviceId?: number | null; agencySupplierId?: number | null };

/** Nguồn của chỗ ở/nhà hàng AI chọn: đối tác đã liên kết → trên TripOps → bên ngoài (cần xác minh). */
function SourceBadge({ item }: { item: ServiceItem }) {
  if (item.supplierSource === "PLATFORM_PARTNER" || item.serviceId) return <em className="ai-source platform">trên TripOps</em>;
  if (item.agencySupplierId) return <em className="ai-source own">đối tác của bạn</em>;
  return <em className="ai-source outside">bên ngoài, cần xác minh</em>;
}

const FOLLOW_UPS = [
  "Gợi ý chỗ ở cho tour này",
  "Gợi ý ăn uống cho tour này",
  "Lịch trình này có gì cần chỉnh?",
];

/** Thẻ tóm tắt khung tour AI vừa soạn, kèm "Mở để chỉnh sửa" và "Tạo lại". */
export function AiTourDraftCard({
  draft,
  busy,
  saving,
  savedTourId,
  onOpen,
  onRegenerate,
  onAsk,
}: {
  draft: TourConfiguration;
  busy: boolean;
  saving: boolean;
  savedTourId?: number;
  onOpen: () => void;
  onRegenerate: () => void;
  /** Hỏi tiếp trợ lý về chính khung tour này (chỗ ở, ăn uống...). */
  onAsk: (question: string) => void;
}) {
  const days = [...(draft.timelines || [])].sort((a, b) => a.dayNumber - b.dayNumber);
  const highlights = (draft.highlights || "").split("\n").filter(Boolean).slice(0, 3);
  return (
    <div className="ai-draft-card">
      <strong>{draft.name}</strong>
      <span className="ai-draft-meta">
        <CalendarDays size={12} aria-hidden="true" /> {draft.durationDays} ngày {draft.durationNights} đêm
        {draft.maxGuests ? (
          <>
            <Users size={12} aria-hidden="true" /> {draft.maxGuests} khách
          </>
        ) : null}
        {draft.destination && (
          <>
            <MapPin size={12} aria-hidden="true" /> {draft.destination}
          </>
        )}
      </span>
      <ol className="ai-draft-days">
        {days.map((day) => (
          <li key={day.dayNumber}>
            <b>Ngày {day.dayNumber}:</b> {day.title}
            {day.activities?.length ? <small> · {day.activities.length} hoạt động</small> : null}
            {(day.accommodations || []).filter((a) => a.isDefault !== false).map((a) => (
              <span className="ai-draft-service" key={`stay-${a.hotelName}`}>
                <BedDouble size={12} aria-hidden="true" /> {a.hotelName}
                {a.nightsCount > 1 ? ` (${a.nightsCount} đêm)` : ""} <SourceBadge item={a} />
              </span>
            ))}
            {(day.meals || []).filter((m) => m.isDefault !== false).map((m) => (
              <span className="ai-draft-service" key={`meal-${m.mealType}`}>
                <UtensilsCrossed size={12} aria-hidden="true" /> {MEAL_LABEL[m.mealType] ?? m.mealType}: {m.restaurantName} <SourceBadge item={m} />
              </span>
            ))}
          </li>
        ))}
      </ol>
      {highlights.length > 0 && (
        <ul className="ai-draft-highlights">
          {highlights.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
      <p className="ai-draft-note">
        Chỗ ở, ăn uống lấy từ danh bạ nhà cung cấp của bạn trước, sau đó là dịch vụ trên TripOps; khu vực chưa có thì AI gợi ý bên ngoài (ghi rõ "AI gợi ý · chưa có trong danh bạ", cần xác minh và nhập giá). Giá tour bạn tự nhập trước khi đăng.
      </p>
      <div className="ai-draft-actions">
        {savedTourId ? (
          <button type="button" className="primary" onClick={onOpen}>
            <SquarePen size={14} aria-hidden="true" /> Đã lưu nháp, mở lại
          </button>
        ) : (
          <button type="button" className="primary" onClick={onOpen} disabled={busy || saving}>
            {saving ? <Loader2 size={14} className="ai-spin" aria-hidden="true" /> : <SquarePen size={14} aria-hidden="true" />}
            Mở để chỉnh sửa
          </button>
        )}
        <button type="button" onClick={onRegenerate} disabled={busy || saving}>
          <RefreshCw size={14} aria-hidden="true" /> Tạo lại
        </button>
      </div>
      <div className="ai-suggestions" aria-label="Hỏi thêm về khung tour này">
        {FOLLOW_UPS.map((question) => (
          <button key={question} type="button" onClick={() => onAsk(question)} disabled={busy || saving}>{question}</button>
        ))}
      </div>
    </div>
  );
}
