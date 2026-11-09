import { useRef, type InputHTMLAttributes } from "react";

export function VietnameseMoneyInput({ value, onValueChange, signed = false, ...props }:
  Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> &
  { value: string; onValueChange: (raw: string) => void; signed?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const formatted = value === "" || value === "-" ? value : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
  return <input {...props} ref={input} type="text" inputMode={signed ? "text" : "numeric"} value={formatted}
    onChange={e => {
      const text = e.target.value;
      const suffixDigits = text.slice(e.target.selectionStart ?? text.length).replace(/\D/g, "").length;
      const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      onValueChange((signed && text.trimStart().startsWith("-") ? "-" : "") + digits);
      requestAnimationFrame(() => {
        const field = input.current;
        if (!field || document.activeElement !== field) return;
        let caret = field.value.length; let remaining = suffixDigits;
        while (caret > 0 && remaining > 0) { if (/\d/.test(field.value[--caret])) remaining--; }
        field.setSelectionRange(caret, caret);
      });
    }} />;
}
