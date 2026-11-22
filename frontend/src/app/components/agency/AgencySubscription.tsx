import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { getAgencySubscription, setAgencySubscription } from "@/app/services/agencySubscription";

export function AgencySubscription() {
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = () => { setError(""); void getAgencySubscription().then(s => setActive(s.active)).catch(e => setError(e.message)); };
  useEffect(load, []);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Gói AI dành cho Agency</h1>
      <p className="mt-2 text-slate-600">Đăng ký để sử dụng trợ lý AI tư vấn thiết kế và tạo khung tour.</p></div>
    <div className="max-w-xl rounded-2xl border bg-white p-6 space-y-5">
      <h2 className="text-xl font-semibold text-[#075985]">Agency AI</h2>
      <p>Trợ lý chat AI và tạo lịch trình tour bằng AI.</p>
      <p className="text-sm text-slate-500">Hiện tại đăng ký miễn phí, không có thời hạn. Có thể hủy bất cứ lúc nào.</p>
      {active !== null && <p className="font-semibold">Trạng thái: {active ? "Đang đăng ký · Được sử dụng AI" : "Chưa đăng ký · Chưa được sử dụng AI"}</p>}
      {error && <NotificationMessage tone="error" message={error} />}
      {active === null ? <Button variant="outline" onClick={load}>{error ? "Thử tải lại" : "Đang tải..."}</Button> :
        <Button disabled={busy} variant={active ? "outline" : "default"} onClick={async () => {
          setBusy(true); setError("");
          try { const s = await setAgencySubscription(!active); setActive(s.active); window.dispatchEvent(new Event("agency-subscription-changed")); }
          catch (e) { setError(e instanceof Error ? e.message : "Không thể cập nhật gói AI."); }
          finally { setBusy(false); }
        }}>{busy ? "Đang xử lý..." : active ? "Hủy đăng ký" : "Đăng ký sử dụng AI"}</Button>}
    </div>
  </div>;
}
