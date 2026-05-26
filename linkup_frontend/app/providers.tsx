"use client";

import { AuthProvider } from "@/src/lib/AuthProvider";
import { NotificationsProvider } from "@/src/lib/NotificationsContext";
import { ThemeProvider } from "@/src/lib/ThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>{children}</NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
