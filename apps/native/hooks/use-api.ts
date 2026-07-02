import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { ApiError, apiFetch } from "@/lib/api";
import { readSnapshot, saveSnapshot } from "@/lib/offline-cache";

// Mirrors the web app's useApi hook, but attaches the SecureStore-backed bearer token
// directly (native has no httpOnly-cookie proxy) instead of hitting a same-origin proxy route.
//
// Offline behavior: every successful response is snapshotted to disk keyed by path. If a
// fetch fails (no connectivity — the common case; a real 4xx/5xx from a reachable server
// still surfaces as a normal error), the last snapshot for that exact path is served instead
// of a hard error, with isOffline/cachedAt set so screens can show a "showing saved data"
// affordance instead of silently pretending it's live.
export function useApi<T>(path: string | null, deps: React.DependencyList = []) {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!path || !token) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    apiFetch<T>(path, { token })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setIsOffline(false);
        setCachedAt(null);
        saveSnapshot(path, result);
      })
      .catch((err) => {
        if (cancelled) return;
        // A reachable server returning an error (validation, 403, 404, etc.) is a real error,
        // not an offline condition — only fall back to the cache for network-level failures.
        const isNetworkFailure = !(err instanceof ApiError);
        const snapshot = isNetworkFailure ? readSnapshot<T>(path) : null;
        if (snapshot) {
          setData(snapshot.data);
          setIsOffline(true);
          setCachedAt(snapshot.savedAt);
        } else {
          setError(err instanceof ApiError ? err.message : "Couldn't load this data.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, token, reloadKey, ...deps]);

  return { data, isLoading, error, refetch, isOffline, cachedAt };
}
