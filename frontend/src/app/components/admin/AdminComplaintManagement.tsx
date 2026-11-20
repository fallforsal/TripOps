import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Building2, CheckCircle2, Loader2, Mail, MessageSquareWarning, Phone } from "lucide-react";
import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ComplaintContent } from "@/app/components/reviews/ComplaintContent";
import {
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_STATUS_STYLE,
  formatDate,
  formatDateTime,
  getAdminComplaint,
  isComplaintOpen,
  listAdminComplaints,
  listAgencyComplaintStats,
  reasonLabel,
  resolveComplaint,
  type AgencyComplaintStat,
  type ComplaintDetail,
  type ComplaintStatus,
  type ComplaintSummary,
  type ComplaintType,
} from "@/app/services/reviews";

const STATUS_FILTERS: { id: "" | ComplaintStatus; label: string }[] = [
  { id: "", label: "Tất cả" },
  { id: "Pending", label: "Đang xử lý" },
  { id: "Resolved", label: "Đã giải quyết" },
];

/** Mở thẳng khiếu nại từ thẻ trong chat: #/admin/complaints?id=12. */
const complaintIdFromHash = () => {
  const match = window.location.hash.match(/^#\/?admin\/complaints\?(?:.*&)?id=(\d+)/);
  return match ? Number(match[1]) : null;
};

/**
 * Admin xử lý khiếu nại: xem nội dung + bằng chứng, chat với khách / Agency (thẻ khiếu nại gắn sẵn trong khung chat),
 * xong thì đánh dấu đã giải quyết kèm ghi chú; khách và Agency nhận tin nhắn + thông báo. Không có từ chối.
 */
export function AdminComplaintManagement() {
  const [items, setItems] = useState<ComplaintSummary[]>([]);
  const [stats, setStats] = useState<AgencyComplaintStat[]>([]);
  const [status, setStatus] = useState<"" | ComplaintStatus>("");
  const [type, setType] = useState<"" | ComplaintType>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ComplaintDetail | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listAdminComplaints({ status, type }), listAgencyComplaintStats()])
      .then(([list, agencyStats]) => { setItems(list); setStats(agencyStats); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được khiếu nại."))
      .finally(() => setLoading(false));
  }, [status, type]);
  useEffect(load, [load]);
  useEffect(() => {
    const fromHash = () => { const id = complaintIdFromHash(); if (id) void open(id); };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = async (id: number) => {
    try { setDetail(await getAdminComplaint(id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Không mở được khiếu nại."); }
  };

  if (detail) return <ComplaintDetailView complaint={detail} onChange={setDetail} onBack={() => { setDetail(null); load(); }} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Khiếu nại</h1>
        <p className="text-sm text-slate-500">Xem khiếu nại, chat với khách hoặc Agency để xử lý, xong thì đánh dấu đã giải quyết. Agency xem được khiếu nại về booking của mình.</p>
      </div>
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Danh sách khiếu nại</TabsTrigger>
          <TabsTrigger value="agencies" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Theo Agency</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setStatus(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${status === f.id ? "bg-[#075985] text-white border-[#075985]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                {f.label}
              </button>
            ))}
            <select value={type} onChange={(e) => setType(e.target.value as "" | ComplaintType)}
              className="h-8 rounded-lg border border-slate-200 text-xs px-2 text-slate-700 ml-auto">
              <option value="">Mọi loại</option>
              <option value="Trip">Chuyến đi</option>
              <option value="Platform">Nền tảng</option>
            </select>
          </div>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          {loading ? (
            <div className="py-10 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Không có khiếu nại nào.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Khiếu nại</th>
                    <th className="py-2.5 px-3">Loại</th>
                    <th className="py-2.5 px-3">Khách</th>
                    <th className="py-2.5 px-3">Booking / Agency</th>
                    <th className="py-2.5 px-3">Gửi lúc</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((c) => (
                    <tr key={c.id} className="cursor-pointer hover:bg-slate-50 align-top" onClick={() => open(c.id)}>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900">#{c.id} {c.title}</p>
                        <p className="text-[11px] text-slate-500">{reasonLabel(c.type, c.reasonCode)}</p>
                      </td>
                      <td className="py-2.5 px-3">{c.type === "Trip" ? "Chuyến đi" : "Nền tảng"}</td>
                      <td className="py-2.5 px-3">{c.customerName}</td>
                      <td className="py-2.5 px-3">
                        {c.type === "Trip" ? (<><p className="font-mono">{c.bookingCode}</p><p className="text-[11px] text-slate-500">{c.agencyName}</p></>) : "—"}
                      </td>
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
        </TabsContent>

        <TabsContent value="agencies">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-xs text-slate-500">
              Khiếu nại về chuyến đi theo từng Agency.
              Số liệu này chỉ để theo dõi nội bộ, <strong>không trừ vào số sao</strong> của Agency.
            </p>
            {stats.length === 0 ? <p className="text-sm text-slate-500">Chưa có khiếu nại chuyến đi nào.</p> : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="text-slate-700 font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2">Agency</th>
                    <th className="py-2 px-2 text-right">Tổng</th>
                    <th className="py-2 px-2 text-right">Đang xử lý</th>
                    <th className="py-2 px-2 text-right">Đã giải quyết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.map((s) => (
                    <tr key={s.agencyId}>
                      <td className="py-2 px-2 font-semibold text-slate-900 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />{s.agencyName}</td>
                      <td className="py-2 px-2 text-right">{s.total}</td>
                      <td className={`py-2 px-2 text-right ${s.open > 0 ? "font-bold text-amber-700" : ""}`}>{s.open}</td>
                      <td className="py-2 px-2 text-right">{s.upheld}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComplaintDetailView({ complaint, onChange, onBack }: {
  complaint: ComplaintDetail; onChange: (c: ComplaintDetail) => void; onBack: () => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isOpen = isComplaintOpen(complaint.status);
  // Thẻ khiếu nại gắn sẵn vào khung chat với khách / Agency.
  const card = {
    kind: "complaint" as const,
    id: complaint.id,
    title: `Khiếu nại #${complaint.id}: ${complaint.title}`,
    subtitle: complaint.bookingCode ? `Booking ${complaint.bookingCode}` : "Khiếu nại về nền tảng",
  };

  const resolve = async () => {
    if (note.trim().length < 5) return setError("Ghi chú cần ít nhất 5 ký tự.");
    setSaving(true);
    setError("");
    try { onChange(await resolveComplaint(complaint.id, note)); setResolving(false); setNote(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Không lưu được."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#075985]">
        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách
      </button>
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Khiếu nại #{complaint.id} · {complaint.type === "Trip" ? "Chuyến đi" : "Nền tảng"} · {reasonLabel(complaint.type, complaint.reasonCode)}</p>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><MessageSquareWarning className="w-5 h-5 text-rose-600" />{complaint.title}</h2>
          </div>
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${COMPLAINT_STATUS_STYLE[complaint.status]}`}>{COMPLAINT_STATUS_LABEL[complaint.status]}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
            <p className="font-semibold text-slate-700">Khách hàng</p>
            <p className="text-slate-900">{complaint.customerName}</p>
            {complaint.customerPhone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{complaint.customerPhone}</p>}
            {complaint.customerEmail && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{complaint.customerEmail}</p>}
            <ChatWithButton userId={complaint.customerId} context={card} className="mt-1">Chat với khách</ChatWithButton>
          </div>
          {complaint.type === "Trip" && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
              <p className="font-semibold text-slate-700">Chuyến đi</p>
              <p><span className="font-mono">{complaint.bookingCode}</span> · {complaint.tourName}</p>
              <p>Khởi hành: {formatDate(complaint.startDate)}</p>
              <p>Agency: <strong>{complaint.agencyName}</strong></p>
              <ChatWithButton userId={complaint.agencyId} context={card} className="mt-1">Chat với Agency</ChatWithButton>
            </div>
          )}
        </div>

        <ComplaintContent complaint={complaint} />

        {isOpen && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" onClick={() => setResolving(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Đánh dấu đã giải quyết
            </Button>
          </div>
        )}
      </div>

      <Dialog open={resolving} onOpenChange={(o) => !o && setResolving(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Đánh dấu đã giải quyết</DialogTitle>
            <DialogDescription>
              Ghi chú cách đã giải quyết. Hệ thống gửi tin nhắn và thông báo cho khách
              {complaint.type === "Trip" && " và Agency"}; không sửa được sau khi lưu.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={2000}
            placeholder="VD: Agency đã đổi phòng đúng hạng và hoàn 500.000đ chênh lệch cho khách." />
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setResolving(false)}>Hủy</Button>
            <Button type="button" onClick={resolve} disabled={saving} className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Xác nhận đã giải quyết
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
