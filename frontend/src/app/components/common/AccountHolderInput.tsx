import React, { useLayoutEffect, useRef } from "react";
import { Input } from "@/app/components/ui/input";
import { toHolderName } from "@/app/lib/bankAccountText";

type AccountHolderInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Ô "Tên chủ tài khoản": gõ "hoang tung lam" hiện ngay "HOANG TUNG LAM" (in hoa, không dấu).
 * Gõ tiếng Việt bằng bộ gõ (Telex/VNI) vẫn đúng: trong lúc bộ gõ đang ghép chữ thì để nguyên, ghép xong mới đổi.
 * Giữ vị trí con trỏ khi sửa giữa chừng.
 */
export function AccountHolderInput({ value, onChange, onCompositionStart, onCompositionEnd, ...props }: AccountHolderInputProps) {
  const composing = useRef(false);
  const pendingCaret = useRef<{ input: HTMLInputElement; position: number } | null>(null);

  // Sau khi React ghi giá trị mới vào ô, đặt lại con trỏ đúng chỗ người dùng đang gõ.
  useLayoutEffect(() => {
    const pending = pendingCaret.current;
    pendingCaret.current = null;
    if (!pending || document.activeElement !== pending.input) return;
    try { pending.input.setSelectionRange(pending.position, pending.position); } catch { /* ô không hỗ trợ chọn */ }
  });

  const apply = (input: HTMLInputElement) => {
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const next = toHolderName(raw);
    if (next !== raw) pendingCaret.current = { input, position: toHolderName(raw.slice(0, caret)).length };
    onChange(next);
  };

  return (
    <Input
      {...props}
      value={value}
      autoComplete={props.autoComplete ?? "off"}
      spellCheck={false}
      onCompositionStart={(e) => { composing.current = true; onCompositionStart?.(e); }}
      onCompositionEnd={(e) => { composing.current = false; apply(e.currentTarget); onCompositionEnd?.(e); }}
      onChange={(e) => {
        if (composing.current) onChange(e.target.value);
        else apply(e.target);
      }}
    />
  );
}
