"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2 } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { useNotifications } from "@/src/lib/NotificationsContext";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  Notification,
  NotificationType,
} from "@/src/lib/notifications";
import { formatTimeAgo } from "@/src/lib/posts";
import NotificationItem from "../../components/NotificationItem";
import AuthLoadingScreen from "../../components/AuthLoadingScreen";

type AlertFilter =
  | "all"
  | "unread"
  | "boosts"
  | "replies"
  | "connects"
  | "chats"
  | "hubs"
  | "work"
  | "happenings";

const FILTER_CHIPS: { id: AlertFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "boosts", label: "Boosts" },
  { id: "replies", label: "Replies" },
  { id: "connects", label: "Connects" },
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
  connects: ["FOLLOW"],
  chats: ["MARKETPLACE_INQUIRY"],
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
  return alerts.filter((alert) => FILTER_TYPE_MAP[filter].includes(alert.type));
}

export default function NotificationsPage() {
  const router = useRouter();
  const { unreadCount, setUnreadCount, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<AlertFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const filteredNotifications = useMemo(
    () => filterAlerts(notifications, activeFilter),
    [notifications, activeFilter],
  );

  const loadNotifications = useCallback(async () => {
    setError(null);

    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Unable to load alerts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [router, setUnreadCount]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handleMarkAllRead() {
    setIsMarkingAll(true);
    setError(null);

    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true })),
      );
      setUnreadCount(0);
    } catch (err) {
      setError(
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
    setError(null);

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
      setError(
        err instanceof ApiError ? err.message : "Unable to update alert.",
      );
    } finally {
      setMarkingId(null);
    }
  }

  const hasUnread = notifications.some((n) => !n.read);

  if (isLoading) {
    return <AuthLoadingScreen message="Loading alerts..." />;
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container max-w-3xl">
        <header className="mb-6 linkup-panel p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-600 dark:text-violet-300/80">
                LinkUp Alerts
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Alerts
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Stay updated on what matters across your network.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-950/60">
                <Bell className="h-4 w-4 text-violet-500" />
                <span className="text-slate-700 dark:text-slate-300">
                  {unreadCount}{" "}
                  {unreadCount === 1 ? "unread alert" : "unread alerts"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={isMarkingAll || !hasUnread}
              className="linkup-btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isMarkingAll ? "Updating…" : "Mark all as read"}
            </button>
          </div>

          <div className="linkup-chip-row mt-6">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveFilter(chip.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeFilter === chip.id
                    ? "border-violet-500/50 bg-violet-600 text-white shadow-md shadow-violet-600/20 dark:bg-violet-600"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </header>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-slate-900/60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                No alerts yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
                When something important happens, you&apos;ll see it here.
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-slate-900/60">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No alerts match this filter. Try another category or check back
                later.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                type={notification.type}
                actor={notification.actor}
                message={notification.message}
                time={formatTimeAgo(notification.createdAt)}
                unread={!notification.read}
                onMarkRead={
                  !notification.read
                    ? () => void handleMarkRead(notification.id)
                    : undefined
                }
              />
            ))
          )}
        </div>

        {markingId ? (
          <p className="sr-only" aria-live="polite">
            Marking alert as read
          </p>
        ) : null}
      </div>
    </div>
  );
}
