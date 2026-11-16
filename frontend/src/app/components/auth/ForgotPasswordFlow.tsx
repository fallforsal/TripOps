import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { newPasswordProblem, requestPasswordReset, resetPassword, verifyResetCode } from "@/app/services/password";

type Step = "email" | "code" | "password" | "done";
const input = "w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]";

/**
 * Quên mật khẩu: (1) nhập email → nhận mã 6 số qua email, (2) nhập mã, (3) đặt mật khẩu mới.
 * Mã hết hạn sau 10 phút, sai 5 lần phải gửi lại; gửi lại sau 60 giây.
 */
export function ForgotPasswordFlow({
  initialEmail,
  onCancel,
  onDone,
}: {
  initialEmail: string;
  onCancel: () => void;
  onDone: (email: string) => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : "Có lỗi xảy ra. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };

  const send = () => run(async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Vui lòng nhập email hợp lệ.");
    const res = await requestPasswordReset(email);
    setInfo(res.message);
    setDevCode(res.developmentCode ?? null);
    setCooldown(res.resendAfterSeconds);
    setCode("");
    setStep("code");
  });

  const verify = () => run(async () => {
    if (!/^\d{6}$/.test(code)) throw new Error("Mã xác nhận gồm 6 chữ số.");
    await verifyResetCode(email, code);
    setStep("password");
  });

  const reset = () => run(async () => {
    const problem = newPasswordProblem(password, confirm);
    if (problem) throw new Error(problem);
    await resetPassword(email, code, password, confirm);
    setStep("done");
  });

  if (step === "done") {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="w-12 h-12 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] flex items-center justify-center mx-auto text-[#15803D]">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#0F172A]">Đã đặt lại mật khẩu</h3>
          <p className="text-xs text-[#475569] leading-relaxed">Hãy đăng nhập bằng mật khẩu mới. Các thiết bị đang đăng nhập trước đó đã được đăng xuất.</p>
        </div>
        <Button type="button" onClick={() => onDone(email)} className="w-full bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 rounded-[6px]">
          Quay lại đăng nhập
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 text-xs"
      onSubmit={(e) => { e.preventDefault(); void (step === "email" ? send() : step === "code" ? verify() : reset()); }}
    >
      <ol className="flex items-center gap-2 text-[11px] text-[#64748B]">
        {(["email", "code", "password"] as const).map((s, i) => (
          <li key={s} className={`flex items-center gap-1 ${step === s ? "text-[#075985] font-semibold" : ""}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === s ? "border-[#075985] bg-[#F0F9FF]" : "border-[#CBD5E1]"}`}>{i + 1}</span>
            {s === "email" ? "Email" : s === "code" ? "Mã xác nhận" : "Mật khẩu mới"}
          </li>
        ))}
      </ol>

      {error && <NotificationMessage message={error} />}

      {step === "email" && (
        <>
          <p className="text-[#475569] leading-relaxed">Nhập email đã đăng ký. TripOps sẽ gửi mã xác nhận 6 số để bạn đặt lại mật khẩu.</p>
          <div className="space-y-1.5">
            <label htmlFor="forgot-email" className="font-semibold text-[#0F172A]">Email tài khoản:</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="forgot-email" type="email" required autoFocus placeholder="your.email@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} className={`${input} pl-9`} />
            </div>
          </div>
        </>
      )}

      {step === "code" && (
        <>
          <p className="text-[#475569] leading-relaxed">{info} Mã có hiệu lực 10 phút.</p>
          {devCode && (
            <p className="rounded-[6px] border border-amber-200 bg-amber-50 p-2 text-amber-900">
              Môi trường thử nghiệm chưa cấu hình gửi email — mã của bạn là <strong className="font-mono">{devCode}</strong>.
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="forgot-code" className="font-semibold text-[#0F172A]">Mã xác nhận (6 số) gửi tới {email}:</label>
            <input id="forgot-code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${input} h-11 text-center text-lg tracking-[0.5em] font-mono`} placeholder="••••••" />
          </div>
          <button type="button" disabled={cooldown > 0 || busy} onClick={() => void send()}
            className="text-[11px] text-[#075985] hover:underline disabled:text-[#94A3B8] disabled:no-underline">
            {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã"}
          </button>
        </>
      )}

      {step === "password" && (
        <>
          <p className="text-[#475569] leading-relaxed">Mã hợp lệ. Đặt mật khẩu mới cho tài khoản <strong>{email}</strong>.</p>
          {[["Mật khẩu mới", password, setPassword, "forgot-new"], ["Nhập lại mật khẩu mới", confirm, setConfirm, "forgot-confirm"]].map(([label, value, set, id]) => (
            <div key={id as string} className="space-y-1.5">
              <label htmlFor={id as string} className="font-semibold text-[#0F172A]">{label as string}:</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input id={id as string} type={show ? "text" : "password"} autoComplete="new-password" value={value as string}
                  onChange={(e) => (set as (v: string) => void)(e.target.value)} className={`${input} pl-9 pr-9`} placeholder="Ít nhất 8 ký tự" />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] p-1">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={step === "email" ? onCancel : () => { setError(""); setStep(step === "password" ? "code" : "email"); }}
          className="text-xs text-[#475569] hover:text-[#0F172A] flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{step === "email" ? "Quay lại đăng nhập" : "Quay lại"}</span>
        </button>
        <Button type="submit" disabled={busy} className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] font-semibold gap-1.5">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {step === "email" ? "Gửi mã xác nhận" : step === "code" ? "Xác nhận mã" : "Đặt lại mật khẩu"}
        </Button>
      </div>
    </form>
  );
}
