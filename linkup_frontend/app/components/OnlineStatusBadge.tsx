"use client";

import { formatLastSeen } from "@/src/lib/presence";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";

type OnlineStatusBadgeProps = {
  userId: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  live?: boolean;
  className?: string;
};

const dotSizes = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
};

export default function OnlineStatusBadge({
  userId,
  showLabel = false,
  size = "sm",
  live = false,
  className = "",
}: OnlineStatusBadgeProps) {
  const { isOnline, getLastSeenAt } = useOnlineStatus();
  const online = isOnline(userId);
  const lastSeen = getLastSeenAt(userId);

  if (live) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        aria-label="Live in room"
      >
        <span
          className={`${dotSizes[size]} animate-pulse rounded-full bg-rose-500`}
        />
        {showLabel ? (
          <span className="text-xs font-medium text-rose-600 dark:text-rose-300">
            Live
          </span>
        ) : null}
      </span>
    );
  }

  const label = online ? "Online" : formatLastSeen(lastSeen);

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={online ? "Online" : "Offline"}
    >
      <span
        className={`${dotSizes[size]} shrink-0 rounded-full ${
          online ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-500"
        }`}
      />
      {showLabel ? (
        <span
          className={`text-xs font-medium ${
            online
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
