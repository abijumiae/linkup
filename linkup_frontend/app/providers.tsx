"use client";

import { AuthProvider } from "@/src/lib/AuthProvider";
import { NotificationsProvider } from "@/src/lib/NotificationsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationsProvider>{children}</NotificationsProvider>
    </AuthProvider>
  );
}
