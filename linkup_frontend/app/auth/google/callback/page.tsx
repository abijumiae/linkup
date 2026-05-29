"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/lib/AuthProvider";
import { fetchMe, setAuth } from "@/src/lib/auth";
import AuthLoadingScreen from "../../../components/AuthLoadingScreen";

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      const token = searchParams.get("token");

      if (!token) {
        if (!cancelled) {
          setError("Google sign-in failed. Please try again.");
        }
        return;
      }

      localStorage.setItem("linkup_access_token", token);

      try {
        const user = await fetchMe();

        if (!user) {
          throw new Error("Unable to load user");
        }

        setAuth(token, user);
        setUser(user);

        if (!cancelled) {
          router.replace(user.isOnboarded ? "/home" : "/onboarding");
        }
      } catch {
        localStorage.removeItem("linkup_access_token");
        localStorage.removeItem("linkup_user");
        if (!cancelled) {
          setError("Unable to complete Google sign-in.");
        }
      }
    }

    void handleCallback();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, setUser]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="linkup-panel max-w-md p-8 text-center">
          <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="linkup-btn-primary mt-4"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return <AuthLoadingScreen message="Completing Google sign-in..." />;
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen message="Completing Google sign-in..." />}>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
