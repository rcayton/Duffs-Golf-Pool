import { useState, useEffect, useCallback } from "react";
import { DashboardData } from "../lib/types";
import { fetchDashboard } from "../lib/api";

const POLL_MS = 60_000; // refresh every 60 seconds

interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  refresh: () => void;
}

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchDashboard();
      setData(result);
      setLastFetched(new Date());
    } catch (err: any) {
      setError(err.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading, error, lastFetched, refresh: load };
}
