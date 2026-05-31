"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Trash2 } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { useSocket } from "@/src/components/SocketProvider";
import { isChatAlert } from "@/src/lib/alertUtils";
import {
  getNotificationActionLabel,
  getNotificationHref,
} from "@/src/lib/notificationRoutes";
import { useNotifications } from "@/src/lib/NotificationsContext";
import {
  fetchNotificationsSafe,
  markAllNotificationsRead,
  markNotificationRead,
  Notification,
  NotificationType,
} from "@/src/lib/notifications";
import { formatTimeAgo } from "@/src/lib/posts";
import AlertsEmptyState from "../../components/alerts/AlertsEmptyState";
import {
  AlertCardSkeleton,
  AlertsHeaderSkeleton,
} from "../../components/alerts/AlertsSkeleton";
import NotificationItem from "../../components/NotificationItem";

type AlertFilter =
  | "all"
  | "unread"
  | "boosts"
  | "replies"
  | "chats"
  | "hubs"
  | "work"
  | "happenings";

const FILTER_CHIPS: { id: AlertFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "boosts", label: "Boosts" },
  { id: "replies", label: "Replies" },
  { id: "chats", label: "Chats" },
  { id: "hubs", label: "Hubs" },
  { id: "work", label: "Work" },
  { id: "happenings", label: "Happenings" },
];

const FILTER_TYPE_MAP: Record<
  Exclude<AlertFilter, "all" | "unread">,
  NotificationType[]
> = {
  boosts: ["LIKE"],
  replies: ["COMMENT"],
  chats: [],
  hubs: ["GROUP_JOIN"],
  work: ["JOB_APPLICATION"],
  happenings: ["EVENT_JOIN"],
};

function filterAlerts(
  alerts: Notification[],
  filter: AlertFilter,
): Notification[] {
  if (filter === "all") return alerts;
  if (filter === "unread") return alerts.filter((alert) => !alert.read);
  if (filter === "chats") {
    return alerts.filter(
      (alert) =>
        isChatAlert(alert) ||
        alert.alertCategory === "chat" ||
        alert.peerId != null,
    );
  }
  return alerts.filter((alert) => FILTER_TYPE_MAP[filter].includes(alert.type));
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    unreadCount,
    setUnreadCount,
    refreshUnreadCount,
    latestNotification,
    clearLatestNotification,
  } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [alertsPage, setAlertsPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AlertFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const { socket } = useSocket();

  const filteredNotifications = useMemo(
    () => filterAlerts(notifications, activeFilter),
    [notifications, activeFilter],
  );

  const loadNotifications = useCallback(
    async (page = 1, append = false) => {
      try {
        const { data, warning: fetchWarning } = await fetchNotificationsSafe(
          page,
        );
        setNotifications((current) =>
          append
            ? [
                ...current,
                ...data.notifications.filter(
                  (item) => !current.some((existing) => existing.id === item.id),
                ),
              ]
            : data.notifications,
        );
        setAlertsPage(page);
        setHasMore(data.hasMore ?? false);
        setUnreadCount(data.unreadCount);
        setWarning(fetchWarning);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setWarning("Alerts are warming up. Try again shortly.");
      } finally {
        setIsLoading(false);
      }
    },
    [router, setUnreadCount],
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!latestNotification) {
      return;
    }

    setNotifications((current) => [
      latestNotification,
      ...current.filter((item) => item.id !== latestNotification.id),
    ]);
    clearLatestNotification();
  }, [latestNotification, clearLatestNotification]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onNotificationRead = (payload: { id?: string }) => {
      if (!payload?.id) {
        return;
      }
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === payload.id
            ? { ...notification, read: true }
            : notification,
        ),
      );
    };

    const onNotificationsReadAll = () => {
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true })),
      );
      setUnreadCount(0);
    };

    socket.on("notification_read", onNotificationRead);
    socket.on("notifications_read_all", onNotificationsReadAll);

    return () => {
      socket.off("notification_read", onNotificationRead);
      socket.off("notifications_read_all", onNotificationsReadAll);
    };
  }, [socket, setUnreadCount]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function handleMarkAllRead() {
    setIsMarkingAll(true);

    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true })),
      );
      setUnreadCount(0);
    } catch (err) {
      setWarning(
        err instanceof ApiError
          ? err.message
          : "Unable to mark alerts as read.",
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  async function handleMarkRead(notificationId: string) {
    setMarkingId(notificationId);

    try {
      await markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );
      await refreshUnreadCount();
    } catch (err) {
      setWarning(
        err instanceof ApiError ? err.message : "Unable to update alert.",
      );
    } finally {
      setMarkingId(null);
    }
  }

  function handleClearReadPlaceholder() {
    setNotice("Clearing read alerts is coming soon.");
  }

  const hasUnread = notifications.some((n) => !n.read);
  const hasRead = notifications.some((n) => n.read);

  if (isLoading && notifications.length === 0) {
    return (
      <div className="linkup-page">
        <div className="linkup-container max-w-3xl">
          <AlertsHeaderSkeleton />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <AlertCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container max-w-3xl">
        <header className="mb-6 linkup-panel p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="linkup-eyebrow">LinkUp</p>
              <h1 className="linkup-title mt-2">Alerts</h1>
              <p className="linkup-subtitle mt-2 max-w-xl">
                Stay updated on boosts, replies, chats, hubs, work, and
                happenings.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-brand-dark/60">
                <Bell className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                <span className="text-slate-700 dark:text-slate-300">
                  {unreadCount}{" "}
                  {unreadCount === 1 ? "unread alert" : "unread alerts"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={isMarkingAll || !hasUnread}
                className="linkup-btn-primary min-h-[44px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isMarkingAll ? "Updating…" : "Mark all as read"}
              </button>
              <button
                type="button"
                onClick={handleClearReadPlaceholder}
                disabled={!hasRead}
                className="linkup-btn-secondary inline-flex min-h-[44px] items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Clear read
              </button>
            </div>
          </div>

          <div className="linkup-chip-row mt-6 -mx-1 overflow-x-auto px-1 pb-1">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveFilter(chip.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeFilter === chip.id
                    ? "border-brand-primary/50 bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </header>

        {warning ? (
          <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </p>
        ) : null}

        {notice ? (
          <p className="mb-4 rounded-xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary dark:text-brand-secondary">
            {notice}
          </p>
        ) : null}

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <AlertsEmptyState variant="all" />
          ) : filteredNotifications.length === 0 ? (
            <AlertsEmptyState
              variant={activeFilter === "unread" ? "unread" : "filter"}
            />
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                type={notification.type}
                actor={notification.actor}
                message={notification.message}
                time={formatTimeAgo(notification.createdAt)}
                unread={!notification.read}
                href={getNotificationHref(notification)}
                actionLabel={getNotificationActionLabel(notification)}
                onMarkRead={
                  !notification.read
                    ? () => void handleMarkRead(notification.id)
                    : undefined
                }
              />
            ))
          )}
        </div>

        {hasMore && notifications.length > 0 ? (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setLoadingMore(true);
                void loadNotifications(alertsPage + 1, true).finally(() =>
                  setLoadingMore(false),
                );
              }}
              disabled={loadingMore}
              className="linkup-btn-secondary min-h-[44px] disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load more alerts"}
            </button>
          </div>
        ) : null}

        {markingId ? (
          <p className="sr-only" aria-live="polite">
            Marking alert as read
          </p>
        ) : null}
      </div>
    </div>
  );
}
