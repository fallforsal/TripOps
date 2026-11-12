import { useEffect, useState } from "react";
import { CheckCircle2, ImageIcon, Loader2 } from "lucide-react";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { http } from "@/app/lib/http";
import type { Tour } from "@/app/types";

type Version = { version: number; configuration: { name: string; images?: string[] } };
export function DesignVersionSelector({ requestId, tour, sharedVersion, reload, disabled, updatingVersion, onChange }: {
  requestId: string; tour: Tour; sharedVersion?: number; reload: number;
  disabled: boolean; updatingVersion?: number; onChange: (version: number | null) => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    http<Version[]>(`/agency/tour-design-requests/${requestId}/history`)
      .then(rows => { if (active) setVersions(rows); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestId, reload]);
  const rows = versions.length ? [...versions].sort((a, b) => b.version - a.version)
    : [{ version: tour.version || 1, configuration: { name: tour.name, images: tour.images } }];
  const displayed = rows.find(row => row.version === sharedVersion);
  const name = displayed?.configuration.name || tour.name;
  const image = displayed ? displayed.configuration.images?.[0] : tour.image;
  return <div className="min-w-0">
    <div className="flex items-center gap-2">
      {image ? <img src={image} alt="" title={name} className="h-10 w-10 shrink-0 rounded-md object-cover" />
        : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400"><ImageIcon className="h-4 w-4" /></span>}
      <label className="min-w-0 flex-1">
        <span className="sr-only">Phiên bản khách xem</span>
        <select aria-label={`Phiên bản phương án yêu cầu ${requestId}`} title={name} value={sharedVersion ?? ""}
          aria-busy={updatingVersion != null} disabled={disabled || loading || !!error}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:opacity-70">
          <option value="">Chưa cho khách xem</option>
          {rows.map(row => <option key={row.version} value={row.version}>v{row.version}</option>)}
        </select>
      </label>
    </div>
    <p role="status" className={`mt-2 flex items-center gap-1 text-xs ${updatingVersion != null ? "text-sky-700" : sharedVersion ? "text-emerald-700" : "text-slate-400"}`}>
      {updatingVersion != null ? <><Loader2 className="h-3 w-3 shrink-0 animate-spin" />Đang cập nhật…</>
        : sharedVersion ? <><CheckCircle2 className="h-3 w-3 shrink-0" />Khách đang xem v{sharedVersion}</> : "Chưa hiển thị cho khách"}
    </p>
    {error && <NotificationMessage message={error} />}
  </div>;
}
