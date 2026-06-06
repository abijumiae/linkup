"use client";

import { useEffect, useMemo, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useSocket } from "@/src/components/SocketProvider";

/** Wait before showing any warning — silent retry happens in the background. */
const BANNER_DELAY_MS = 20_000;
const SHOW_IN_PRODUCTION = false;

export default function RealtimeStatusBanner() {
  const { status, isConnected, reconnectAttempt } = useSocket();
  const hideInProduction =
    process.env.NODE_ENV === "production" && !SHOW_IN_PRODUCTION;
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setShowBanner(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowBanner(true);
    }, BANNER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isConnected, status, reconnectAttempt]);

  const message = useMemo(() => {
    if (status === "reconnecting") {
      if (reconnectAttempt >= 3) {
        return `Reconnecting live updates (attempt ${reconnectAttempt})… Posts and messages still save.`;
      }
      return "Reconnecting live updates in the background…";
    }

    return "Syncing in the background…";
  }, [status, reconnectAttempt]);

  if (hideInProduction || isConnected || !showBanner) {
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
