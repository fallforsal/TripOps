import { useState, type FormEvent } from "react";
import { CalendarDays, Loader2, MapPin, RefreshCw, SquarePen } from "lucide-react";
import type { TourConfiguration } from "@/app/services/wf02Tours";
import { AI_TOUR_MAX_DAYS, type AiTourDraftRequest } from "@/app/services/aiTourDraft";

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
  const [problem, setProblem] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const place = destination.trim();
    const count = Number(days);
    if (!place) return setProblem("Vui lòng nhập điểm đến.");
    if (!Number.isInteger(count) || count < 1 || count > AI_TOUR_MAX_DAYS)
      return setProblem(`Số ngày phải từ 1 đến ${AI_TOUR_MAX_DAYS}.`);
    setProblem("");
    onSubmit({ destination: place, durationDays: count, style: style.trim() || null });
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

/** Thẻ tóm tắt khung tour AI vừa soạn, kèm "Mở để chỉnh sửa" và "Tạo lại". */
export function AiTourDraftCard({
  draft,
  busy,
  saving,
  savedTourId,
  onOpen,
  onRegenerate,
}: {
  draft: TourConfiguration;
  busy: boolean;
  saving: boolean;
  savedTourId?: number;
  onOpen: () => void;
  onRegenerate: () => void;
}) {
  const days = [...(draft.timelines || [])].sort((a, b) => a.dayNumber - b.dayNumber);
  const highlights = (draft.highlights || "").split("\n").filter(Boolean).slice(0, 3);
  return (
    <div className="ai-draft-card">
      <strong>{draft.name}</strong>
      <span className="ai-draft-meta">
        <CalendarDays size={12} aria-hidden="true" /> {draft.durationDays} ngày {draft.durationNights} đêm
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
          </li>
        ))}
      </ol>
      {highlights.length > 0 && (
        <ul className="ai-draft-highlights">
          {highlights.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
      <p className="ai-draft-note">Khách sạn, nhà hàng và giá bạn tự chọn trong trang sửa tour trước khi đăng.</p>
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
    </div>
  );
}
