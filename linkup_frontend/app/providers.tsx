"use client";

import { useEffect } from "react";
import { startBackendWarmup, stopBackendWarmup } from "@/src/lib/backendWarmup";
import { AuthProvider } from "@/src/lib/AuthProvider";
import { NotificationsProvider } from "@/src/lib/NotificationsContext";
import { ThemeProvider } from "@/src/lib/ThemeProvider";
import { SocketProvider } from "@/src/components/SocketProvider";
import RealtimeFallbackProvider from "@/src/components/RealtimeFallbackProvider";
import { OnlinePresenceProvider } from "@/src/lib/OnlinePresenceProvider";
import { ActiveChatProvider } from "@/src/lib/ActiveChatContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    startBackendWarmup();
    return () => stopBackendWarmup();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <RealtimeFallbackProvider>
            <OnlinePresenceProvider>
              <ActiveChatProvider>
                <NotificationsProvider>{children}</NotificationsProvider>
              </ActiveChatProvider>
            </OnlinePresenceProvider>
          </RealtimeFallbackProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
