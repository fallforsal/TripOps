import { useEffect, useState } from "react";
import {
  partnerService,
  type PartnerApplication,
} from "@/app/services/partnerService";

export function usePartnerApplications(
  status: string,
  role: string,
  search: string,
  page: number,
) {
  const [items, setItems] = useState<PartnerApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      const query = (state: string, size: number, selectedPage = 1) =>
        new URLSearchParams({
          status: state === "all" ? "" : state,
          role: role === "all" ? "" : role,
          search,
          page: String(selectedPage),
          pageSize: String(size),
        });
      try {
        const [result, all, pending, approved, rejected] = await Promise.all([
          partnerService.list(query(status, 20, page), controller.signal),
          ...["all", "pending", "approved", "rejected"].map((state) =>
            partnerService.list(query(state, 1), controller.signal),
          ),
        ]);
        if (!controller.signal.aborted) {
          setItems(result.items);
          setTotal(result.total);
          setCounts({
            all: all.total,
            pending: pending.total,
            approved: approved.total,
            rejected: rejected.total,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Không thể tải hồ sơ",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [status, role, search, page, revision]);
  return {
    items,
    total,
    counts,
    loading,
    error,
    refresh: () => setRevision((value) => value + 1),
  };
}
