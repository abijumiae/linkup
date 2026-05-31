"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/src/lib/api";
import { resolveProfileImageUrl } from "@/src/lib/profileMedia";
import {
  BlockedUser,
  fetchBlockedUsers,
  unblockUser,
} from "@/src/lib/safety";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name[0] ?? "U").toUpperCase();
}

export default function BlockedUsersSection() {
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await fetchBlockedUsers();
      setItems(rows);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load blocked users.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUnblock(userId: string) {
    setWorkingId(userId);
    setError(null);

    try {
      await unblockUser(userId);
      setItems((current) => current.filter((item) => item.user.id !== userId));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not unblock user. Please try again.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((key) => (
            <div
              key={key}
              className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-400">
          You have not blocked anyone yet.
        </p>
      ) : (
        items.map((item) => {
          const avatarSrc = resolveProfileImageUrl(item.user.avatarUrl);
          return (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-brand-dark/70"
            >
              <div className="flex min-w-0 items-center gap-3">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white">
                    {getInitials(item.user.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {item.user.name}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    @{item.user.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleUnblock(item.user.id)}
                disabled={workingId === item.user.id}
                className="linkup-btn-secondary min-h-[44px] shrink-0 px-4 py-2 text-sm disabled:opacity-60"
              >
                {workingId === item.user.id ? "Unblocking..." : "Unblock"}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
