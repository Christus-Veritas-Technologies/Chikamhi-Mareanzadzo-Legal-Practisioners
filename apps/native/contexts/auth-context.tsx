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
        const { user: me } = await apiFetch<{ user: AuthUser }>("/auth/me", { token: storedToken });
        setUser(me);
        setToken(storedToken);
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
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
    setUser(null);
    setToken(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const { user: me } = await apiFetch<{ user: AuthUser }>("/auth/me", { token });
      setUser(me);
    } catch {
      // Keep the last known user if the refresh fails — not worth signing the user out for.
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
