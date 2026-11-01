import { useEffect, useState } from "react";
import { partnerService } from "@/app/services/partnerService";
import { PartnerProfileDialog, toPartnerProfile, type UnifiedPartnerItem } from "./PartnerProfileDialog";

export function ProviderProfileLink({ providerId, name }: { providerId: string; name?: string }) {
  const [open, setOpen] = useState(false);
  const [partner, setPartner] = useState<UnifiedPartnerItem | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setPartner(null); setError("");
    partnerService.byUserId(providerId, controller.signal)
      .then(item => { if (!controller.signal.aborted) setPartner(toPartnerProfile(item)); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Không thể tải hồ sơ nhà cung cấp."); });
    return () => controller.abort();
  }, [providerId, open, revision]);
  return <>
    <button type="button" onClick={() => setOpen(true)} title="Xem hồ sơ nhà cung cấp"
      className="max-w-full rounded text-left text-[#075985] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
      aria-label={`Xem hồ sơ ${name || "nhà cung cấp"}`}>
      <span className="block truncate font-semibold underline decoration-sky-200 underline-offset-4">{name || "Nhà cung cấp TripOps"}</span>
    </button>
    <PartnerProfileDialog partner={partner} open={open} onOpenChange={setOpen} error={error} onRetry={() => setRevision(value => value + 1)} />
  </>;
}
