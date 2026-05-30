"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, needsOnboarding } from "@/src/lib/auth";
import { useAuth } from "@/src/lib/AuthProvider";
import AuthLoadingScreen from "./AuthLoadingScreen";

type GuardStatus = "loading" | "authorized" | "redirecting";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [status, setStatus] = useState<GuardStatus>("loading");

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const token = getToken();

    if (!token) {
      setStatus("redirecting");
      router.replace("/login");
      return;
    }

    if (!user) {
      logout();
      setStatus("redirecting");
      router.replace("/login");
      return;
    }

    if (needsOnboarding(user)) {
      setStatus("redirecting");
      router.replace("/onboarding");
      return;
    }

    setStatus("authorized");
  }, [isLoading, user, router, logout]);

  if (status === "authorized") {
    return <>{children}</>;
  }

  if (status === "redirecting") {
    return <AuthLoadingScreen message="Redirecting..." />;
  }

  return <AuthLoadingScreen />;
}
