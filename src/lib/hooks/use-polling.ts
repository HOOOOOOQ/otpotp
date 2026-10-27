"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api/client";
import { getSettings } from "@/lib/hooks/use-settings";

interface PollingOptions<T> {
  enabled: boolean;
  onData: (data: T) => void;
  onError?: (message: string) => void;
  intervalMs?: number;
}

/**
 * Efficient polling: one request at a time, pauses on hidden tabs, and backs off on errors.
 * The caller stops it by setting enabled=false (terminal order states).
 */
export function usePolling<T>(url: string, options: PollingOptions<T>) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const failureCount = useRef(0);
  const onDataRef = useRef(options.onData);
  const onErrorRef = useRef(options.onError);
  onDataRef.current = options.onData;
  onErrorRef.current = options.onError;

  const run = useCallback(
    async (signal?: AbortSignal) => {
      if (inFlight.current || (typeof document !== "undefined" && document.hidden)) return;
      inFlight.current = true;
      setRefreshing(true);
      try {
        const data = await apiGet<T>(url, { signal });
        if (signal?.aborted) return;
        setLastError(null);
        failureCount.current = 0;
        onDataRef.current(data);
      } catch (error) {
        if (signal?.aborted) return;
        const message = error instanceof Error ? error.message : "Pembaruan gagal.";
        setLastError(message);
        failureCount.current = Math.min(failureCount.current + 1, 3);
        onErrorRef.current?.(message);
      } finally {
        inFlight.current = false;
        setRefreshing(false);
      }
    },
    [url],
  );

  useEffect(() => {
    if (!options.enabled) return;
    let stopped = false;
    let timer: number | undefined;
    const controller = new AbortController();
    const configuredInterval = options.intervalMs ?? getSettings().pollIntervalSeconds * 1000;

    const tick = async () => {
      if (stopped) return;
      await run(controller.signal);
      if (stopped) return;
      const delay = configuredInterval * Math.min(2 ** failureCount.current, 4);
      timer = window.setTimeout(tick, delay);
    };

    const onVisibility = () => {
      if (!document.hidden && !stopped) {
        window.clearTimeout(timer);
        void tick();
      }
    };

    void tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [url, options.enabled, options.intervalMs, run]);

  return { refresh: () => void run(), refreshing, lastError };
}
