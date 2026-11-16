import { useEffect, useRef, useState } from "react";
import { Input } from "./input";
import { birthDateToIso, formatBirthDateInput } from "@/app/utils/birthDate";

export function BirthDateInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(() => formatBirthDateInput(value));
  const [touched, setTouched] = useState(false);
  const emittedValue = useRef(value);
  useEffect(() => {
    if (value !== emittedValue.current) {
      setText(formatBirthDateInput(value));
      emittedValue.current = value;
      setTouched(false);
    }
  }, [value]);
  const invalid = touched && !!text && !birthDateToIso(text);
  return <>
    <Input id={id} type="text" inputMode="numeric" placeholder="dd/MM/yyyy" autoComplete="bday"
      value={text} aria-invalid={invalid} aria-describedby={`${id}-hint`}
      onBlur={() => setTouched(true)}
      onChange={event => {
        const formatted = formatBirthDateInput(event.target.value);
        setText(formatted);
        const iso = birthDateToIso(formatted);
        emittedValue.current = iso;
        onChange(iso);
      }} />
    <p id={`${id}-hint`} className={`text-xs ${invalid ? "text-red-600" : "text-slate-500"}`}>
      {invalid ? "Ngày sinh không hợp lệ hoặc ở tương lai. Nhập dd/MM/yyyy." : "Nhập ngày/tháng/năm, ví dụ 12041992 → 12/04/1992."}
    </p>
  </>;
}
