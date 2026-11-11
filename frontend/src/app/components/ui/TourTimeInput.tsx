import { useRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "./input";
import { toTourApiTime, tourClockDraft } from "@/app/lib/tourClockTime";

export function TourTimeInput({ value, onValueChange, onValueCommit, ...props }:
  Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> &
  { value: string; onValueChange: (value: string) => void; onValueCommit?: (value: string) => void }) {
  const [error, setError] = useState("");
  const dirty = useRef(false);
  return <div>
    <Input {...props} type="text" inputMode="numeric" value={value} aria-invalid={!!error}
      onChange={event => {
        dirty.current = true;
        setError(""); onValueChange(tourClockDraft(event.target.value)); event.target.setCustomValidity("");
      }}
      onKeyDown={event => {
        if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
      }}
      onMouseLeave={event => {
        if (dirty.current && document.activeElement === event.currentTarget) event.currentTarget.blur();
      }}
      onBlur={event => {
        if (!dirty.current) return;
        try {
          const time = toTourApiTime(value, "Giờ lịch trình")?.slice(0, 5) || "";
          dirty.current = false;
          (onValueCommit || onValueChange)(time);
          setError(""); event.target.setCustomValidity("");
        } catch {
          setError("Giờ hợp lệ: 00:00–23:59");
          event.target.setCustomValidity("Nhập giờ từ 00:00 đến 23:59");
        }
      }} />
    {error && <p role="alert" className="mt-1 text-[10px] leading-tight text-red-600">{error}</p>}
  </div>;
}
