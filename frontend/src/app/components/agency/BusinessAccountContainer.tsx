import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { partnerService, type BusinessAccount } from "@/app/services/partnerService";
import { BusinessAccountPage } from "./BusinessAccountPage";

export function BusinessAccountContainer() {
  const { refresh } = useAuth();
  const [account, setAccount] = useState<BusinessAccount | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    partnerService
      .me(controller.signal)
      .then(setAccount)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Không thể tải hồ sơ doanh nghiệp.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const handleUpdated = (updated: BusinessAccount) => {
    setAccount(updated);
    // Làm mới phiên đăng nhập để currentUser.businessProfile (trạng thái, logo) cập nhật theo.
    void refresh().catch(() => undefined);
  };

  if (loading)
    return <div role="status" className="p-12 text-center text-sm text-slate-500">Đang tải hồ sơ doanh nghiệp...</div>;
  if (error || !account)
    return <div role="alert" className="p-12 text-center text-sm text-rose-700">{error || "Không có dữ liệu."}</div>;
  return <BusinessAccountPage account={account} onUpdated={handleUpdated} />;
}