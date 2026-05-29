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
import { fetchNotifications, Notification } from "./notifications";
import { useSocket } from "@/src/components/SocketProvider";

type NotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  latestNotification: Notification | null;
  clearLatestNotification: () => void;
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
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] =
    useState<Notification | null>(null);

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

  const clearLatestNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onNotification = (notification: Notification) => {
      setLatestNotification(notification);
      if (!notification.read) {
        setUnreadCount((current) => current + 1);
      }
    };

    socket.on("notification_received", onNotification);

    return () => {
      socket.off("notification_received", onNotification);
    };
  }, [socket]);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        setUnreadCount,
        latestNotification,
        clearLatestNotification,
      }}
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
