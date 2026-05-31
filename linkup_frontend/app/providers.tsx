"use client";

import { AuthProvider } from "@/src/lib/AuthProvider";
import { NotificationsProvider } from "@/src/lib/NotificationsContext";
import { ThemeProvider } from "@/src/lib/ThemeProvider";
import { SocketProvider } from "@/src/components/SocketProvider";
import { OnlinePresenceProvider } from "@/src/lib/OnlinePresenceProvider";
import { ActiveChatProvider } from "@/src/lib/ActiveChatContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <OnlinePresenceProvider>
            <ActiveChatProvider>
              <NotificationsProvider>{children}</NotificationsProvider>
            </ActiveChatProvider>
          </OnlinePresenceProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
