import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Building2, Loader2, Mail, MessageSquareWarning, Phone } from "lucide-react";
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
  { id: "Pending", label: "Chờ xem xét" },
  { id: "Resolved", label: "Đã chấp nhận" },
  { id: "Rejected", label: "Không chấp nhận" },
];

/**
 * Admin xử lý khiếu nại: xem nội dung + bằng chứng, nếu cần thì gọi điện / chat với khách hoặc liên hệ Agency để đối chiếu,
 * rồi chấp nhận hoặc không chấp nhận kèm phản hồi. Khiếu nại chuyến đi đang chờ xử lý giữ tiền quyết toán của Agency.
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

  const open = async (id: number) => {
    try { setDetail(await getAdminComplaint(id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Không mở được khiếu nại."); }
  };

  if (detail) return <ComplaintDetailView complaint={detail} onChange={setDetail} onBack={() => { setDetail(null); load(); }} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Khiếu nại</h1>
        <p className="text-sm text-slate-500">Xem khiếu nại, rồi chấp nhận hoặc không chấp nhận kèm phản hồi cho khách. Cần hỏi thêm thì gọi điện hoặc chat. Agency không thấy khiếu nại.</p>
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
              Khiếu nại về chuyến đi theo từng Agency. “Được chấp nhận” là khiếu nại Admin xác nhận khách đúng.
              Số liệu này chỉ để theo dõi nội bộ, <strong>không trừ vào số sao</strong> của Agency.
            </p>
            {stats.length === 0 ? <p className="text-sm text-slate-500">Chưa có khiếu nại chuyến đi nào.</p> : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="text-slate-700 font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2">Agency</th>
                    <th className="py-2 px-2 text-right">Tổng</th>
                    <th className="py-2 px-2 text-right">Đang mở</th>
                    <th className="py-2 px-2 text-right">Được chấp nhận</th>
                    <th className="py-2 px-2 text-right">Không chấp nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.map((s) => (
                    <tr key={s.agencyId}>
                      <td className="py-2 px-2 font-semibold text-slate-900 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />{s.agencyName}</td>
                      <td className="py-2 px-2 text-right">{s.total}</td>
                      <td className="py-2 px-2 text-right">{s.open}</td>
                      <td className={`py-2 px-2 text-right font-bold ${s.upheld > 0 ? "text-rose-700" : ""}`}>{s.upheld}</td>
                      <td className="py-2 px-2 text-right">{s.dismissed}</td>
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
  const [resolving, setResolving] = useState<"Resolved" | "Rejected" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isOpen = isComplaintOpen(complaint.status);

  const resolve = async () => {
    if (!resolving) return;
    if (note.trim().length < 5) return setError("Phản hồi cần ít nhất 5 ký tự.");
    setSaving(true);
    setError("");
    try { onChange(await resolveComplaint(complaint.id, resolving, note)); setResolving(null); setNote(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Không lưu được kết luận."); }
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
            <ChatWithButton userId={complaint.customerId} className="mt-1">Chat với khách</ChatWithButton>
          </div>
          {complaint.type === "Trip" && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
              <p className="font-semibold text-slate-700">Chuyến đi</p>
              <p><span className="font-mono">{complaint.bookingCode}</span> · {complaint.tourName}</p>
              <p>Khởi hành: {formatDate(complaint.startDate)}</p>
              <p>Agency: <strong>{complaint.agencyName}</strong></p>
              {isOpen && <p className="text-amber-700">Đang giữ tự chuyển tiền quyết toán của Agency cho booking này.</p>}
            </div>
          )}
        </div>

        <ComplaintContent complaint={complaint} viewer="admin" />

        {isOpen && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" onClick={() => setResolving("Rejected")} className="border-rose-200 text-rose-700 hover:bg-rose-50">Không chấp nhận</Button>
            <Button type="button" onClick={() => setResolving("Resolved")} className="bg-emerald-700 hover:bg-emerald-800 text-white">Chấp nhận khiếu nại</Button>
          </div>
        )}
      </div>

      <Dialog open={resolving !== null} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{resolving === "Resolved" ? "Chấp nhận khiếu nại" : "Không chấp nhận khiếu nại"}</DialogTitle>
            <DialogDescription>
              Phản hồi được gửi cho khách và không thể sửa sau khi lưu.
              {complaint.type === "Trip" && " Sau khi phản hồi, khoản quyết toán của Agency không còn bị khiếu nại này chặn."}
            </DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={2000}
            placeholder={resolving === "Resolved" ? "VD: Agency xác nhận đổi phòng sai hạng; TripOps hoàn 500.000đ cho khách." : "VD: Đã đối chiếu với Agency, dịch vụ đúng như hợp đồng."} />
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setResolving(null)}>Hủy</Button>
            <Button type="button" onClick={resolve} disabled={saving} className="bg-[#075985] hover:bg-[#0C4A6E] text-white gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Gửi phản hồi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
