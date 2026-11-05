import { useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { CheckCircle2, Download, ExternalLink, FileSignature, FileText, QrCode, RotateCcw, Upload, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { contractFileUrl, signPageUrl, type ContractDto, type SignSessionStartDto } from "@/app/services/wf05Bookings";
import { formatVietnamDateTime } from "@/app/services/payos";

const STATUS: Record<ContractDto["status"], { label: string; tone: string }> = {
  AwaitingSignature: { label: "Chờ khách ký", tone: "bg-amber-50 text-amber-800 border-amber-300" },
  Signed: { label: "Đã tải bản ký – chờ công ty xác nhận", tone: "bg-sky-50 text-sky-800 border-sky-300" },
  Verified: { label: "Đã xác nhận hợp lệ", tone: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  ResignRequested: { label: "Cần ký lại", tone: "bg-rose-50 text-rose-800 border-rose-300" },
};

const WEB_SIGNED = { label: "Đã ký trực tuyến (OTP)", tone: "bg-emerald-50 text-emerald-800 border-emerald-300" };

const formatVND = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

/** Ảnh SVG mã QR (dạng data URL) cho đường dẫn trang ký. */
function qrSvgDataUrl(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }))}`;
}

interface ContractCardProps {
  bookingId: string;
  contract: ContractDto;
  /** Khách: tải bản đã ký lên. Trả false nếu máy chủ từ chối. */
  onUploadSigned?: (file: File) => Promise<boolean>;
  /** Agency: xác nhận hoặc yêu cầu ký lại. */
  onReview?: (decision: "verify" | "resign", note?: string) => Promise<boolean>;
  /** Khách: tạo mã ký trực tuyến một lần (hiện QR). */
  onStartWebSign?: () => Promise<SignSessionStartDto | null>;
  /** Khách: hỏi lại trạng thái hợp đồng trong lúc chờ ký trên điện thoại. */
  onRefresh?: () => Promise<ContractDto | null>;
}

/** Hợp đồng lữ hành của đơn: tải PDF, tải bản đã ký (khách), kiểm tra bản ký (Agency). */
export function ContractCard({ bookingId, contract: c, onUploadSigned, onReview, onStartWebSign, onRefresh }: ContractCardProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resignNote, setResignNote] = useState("");
  const [showResign, setShowResign] = useState(false);
  const [signSession, setSignSession] = useState<SignSessionStartDto | null>(null);
  const webSigned = c.status === "Signed" && c.signMethod === "web";
  const status = webSigned ? WEB_SIGNED : STATUS[c.status] ?? STATUS.AwaitingSignature;
  const canSign = c.status !== "Verified" && !webSigned;
  const canUpload = Boolean(onUploadSigned) && canSign;
  const canWebSign = Boolean(onStartWebSign) && canSign;
  const signUrl = useMemo(() => (signSession ? signPageUrl(signSession.token) : ""), [signSession]);
  const qrImage = useMemo(() => (signUrl ? qrSvgDataUrl(signUrl) : ""), [signUrl]);

  // Đang mở QR: cứ 4 giây hỏi máy chủ, khách ký xong trên điện thoại thì tự đóng.
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;
  useEffect(() => {
    if (!signSession) return;
    const timer = window.setInterval(async () => {
      const latest = await refresh.current?.();
      if (latest?.status === "Signed" && latest.signMethod === "web") setSignSession(null);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [signSession]);

  const startWebSign = async () => {
    if (!onStartWebSign) return;
    setBusy(true);
    setError("");
    const session = await onStartWebSign();
    setBusy(false);
    if (session) setSignSession(session);
  };

  const closeWebSign = async () => {
    setSignSession(null);
    await onRefresh?.();
  };
  const hasSigned = c.status === "Signed" || c.status === "Verified" || (c.status === "ResignRequested" && Boolean(c.signedAt));

  const upload = async (file?: File) => {
    if (!file || !onUploadSigned) return;
    if (file.size > 10 * 1024 * 1024 || !/\.(pdf|png|jpe?g)$/i.test(file.name)) {
      setError("Chỉ nhận file PDF, PNG hoặc JPG, tối đa 10 MB.");
      return;
    }
    setBusy(true);
    setError("");
    await onUploadSigned(file);
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const review = async (decision: "verify" | "resign") => {
    if (!onReview) return;
    if (decision === "resign" && !resignNote.trim()) {
      setError("Vui lòng ghi lý do yêu cầu khách ký lại.");
      return;
    }
    setBusy(true);
    setError("");
    const ok = await onReview(decision, decision === "resign" ? resignNote.trim() : undefined);
    setBusy(false);
    if (ok) {
      setShowResign(false);
      setResignNote("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3 text-xs text-gray-700">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-teal-600" />
          Hợp đồng lữ hành
        </h3>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${status.tone}`}>{status.label}</span>
      </div>
      <p>
        Số <strong>{c.contractNo}</strong> · phiên bản {c.version} · giá trị <strong>{formatVND(c.totalAmount)}</strong>
      </p>
      {c.requiredBeforePayment && (onUploadSigned || onStartWebSign) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-amber-900 leading-relaxed space-y-1">
          {c.status === "Signed" ? (
            <p>Bạn đã tải bản ký lên. Công ty lữ hành xác nhận bản ký hợp lệ thì mới mở thanh toán. Muốn thanh toán ngay, hãy ký trực tuyến.</p>
          ) : (
            <>
              <p>
                <strong>Cách nhanh (khuyên dùng):</strong> bấm “Ký trực tuyến”, quét mã QR bằng điện thoại, ký tên và nhập mã OTP gửi về email.
                Ký xong mở thanh toán ngay.
              </p>
              <p>
                <strong>Cách dự phòng:</strong> tải PDF, ký tay rồi chụp/quét lại và tải lên. Cách này cần công ty lữ hành xác nhận rồi mới thanh toán được.
              </p>
            </>
          )}
        </div>
      )}
      {c.signedAt && (
        <p className="text-gray-500">
          {c.signMethod === "web" ? "Khách ký trực tuyến lúc" : "Khách tải bản ký lúc"} {formatVietnamDateTime(c.signedAt)}
          {c.reviewedAt ? ` · công ty kiểm tra lúc ${formatVietnamDateTime(c.reviewedAt)}` : ""}
        </p>
      )}
      {c.status === "ResignRequested" && c.reviewNote && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-800">Lý do cần ký lại: {c.reviewNote}</p>
      )}

      <div className="grid grid-cols-1 gap-2">
        <a
          href={contractFileUrl(bookingId, "document")}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 min-h-10 px-3 py-2 rounded-md border border-gray-300 font-semibold text-center hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#075985]"
        >
          <Download className="w-3.5 h-3.5" /> Tải hợp đồng (PDF)
        </a>
        {hasSigned && (
          <a
            href={contractFileUrl(bookingId, "signed")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 min-h-10 px-3 py-2 rounded-md border border-gray-300 font-semibold text-center hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#075985]"
          >
            <FileText className="w-3.5 h-3.5" /> Xem bản đã ký
          </a>
        )}
        {canWebSign && (
          <Button size="sm" disabled={busy} onClick={startWebSign} className="h-auto min-h-10 w-full whitespace-normal rounded-md py-2 text-xs gap-2 bg-[#075985] hover:bg-[#0C4A6E] text-white">
            <QrCode className="w-3.5 h-3.5" /> Ký trực tuyến
          </Button>
        )}
        {canUpload && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => upload(e.target.files?.[0])}
            />
            <Button size="sm" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()} className="h-auto min-h-10 w-full whitespace-normal rounded-md py-2 text-xs gap-2 hover:bg-gray-100">
              <Upload className="w-3.5 h-3.5" />
              {busy ? "Đang tải lên..." : c.signedAt ? "Tải lại bản đã ký" : "Tải bản đã ký lên"}
            </Button>
          </>
        )}
      </div>

      {onReview && c.status === "Signed" && (
        <div className="space-y-2 border-t border-gray-100 pt-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => review("verify")} className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="w-3.5 h-3.5" /> Bản ký hợp lệ
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowResign((v) => !v)} className="h-8 text-xs gap-1.5 border-rose-300 text-rose-700">
              <RotateCcw className="w-3.5 h-3.5" /> Yêu cầu ký lại
            </Button>
          </div>
          {showResign && (
            <div className="space-y-2">
              <Textarea
                value={resignNote}
                onChange={(e) => setResignNote(e.target.value)}
                rows={2}
                placeholder="VD: Thiếu chữ ký trang 2, ảnh mờ không đọc được..."
                className="text-xs"
              />
              <Button size="sm" disabled={busy} onClick={() => review("resign")} className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white">
                Gửi yêu cầu ký lại
              </Button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-[11px] text-rose-600">{error}</p>}

      {signSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3 text-sm text-gray-700">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900">Ký hợp đồng trực tuyến</p>
                <p className="text-xs text-gray-500">Hợp đồng {signSession.contractNo} · phiên bản {signSession.version}</p>
              </div>
              <button type="button" onClick={closeWebSign} aria-label="Đóng" className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={qrImage} alt="Mã QR ký hợp đồng" className="mx-auto w-56 h-56" />
            <p className="text-center text-xs leading-relaxed">
              Mở camera điện thoại quét mã, ký tên và nhập mã OTP gửi về email của bạn.
              Mã dùng một lần, hết hạn lúc {formatVietnamDateTime(signSession.expiresAt)}.
            </p>
            <p className="text-center text-[11px] text-gray-400">Ký xong, trang này tự cập nhật.</p>
            <a
              href={signUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-gray-300 text-xs font-semibold hover:bg-gray-50"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ký ngay trên máy này
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
