"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { ApiError } from "./api";
import { normalizeRealtimeAlert, RealtimeAlertPayload } from "./alertUtils";
import { useAuth } from "./AuthProvider";
import { useOptionalActiveChat } from "./ActiveChatContext";
import {
  getBrowserAlertStatus,
  isBrowserAlertsEnabled,
  showBrowserAlert,
} from "./browserNotifications";
import { fetchUnreadCount, Notification } from "./notifications";
import { useSocket } from "@/src/components/SocketProvider";
import AlertToast from "@/app/components/AlertToast";

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
  const activeChat = useOptionalActiveChat();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] =
    useState<Notification | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const receivedNotificationIdsRef = useRef(new Set<string>());

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await fetchUnreadCount();
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

  const handleIncomingAlert = useCallback(
    (raw: RealtimeAlertPayload | Notification) => {
      const notification =
        "actor" in raw && raw.actor && "type" in raw && !("notificationType" in raw)
          ? (raw as Notification)
          : normalizeRealtimeAlert(raw as RealtimeAlertPayload);

      setLatestNotification(notification);

      const isNew = !receivedNotificationIdsRef.current.has(notification.id);
      if (isNew) {
        receivedNotificationIdsRef.current.add(notification.id);
      }

      if (!notification.read && isNew) {
        setUnreadCount((current) => current + 1);
      }

      const isOnAlertsPage = pathname === "/notifications";
      const isInActiveChat =
        pathname.startsWith("/messages") &&
        activeChat?.activeChatPeerId === notification.peerId;

      if (!isOnAlertsPage && !isInActiveChat) {
        setToastMessage(notification.message);
      }

      if (
        getBrowserAlertStatus() === "granted" &&
        isBrowserAlertsEnabled() &&
        !isInActiveChat
      ) {
        showBrowserAlert("New alert from LinkUp", {
          body: notification.message,
          tag: notification.id,
        });
      }
    },
    [activeChat?.activeChatPeerId, pathname],
  );

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.on("notification_received", handleIncomingAlert);

    const onNotificationRead = (payload: { id?: string }) => {
      if (!payload?.id) {
        return;
      }
      setUnreadCount((current) => Math.max(0, current - 1));
    };

    const onNotificationsReadAll = () => {
      setUnreadCount(0);
    };

    socket.on("notification_read", onNotificationRead);
    socket.on("notifications_read_all", onNotificationsReadAll);

    return () => {
      socket.off("notification_received", handleIncomingAlert);
      socket.off("notification_read", onNotificationRead);
      socket.off("notifications_read_all", onNotificationsReadAll);
    };
  }, [handleIncomingAlert, socket]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

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
      {toastMessage ? (
        <AlertToast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      ) : null}
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
