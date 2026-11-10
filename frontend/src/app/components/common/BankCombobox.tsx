import React, { useEffect, useRef, useState } from "react";
import { Landmark, X } from "lucide-react";
import { findBank, searchBanks, type VietnamBank } from "@/app/data/vietnamBanks";

interface BankComboboxProps {
  id?: string;
  /** Tên ngắn ngân hàng đã chọn (VD "TPBank"), "" khi chưa chọn. */
  value: string;
  onChange: (bankName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Ô chọn ngân hàng có gõ để tìm: gõ "tp", "tien phong", "Tiên Phong" hay "970423" đều ra TPBank.
 * Chỉ nhận ngân hàng trong danh sách chi hộ (giá trị gửi API là tên ngắn khớp backend).
 */
export function BankCombobox({ id = "bank-combobox", value, onChange, placeholder = "Gõ tên ngân hàng, VD: TPBank, Tiên Phong", disabled }: BankComboboxProps) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Giá trị từ ngoài đổi (tải xong tài khoản đã lưu) thì hiện lại tên.
  useEffect(() => setText(value), [value]);

  const suggestions = searchBanks(text);

  useEffect(() => {
    const closeOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  });

  useEffect(() => {
    listRef.current?.querySelectorAll("li")[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const select = (bank: VietnamBank) => {
    onChange(bank.name);
    setText(bank.name);
    setOpen(false);
  };

  /** Rời ô: gõ đúng một ngân hàng thì chọn luôn; gõ dở thì trả lại ngân hàng đang chọn. */
  const close = () => {
    if (!open) return;
    setOpen(false);
    const exact = findBank(text);
    if (exact) select(exact);
    else setText(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setText(value);
      return setOpen(false);
    }
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      return setOpen(true);
    }
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(suggestions[Math.min(highlighted, suggestions.length - 1)]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Landmark className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          className="w-full h-10 rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#075985]/30 disabled:opacity-60"
        />
        {text && !disabled && (
          <button
            type="button"
            aria-label="Xóa ngân hàng"
            onClick={() => {
              setText("");
              onChange("");
              setOpen(true);
            }}
            className="absolute right-2 p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {suggestions.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-slate-500">
              Không tìm thấy ngân hàng “{text.trim()}”. Chỉ hỗ trợ các ngân hàng trong danh sách chuyển tiền tự động.
            </p>
          ) : (
            <ul id={`${id}-list`} ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1 text-sm">
              {suggestions.map((bank, index) => (
                <li
                  key={bank.bin}
                  role="option"
                  aria-selected={bank.name === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(bank)}
                  onMouseEnter={() => setHighlighted(index)}
                  className={`cursor-pointer px-3 py-2 ${index === highlighted ? "bg-[#F0F9FF]" : ""}`}
                >
                  <p className="font-semibold text-slate-800">
                    {bank.name}
                    {bank.name === value && <span className="ml-1.5 text-[10px] font-bold text-emerald-600">ĐANG CHỌN</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {bank.fullName} · BIN {bank.bin}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
