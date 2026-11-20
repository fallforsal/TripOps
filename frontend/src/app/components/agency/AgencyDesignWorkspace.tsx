import { useState, type ComponentProps } from "react";
import { CheckCircle2, Clock, Eye, Handshake, PenSquare, XCircle } from "lucide-react";
import { AgencyCustomRequests } from "./AgencyCustomRequests";
import { AgencyDesignCoHosting } from "./DesignCollaborationPanel";

type Props = ComponentProps<typeof AgencyCustomRequests> & {
  mode: "customers" | "partners";
};

export function AgencyDesignWorkspace({ mode, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  const customers = props.requests.filter(request => request.targetCompanyId === props.company.id);
  const partners = props.requests.filter(request => request.targetCompanyId !== props.company.id);

  if (mode === "customers") {
    const pendingCustomers = customers.filter(r => r.status === "pending").length;
    const designingCustomers = customers.filter(r => r.status === "reviewing").length;
    const sharedCustomers = customers.filter(r => r.status === "designed").length;
    const bookedCustomers = customers.filter(r => r.status === "booked").length;

    const stats = [
      { label: "Chờ tiếp nhận", value: pendingCustomers, icon: Clock, tone: "text-amber-700 bg-amber-50 border-amber-200/70" },
      { label: "Đang thiết kế", value: designingCustomers, icon: PenSquare, tone: "text-[#075985] bg-sky-50 border-sky-200/70" },
      { label: "Khách đang xem", value: sharedCustomers, icon: Eye, tone: "text-emerald-700 bg-emerald-50 border-emerald-200/70" },
      { label: "Đã đặt tour", value: bookedCustomers, icon: CheckCircle2, tone: "text-teal-700 bg-teal-50 border-teal-200/70" },
    ];

    return (
      <div className="min-w-0 w-full max-w-full space-y-5">
        {!focused && (
          <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-[#075985]">
                <PenSquare className="h-3.5 w-3.5" />
                Vai trò Chủ trì
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Thiết kế tour theo yêu cầu
              </h1>
              <p className="max-w-2xl text-sm text-slate-500">
                Tiếp nhận yêu cầu đoàn riêng từ khách hàng, thiết kế từng phiên bản, kiểm soát quyền xem và mời Agency đối tác khi cần.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-auto">
              {stats.map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`flex flex-col justify-between rounded-xl border px-3.5 py-2.5 ${stat.tone}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium opacity-85">{stat.label}</span>
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    </div>
                    <span className="mt-1 text-xl font-bold tabular-nums">{stat.value}</span>
                  </div>
                );
              })}
            </div>
          </header>
        )}

        <AgencyCustomRequests {...props} requests={customers} embedded onDetailChange={setFocused} />
      </div>
    );
  }

  const closedStatuses = new Set(["rejected", "revoked", "removed"]);
  const closedRequest = (r: (typeof partners)[number]) => ["cancelled", "rejected", "closed"].includes(r.status);
  const myInvites = (r: (typeof partners)[number]) =>
    r.collaborationInvitations?.filter(i => i.companyId === props.company.id && i.status !== "uninvited") || [];

  const pendingPartners = partners.filter(r => !closedRequest(r) && myInvites(r).some(i => i.status === "pending")).length;
  const acceptedPartners = partners.filter(r => !closedRequest(r) && myInvites(r).some(i => i.status === "accepted")).length;
  const closedPartners = partners.filter(r => closedRequest(r) || myInvites(r).some(i => closedStatuses.has(i.status))).length;

  const partnerStats = [
    { label: "Chờ phản hồi", value: pendingPartners, icon: Clock, tone: "text-amber-700 bg-amber-50 border-amber-200/70" },
    { label: "Đã tham gia", value: acceptedPartners, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50 border-emerald-200/70" },
    { label: "Kết thúc / Từ chối", value: closedPartners, icon: XCircle, tone: "text-slate-700 bg-slate-50 border-slate-200" },
  ];

  return (
    <div className="min-w-0 w-full max-w-full space-y-5">
      {!focused && (
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              <Handshake className="h-3.5 w-3.5" />
              Liên minh Đồng tổ chức
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Lời mời đối tác
            </h1>
            <p className="max-w-2xl text-sm text-slate-500">
              Xem lời mời hợp tác từ các Agency chủ trì, phản hồi tham gia và thiết kế chặng + báo giá của công ty bạn.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 lg:w-auto">
            {partnerStats.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`flex flex-col justify-between rounded-xl border px-3.5 py-2.5 ${stat.tone}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium opacity-85">{stat.label}</span>
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  </div>
                  <span className="mt-1 text-xl font-bold tabular-nums">{stat.value}</span>
                </div>
              );
            })}
          </div>
        </header>
      )}

      <AgencyDesignCoHosting
        requests={partners}
        company={props.company}
        tours={props.tours}
        embedded
        onDetailChange={setFocused}
        onChanged={async () => {
          await props.onUpdateRequest("", {});
        }}
      />
    </div>
  );
}
