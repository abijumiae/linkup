"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2 } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { useNotifications } from "@/src/lib/NotificationsContext";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  Notification,
} from "@/src/lib/notifications";
import { formatTimeAgo } from "@/src/lib/posts";
import NotificationItem from "../../components/NotificationItem";
import AuthLoadingScreen from "../../components/AuthLoadingScreen";

export default function NotificationsPage() {
  const router = useRouter();
  const { unreadCount, setUnreadCount, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

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
      setError("Unable to load notifications. Please try again.");
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
          : "Unable to mark notifications as read.",
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
        err instanceof ApiError
          ? err.message
          : "Unable to update notification.",
      );
    } finally {
      setMarkingId(null);
    }
  }

  const hasUnread = notifications.some((n) => !n.read);

  if (isLoading) {
    return <AuthLoadingScreen message="Loading notifications..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-600 dark:text-violet-300/80">
                Notifications
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Stay on top of your activity
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Likes, comments, follows, and updates from across LinkUp.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-950/60">
                <Bell className="h-4 w-4 text-violet-500" />
                <span className="text-slate-700 dark:text-slate-300">
                  {unreadCount}{" "}
                  {unreadCount === 1 ? "unread notification" : "unread notifications"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={isMarkingAll || !hasUnread}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isMarkingAll ? "Updating…" : "Mark all as read"}
            </button>
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
                No notifications yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
                When someone likes, comments, or follows you, you'll see it here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
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
            Marking notification as read
          </p>
        ) : null}
      </div>
    </div>
  );
}
