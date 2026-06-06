"use client";

import { useSocket } from "@/src/components/SocketProvider";

export default function RealtimeStatusBanner() {
  const { status, isConnected } = useSocket();

  if (isConnected) {
    return null;
  }

  return (
    <div
      className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-900 dark:text-amber-100 sm:text-sm"
      role="status"
    >
      {status === "reconnecting"
        ? "Realtime reconnecting… Live updates resume shortly. Posts and messages still save."
        : "Realtime offline. Posts and messages still work — live updates may be delayed."}
    </div>
  );
}
