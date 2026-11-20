import { ShieldCheck } from "lucide-react";
import { formatDateTime, isComplaintOpen, type ComplaintDetail } from "@/app/services/reviews";

/**
 * Nội dung một khiếu nại: mô tả + ảnh bằng chứng khách gửi, và cách Admin đã giải quyết.
 * Khiếu nại chỉ có Đang xử lý / Đã giải quyết; Admin trao đổi với khách và Agency qua chat.
 */
export function ComplaintContent({ complaint }: { complaint: ComplaintDetail }) {
  const open = isComplaintOpen(complaint.status);
  return (
    <div className="space-y-4">
      <div className="space-y-1.5 text-sm">
        <p className="text-xs font-semibold text-[#475569]">Nội dung khiếu nại · gửi {formatDateTime(complaint.createdAt)}</p>
        <div className="p-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] whitespace-pre-line leading-relaxed">
          {complaint.description}
        </div>
      </div>

      {complaint.evidence.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[#475569]">Ảnh bằng chứng</p>
          <div className="flex flex-wrap gap-2">
            {complaint.evidence.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block w-24 h-24 rounded-[6px] overflow-hidden border border-[#CBD5E1] hover:border-[#075985]">
                <img src={url} alt={`Bằng chứng ${i + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {!open && (
        <div className="rounded-[6px] border p-3 text-sm bg-emerald-50 border-emerald-200 text-emerald-900">
          <p className="font-semibold flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-4 h-4" />
            Khiếu nại đã được giải quyết
          </p>
          <p className="whitespace-pre-line">{complaint.adminNotes}</p>
          {complaint.resolvedAt && <p className="text-[11px] opacity-70 mt-1">Giải quyết lúc {formatDateTime(complaint.resolvedAt)}</p>}
        </div>
      )}
    </div>
  );
}
