import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, FileText, Mail, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ApiError } from "@/app/lib/http";
import { formatVietnamDateTime } from "@/app/services/payos";
import { normalizeOtp, otpResendWait } from "@/app/services/contractSigning";
import {
  completeWebSign,
  getSignSession,
  sendSignOtp,
  signingDocumentUrl,
  type SignSessionDto,
} from "@/app/services/wf05Bookings";
import { SignaturePad } from "./SignaturePad";

const formatVND = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("vi-VN");
};

/** Trang ký hợp đồng trực tuyến mở từ mã QR (#/sign/{mã}). Không cần đăng nhập: mã một lần + OTP email. */
export function SignContractPage({ token }: { token: string }) {
  const [session, setSession] = useState<SignSessionDto | null>(null);
  const [loadError, setLoadError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "otp" | "sign">("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setSession(await getSignSession(token));
      setLoadError("");
    } catch (err) {
      setLoadError(
        err instanceof ApiError && err.status === 404
          ? "Mã ký không hợp lệ. Vui lòng quét lại mã QR trên trang đơn đặt tour."
          : err instanceof Error ? err.message : "Không tải được thông tin hợp đồng.",
      );
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleError = async (err: unknown, fallback: string) => {
    setError(err instanceof Error ? err.message : fallback);
    if (err instanceof ApiError && (err.status === 410 || err.status === 409)) await load();
  };

  const requestOtp = async () => {
    setBusy("otp");
    setError("");
    try {
      const next = await sendSignOtp(token);
      setSession(next);
      setDevOtp(next.developmentOtp ?? null);
    } catch (err) {
      await handleError(err, "Không gửi được mã OTP.");
    } finally {
      setBusy("");
    }
  };

  const sign = async () => {
    if (!signature) return setError("Vui lòng ký tên vào ô ký.");
    if (!agreed) return setError("Vui lòng xác nhận đã đọc và đồng ý nội dung hợp đồng.");
    if (otp.length !== 6) return setError("Vui lòng nhập đủ 6 số OTP.");
    setBusy("sign");
    setError("");
    try {
      setSession(await completeWebSign(token, { signaturePng: signature, otp, agreed }));
    } catch (err) {
      setOtp("");
      await handleError(err, "Không ký được hợp đồng.");
    } finally {
      setBusy("");
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center gap-2 text-teal-700">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-bold">TripOps · Ký hợp đồng lữ hành</span>
        </div>
        {children}
      </div>
    </div>
  );

  if (loadError)
    return shell(
      <div className="rounded-2xl border border-rose-200 bg-white p-5 text-sm text-rose-700 flex gap-2">
        <TriangleAlert className="w-5 h-5 shrink-0" /> {loadError}
      </div>,
    );
  if (!session) return shell(<p className="text-sm text-gray-500">Đang tải hợp đồng...</p>);

  const summary = (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700 space-y-1.5">
      <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">Hợp đồng số {session.contractNo} · phiên bản {session.version}</p>
      <p className="text-base font-semibold text-gray-900">{session.tourName}</p>
      <p>Khởi hành: {formatDate(session.startDate)}</p>
      <p>Khách hàng: {session.customerName}</p>
      <p>Giá trị hợp đồng: <strong>{formatVND(session.totalAmount)}</strong></p>
    </div>
  );

  if (session.status === "completed")
    return shell(
      <>
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-900 space-y-2">
          <p className="flex items-center gap-2 font-bold text-base">
            <CheckCircle2 className="w-5 h-5" /> Đã ký hợp đồng thành công
          </p>
          <p>
            Ký lúc {formatVietnamDateTime(session.completedAt)}. Bạn có thể quay lại trang đơn đặt tour trên máy tính để thanh toán.
          </p>
          <a
            href={signingDocumentUrl(token)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold underline"
          >
            <FileText className="w-4 h-4" /> Xem bản hợp đồng đã ký
          </a>
        </div>
        {summary}
      </>,
    );

  if (session.status === "expired")
    return shell(
      <>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 flex gap-2">
          <Clock className="w-5 h-5 shrink-0" />
          Mã ký đã hết hạn hoặc đã được thay bằng mã mới. Vui lòng bấm “Ký trực tuyến” trên trang đơn đặt tour để tạo mã QR mới.
        </div>
        {summary}
      </>,
    );

  const wait = otpResendWait(session.otpSentAt, now);
  const otpSent = Boolean(session.otpSentAt);

  return shell(
    <>
      {summary}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700 space-y-4">
        <div className="space-y-2">
          <p className="font-bold text-gray-900">1. Đọc hợp đồng</p>
          <a
            href={signingDocumentUrl(token)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-300 font-semibold hover:bg-gray-50"
          >
            <FileText className="w-4 h-4" /> Mở hợp đồng (PDF)
          </a>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>Tôi đã đọc, hiểu và đồng ý toàn bộ nội dung hợp đồng.</span>
          </label>
        </div>

        <div className="space-y-2">
          <p className="font-bold text-gray-900">2. Ký tên</p>
          <SignaturePad onChange={setSignature} disabled={busy === "sign"} />
        </div>

        <div className="space-y-2">
          <p className="font-bold text-gray-900">3. Xác nhận bằng mã OTP</p>
          <p className="text-gray-500">Mã 6 số gửi tới email tài khoản <strong>{session.maskedEmail}</strong>, hiệu lực 5 phút.</p>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== "" || wait > 0}
            onClick={requestOtp}
            className="h-9 gap-1.5 text-sm"
          >
            <Mail className="w-4 h-4" />
            {busy === "otp" ? "Đang gửi..." : wait > 0 ? `Gửi lại sau ${wait}s` : otpSent ? "Gửi lại mã OTP" : "Gửi mã OTP"}
          </Button>
          {devOtp && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              Môi trường Development chưa cấu hình email: mã OTP là <strong className="font-mono">{devOtp}</strong>
            </p>
          )}
          {otpSent && (
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(normalizeOtp(e.target.value))}
              placeholder="Nhập 6 số OTP"
              className="w-full h-11 rounded-lg border border-gray-300 px-3 text-center font-mono text-lg tracking-[0.4em]"
            />
          )}
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button
          type="button"
          disabled={busy !== "" || !otpSent || !signature || !agreed || otp.length !== 6}
          onClick={sign}
          className="w-full h-11 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white"
        >
          {busy === "sign" ? "Đang ký..." : "Xác nhận ký hợp đồng"}
        </Button>
        <p className="text-[11px] text-gray-400">
          Mã ký hết hạn lúc {formatVietnamDateTime(session.expiresAt)}. Hệ thống lưu thời điểm ký, địa chỉ IP và thiết bị để làm bằng chứng.
        </p>
      </div>
    </>,
  );
}
