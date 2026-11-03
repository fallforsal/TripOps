import { useRef, useState } from "react";
import { CheckCircle2, Download, FileSignature, FileText, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { contractFileUrl, type ContractDto } from "@/app/services/wf05Bookings";
import { formatVietnamDateTime } from "@/app/services/payos";

const STATUS: Record<ContractDto["status"], { label: string; tone: string }> = {
  AwaitingSignature: { label: "Chờ khách ký", tone: "bg-amber-50 text-amber-800 border-amber-300" },
  Signed: { label: "Khách đã ký – chờ công ty kiểm tra", tone: "bg-sky-50 text-sky-800 border-sky-300" },
  Verified: { label: "Đã xác nhận hợp lệ", tone: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  ResignRequested: { label: "Cần ký lại", tone: "bg-rose-50 text-rose-800 border-rose-300" },
};

const formatVND = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

interface ContractCardProps {
  bookingId: string;
  contract: ContractDto;
  /** Khách: tải bản đã ký lên. Trả false nếu máy chủ từ chối. */
  onUploadSigned?: (file: File) => Promise<boolean>;
  /** Agency: xác nhận hoặc yêu cầu ký lại. */
  onReview?: (decision: "verify" | "resign", note?: string) => Promise<boolean>;
}

/** Hợp đồng lữ hành của đơn: tải PDF, tải bản đã ký (khách), kiểm tra bản ký (Agency). */
export function ContractCard({ bookingId, contract: c, onUploadSigned, onReview }: ContractCardProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resignNote, setResignNote] = useState("");
  const [showResign, setShowResign] = useState(false);
  const status = STATUS[c.status] ?? STATUS.AwaitingSignature;
  const canUpload = Boolean(onUploadSigned) && c.status !== "Verified";
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
      {c.requiredBeforePayment && onUploadSigned && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-amber-900 leading-relaxed">
          Bước 1: tải hợp đồng PDF. Bước 2: ký tay rồi chụp/quét lại, hoặc chèn chữ ký vào file. Bước 3: tải bản đã ký lên.
          Ký xong mới mở thanh toán.
        </p>
      )}
      {c.signedAt && (
        <p className="text-gray-500">
          Khách tải bản ký lúc {formatVietnamDateTime(c.signedAt)}
          {c.reviewedAt ? ` · công ty kiểm tra lúc ${formatVietnamDateTime(c.reviewedAt)}` : ""}
        </p>
      )}
      {c.status === "ResignRequested" && c.reviewNote && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-800">Lý do cần ký lại: {c.reviewNote}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={contractFileUrl(bookingId, "document")}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 font-semibold hover:bg-gray-50"
        >
          <Download className="w-3.5 h-3.5" /> Tải hợp đồng (PDF)
        </a>
        {hasSigned && (
          <a
            href={contractFileUrl(bookingId, "signed")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-300 font-semibold hover:bg-gray-50"
          >
            <FileText className="w-3.5 h-3.5" /> Xem bản đã ký
          </a>
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
            <Button size="sm" disabled={busy} onClick={() => fileInput.current?.click()} className="h-8 text-xs gap-1.5">
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
    </div>
  );
}
