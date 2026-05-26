"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe, getToken } from "@/src/lib/auth";
import { useAuth } from "@/src/lib/AuthProvider";
import AuthLoadingScreen from "./AuthLoadingScreen";

type GuardStatus = "loading" | "authorized" | "redirecting";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser, logout } = useAuth();
  const [status, setStatus] = useState<GuardStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const token = getToken();

      if (!token) {
        if (!cancelled) {
          setStatus("redirecting");
          router.replace("/login");
        }
        return;
      }

      const user = await fetchMe();

      if (cancelled) {
        return;
      }

      if (!user) {
        logout();
        setStatus("redirecting");
        router.replace("/login");
        return;
      }

      setUser(user);
      setStatus("authorized");
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [router, setUser, logout]);

  if (status === "authorized") {
    return <>{children}</>;
  }

  if (status === "redirecting") {
    return <AuthLoadingScreen message="Redirecting to sign in..." />;
  }

  return <AuthLoadingScreen />;
}
