"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { resetPassword } from "@/src/lib/auth";
import { ThemeToggle } from "../components/ThemeToggle";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Reset link is invalid. Request a new one.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await resetPassword(token, password);
      setMessage(result.message);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not reset password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="linkup-auth-shell">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="linkup-panel w-full max-w-md p-6 sm:p-8">
        <p className="linkup-eyebrow">Account</p>
        <h1 className="linkup-title mt-2">Reset password</h1>
        <p className="linkup-subtitle">Choose a new password for your account.</p>

        {message ? (
          <div className="linkup-alert-success mt-6">
            {message}{" "}
            <Link href="/login" className="font-semibold underline">
              Sign in
            </Link>
          </div>
        ) : null}
        {error ? <div className="linkup-alert-error mt-6">{error}</div> : null}

        {!message ? (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                New password
              </span>
              <div className="linkup-input-shell">
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  className="linkup-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Confirm password
              </span>
              <div className="linkup-input-shell">
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  className="linkup-input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={loading || !token}
              className="linkup-btn-primary w-full min-h-[44px]"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link
            href="/forgot-password"
            className="font-semibold text-brand-primary dark:text-brand-secondary"
          >
            Request a new link
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="linkup-auth-shell">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
