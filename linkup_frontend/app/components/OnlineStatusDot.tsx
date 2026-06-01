"use client";

import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";

type OnlineStatusDotProps = {
  userId: string;
  className?: string;
  live?: boolean;
  showOffline?: boolean;
};

export default function OnlineStatusDot({
  userId,
  className = "",
  live = false,
  showOffline = true,
}: OnlineStatusDotProps) {
  const { isOnline } = useOnlineStatus();
  const online = isOnline(userId);

  if (!showOffline && !online && !live) {
    return null;
  }

  return (
    <span
      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-brand-dark ${
        live
          ? "animate-pulse bg-rose-500"
          : online
            ? "bg-emerald-500"
            : "bg-slate-400"
      } ${className}`}
      aria-label={live ? "Live" : online ? "Online" : "Offline"}
    />
  );
}
