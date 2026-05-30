"use client";

import { useEffect, useState } from "react";
import { apiRequest, getApiBaseUrl } from "@/src/lib/api";

export default function GoogleSignInButton() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkGoogleAuth() {
      try {
        const data = await apiRequest<{ enabled: boolean }>("/auth/google/status");
        if (!cancelled) {
          setEnabled(data.enabled);
        }
      } catch {
        if (!cancelled) {
          setEnabled(false);
        }
      }
    }

    void checkGoogleAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleGoogleSignIn() {
    if (!enabled) {
      setError("Google sign-in is not available on this server yet.");
      return;
    }

    setError(null);
    window.location.href = `${getApiBaseUrl()}/auth/google`;
  }

  if (enabled === null) {
    return (
      <div
        aria-hidden
        className="h-11 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5"
      />
    );
  }

  if (!enabled) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        Google sign-in requires server configuration. Use email signup or login.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 ease-out hover:bg-slate-50 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-100 dark:hover:bg-white/10"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]">
          G
        </span>
        Continue with Google
      </button>
      {error ? (
        <p className="text-center text-xs text-red-600 dark:text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
