"use client";

import { AuthProvider } from "@/src/lib/AuthProvider";
import { NotificationsProvider } from "@/src/lib/NotificationsContext";
import { ThemeProvider } from "@/src/lib/ThemeProvider";
import { SocketProvider } from "@/src/components/SocketProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
