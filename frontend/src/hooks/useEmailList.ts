import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { EmailItem, Pagination } from "../types/api";

const initialPagination: Pagination = { page: 1, limit: 25, total: 0, pages: 1 };

export function useEmailList(view: "scheduled" | "sent") {
  const [items, setItems] = useState<EmailItem[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.emails(view, page);
      setItems(response.items);
      setPagination(response.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load emails");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { void load(); }, [load]);
  return { items, pagination, loading, error, load };
}
