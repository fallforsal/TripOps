import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { CheckCircle2, Clock, Eye, Handshake, PenSquare } from "lucide-react";
import { AgencyCustomRequests } from "./AgencyCustomRequests";
import { AgencyDesignCoHosting } from "./DesignCollaborationPanel";

type Props = ComponentProps<typeof AgencyCustomRequests>;
type Scope = "customers" | "partners";

export function AgencyDesignWorkspace(props: Props) {
  const customers = props.requests.filter(request => request.targetCompanyId === props.company.id);
  const partners = props.requests.filter(request => request.targetCompanyId !== props.company.id);

  const [scope, setScope] = useState<Scope>(() => {
    const reqId = new URLSearchParams(window.location.hash.split("?")[1]).get("requestId");
    if (reqId && partners.some(r => r.id === reqId)) return "partners";
    return "customers";
  });

  useEffect(() => {
    const reqId = new URLSearchParams(window.location.hash.split("?")[1]).get("requestId");
    if (reqId && partners.some(r => r.id === reqId)) setScope("partners");
  }, [partners.length]);

  const [focused, setFocused] = useState<"customers" | "partners" | null>(null);
  const focusCustomers = useCallback(
    (open: boolean) => setFocused(previous => (open ? "customers" : previous === "customers" ? null : previous)),
    [],
  );
  const focusPartners = useCallback(
    (open: boolean) => setFocused(previous => (open ? "partners" : previous === "partners" ? null : previous)),
    [],
  );

  const pendingCustomers = customers.filter(r => r.status === "pending").length;
  const designingCustomers = customers.filter(r => r.status === "reviewing").length;
  const sharedCustomers = customers.filter(r => r.status === "designed").length;
  const pendingPartners = partners.filter(
    r =>
      r.collaborationInvitations?.some(i => i.companyId === props.company.id && i.status === "pending") ||
      r.coHosts?.some(h => h.companyId === props.company.id && h.status === "pending"),
  ).length;

  const stats = [
    {
      label: "Chờ tiếp nhận",
      value: pendingCustomers,
      icon: Clock,
      tone: "text-amber-700 bg-amber-50 border-amber-200/70",
      onClick: () => setScope("customers"),
    },
    {
      label: "Đang thiết kế",
      value: designingCustomers,
      icon: PenSquare,
      tone: "text-[#075985] bg-sky-50 border-sky-200/70",
      onClick: () => setScope("customers"),
    },
    {
      label: "Khách đang xem",
      value: sharedCustomers,
      icon: Eye,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200/70",
      onClick: () => setScope("customers"),
    },
    {
      label: "Lời mời đối tác",
      value: partners.length,
      sub: pendingPartners > 0 ? `${pendingPartners} chờ phản hồi` : undefined,
      icon: CheckCircle2,
      tone: "text-teal-700 bg-teal-50 border-teal-200/70",
      onClick: () => setScope("partners"),
    },
  ];

  return (
    <div className="min-w-0 w-full max-w-full space-y-5">
      {!focused && (
        <>
          <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-[#075985]">
                <PenSquare className="h-3.5 w-3.5" />
                Không gian Thiết kế Tour &amp; Liên minh
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Thiết kế tour theo yêu cầu
              </h1>
              <p className="max-w-2xl text-sm text-slate-500">
                Tách riêng 2 vai trò: xử lý yêu cầu từ khách hàng (Chủ trì) hoặc phản hồi và thiết kế chặng cho đối tác (Đồng tổ chức).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-auto">
              {stats.map(stat => {
                const Icon = stat.icon;
                return (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={stat.onClick}
                    className={`flex flex-col justify-between rounded-xl border px-3.5 py-2.5 text-left transition hover:shadow-xs ${stat.tone}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium opacity-85">{stat.label}</span>
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold tabular-nums">{stat.value}</span>
                      {stat.sub && <span className="text-[10px] font-semibold">{stat.sub}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </header>

          {/* 2 Vai trò tách biệt rõ ràng bằng màu sắc */}
          <div
            role="tablist"
            aria-label="Loại yêu cầu thiết kế và liên minh"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <button
              role="tab"
              type="button"
              aria-selected={scope === "customers"}
              aria-controls="agency-design-workspace-content"
              onClick={() => setScope("customers")}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075985] ${
                scope === "customers"
                  ? "border-[#075985] bg-sky-50/70 shadow-xs ring-2 ring-sky-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    scope === "customers" ? "bg-[#075985] text-white" : "bg-sky-50 text-[#075985]"
                  }`}
                >
                  <PenSquare className="h-5 w-5" />
                </span>
                <div>
                  <span className={`block text-sm font-bold ${scope === "customers" ? "text-[#075985]" : "text-slate-800"}`}>
                    Yêu cầu khách hàng
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Vai trò Chủ trì · Thiết kế &amp; gửi phương án cho khách
                  </span>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                  scope === "customers" ? "bg-[#075985] text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {customers.length}
              </span>
            </button>

            <button
              role="tab"
              type="button"
              aria-selected={scope === "partners"}
              aria-controls="agency-design-workspace-content"
              onClick={() => setScope("partners")}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                scope === "partners"
                  ? "border-teal-700 bg-teal-50/70 shadow-xs ring-2 ring-teal-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    scope === "partners" ? "bg-teal-700 text-white" : "bg-teal-50 text-teal-700"
                  }`}
                >
                  <Handshake className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-bold ${scope === "partners" ? "text-teal-800" : "text-slate-800"}`}>
                      Lời mời đối tác
                    </span>
                    {pendingPartners > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {pendingPartners} mới
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Vai trò Đối tác · Phối hợp chặng với Agency chủ trì
                  </span>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                  scope === "partners" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {partners.length}
              </span>
            </button>
          </div>
        </>
      )}

      <div id="agency-design-workspace-content" role="tabpanel" className="min-w-0">
        {scope === "customers" && focused !== "partners" && (
          <section aria-label="Yêu cầu khách hàng">
            <AgencyCustomRequests {...props} requests={customers} embedded onDetailChange={focusCustomers} />
          </section>
        )}

        {scope === "partners" && focused !== "customers" && (
          <section aria-label="Lời mời đối tác">
            <AgencyDesignCoHosting
              requests={partners}
              company={props.company}
              tours={props.tours}
              embedded
              onDetailChange={focusPartners}
              onChanged={async () => {
                await props.onUpdateRequest("", {});
              }}
            />
          </section>
        )}
      </div>
    </div>
  );
}
