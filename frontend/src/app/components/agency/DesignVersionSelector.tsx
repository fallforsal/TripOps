import { useEffect, useState } from "react";
import { http } from "@/app/lib/http";
import type { Tour } from "@/app/types";

type Version = { version: number; configuration: { name: string }; };

export function DesignVersionSelector({ requestId, tour, value, sharedVersion, reload, disabled, onChange }: {
  requestId: string; tour: Tour; value: number; sharedVersion?: number; reload: number;
  disabled: boolean; onChange: (version: number) => void;
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
  const rows = versions.length ? versions : [{ version: tour.version || 1, configuration: { name: tour.name } }];
  const name = rows.find(row => row.version === value)?.configuration.name || tour.name;
  return <div className="max-w-[260px] space-y-2">
    <p className="truncate font-medium" title={name}>{name}</p>
    <select aria-label={`Phiên bản phương án yêu cầu ${requestId}`} value={value}
      disabled={disabled || loading || !!error}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 disabled:opacity-60">
      {rows.map(row => <option key={row.version} value={row.version}>
        Phiên bản v{row.version}{row.version === sharedVersion ? " · Khách đang xem" : ""}
      </option>)}
    </select>
    <p className="text-xs text-[#075985]">{sharedVersion ? `Khách đang xem v${sharedVersion}` : "Chưa chia sẻ cho khách"}</p>
    {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
  </div>;
}
