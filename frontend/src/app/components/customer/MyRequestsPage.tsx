import { customerDesignVersion } from "@/app/lib/designVersionSelection";
import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { confirmAction } from "@/app/lib/notificationDialogs";
import { TourAccommodationSummary } from "@/app/components/common/TourAccommodationSummary";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { CustomTourRequest, Tour, Service } from "@/app/types";
import { customerDesignRequests, customerRequestPlans } from "@/app/services/customTourRequests";
import { Button } from "@/app/components/ui/button";
import { CustomRequestDetailModal } from "@/app/components/common/CustomRequestDetailModal";
import { StatusBadge } from "@/app/components/customer/StatusBadge";

interface Props {
  onViewBooking?: (id: string) => void;
  services?: Service[];
  requests: CustomTourRequest[];
  tours?: Tour[];
  onCancelRequest: (id: string) => Promise<void>;
  onNavigateToCreate: () => void;
  onViewTour?: (tour: Tour) => void;
  onBookTour?: (tour: Tour) => void | Promise<void>;
}

const date = (value: string) => new Date(value).toLocaleDateString("vi-VN");
const money = (value: number) => value.toLocaleString("vi-VN") + "đ";

function RequestStepper({ status }: { status: CustomTourRequest["status"] }) {
  const closed = status === "rejected" || status === "cancelled" || status === "closed";
  const stepIndex =
    status === "booked" || status === "accepted"
      ? 3
      : status === "designed" || status === "quoted"
        ? 2
        : status === "reviewing"
          ? 1
          : 0;
  const steps = ["Gửi yêu cầu", "Đang thiết kế", "Xem & Chọn phương án", "Đặt tour"];

  if (closed) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-2xs">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {steps.map((label, idx) => {
          const done = idx < stepIndex || (idx === 3 && stepIndex === 3);
          const current = idx === stepIndex && !done;
          return (
            <div key={label} className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-emerald-600 text-white"
                    : current
                      ? "bg-[#075985] text-white ring-4 ring-sky-100"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              <span className={`text-xs font-semibold ${done ? "text-emerald-700" : current ? "text-[#075985]" : "text-slate-400"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MyRequestsPage({
  requests: initialRequests,
  onCancelRequest,
  onNavigateToCreate,
  onViewTour,
  onBookTour,
  onViewBooking,
  services = [],
}: Props) {
  const [requests, setRequests] = useState(initialRequests);
  useEffect(() => {
    setRequests(initialRequests);
    let alive = true;
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const latest = await customerDesignRequests();
        if (alive) setRequests(latest);
      } catch {
        /* Keep the current list during a temporary background connection failure. */
      } finally {
        pending = false;
      }
    };
    const interval = window.setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [initialRequests]);

  const groups = [
    { id: "all", label: "Tất cả" },
    { id: "pending", label: "Chờ tiếp nhận" },
    { id: "reviewing", label: "Đang thiết kế" },
    { id: "designed", label: "Đang xem phương án" },
    { id: "booked", label: "Đã đặt tour" },
    { id: "closed", label: "Đã đóng / Hủy / Từ chối" },
  ];
  const [status, setStatus] = useState("all");
  const inGroup = (request: CustomTourRequest, group: string) =>
    group === "all" ||
    (group === "closed"
      ? ["closed", "cancelled", "rejected"].includes(request.status)
      : group === "designed"
        ? ["designed", "quoted", "accepted"].includes(request.status)
        : request.status === group);
  const rows = requests.filter(request => inGroup(request, status));

  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(window.location.hash.split("?")[1]).get("requestId"));
  const [viewing, setViewing] = useState(false);
  const [plans, setPlans] = useState<Tour[]>([]);
  const [planVersion, setPlanVersion] = useState<number | null>(null);
  const plan = customerDesignVersion(plans, planVersion);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = requests.find(r => r.id === selectedId);
  useEffect(() => {
    setPlans([]);
    setPlanVersion(null);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    let pending = false;
    setLoading(true);
    setError("");
    const refresh = async (background = false) => {
      if (pending || (background && document.visibilityState === "hidden")) return;
      pending = true;
      try {
        const result = await customerRequestPlans(selectedId);
        if (alive) setPlans(result);
      } catch (e) {
        if (alive && !background) setError(e instanceof Error ? e.message : "Không tải được phương án.");
      } finally {
        pending = false;
        if (alive && !background) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(true), 5000);
    const onFocus = () => void refresh(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [selectedId, reload, selected?.sharedVersion, selected?.shareAllVersions]);

  const book = async () => {
    if (!selected || !plan || busy) return;
    setBusy(true);
    setError("");
    try {
      await onBookTour?.({ ...plan, customRequestId: selected.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đặt tour.");
    } finally {
      setBusy(false);
    }
  };

  if (selected) {
    const budget = Number(selected.budgetPerPerson);
    return (
      <div className="mx-auto max-w-6xl space-y-5 pb-12">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-[#075985]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại danh sách yêu cầu
            </button>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">Yêu cầu thiết kế #{selected.id}</h1>
              <StatusBadge type="custom_request" status={selected.status} />
            </div>
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <Building2 className="h-4 w-4 text-[#075985]" />
              Đơn vị phụ trách: <strong className="font-semibold text-slate-700">{selected.targetCompanyName}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ChatWithButton
              userId={selected.targetCompanyId}
              context={{ kind: "design-request", id: Number(selected.id), title: `Yêu cầu thiết kế #${selected.id}`, subtitle: selected.destinations }}
            >
              Chat với Agency
            </ChatWithButton>
            {selected.bookingId && (
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onViewBooking?.(selected.bookingId!)}>
                <CheckCircle2 className="h-4 w-4" />
                Xem booking #{selected.bookingId}
              </Button>
            )}
          </div>
        </div>

        <RequestStepper status={selected.status} />

        {(selected.closeReason || selected.rejectionReason) && (
          <div className={`rounded-2xl border p-4 text-sm ${selected.rejectionReason ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            <strong>{selected.rejectionReason ? "Lý do Agency từ chối" : "Yêu cầu đã đóng"}</strong>
            <p className="mt-1 whitespace-pre-wrap">{selected.rejectionReason || selected.closeReason}</p>
            {selected.closeReason && <p className="mt-2 text-xs">Bạn vẫn có thể xem lại phương án. Liên hệ Agency nếu muốn mở lại yêu cầu.</p>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
          {/* Cột chính: Phương án tour */}
          <div className="space-y-5">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-[#075985]">
                    <Sparkles className="h-4 w-4" />
                    Phương án tour dành cho bạn
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {plans.length > 1
                      ? `Agency đã mở ${plans.length} phiên bản để bạn so sánh và lựa chọn.`
                      : "Xem chi tiết hành trình, dịch vụ lưu trú và đặt tour khi bạn hài lòng."}
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={loading} onClick={() => setReload(n => n + 1)}>
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Tải lại
                </Button>
              </div>

              {error && <NotificationMessage tone="error" message={error} />}

              {plans.length > 1 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chọn phiên bản phương án">
                    {plans.map(p => {
                      const active = plan?.version === p.version;
                      return (
                        <button
                          key={p.version}
                          type="button"
                          onClick={() => setPlanVersion(p.version ?? null)}
                          className={`flex flex-col rounded-xl border px-3.5 py-2 text-left transition ${
                            active
                              ? "border-[#075985] bg-sky-50/80 ring-2 ring-sky-100"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${active ? "text-[#075985]" : "text-slate-800"}`}>
                              Phiên bản v{p.version}
                            </span>
                            {p.version === selected.sharedVersion && (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Đề xuất
                              </span>
                            )}
                          </div>
                          <span className="mt-0.5 text-xs font-semibold tabular-nums text-slate-600">
                            {money(p.price)} / khách
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <label className="sr-only">
                    Phiên bản bạn muốn xem
                    <select
                      aria-label="Chọn phiên bản tour để xem và đặt"
                      value={plan?.version ?? ""}
                      onChange={e => setPlanVersion(Number(e.target.value))}
                    >
                      {plans.map(p => (
                        <option key={p.version} value={p.version}>
                          Phiên bản {p.version} · {p.name} · {money(p.price)} / khách
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {loading ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
                  Đang tải phương án tour…
                </div>
              ) : plan ? (
                <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {plan.image && (
                      <img
                        src={plan.image}
                        alt={plan.name}
                        className="h-40 w-full shrink-0 rounded-xl border border-slate-200 object-cover sm:w-56"
                      />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-[#075985]">
                            Phiên bản v{plan.version}
                          </span>
                          {plan.isCoHosted && (
                            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
                              Tour liên minh đa Agency
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">{plan.name}</h3>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{plan.duration}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{plan.destination}</span>
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-200/70 pt-3">
                        <div>
                          <span className="block text-[11px] text-slate-500">Đơn giá người lớn</span>
                          <span className="text-xl font-bold tabular-nums text-[#075985]">
                            {money(plan.price)} <span className="text-xs font-normal text-slate-500">/ khách</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {onViewTour && (
                            <Button
                              variant="outline"
                              className="bg-white"
                              onClick={() => onViewTour({ ...plan, designReadOnly: selected.status !== "designed" })}
                            >
                              <Eye className="h-4 w-4" />
                              Xem chi tiết tour
                            </Button>
                          )}
                          {onBookTour && selected.status === "designed" && (
                            <Button className="bg-[#075985] text-white hover:bg-[#0369a1]" disabled={busy} onClick={() => void book()}>
                              Đặt tour phiên bản v{plan.version}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                  <Clock className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {selected.status === "rejected"
                      ? "Agency đã từ chối yêu cầu này."
                      : selected.status === "cancelled"
                        ? "Yêu cầu đã được hủy."
                        : "Agency đang thiết kế hoặc chưa chia sẻ phương án"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selected.status === "rejected" || selected.status === "cancelled"
                      ? "Bạn có thể tạo yêu cầu mới hoặc chọn Agency khác."
                      : "Bạn có thể chat trực tiếp với Agency để trao đổi thêm nhu cầu trong lúc chờ."}
                  </p>
                </div>
              )}
            </section>

            {plan && <TourAccommodationSummary tour={plan} services={services} />}
          </div>

          {/* Cột phụ: Tóm tắt hồ sơ yêu cầu */}
          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText className="h-4 w-4 text-[#075985]" />
                Hồ sơ yêu cầu của bạn
              </h2>
              <button
                type="button"
                onClick={() => setViewing(true)}
                className="text-xs font-semibold text-[#075985] hover:underline"
              >
                Xem đầy đủ
              </button>
            </div>

            <dl className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#075985]" />
                <div>
                  <dt className="text-slate-400">Điểm đến mong muốn</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-800">{selected.destinations}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-slate-400">Thời gian dự kiến</dt>
                  <dd className="mt-0.5 font-medium text-slate-700">
                    {date(selected.departureDate)} – {date(selected.returnDate)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-slate-400">Số lượng khách</dt>
                  <dd className="mt-0.5 font-medium text-slate-700">{selected.numberOfPeople} khách</dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-slate-400">Ngân sách dự kiến</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-slate-800">
                    {budget > 0 ? `${money(budget)} / khách` : "Thỏa thuận"}
                  </dd>
                </div>
              </div>
            </dl>

            {selected.additionalInfo && (
              <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <span className="mb-1 block font-semibold text-slate-700">Ghi chú yêu cầu:</span>
                <p className="whitespace-pre-wrap">{selected.additionalInfo}</p>
              </div>
            )}

            {!selected.designedTourId && (selected.status === "pending" || selected.status === "reviewing") && (
              <div className="border-t border-slate-100 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={async () => {
                    if (!(await confirmAction("Hủy yêu cầu thiết kế này?"))) return;
                    setBusy(true);
                    try {
                      await onCancelRequest(selected.id);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Không thể hủy yêu cầu.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Hủy yêu cầu thiết kế
                </Button>
              </div>
            )}
          </aside>
        </div>

        <CustomRequestDetailModal
          isOpen={viewing}
          onClose={() => setViewing(false)}
          request={selected}
          matchingTour={plan}
          userRole="customer"
          onViewTour={tour => onViewTour?.({ ...tour, designReadOnly: selected.status !== "designed" })}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-[#075985]">Yêu cầu thiết kế tour của tôi</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi tiến độ thiết kế, trao đổi với Agency và chọn phương án phù hợp nhất.</p>
        </div>
        <Button className="bg-[#075985] text-white hover:bg-[#0C4A6E]" onClick={onNavigateToCreate}>
          <Plus className="h-4 w-4" />
          Tạo yêu cầu mới
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xs" role="tablist" aria-label="Trạng thái yêu cầu thiết kế">
        {groups.map(group => {
          const active = status === group.id;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="design-request-list"
              onClick={() => setStatus(group.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                active ? "bg-[#075985] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100/80"
              }`}
            >
              <span>{group.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                {requests.filter(request => inGroup(request, group.id)).length}
              </span>
            </button>
          );
        })}
      </div>

      <div id="design-request-list" role="tabpanel" className="space-y-3.5">
        {!rows.length && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
            <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {requests.length ? "Chưa có yêu cầu trong trạng thái này." : "Bạn chưa gửi yêu cầu thiết kế tour."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {requests.length ? "Thử chọn tab trạng thái khác." : "Hãy gửi yêu cầu để các Agency uy tín thiết kế lịch trình riêng cho đoàn của bạn."}
            </p>
          </div>
        )}

        {rows.map(request => {
          const budget = Number(request.budgetPerPerson);
          return (
            <article
              key={request.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-sky-200 hover:shadow-sm sm:flex-row"
            >
              {request.sharedTourThumbnail ? (
                <img
                  src={request.sharedTourThumbnail}
                  alt={request.sharedTourName || request.destinations}
                  className="h-40 w-full shrink-0 rounded-xl border border-slate-200 object-cover sm:h-36 sm:w-52"
                />
              ) : (
                <div className="flex h-40 w-full shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-slate-400 sm:h-36 sm:w-52">
                  <MapPin className="h-6 w-6 text-slate-300" />
                  <span className="mt-1.5 text-[11px] font-medium">Chưa có ảnh phương án</span>
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">
                          #{request.id}
                        </span>
                        <span className="text-xs font-medium text-slate-500">{request.targetCompanyName}</span>
                        <span className="text-xs text-slate-400">· Gửi {date(request.createdAt)}</span>
                      </div>
                      <h2 className="mt-1.5 text-base font-bold text-slate-900">
                        {request.sharedTourName || request.destinations}
                      </h2>
                    </div>
                    <StatusBadge type="custom_request" status={request.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#075985]" />{request.destinations}</span>
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{date(request.departureDate)} – {date(request.returnDate)}</span>
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />{request.numberOfPeople} khách</span>
                    {budget > 0 && (
                      <span className="flex items-center gap-1.5 font-semibold tabular-nums text-slate-800">
                        <Wallet className="h-3.5 w-3.5 text-slate-400" />
                        Ngân sách: {money(budget)} / khách
                      </span>
                    )}
                  </div>

                  {request.closeReason && <p className="mt-2.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">Lý do đóng: {request.closeReason}</p>}
                  {request.rejectionReason && <p className="mt-2.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">Lý do từ chối: {request.rejectionReason}</p>}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <ChatWithButton
                    userId={request.targetCompanyId}
                    context={{ kind: "design-request", id: Number(request.id), title: `Yêu cầu thiết kế #${request.id}`, subtitle: request.destinations }}
                  >
                    Chat với Agency
                  </ChatWithButton>
                  <Button
                    variant={request.status === "designed" ? "default" : "outline"}
                    className={request.status === "designed" ? "bg-[#075985] text-white hover:bg-[#0369a1]" : ""}
                    onClick={() => setSelectedId(request.id)}
                  >
                    <Eye className="h-4 w-4" />
                    {request.status === "designed" ? "Xem & Chọn phương án" : "Xem chi tiết"}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
