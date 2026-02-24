"use client";

import { useEffect, useState, useCallback } from "react";

interface UseJobStatusOptions<T> {
  endpoint: string;
  intervalMs?: number;
  activeStatuses: Set<string>;
  getStatus: (data: T) => string;
  onComplete?: (data: T) => void;
  onFailed?: (data: T) => void;
}

interface UseJobStatusReturn<T> {
  data: T | null;
  error: string | null;
  isPolling: boolean;
}

export function useJobStatus<T>({
  endpoint,
  intervalMs = 2000,
  activeStatuses,
  getStatus,
  onComplete,
  onFailed,
}: UseJobStatusOptions<T>): UseJobStatusReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        setError("Failed to fetch status");
        return;
      }
      const result: T = await res.json();
      setData(result);

      const status = getStatus(result);

      if (!activeStatuses.has(status)) {
        setIsPolling(false);
      }

      if (status === "ready" || status === "completed") {
        onComplete?.(result);
      } else if (status === "failed") {
        onFailed?.(result);
      }
    } catch {
      setError("Failed to connect to server");
    }
  }, [endpoint, activeStatuses, getStatus, onComplete, onFailed]);

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      if (data && !activeStatuses.has(getStatus(data))) return;
      fetchStatus();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [fetchStatus, data, activeStatuses, getStatus, intervalMs]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsPolling(true);
  }, []);

  return { data, error, isPolling };
}
