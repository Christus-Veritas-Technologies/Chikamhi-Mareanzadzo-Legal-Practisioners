import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { ApiError, apiFetch } from "@/lib/api";

// Mirrors the web app's useApi hook, but attaches the SecureStore-backed bearer token
// directly (native has no httpOnly-cookie proxy) instead of hitting a same-origin proxy route.
export function useApi<T>(path: string | null, deps: React.DependencyList = []) {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!path || !token) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    apiFetch<T>(path, { token })
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
  }, [path, token, reloadKey, ...deps]);

  return { data, isLoading, error, refetch };
}
