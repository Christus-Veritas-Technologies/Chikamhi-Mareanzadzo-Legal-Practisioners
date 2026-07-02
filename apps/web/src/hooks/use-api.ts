"use client";

import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? "Something went wrong.", res.status);
  }
  return data as T;
}

// Shared client-side data-fetching hook — every list/detail page uses this so loading and
// error handling stay consistent instead of each page hand-rolling its own useEffect.
export function useApi<T>(path: string | null, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    apiFetch<T>(path)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load this data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, reloadKey, ...deps]);

  return { data, isLoading, error, refetch };
}

export { apiFetch };
