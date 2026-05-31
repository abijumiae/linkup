"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  User,
  fetchMe,
  getCurrentUser,
  getToken,
  logout as clearAuthStorage,
} from "./auth";
import { disconnectSocket } from "./socket";
import { notifyLogout } from "./presence";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<User | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }

    const currentUser = await fetchMe();
    setUser(currentUser);
    return currentUser;
  }, []);

  useEffect(() => {
    setUser(getCurrentUser());
    void refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const logout = useCallback(() => {
    void notifyLogout();
    disconnectSocket();
    clearAuthStorage();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      setUser,
      refreshUser,
      logout,
    }),
    [user, isLoading, refreshUser, logout],
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
