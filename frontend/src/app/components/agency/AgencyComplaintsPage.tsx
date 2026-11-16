import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Info, Loader2, MessageSquareWarning } from "lucide-react";
import { ComplaintContent } from "@/app/components/reviews/ComplaintContent";
import {
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_STATUS_STYLE,
  formatDate,
  formatDateTime,
  getAgencyComplaint,
  isComplaintOpen,
  listAgencyComplaints,
  reasonLabel,
  type ComplaintDetail,
  type ComplaintSummary,
} from "@/app/services/reviews";

type Filter = "all" | "open" | "closed";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "open", label: "Đang xử lý" },
  { id: "closed", label: "Đã giải quyết" },
];

/** Mở thẳng khiếu nại từ thẻ trong chat: #/agency/complaints?id=12. */
const complaintIdFromHash = () => {
  const match = window.location.hash.match(/^#\/?agency\/complaints\?(?:.*&)?id=(\d+)/);
  return match ? Number(match[1]) : null;
};

/**
 * Khiếu nại khách gửi về booking của Agency (chủ trì hoặc đồng tổ chức). Chỉ đọc:
 * Admin TripOps xử lý và trao đổi với Agency qua chat. Khiếu nại về nền tảng không hiện ở đây.
 */
export function AgencyComplaintsPage() {
  const [items, setItems] = useState<ComplaintSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ComplaintDetail | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listAgencyComplaints()
      .then((list) => { setItems(list); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được khiếu nại."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const open = useCallback(async (id: number) => {
    try { setDetail(await getAgencyComplaint(id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Không mở được khiếu nại."); }
  }, []);
  useEffect(() => {
    const fromHash = () => { const id = complaintIdFromHash(); if (id) void open(id); };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [open]);

  const back = () => {
    setDetail(null);
    if (complaintIdFromHash()) window.history.replaceState(null, "", "#/agency/complaints");
    load();
  };

  if (detail) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-10 space-y-4">
        <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#075985]">
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Khiếu nại #{detail.id} · {reasonLabel(detail.type, detail.reasonCode)}</p>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-rose-600" />{detail.title}
              </h2>
            </div>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${COMPLAINT_STATUS_STYLE[detail.status]}`}>
              {COMPLAINT_STATUS_LABEL[detail.status]}
            </span>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
            <p className="font-semibold text-slate-700">Booking</p>
            <p><span className="font-mono">{detail.bookingCode}</span> · {detail.tourName}</p>
            {detail.startDate && <p>Khởi hành: {formatDate(detail.startDate)}</p>}
            <p>Khách: {detail.customerName}</p>
          </div>
          <ComplaintContent complaint={detail} />
          {isComplaintOpen(detail.status) && (
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Admin TripOps đang xử lý. Nếu cần đối chiếu, Admin sẽ nhắn cho bạn trong mục Tin nhắn.
            </p>
          )}
        </div>
      </div>
    );
  }

  const shown = items.filter((c) => filter === "all" || (filter === "open") === isComplaintOpen(c.status));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Khiếu nại</h1>
        <p className="text-sm text-slate-500">Khiếu nại khách gửi về các booking của bạn. Admin TripOps xử lý và sẽ nhắn cho bạn khi cần.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${filter === f.id ? "bg-[#075985] text-white border-[#075985]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            {f.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {loading ? (
        <div className="py-10 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">Không có khiếu nại nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Khiếu nại</th>
                <th className="py-2.5 px-3">Booking</th>
                <th className="py-2.5 px-3">Khách</th>
                <th className="py-2.5 px-3">Gửi lúc</th>
                <th className="py-2.5 px-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-slate-50 align-top" onClick={() => open(c.id)}>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-900">#{c.id} {c.title}</p>
                    <p className="text-[11px] text-slate-500">{reasonLabel(c.type, c.reasonCode)}</p>
                  </td>
                  <td className="py-2.5 px-3"><p className="font-mono">{c.bookingCode}</p><p className="text-[11px] text-slate-500">{c.tourName}</p></td>
                  <td className="py-2.5 px-3">{c.customerName}</td>
                  <td className="py-2.5 px-3">{formatDateTime(c.createdAt)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${COMPLAINT_STATUS_STYLE[c.status]}`}>{COMPLAINT_STATUS_LABEL[c.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
