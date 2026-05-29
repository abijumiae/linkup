"use client";

import { AuthProvider } from "@/src/lib/AuthProvider";
import { NotificationsProvider } from "@/src/lib/NotificationsContext";
import { ThemeProvider } from "@/src/lib/ThemeProvider";
import { SocketProvider } from "@/src/components/SocketProvider";
import { ActiveChatProvider } from "@/src/lib/ActiveChatContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ActiveChatProvider>
            <NotificationsProvider>{children}</NotificationsProvider>
          </ActiveChatProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
