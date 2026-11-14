import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Calendar, Info, Loader2, MessageSquare, Plus, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { EmptyState } from "@/app/components/customer/EmptyState";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { EvidencePicker } from "@/app/components/reviews/EvidencePicker";
import { ComplaintConversation } from "@/app/components/reviews/ComplaintConversation";
import {
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_STATUS_STYLE,
  PLATFORM_REASONS,
  TRIP_REASONS,
  createComplaint,
  formatDate,
  formatDateTime,
  getMyComplaint,
  isComplaintOpen,
  listComplaintBookingOptions,
  listMyComplaints,
  reasonLabel,
  sendMyComplaintMessage,
  type ComplaintBookingOption,
  type ComplaintDetail,
  type ComplaintSummary,
  type ComplaintType,
} from "@/app/services/reviews";

type Tab = "all" | "open" | "closed";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "open", label: "Đang xử lý" },
  { id: "closed", label: "Đã kết thúc" },
];

function TypeBadge({ type }: { type: ComplaintType }) {
  return type === "Trip" ? (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] border bg-[#F0F9FF] text-[#075985] border-[#BAE6FD]">Chuyến đi</span>
  ) : (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] border bg-violet-50 text-violet-800 border-violet-200">Nền tảng TripOps</span>
  );
}

function StatusPill({ status }: { status: ComplaintSummary["status"] }) {
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${COMPLAINT_STATUS_STYLE[status]}`}>
      {COMPLAINT_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Khiếu nại của tôi. Khách trao đổi trực tiếp với Admin; Agency không xem khiếu nại trên hệ thống.
 * Khiếu nại chuyến đi: chỉ booking đã hoàn thành, trong 1 ngày sau khi tour kết thúc. Khiếu nại nền tảng: không giới hạn.
 */
export function MyComplaintsPage({
  initialBookingId,
  onViewBookingDetail,
}: {
  initialBookingId?: number | null;
  onViewBookingDetail?: (bookingId: number) => void;
}) {
  const [items, setItems] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [detail, setDetail] = useState<ComplaintDetail | null>(null);
  const [creating, setCreating] = useState(Boolean(initialBookingId));

  const load = useCallback(() => {
    setLoading(true);
    listMyComplaints()
      .then((list) => { setItems(list); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được khiếu nại."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  useEffect(() => { if (initialBookingId) setCreating(true); }, [initialBookingId]);

  const filtered = useMemo(
    () => items.filter((c) => tab === "all" || (tab === "open") === isComplaintOpen(c.status)),
    [items, tab],
  );

  const openDetail = async (id: number) => {
    try { setDetail(await getMyComplaint(id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Không mở được khiếu nại."); }
  };

  if (detail) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16 font-sans">
        <PageHeader
          title={detail.title}
          subtitle={`Khiếu nại #${detail.id} · gửi ${formatDateTime(detail.createdAt)}`}
          onBack={() => { setDetail(null); load(); }}
          backText="Quay lại danh sách khiếu nại"
          actions={<StatusPill status={detail.status} />}
        />
        <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={detail.type} />
            <span className="text-xs text-[#475569]">{reasonLabel(detail.type, detail.reasonCode)}</span>
          </div>
          {detail.type === "Trip" && (
            <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#475569] block">Booking</span>
                {onViewBookingDetail && detail.bookingId ? (
                  <button type="button" onClick={() => onViewBookingDetail(detail.bookingId!)} className="font-mono font-semibold text-[#075985] hover:underline">
                    {detail.bookingCode}
                  </button>
                ) : <span className="font-mono font-semibold text-[#075985]">{detail.bookingCode}</span>}
              </div>
              <div>
                <span className="text-[#475569] block">Tour</span>
                <strong className="text-[#0F172A] font-semibold">{detail.tourName}</strong>
              </div>
              <div>
                <span className="text-[#475569] block">Agency</span>
                <strong className="text-[#0F172A] font-semibold">{detail.agencyName}</strong>
              </div>
            </div>
          )}
          <ComplaintConversation
            complaint={detail}
            viewer="customer"
            onSend={async (content, files) => setDetail(await sendMyComplaintMessage(detail.id, content, files))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 font-sans">
      <PageHeader
        title="Khiếu nại của tôi"
        subtitle="Báo sự cố cần TripOps can thiệp, về chuyến đi hoặc về nền tảng. Bạn trao đổi trực tiếp với Admin TripOps."
        actions={
          <Button
            type="button"
            onClick={() => setCreating(true)}
            className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] font-medium flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Gửi khiếu nại</span>
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-[6px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>Khiếu nại</strong> là yêu cầu xử lý sự cố (sai dịch vụ, cần hoàn tiền…), chỉ bạn và Admin thấy.
          Khiếu nại về chuyến đi gửi được trong <strong>1 ngày</strong> sau khi tour kết thúc. Muốn chia sẻ cảm nhận thì dùng mục <strong>Đánh giá</strong>.
        </p>
      </div>

      <div role="tablist" aria-label="Trạng thái khiếu nại" className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? "bg-[#075985] text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {t.label}
            <span className="ml-1.5 opacity-80">({items.filter((c) => t.id === "all" || (t.id === "open") === isComplaintOpen(c.status)).length})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : error ? (
        <p role="alert" className="text-sm text-rose-700">{error}</p>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openDetail(c.id)}
              className="w-full text-left bg-white border border-[#CBD5E1] rounded-[6px] p-4 hover:border-[#075985] transition-colors space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={c.type} />
                  <span className="text-xs text-[#475569]">{reasonLabel(c.type, c.reasonCode)}</span>
                </div>
                <StatusPill status={c.status} />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">{c.title}</h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
                {c.type === "Trip" && (
                  <>
                    <span className="font-mono text-[#075985]">{c.bookingCode}</span>
                    {c.tourName && <span>{c.tourName}</span>}
                    {c.agencyName && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{c.agencyName}</span>}
                  </>
                )}
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Gửi {formatDate(c.createdAt)}</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{c.messageCount} phản hồi</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title={tab === "all" ? "Bạn chưa gửi khiếu nại nào" : "Không có khiếu nại trong mục này"}
          description="Nếu chuyến đi hoặc nền tảng có sự cố cần xử lý, hãy gửi khiếu nại để Admin TripOps hỗ trợ."
          actionText={tab === "all" ? "Gửi khiếu nại" : "Xem tất cả"}
          onAction={() => (tab === "all" ? setCreating(true) : setTab("all"))}
        />
      )}

      <CreateComplaintDialog
        open={creating}
        onOpenChange={setCreating}
        initialBookingId={initialBookingId ?? null}
        onCreated={(created) => { setCreating(false); load(); setDetail(created); }}
      />
    </div>
  );
}

function CreateComplaintDialog({
  open,
  onOpenChange,
  initialBookingId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBookingId: number | null;
  onCreated: (complaint: ComplaintDetail) => void;
}) {
  const [options, setOptions] = useState<ComplaintBookingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<ComplaintType>("Trip");
  const [bookingId, setBookingId] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType("Trip"); setReason(""); setTitle(""); setDescription(""); setFiles([]); setError("");
    setLoading(true);
    listComplaintBookingOptions()
      .then((list) => {
        setOptions(list);
        const preferred = list.find((o) => o.bookingId === initialBookingId && o.canComplain) ?? list.find((o) => o.canComplain);
        setBookingId(preferred?.bookingId ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được danh sách chuyến đi."))
      .finally(() => setLoading(false));
  }, [open, initialBookingId]);

  const reasons = type === "Trip" ? TRIP_REASONS : PLATFORM_REASONS;
  const booking = options.find((o) => o.bookingId === bookingId);
  const initialExpired = initialBookingId ? options.find((o) => o.bookingId === initialBookingId && !o.canComplain) : undefined;
  const noEligibleTrip = type === "Trip" && !options.some((o) => o.canComplain);

  const submit = async () => {
    if (type === "Trip" && !booking) return setError("Vui lòng chọn chuyến đi cần khiếu nại.");
    if (!reason) return setError("Vui lòng chọn vấn đề gặp phải.");
    if (title.trim().length < 5) return setError("Tiêu đề cần ít nhất 5 ký tự.");
    if (description.trim().length < 10) return setError("Mô tả cần ít nhất 10 ký tự.");
    setSaving(true);
    setError("");
    try {
      onCreated(await createComplaint({ type, bookingId: booking?.bookingId, reasonCode: reason, title, description, files }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được khiếu nại.");
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-[#075985]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-[#B91C1C]" /> Gửi khiếu nại</DialogTitle>
          <DialogDescription>Admin TripOps sẽ trao đổi với bạn trong khiếu nại này và liên hệ các bên liên quan để xử lý.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label htmlFor="complaint-type" className="text-xs font-semibold text-[#0F172A]">Khiếu nại về <span className="text-rose-600">*</span></label>
              <select id="complaint-type" value={type} onChange={(e) => { setType(e.target.value as ComplaintType); setReason(""); }} className={selectClass}>
                <option value="Trip">Chuyến đi (tour đã hoàn thành)</option>
                <option value="Platform">Nền tảng TripOps (thanh toán, tài khoản, lỗi website…)</option>
              </select>
            </div>

            {type === "Trip" && (
              <div className="space-y-1.5">
                <label htmlFor="complaint-booking" className="text-xs font-semibold text-[#0F172A]">Chuyến đi <span className="text-rose-600">*</span></label>
                {options.length === 0 ? (
                  <p className="text-xs text-slate-600 rounded-[6px] border border-slate-200 bg-slate-50 p-2.5">
                    Bạn chưa có chuyến đi nào đã hoàn thành. Khiếu nại về chuyến đi chỉ gửi được sau khi tour kết thúc.
                  </p>
                ) : (
                  <>
                    <select id="complaint-booking" value={bookingId} onChange={(e) => setBookingId(Number(e.target.value))} className={selectClass}>
                      {!options.some((o) => o.canComplain) && <option value="">— Không còn chuyến đi trong hạn khiếu nại —</option>}
                      {options.map((o) => (
                        <option key={o.bookingId} value={o.bookingId} disabled={!o.canComplain}>
                          {o.bookingCode} – {o.tourName ?? "Tour"}{o.canComplain ? "" : " (đã hết hạn khiếu nại)"}
                        </option>
                      ))}
                    </select>
                    {booking && <p className="text-[11px] text-slate-500">Hạn khiếu nại: {formatDateTime(booking.deadline)} · Agency: {booking.agencyName ?? "—"}</p>}
                    {initialExpired && (
                      <p className="text-[11px] text-amber-800">Booking {initialExpired.bookingCode} đã quá hạn khiếu nại (1 ngày sau khi tour kết thúc, đến {formatDateTime(initialExpired.deadline)}).</p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="complaint-reason" className="text-xs font-semibold text-[#0F172A]">Vấn đề gặp phải <span className="text-rose-600">*</span></label>
              <select id="complaint-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={selectClass}>
                <option value="">— Chọn vấn đề —</option>
                {Object.entries(reasons).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="complaint-title" className="text-xs font-semibold text-[#0F172A]">Tiêu đề <span className="text-rose-600">*</span></label>
              <Input id="complaint-title" value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "Trip" ? "VD: Phòng khách sạn đêm 2 không đúng hạng 4 sao" : "VD: Đã duyệt hoàn tiền nhưng chưa nhận được"} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="complaint-description" className="text-xs font-semibold text-[#0F172A]">Mô tả chi tiết <span className="text-rose-600">*</span></label>
              <Textarea id="complaint-description" value={description} maxLength={4000} rows={5} onChange={(e) => setDescription(e.target.value)}
                placeholder="Thời gian, địa điểm, sự việc xảy ra và bạn mong muốn được xử lý thế nào..." />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#0F172A]">Ảnh bằng chứng (không bắt buộc)</p>
              <EvidencePicker files={files} onChange={setFiles} onError={setError} disabled={saving} />
            </div>

            {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="button" onClick={submit} disabled={saving || noEligibleTrip}
                className="bg-[#075985] hover:bg-[#0C4A6E] text-white gap-1.5">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Gửi khiếu nại
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
