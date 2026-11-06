import { useEffect, useState } from "react";
import { http } from "@/app/lib/http";
import { findProvince, type ProvinceOption, type WardOption } from "@/app/lib/administrativeLocations";

export function useAdministrativeAddress(province: string) {
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [provinceLoading, setProvinceLoading] = useState(true);
  const [provinceError, setProvinceError] = useState("");
  const [wardState, setWardState] = useState<{ code?: string; rows: WardOption[]; loading: boolean; error: string }>({ rows: [], loading: false, error: "" });
  const [attempt, setAttempt] = useState(0);
  const selectedProvince = findProvince(provinces, province);
  const provinceCode = selectedProvince?.code;

  useEffect(() => {
    const abort = new AbortController();
    setProvinceLoading(true); setProvinceError("");
    http<ProvinceOption[]>("/locations/provinces", { signal: abort.signal })
      .then(rows => { if (!abort.signal.aborted) setProvinces(rows); })
      .catch(e => { if (!abort.signal.aborted) setProvinceError(e.message); })
      .finally(() => { if (!abort.signal.aborted) setProvinceLoading(false); });
    return () => abort.abort();
  }, [attempt]);

  useEffect(() => {
    const abort = new AbortController();
    if (!provinceCode) { setWardState({ rows: [], loading: false, error: "" }); return; }
    setWardState({ code: provinceCode, rows: [], loading: true, error: "" });
    http<WardOption[]>(`/locations/provinces/${provinceCode}/wards`, { signal: abort.signal })
      .then(rows => { if (!abort.signal.aborted) setWardState({ code: provinceCode, rows, loading: false, error: "" }); })
      .catch(e => { if (!abort.signal.aborted) setWardState({ code: provinceCode, rows: [], loading: false, error: e.message }); });
    return () => abort.abort();
  }, [provinceCode, attempt]);

  // Never expose another province's wards, even for the render before the effect starts.
  const matchingWards = wardState.code === provinceCode;
  return { provinces, selectedProvince, provinceLoading, provinceError,
    wards: matchingWards ? wardState.rows : [],
    wardLoading: !!provinceCode && (!matchingWards || wardState.loading),
    wardError: matchingWards ? wardState.error : "", retry: () => setAttempt(a => a + 1) };
}
