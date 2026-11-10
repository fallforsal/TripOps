import { useEffect, useState } from "react";
import {
  adminAccountService,
  type AccountCounts,
  type AdminAccount,
} from "@/app/services/adminAccountService";

export function useAdminAccounts(
  role: string,
  status: string,
  search: string,
  page: number,
  pageSize = 20,
) {
  const [items, setItems] = useState<AdminAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<AccountCounts>({
    all: 0,
    customer: 0,
    agency: 0,
    provider: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          role: role === "all" ? "" : role,
          status,
          search,
          page: String(page),
          pageSize: String(pageSize),
        });
        const result = await adminAccountService.list(query, controller.signal);
        if (!controller.signal.aborted) {
          setItems(result.items);
          setTotal(result.total);
          setCounts(result.counts);
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Không thể tải danh sách tài khoản.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [role, status, search, page, pageSize, revision]);

  return {
    items,
    total,
    counts,
    loading,
    error,
    refresh: () => setRevision((value) => value + 1),
  };
}