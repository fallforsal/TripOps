import { useCallback, useState, type ComponentProps } from "react";
import { Handshake, PenSquare } from "lucide-react";
import { AgencyCustomRequests } from "./AgencyCustomRequests";
import { AgencyDesignCoHosting } from "./DesignCollaborationPanel";

type Props = ComponentProps<typeof AgencyCustomRequests>;
type Scope = "all" | "customers" | "partners";

export function AgencyDesignWorkspace(props: Props) {
  const [scope, setScope] = useState<Scope>("all");
  const [focused, setFocused] = useState<"customers" | "partners" | null>(null);
  const focusCustomers = useCallback((open: boolean) => setFocused(previous => open ? "customers" : previous === "customers" ? null : previous), []);
  const focusPartners = useCallback((open: boolean) => setFocused(previous => open ? "partners" : previous === "partners" ? null : previous), []);
  const customers = props.requests.filter(request => request.targetCompanyId === props.company.id);
  const partners = props.requests.filter(request => request.targetCompanyId !== props.company.id);
  const tabs: { id: Scope; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: customers.length + partners.length },
    { id: "customers", label: "Yêu cầu khách hàng", count: customers.length },
    { id: "partners", label: "Lời mời đối tác", count: partners.length },
  ];
  return <div className="min-w-0 w-full max-w-full space-y-6 overflow-hidden">
    {!focused && <>
      <header className="space-y-2 px-1">
        <h1 className="text-2xl font-semibold text-slate-900">Thiết kế tour &amp; Liên minh</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-500">Tiếp nhận yêu cầu khách hàng, thiết kế từng phiên bản và phối hợp với Agency đối tác.</p>
      </header>
      <div role="tablist" aria-label="Loại yêu cầu thiết kế và liên minh" className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(tab => <button key={tab.id} role="tab" type="button" aria-selected={scope === tab.id} aria-controls="agency-design-workspace-content"
          onClick={() => setScope(tab.id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-600 ${scope === tab.id ? "border-sky-700 font-semibold text-sky-800" : "border-transparent text-slate-500 hover:text-slate-900"}`}>
          {tab.label}<span className={`rounded-md px-1.5 py-0.5 text-xs ${scope === tab.id ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-500"}`}>{tab.count}</span>
        </button>)}
      </div>
    </>}
    <div id="agency-design-workspace-content" role="tabpanel" className="min-w-0 space-y-8">
      {scope !== "partners" && focused !== "partners" && <section aria-label="Yêu cầu khách hàng">
        {!focused && <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800"><PenSquare className="h-4 w-4 text-sky-800"/>Yêu cầu khách hàng</h2>}
        <AgencyCustomRequests {...props} requests={customers} embedded onDetailChange={focusCustomers}/>
      </section>}
      {scope !== "customers" && focused !== "customers" && <section aria-label="Lời mời đối tác">
        {!focused && <div className="mb-3"><h2 className="flex items-center gap-2 text-base font-semibold text-slate-800"><Handshake className="h-4 w-4 text-teal-700"/>Lời mời đối tác</h2><p className="mt-1 text-sm text-slate-500">Các phiên bản bạn được Agency khác mời cùng thiết kế, gồm cả lời mời đã bị gỡ.</p></div>}
        <AgencyDesignCoHosting requests={partners} company={props.company} embedded onDetailChange={focusPartners} onChanged={async () => { await props.onUpdateRequest("", {}); }}/>
      </section>}
    </div>
  </div>;
}
