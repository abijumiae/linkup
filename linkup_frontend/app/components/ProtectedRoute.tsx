"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getToken, needsOnboarding } from "@/src/lib/auth";
import { useAuth } from "@/src/lib/AuthProvider";
import AuthLoadingScreen from "./AuthLoadingScreen";

type GuardStatus = "loading" | "authorized" | "redirecting";

const GUARD_TIMEOUT_MS = 5_000;

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [status, setStatus] = useState<GuardStatus>("loading");

  useEffect(() => {
    if (isLoading) {
      const timeout = window.setTimeout(() => {
        const token = getToken();
        const cached = getCurrentUser();
        if (token && cached) {
          setStatus("authorized");
        }
      }, GUARD_TIMEOUT_MS);

      return () => window.clearTimeout(timeout);
    }

    const token = getToken();
    const resolvedUser = user ?? getCurrentUser();

    if (!token) {
      setStatus("redirecting");
      router.replace("/login");
      return;
    }

    if (!resolvedUser) {
      setStatus("redirecting");
      router.replace("/login");
      return;
    }

    if (needsOnboarding(resolvedUser)) {
      setStatus("redirecting");
      router.replace("/onboarding");
      return;
    }

    setStatus("authorized");
  }, [isLoading, user, router]);

  if (status === "authorized") {
    return <>{children}</>;
  }

  if (status === "redirecting") {
    return <AuthLoadingScreen message="Redirecting..." />;
  }

  return <AuthLoadingScreen />;
}
