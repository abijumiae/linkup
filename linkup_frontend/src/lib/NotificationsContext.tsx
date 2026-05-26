"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiError } from "./api";
import { useAuth } from "./AuthProvider";
import { fetchNotifications } from "./notifications";

type NotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await fetchNotifications();
      setUnreadCount(data.unreadCount);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUnreadCount(0);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  return (
    <NotificationsContext.Provider
      value={{ unreadCount, refreshUnreadCount, setUnreadCount }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }

  return context;
}
