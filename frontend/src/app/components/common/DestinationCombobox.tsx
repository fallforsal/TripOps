import React, { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { suggestDestinations, type VietnamProvinceItem } from "@/app/data/vietnamProvinces";

interface DestinationComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Bôi đậm phần chữ đã gõ ở đầu tên (bỏ qua "TP." đứng trước). */
function HighlightedName({ name, query }: { name: string; query: string }) {
  const prefix = name.match(/^TP\.\s*/i)?.[0] ?? "";
  const rest = name.slice(prefix.length);
  const q = query.trim();
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
  if (!q || fold(rest.slice(0, q.length)) !== fold(q)) return <>{name}</>;
  return (
    <>
      {prefix}
      <strong className="font-bold text-[#075985]">{rest.slice(0, q.length)}</strong>
      {rest.slice(q.length)}
    </>
  );
}

/**
 * Ô điểm đến: nhấn vào không bung danh sách; chỉ khi bắt đầu gõ mới gợi ý tỉnh/thành theo chữ đầu
 * ("H" → các tỉnh bắt đầu bằng H, "Hà" → Hà Nội, Hà Giang, Hà Nam, Hà Tĩnh). Danh sách nổi đè lên, không đẩy bố cục.
 */
export function DestinationCombobox({
  id = "home-destination",
  value,
  onChange,
  placeholder = "Địa danh hoặc tên tour",
  className = "",
}: DestinationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = suggestDestinations(value);
  const showList = open && value.trim().length > 0;

  useEffect(() => {
    const closeOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  useEffect(() => {
    if (highlighted < 0) return;
    listRef.current?.querySelectorAll("li")[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const select = (item: VietnamProvinceItem) => {
    onChange(item.name);
    setOpen(false);
    setHighlighted(-1);
    inputRef.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (!showList || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      select(suggestions[highlighted]);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={`${id}-popup`}
          aria-activedescendant={showList && suggestions[highlighted] ? `${id}-option-${suggestions[highlighted].code}` : undefined}
          className="w-full h-8 border-0 p-0 text-sm font-medium text-[#172523] placeholder:text-[#62706C]/70 focus:outline-none focus:ring-0 shadow-none bg-transparent"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="text-slate-400 hover:text-slate-600 p-1 shrink-0"
            aria-label="Xóa điểm đến"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showList && (
        <div className="absolute left-0 top-full z-50 mt-3 w-full min-w-[260px] max-w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {suggestions.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-slate-500">
              Không có tỉnh/thành bắt đầu bằng “{value.trim()}”. Bấm Tìm tour để tìm theo từ khóa này.
            </p>
          ) : (
            <ul id={`${id}-popup`} ref={listRef} role="listbox" className="max-h-72 overflow-y-auto py-1 text-sm">
              {suggestions.map((item, index) => (
                <li
                  key={item.code}
                  id={`${id}-option-${item.code}`}
                  role="option"
                  aria-selected={highlighted === index}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(item)}
                  onMouseEnter={() => setHighlighted(index)}
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${highlighted === index ? "bg-[#F0F9FF]" : ""}`}
                >
                  <MapPin className="h-4 w-4 shrink-0 text-[#075985]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-800">
                      <HighlightedName name={item.name} query={value} />
                    </p>
                    {item.popularDestinations.length > 0 && (
                      <p className="truncate text-[11px] text-slate-500">{item.popularDestinations.slice(0, 3).join(", ")}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">{item.region}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
