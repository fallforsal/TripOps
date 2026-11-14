import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";

export interface BookingPickerOption {
  id: number;
  code: string;
  title: string;
  /** Dòng phụ: ngày khởi hành, Agency... */
  details?: string;
  disabled?: boolean;
  /** Nhãn ngắn hiện bên phải, ví dụ "Hết hạn". */
  badge?: string;
}

/**
 * Chọn chuyến đi trong modal. Thay cho <select> gốc: tên tour dài được xuống dòng thay vì bị cắt,
 * danh sách mở ngay bên dưới (không tràn ra ngoài modal), lựa chọn không dùng được hiện mờ kèm lý do.
 */
export function BookingPicker({
  id,
  options,
  value,
  onChange,
  placeholder = "Chọn chuyến đi",
}: {
  id?: string;
  options: BookingPickerOption[];
  value: number | "";
  onChange: (id: number) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc, true); };
  }, [open]);

  return (
    <div ref={root} className="space-y-1">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2 bg-white border border-[#CBD5E1] rounded-[6px] text-left focus:outline-none focus:ring-2 focus:ring-[#075985]"
      >
        {selected ? (
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-[#0F172A] leading-snug">{selected.title}</span>
            <span className="block text-[11px] text-[#64748B] leading-snug">
              <span className="font-mono">{selected.code}</span>{selected.details ? ` · ${selected.details}` : ""}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-sm text-[#94A3B8]">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 shrink-0 text-[#64748B] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul role="listbox" aria-labelledby={id} className="max-h-60 overflow-y-auto rounded-[6px] border border-[#CBD5E1] bg-white shadow-sm divide-y divide-[#F1F5F9]">
          {options.map((o) => {
            const active = o.id === value;
            return (
              <li key={o.id} role="option" aria-selected={active} aria-disabled={o.disabled}>
                <button
                  type="button"
                  disabled={o.disabled}
                  onClick={() => { onChange(o.id); setOpen(false); }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left ${o.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[#F0F9FF]"} ${active ? "bg-[#F0F9FF]" : ""}`}
                >
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#075985]" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[#0F172A] leading-snug">{o.title}</span>
                    <span className="block text-[11px] text-[#64748B] leading-snug">
                      <span className="font-mono">{o.code}</span>{o.details ? ` · ${o.details}` : ""}
                    </span>
                  </span>
                  {o.badge && <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{o.badge}</span>}
                  {active && <Check className="w-4 h-4 shrink-0 text-[#075985]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
