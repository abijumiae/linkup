"use client";

import { useEffect } from "react";
import { getToken } from "@/src/lib/auth";
import { dispatchRealtimeFallbackSync } from "@/src/lib/realtimeFallback";
import { isSocketConnected } from "@/src/lib/socket";
import { useSocket } from "@/src/components/SocketProvider";

const FALLBACK_POLL_MS = 10_000;

export default function RealtimeFallbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!getToken()) {
      return;
    }

    if (isConnected) {
      return;
    }

    dispatchRealtimeFallbackSync();

    const intervalId = window.setInterval(() => {
      if (!getToken() || isSocketConnected()) {
        return;
      }

      dispatchRealtimeFallbackSync();
    }, FALLBACK_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [isConnected]);

  return <>{children}</>;
}
