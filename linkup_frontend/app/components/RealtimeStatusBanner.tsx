"use client";

import { useMemo } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useSocket } from "@/src/components/SocketProvider";

export default function RealtimeStatusBanner() {
  const { status, isConnected, reconnectAttempt } = useSocket();

  const message = useMemo(() => {
    if (status === "reconnecting") {
      if (reconnectAttempt > 0) {
        return `Reconnecting live updates (attempt ${reconnectAttempt})… Your posts and messages still save.`;
      }
      return "Connecting live updates… Your posts and messages still save.";
    }

    return "Live updates paused. Posts and messages still work — refresh if this persists.";
  }, [status, reconnectAttempt]);

  if (isConnected) {
    return null;
  }

  const Icon = status === "reconnecting" ? Wifi : WifiOff;

  return (
    <div
      className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-900 dark:text-amber-100 sm:text-sm"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
        <span>{message}</span>
      </span>
    </div>
  );
}
