import { Clock, ShieldCheck } from "lucide-react";
import { formatDateTime, isComplaintOpen, type ComplaintDetail } from "@/app/services/reviews";

/**
 * Nội dung một khiếu nại: mô tả + ảnh bằng chứng khách gửi, và phản hồi của Admin (chấp nhận / không chấp nhận).
 * Không có nhắn tin qua lại: cần trao đổi thêm thì Admin gọi điện hoặc dùng chat.
 */
export function ComplaintContent({ complaint, viewer = "customer" }: { complaint: ComplaintDetail; viewer?: "customer" | "admin" }) {
  const open = isComplaintOpen(complaint.status);
  const accepted = complaint.status === "Resolved";
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

      {open ? (viewer === "admin" ? null :
        <div className="flex items-start gap-2 rounded-[6px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Admin TripOps đang xem xét khiếu nại. Nếu cần thêm thông tin, Admin sẽ liên hệ bạn qua số điện thoại hoặc tin nhắn.</p>
        </div>
      ) : (
        <div className={`rounded-[6px] border p-3 text-sm ${accepted ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"}`}>
          <p className="font-semibold flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-4 h-4" />
            {accepted ? "Khiếu nại được chấp nhận" : "Khiếu nại không được chấp nhận"}
          </p>
          <p className="whitespace-pre-line">{complaint.adminNotes}</p>
          {complaint.resolvedAt && <p className="text-[11px] opacity-70 mt-1">Phản hồi lúc {formatDateTime(complaint.resolvedAt)}</p>}
        </div>
      )}
    </div>
  );
}
