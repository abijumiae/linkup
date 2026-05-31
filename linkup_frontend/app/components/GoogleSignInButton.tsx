"use client";

import { useEffect, useState } from "react";
import { apiRequest, getApiBaseUrl } from "@/src/lib/api";

/**
 * Renders Google sign-in only when the backend reports OAuth is configured.
 * Returns null otherwise (no warning, no placeholder).
 */
export default function GoogleSignInButton() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

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

  if (enabled !== true) {
    return null;
  }

  function handleGoogleSignIn() {
    window.location.href = `${getApiBaseUrl()}/auth/google`;
  }

  return (
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
  );
}
