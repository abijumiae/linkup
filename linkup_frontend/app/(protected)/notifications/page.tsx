"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
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
  const { setUnreadCount, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setError(null);

    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Please log in again to view notifications.");
      } else {
        setError("Unable to load notifications. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [setUnreadCount]);

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
    }
  }

  if (isLoading) {
    return <AuthLoadingScreen message="Loading notifications..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                Notifications
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Stay on top of activity across LinkUp
              </h1>
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll || notifications.every((n) => n.read)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isMarkingAll ? "Updating..." : "Mark all as read"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mb-4 text-sm text-red-500 dark:text-red-400">{error}</p>
        ) : null}

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-950/85">
              <p className="text-sm text-slate-600 dark:text-slate-400">No notifications yet.</p>
              <p className="mt-2 text-xs text-slate-500">
                Likes, comments, and follows will show up here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                type={notification.type}
                actorName={notification.actor.name}
                message={notification.message}
                time={formatTimeAgo(notification.createdAt)}
                unread={!notification.read}
                onClick={() => {
                  if (!notification.read) {
                    void handleMarkRead(notification.id);
                  }
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
