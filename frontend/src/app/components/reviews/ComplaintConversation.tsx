import { useState } from "react";
import { Loader2, Send, ShieldCheck, User } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { EvidencePicker } from "@/app/components/reviews/EvidencePicker";
import {
  formatDateTime,
  isComplaintOpen,
  type ComplaintDetail,
} from "@/app/services/reviews";

function Attachments({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {urls.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-[6px] overflow-hidden border border-[#CBD5E1] bg-slate-50">
          <img src={url} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
        </a>
      ))}
    </div>
  );
}

function Bubble({ mine, admin, name, at, content, attachments }: {
  mine: boolean; admin: boolean; name: string; at: string; content: string; attachments: string[];
}) {
  return (
    <div className={`flex gap-2.5 ${mine ? "flex-row-reverse text-right" : ""}`}>
      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${admin ? "bg-[#075985] text-white" : "bg-slate-200 text-slate-600"}`}>
        {admin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className={`max-w-[80%] rounded-[8px] px-3 py-2 text-left ${admin ? "bg-[#F0F9FF] border border-[#BAE6FD]" : "bg-white border border-[#E2E8F0]"}`}>
        <p className="text-[11px] text-[#64748B] mb-0.5">
          <span className="font-semibold text-[#0F172A]">{name}</span> · {formatDateTime(at)}
        </p>
        <p className="text-sm text-[#0F172A] whitespace-pre-line">{content}</p>
        <Attachments urls={attachments} />
      </div>
    </div>
  );
}

/** Cuộc trao đổi khách ↔ Admin trong một khiếu nại. Agency không tham gia. */
export function ComplaintConversation({
  complaint,
  viewer,
  onSend,
}: {
  complaint: ComplaintDetail;
  viewer: "customer" | "admin";
  onSend: (content: string, files: File[]) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const open = isComplaintOpen(complaint.status);

  const send = async () => {
    if (!text.trim()) return setError("Vui lòng nhập nội dung.");
    setSending(true);
    setError("");
    try {
      await onSend(text, files);
      setText("");
      setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được tin nhắn.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Bubble
          mine={viewer === "customer"}
          admin={false}
          name={complaint.customerName || "Khách hàng"}
          at={complaint.createdAt}
          content={complaint.description}
          attachments={complaint.evidence}
        />
        {complaint.messages.map((m) => (
          <Bubble
            key={m.id}
            mine={m.senderRole === viewer}
            admin={m.senderRole === "admin"}
            name={m.senderName}
            at={m.createdAt}
            content={m.content}
            attachments={m.attachments}
          />
        ))}
        {complaint.messages.length === 0 && open && viewer === "customer" && (
          <p className="text-xs text-[#64748B] text-center py-1">Admin TripOps sẽ phản hồi tại đây. Bạn sẽ nhận thông báo khi có phản hồi.</p>
        )}
      </div>

      {!open && complaint.adminNotes && (
        <div className={`rounded-[6px] border p-3 text-sm ${complaint.status === "Resolved" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-800"}`}>
          <p className="font-semibold mb-1">{complaint.status === "Resolved" ? "Kết luận: khiếu nại được giải quyết" : "Kết luận: khiếu nại được khép lại"}</p>
          <p className="whitespace-pre-line">{complaint.adminNotes}</p>
          {complaint.resolvedAt && <p className="text-[11px] opacity-70 mt-1">{formatDateTime(complaint.resolvedAt)}</p>}
        </div>
      )}

      {open ? (
        <div className="space-y-2 border-t border-[#F1F5F9] pt-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder={viewer === "admin" ? "Phản hồi khách hàng..." : "Bổ sung thông tin hoặc trả lời Admin..."}
            className="text-sm"
          />
          <div className="flex items-end justify-between gap-3">
            <EvidencePicker files={files} onChange={setFiles} onError={setError} disabled={sending} compact />
            <Button type="button" onClick={send} disabled={sending} className="bg-[#075985] hover:bg-[#0C4A6E] text-white gap-1.5 rounded-[6px]">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Gửi
            </Button>
          </div>
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        </div>
      ) : (
        <p className="text-xs text-[#64748B] text-center">Khiếu nại đã kết thúc nên không thể gửi thêm tin nhắn.</p>
      )}
    </div>
  );
}
