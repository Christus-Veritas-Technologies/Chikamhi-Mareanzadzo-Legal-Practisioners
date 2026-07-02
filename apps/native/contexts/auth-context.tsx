import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { ApiError, apiFetch } from "@/lib/api";

const TOKEN_KEY = "cmlp_auth_token";
// Last-known user profile, cached alongside the token so a cold app launch while offline can
// still restore a signed-in session (Boolean(user) is what gates the protected navigator —
// having a valid token alone isn't enough to render the signed-in shell).
const USER_KEY = "cmlp_auth_user";

async function cacheUser(user: AuthUser) {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch {
    // Non-fatal — worst case we just can't offline-restore the session on next cold boot.
  }
}

async function readCachedUser(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
  notifications?: { caseUpload: boolean; ocrComplete: boolean; weeklyDigest: boolean };
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  isSignedIn: boolean;
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!storedToken) return;
        try {
          const { user: me } = await apiFetch<{ user: AuthUser }>("/auth/me", { token: storedToken });
          setUser(me);
          setToken(storedToken);
          await cacheUser(me);
        } catch (err) {
          // A genuine auth failure (expired/invalid token, account disabled) means we really
          // are signed out — clear it and send the user to sign-in. A network failure (device
          // offline, server unreachable) does NOT mean signed out: fall back to the last-known
          // cached user so the app opens straight into the signed-in shell (which itself falls
          // back to cached data via useApi) instead of bouncing to the login screen just
          // because there's no connectivity.
          if (err instanceof ApiError) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
          } else {
            const cachedUser = await readCachedUser();
            if (cachedUser) {
              setUser(cachedUser);
              setToken(storedToken);
            }
            // No cached user and no network — nothing to safely restore; stays signed out
            // until connectivity returns.
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setIsSigningIn(true);
    setError(null);
    try {
      const { token: newToken, user: newUser } = await apiFetch<{ token: string; user: AuthUser }>(
        "/auth/sign-in",
        { method: "POST", body: { username, password } },
      );
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      setUser(newUser);
      setToken(newToken);
      await cacheUser(newUser);
      return true;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection.",
      );
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const { user: me } = await apiFetch<{ user: AuthUser }>("/auth/me", { token });
      setUser(me);
      await cacheUser(me);
    } catch {
      // Keep the last known user if the refresh fails — not worth signing the user out for
      // (covers both a flaky network and a momentary server error).
    }
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isSigningIn,
      error,
      isSignedIn: Boolean(user),
      signIn,
      signOut,
      clearError,
      refreshUser,
    }),
    [user, token, isLoading, isSigningIn, error, signIn, signOut, clearError, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
