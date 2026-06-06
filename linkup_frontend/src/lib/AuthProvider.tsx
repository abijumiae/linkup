"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  User,
  fetchMe,
  getCurrentUser,
  getToken,
  logout as clearAuthStorage,
  refreshAccessToken,
} from "./auth";
import { logLinkUpDiagnostic } from "./diagnostics";
import {
  startSessionHealthMonitor,
  stopSessionHealthMonitor,
} from "./sessionHealth";
import { connectSocket, disconnectSocket } from "./socket";
import { notifyLogout } from "./presence";

const SESSION_INIT_TIMEOUT_MS = 4_000;

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSessionSyncing: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<User | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readCachedUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }
  return getCurrentUser();
}

function hasStoredSession(): boolean {
  return typeof window !== "undefined" && Boolean(getToken());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readCachedUser);
  const [isLoading, setIsLoading] = useState(
    () => typeof window !== "undefined" && hasStoredSession() && !readCachedUser(),
  );
  const [isSessionSyncing, setIsSessionSyncing] = useState(false);
  const syncInFlight = useRef(false);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }

    if (syncInFlight.current) {
      return getCurrentUser();
    }

    syncInFlight.current = true;
    setIsSessionSyncing(true);

    try {
      void refreshAccessToken()
        .then((token) => {
          if (token) {
            connectSocket(token);
          }
        })
        .catch((error) => {
          logLinkUpDiagnostic("auth", "Token refresh failed during session sync", error);
        });

      const currentUser = await fetchMe();
      const resolvedUser = currentUser ?? getCurrentUser();
      setUser(resolvedUser);
      connectSocket();
      return resolvedUser;
    } catch (error) {
      logLinkUpDiagnostic("auth", "Session sync failed", error);
      const cached = getCurrentUser();
      if (cached) {
        setUser(cached);
        connectSocket();
        return cached;
      }
      return null;
    } finally {
      syncInFlight.current = false;
      setIsSessionSyncing(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    const cached = readCachedUser();
    setUser(cached);

    if (!token) {
      setIsLoading(false);
      return;
    }

    if (cached) {
      setIsLoading(false);
      connectSocket(token);
      void refreshUser();
      startSessionHealthMonitor();
      return;
    }

    const safetyTimer = window.setTimeout(() => {
      logLinkUpDiagnostic(
        "session",
        "Session init timed out — continuing with cached credentials",
      );
      setIsLoading(false);
      connectSocket(token);
    }, SESSION_INIT_TIMEOUT_MS);

    void refreshUser().finally(() => {
      window.clearTimeout(safetyTimer);
      setIsLoading(false);
      startSessionHealthMonitor();
    });

    return () => {
      window.clearTimeout(safetyTimer);
    };
  }, [refreshUser]);

  const logout = useCallback(() => {
    stopSessionHealthMonitor();
    void notifyLogout();
    disconnectSocket();
    clearAuthStorage();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user && getToken()),
      isSessionSyncing,
      setUser,
      refreshUser,
      logout,
    }),
    [user, isLoading, isSessionSyncing, refreshUser, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
