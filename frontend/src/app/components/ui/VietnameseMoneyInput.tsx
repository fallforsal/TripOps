import { useRef, useState, type InputHTMLAttributes } from "react";

export function VietnameseMoneyInput({ value, onValueChange, signed = false, onBlur, onWheel, ...props }:
  Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> &
  { value: string; onValueChange: (raw: string) => void; signed?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [draftPrefix, setDraftPrefix] = useState<"" | "-" | null>(null);
  const displayRaw =
    draftPrefix !== null && (value === "0" || value === "")
      ? draftPrefix
      : value;
  const formatted =
    displayRaw === "" || displayRaw === "-"
      ? displayRaw
      : Number(displayRaw).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
  return <input {...props} ref={input} type="text" inputMode={signed ? "text" : "numeric"} value={formatted}
    onWheel={e => {
      e.currentTarget.blur();
      onWheel?.(e);
    }}
    onBlur={e => {
      setDraftPrefix(null);
      onBlur?.(e);
    }}
    onChange={e => {
      const text = e.target.value;
      const suffixDigits = text.slice(e.target.selectionStart ?? text.length).replace(/\D/g, "").length;
      const isNegative = signed && text.trimStart().startsWith("-");
      const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      if (isNegative && (digits === "" || digits === "0")) {
        setDraftPrefix("-");
        onValueChange("-");
        return;
      }
      if (digits === "") {
        setDraftPrefix("");
        onValueChange("");
        return;
      }
      setDraftPrefix(null);
      onValueChange((isNegative ? "-" : "") + digits);
      requestAnimationFrame(() => {
        const field = input.current;
        if (!field || document.activeElement !== field) return;
        let caret = field.value.length; let remaining = suffixDigits;
        while (caret > 0 && remaining > 0) { if (/\d/.test(field.value[--caret])) remaining--; }
        field.setSelectionRange(caret, caret);
      });
    }} />;
}
