import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Tên đầy đủ hoặc chữ phụ dùng thêm khi lọc (VD "Thành phố Hồ Chí Minh"). */
  keywords?: string;
}

interface SearchableComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  invalid?: boolean;
  className?: string;
}

/** Bỏ dấu tiếng Việt để gõ "ho chi minh", "hcm", "Hồ Chí" đều tìm được. */
export const foldVietnamese = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();

const initials = (text: string) =>
  foldVietnamese(text)
    .replace(/^(thanh pho|tinh|phuong|xa|dac khu)\s+/, "")
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("");

function matches(option: ComboboxOption, query: string) {
  const q = foldVietnamese(query);
  if (!q) return true;
  const hay = foldVietnamese(`${option.label} ${option.keywords ?? ""}`);
  return hay.includes(q) || initials(option.label).startsWith(q.replace(/\s+/g, ""));
}

/**
 * Ô chọn có gõ để lọc: bấm vào là bung danh sách, gõ để thu hẹp, dùng ↑ ↓ Enter để chọn, Esc để đóng.
 * Chỉ nhận giá trị nằm trong danh sách; rời ô mà chưa chọn thì trả lại lựa chọn cũ.
 */
export function SearchableCombobox({
  id,
  options,
  value,
  onChange,
  placeholder = "Gõ để tìm…",
  disabled,
  loading,
  emptyText = "Không có kết quả phù hợp",
  invalid,
  className = "",
}: SearchableComboboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const selected = options.find((o) => o.value === value);
  const [text, setText] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Lựa chọn đổi từ bên ngoài (tải xong hồ sơ, đổi tỉnh làm xóa phường) thì hiện lại đúng nhãn.
  useEffect(() => {
    if (!typing) setText(selected?.label ?? "");
  }, [selected?.label, value, typing]);

  const filtered = useMemo(
    () => (typing ? options.filter((o) => matches(o, text)) : options).slice(0, 200),
    [options, text, typing],
  );

  useEffect(() => setActive(0), [text, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) commitClose();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  });

  useEffect(() => {
    const item = listRef.current?.children[active] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function commitClose() {
    setOpen(false);
    setTyping(false);
    setText(selected?.label ?? "");
  }

  function choose(option: ComboboxOption) {
    onChange(option.value);
    setText(option.label);
    setTyping(false);
    setOpen(false);
  }

  const isDisabled = disabled || loading;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          autoComplete="off"
          disabled={isDisabled}
          value={text}
          placeholder={loading ? "Đang tải…" : placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setTyping(true);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              if (open && filtered[active]) {
                e.preventDefault();
                choose(filtered[active]);
              }
            } else if (e.key === "Escape") {
              commitClose();
            } else if (e.key === "Tab") {
              commitClose();
            }
          }}
          className={`w-full h-9 pl-3 pr-14 bg-white disabled:bg-[#F8FAFC] disabled:text-[#64748B] border rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985] ${
            invalid ? "border-rose-400" : "border-[#CBD5E1]"
          }`}
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-1 text-[#64748B]">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
          {!isDisabled && value && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Xóa lựa chọn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange("");
                setText("");
                setTyping(false);
              }}
              className="p-0.5 rounded hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
      </div>
      {open && !isDisabled && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-[6px] border border-[#CBD5E1] bg-white py-1 shadow-lg text-xs"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[#64748B]">{emptyText}</li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
                className={`px-3 py-2 cursor-pointer ${index === active ? "bg-[#F0F9FF] text-[#075985]" : "text-[#0F172A]"} ${
                  option.value === value ? "font-semibold" : ""
                }`}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
