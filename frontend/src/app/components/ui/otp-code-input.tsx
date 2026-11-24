import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";

/** Ô nhập mã OTP 6 số dùng chung (quên mật khẩu, ký hợp đồng trực tuyến). */
export function OtpCodeInput({
  id,
  value,
  onChange,
  autoFocus,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <InputOTP
      id={id}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      disabled={disabled}
      value={value}
      onChange={(next) => onChange(next.replace(/\D/g, "").slice(0, 6))}
      containerClassName="justify-center"
    >
      <InputOTPGroup className="gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className="h-11 w-11 rounded-lg border border-[#CBD5E1] bg-white font-mono text-lg text-[#0F172A] first:rounded-lg last:rounded-lg data-[active=true]:border-[#075985] data-[active=true]:ring-[#075985]/20"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
