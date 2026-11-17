import { useEffect, useMemo, useState } from "react";
import type { Booking, RefundRequest, Service, Tour } from "@/app/types";
import { partnerService, type PartnerPage } from "@/app/services/partnerService";
import { isComplaintOpen, listAdminComplaints, type ComplaintSummary } from "@/app/services/reviews";
import { listSettlements, type SettlementDto } from "@/app/services/settlements";
import { Button } from "@/app/components/ui/button";
import {
  AlertCircle, ArrowRight, Building2, CalendarDays, ChevronRight,
  ClipboardList, FileText, HandCoins, MessageSquareWarning,
  RefreshCw, Route, Wallet, Clock3,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface AdminDashboardOverviewProps {
  tours: Tour[];
  bookings: Booking[];
  services: Service[];
  refundRequests: RefundRequest[];
  onNavigate: (section: string) => void;
}

type Period = 7 | 30 | 90 | 365 | "all";
type QueueItem = {
  id: string;
  title: string;
  detail: string;
  category: string;
  createdAt?: string | null;
  section: string;
};

const PERIODS: { value: Period; label: string }[] = [
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
  { value: 365, label: "1 năm" },
  { value: "all", label: "Tất cả" },
];

const numberFormatter = new Intl.NumberFormat("vi-VN");
const moneyFormatter = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });

function readableDate(value?: string | null) {
  if (!value) return "Chưa có ngày";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa có ngày" : dateFormatter.format(date);
}

function validDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function periodStart(today: Date, period: number) {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - period + 1);
}

function inPeriod(value: string | null | undefined, start: Date, now: Date) {
  const date = validDate(value);
  return date !== null && date >= start && date <= now;
}

function shortMoney(amount: number) {
  return moneyFormatter.format(amount) + "đ";
}

function formatCount(value: number | null) {
  return value === null ? "—" : numberFormatter.format(value);
}

function trendByPeriod(bookings: Booking[], period: Period, start: Date, now: Date) {
  const bucketCount = period === 7 ? 7 : 6;
  const bucketDays = period / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index * bucketDays);
    return { label: dateFormatter.format(date), count: 0 };
  });

  for (const booking of bookings) {
    const date = validDate(booking.bookingDate);
    if (!date || date < start || date > now) continue;
    const days = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86_400_000);
    const index = Math.min(bucketCount - 1, Math.floor(days / bucketDays));
    if (index >= 0) buckets[index].count += 1;
  }
  return buckets;
}

const waitingRefund = (status: RefundRequest["status"]) =>
  status === "PENDING" || status === "REVIEWING";

export function AdminDashboardOverview({
  tours, bookings, services, refundRequests, onNavigate,
}: AdminDashboardOverviewProps) {
  const [period, setPeriod] = useState<Period>(30);
  const [reload, setReload] = useState(0);
  const [partnerPage, setPartnerPage] = useState<PartnerPage | null>(null);
  const [complaints, setComplaints] = useState<ComplaintSummary[] | null>(null);
  const [settlements, setSettlements] = useState<SettlementDto[] | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);

  // These endpoints report totals from the server, not counts from one page of results.
  // All three requests are independent: an unavailable endpoint must not become a false zero.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const query = new URLSearchParams({ status: "pending", page: "1", pageSize: "5" });
    Promise.allSettled([
      partnerService.list(query),
      listAdminComplaints(),
      listSettlements(),
    ]).then(([partners, complaintResult, settlementResult]) => {
      if (!alive) return;
      const errors: string[] = [];
      if (partners.status === "fulfilled") setPartnerPage(partners.value);
      else { setPartnerPage(null); errors.push("hồ sơ đối tác"); }
      if (complaintResult.status === "fulfilled") setComplaints(complaintResult.value);
      else { setComplaints(null); errors.push("khiếu nại"); }
      if (settlementResult.status === "fulfilled") setSettlements(settlementResult.value);
      else { setSettlements(null); errors.push("quyết toán"); }
      setLoadErrors(errors);
      setLastLoaded(new Date());
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reload]);

  const now = useMemo(() => new Date(), [reload]);
  const start = useMemo(() => period === "all" ? null : periodStart(now, period), [now, period]);

  // Only the KPI cards use the chosen period. "Tất cả" includes all historical records,
  // even those without a creation date; the independent charts stay on a fixed 30-day window.
  const bookingPeriod = useMemo(
    () => period === "all" ? bookings : bookings.filter((b) => inPeriod(b.bookingDate, start!, now)),
    [bookings, period, start, now],
  );
  const chartStart = useMemo(() => periodStart(now, 30), [now]);
  const chartBookings = useMemo(
    () => bookings.filter((b) => inPeriod(b.bookingDate, chartStart, now)),
    [bookings, chartStart, now],
  );
  const bookingValue = useMemo(() =>
    bookingPeriod
      .filter((b) => b.status !== "cancelled" && b.status !== "rejected")
      .reduce((sum, b) => sum + Math.max(0, b.totalPrice || 0), 0), [bookingPeriod]);

  // Only completed transfers count as platform fees earned and paid out.
  const platformFeeCollected = useMemo(() => settlements === null ? null :
    settlements.filter((s) => s.status === "Paid" && (period === "all" || inPeriod(s.transferredAt, start!, now)))
      .reduce((sum, s) => sum + Math.max(0, s.platformFee || 0), 0),
  [settlements, period, start, now]);

  // Unpaid means the tour is not yet eligible. Count only settlement rows awaiting payout.
  const pendingSettlement = useMemo(() => settlements === null ? null :
    settlements.filter((s) => ["Ready", "Processing", "Failed", "OnHold"].includes(s.status))
      .reduce((sum, s) => sum + Math.max(0, s.netPayout || 0), 0),
  [settlements]);

  const pendingTours = useMemo(() => tours.filter((t) => t.status === "pending_approval"), [tours]);
  const pendingServices = useMemo(() => services.filter((s) => s.status === "pending"), [services]);
  const pendingRefunds = useMemo(() => refundRequests.filter((r) => waitingRefund(r.status)), [refundRequests]);
  const openComplaints = useMemo(() => complaints?.filter((c) => isComplaintOpen(c.status)) ?? [], [complaints]);

  const trend = useMemo(() => trendByPeriod(chartBookings, 30, chartStart, now),
    [chartBookings, chartStart, now]);

  const statusBreakdown = useMemo(() => {
    const pending = chartBookings.filter((b) => b.status === "pending").length;
    const completed = chartBookings.filter((b) => b.status === "completed").length;
    const cancelled = chartBookings.filter((b) => b.status === "cancelled" || b.status === "rejected").length;
    const processing = chartBookings.length - pending - completed - cancelled;
    return [
      { label: "Chờ xử lý", count: pending, color: "bg-amber-500" },
      { label: "Đang thực hiện", count: processing, color: "bg-sky-600" },
      { label: "Hoàn thành", count: completed, color: "bg-emerald-500" },
      { label: "Hủy / từ chối", count: cancelled, color: "bg-rose-500" },
    ];
  }, [chartBookings]);

  const tasks = useMemo(() => {
    const list: QueueItem[] = [
      ...pendingTours.map((t) => ({ id: "tour-" + t.id, title: t.name, detail: t.companyName || "Tour", category: "Tour chờ duyệt", createdAt: t.createdAt, section: "approve-tours" })),
      ...pendingServices.map((s) => ({ id: "service-" + s.id, title: s.name, detail: s.providerName || "Dịch vụ", category: "Bài đăng chờ duyệt", createdAt: s.createdAt, section: "approve-posts" })),
      ...pendingRefunds.map((r) => ({ id: "refund-" + r.id, title: r.tourName || r.bookingCode || r.id, detail: r.customerName, category: "Yêu cầu hoàn tiền", createdAt: r.createdAt, section: "refund-requests" })),
      ...openComplaints.map((c) => ({ id: "complaint-" + c.id, title: c.title, detail: c.customerName, category: "Khiếu nại", createdAt: c.createdAt, section: "complaints" })),
      ...(partnerPage?.items ?? []).map((p) => ({ id: "partner-" + p.profile.id, title: p.profile.businessName, detail: p.name, category: "Đối tác chờ duyệt", createdAt: p.profile.createdAt, section: "partner-approvals" })),
    ];
    return list.sort((a, b) => (validDate(b.createdAt)?.getTime() ?? 0) - (validDate(a.createdAt)?.getTime() ?? 0)).slice(0, 7);
  }, [pendingTours, pendingServices, pendingRefunds, openComplaints, partnerPage]);

  const queueCards = [
    { key: "partners", label: "Đối tác chờ duyệt", count: partnerPage?.total ?? null, Icon: Building2, section: "partner-approvals", iconStyle: "bg-amber-50 text-amber-700" },
    { key: "tours", label: "Tour chờ duyệt", count: pendingTours.length, Icon: Route, section: "approve-tours", iconStyle: "bg-sky-50 text-sky-700" },
    { key: "services", label: "Bài dịch vụ chờ duyệt", count: pendingServices.length, Icon: FileText, section: "approve-posts", iconStyle: "bg-indigo-50 text-indigo-700" },
    { key: "refunds", label: "Yêu cầu hoàn tiền", count: pendingRefunds.length, Icon: Wallet, section: "refund-requests", iconStyle: "bg-orange-50 text-orange-700" },
    { key: "complaints", label: "Khiếu nại chưa xử lý", count: complaints === null ? null : openComplaints.length, Icon: MessageSquareWarning, section: "complaints", iconStyle: "bg-rose-50 text-rose-700" },
  ];

  const kpis = [
    { id: "bookings", title: "Booking trong kỳ", value: numberFormatter.format(bookingPeriod.length), note: "Theo ngày đặt", Icon: CalendarDays },
    { id: "value", title: "Giá trị đặt tour", value: shortMoney(bookingValue), note: "Không phải doanh thu sàn", Icon: ClipboardList },
    { id: "payout", title: "Tiền chờ chi Agency (hiện tại)", value: pendingSettlement === null ? "—" : shortMoney(pendingSettlement), note: "Số dư chưa chi, không lọc theo thời gian", Icon: HandCoins },
    { id: "fees", title: "Phí sàn đã thu trong kỳ", value: platformFeeCollected === null ? "—" : shortMoney(platformFeeCollected), note: "Khoản quyết toán đã chuyển", Icon: Wallet },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tổng quan hệ thống</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi tình hình kinh doanh và các công việc cần xử lý trên TripOps.</p>
          <p className="mt-1 text-xs text-slate-400">Dữ liệu nghiệp vụ theo danh sách hiện được tải; số liệu đối tác, khiếu nại, quyết toán lấy từ API.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={loading}
            onClick={() => setReload((value) => value + 1)} className="h-9 rounded-xl text-xs gap-1.5">
            <RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} />
            Tải lại
          </Button>
        </div>
      </header>

      {loadErrors.length > 0 && !loading && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Không tải được dữ liệu {loadErrors.join(", ")}. Chỉ số liên quan được hiển thị bằng dấu —. Bạn có thể thử tải lại.</span>
        </div>
      )}

      <section className="space-y-3" aria-labelledby="admin-work-queue">
        <div className="flex items-center justify-between">
          <h2 id="admin-work-queue" className="text-base font-bold text-slate-900">Công việc cần xử lý</h2>
          <span className="text-xs text-slate-500">Tình trạng hiện tại, không phụ thuộc bộ lọc thời gian</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {queueCards.map(({ key, label, count, Icon, section, iconStyle }) => (
            <button type="button" key={key} onClick={() => onNavigate(section)}
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-all hover:border-sky-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#075985]"
              aria-label={"Mở mục " + label}>
              <div className="flex items-center justify-between">
                <span className={"flex h-9 w-9 items-center justify-center rounded-xl " + iconStyle}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#075985]" />
              </div>
              <div className="mt-4 text-2xl font-extrabold tabular-nums text-slate-900">{formatCount(count)}</div>
              <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="admin-kpis">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="admin-kpis" className="text-base font-bold text-slate-900">Chỉ số hoạt động</h2>
          <div className="inline-flex max-w-full flex-wrap gap-1 self-start rounded-xl border border-slate-200 bg-white p-1"
            role="group" aria-label="Lọc thời gian chỉ số hoạt động">
            {PERIODS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                aria-pressed={period === option.value}
                className={"rounded-lg px-3 py-2 text-xs font-semibold transition-colors " +
                  (period === option.value ? "bg-[#075985] text-white" : "text-slate-600 hover:bg-slate-100")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ id, title, value, note, Icon }) => (
            <div key={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">{title}</p>
                <Icon className="h-5 w-5 shrink-0 text-[#075985]" />
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{value}</p>
              <p className="mt-1 text-[11px] text-slate-500">{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3" aria-label="Biểu đồ tình hình booking">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Xu hướng Booking</h2>
              <p className="mt-1 text-xs text-slate-500">Số lượt đặt tour trong 30 ngày gần nhất</p>
            </div>
            <span className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-[#075985]">{numberFormatter.format(chartBookings.length)} booking</span>
          </div>
          <div className="h-64 w-full" role="img" aria-label="Biểu đồ số lượng booking theo thời gian">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="admin-booking-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ stroke: "#bae6fd" }} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Area name="Booking" type="monotone" dataKey="count" stroke="#075985" strokeWidth={2.5} fill="url(#admin-booking-gradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Trạng thái Booking</h2>
          <p className="mt-1 text-xs text-slate-500">Phân bổ booking tạo trong 30 ngày gần nhất</p>
          <div className="mt-6 space-y-5">
            {statusBreakdown.map((item) => {
              const percentage = chartBookings.length > 0 ? Math.round(item.count * 100 / chartBookings.length) : 0;
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-slate-600">{item.label}</span>
                    <span className="font-bold tabular-nums text-slate-800">{numberFormatter.format(item.count)} · {percentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={"h-full rounded-full transition-all " + item.color} style={{ width: percentage + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {chartBookings.length === 0 && <p className="mt-4 text-xs text-slate-500">Chưa có booking trong 30 ngày gần nhất.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs" aria-labelledby="admin-recent-actions">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 id="admin-recent-actions" className="text-sm font-bold text-slate-900">Yêu cầu cần xử lý gần đây</h2>
            <p className="mt-1 text-xs text-slate-500">Các yêu cầu chưa xử lý được sắp theo ngày tạo mới nhất</p>
          </div>
          <Clock3 className="h-4 w-4 text-slate-400" />
        </div>
        {loading && tasks.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Đang tải dữ liệu...</p>
        ) : tasks.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Không có yêu cầu chờ xử lý trong dữ liệu hiện tại.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Yêu cầu</th>
                  <th className="px-5 py-3">Loại</th>
                  <th className="px-5 py-3">Ngày tạo</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((item) => (
                  <tr key={item.id} className="hover:bg-sky-50/40">
                    <td className="max-w-[330px] px-5 py-3">
                      <p className="truncate font-semibold text-slate-900" title={item.title}>{item.title}</p>
                      <p className="mt-0.5 truncate text-slate-500">{item.detail}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{item.category}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{readableDate(item.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" className="inline-flex items-center gap-1 font-semibold text-[#075985] hover:underline"
                        onClick={() => onNavigate(item.section)} aria-label={"Mở " + item.title}>
                        Xem chi tiết <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
          {lastLoaded ? "Cập nhật API: " + lastLoaded.toLocaleTimeString("vi-VN") + ". " : ""}
          Danh sách lấy từ các phân hệ hiện có; không phải lịch sử thao tác kiểm toán.
        </div>
      </section>
    </div>
  );
}
