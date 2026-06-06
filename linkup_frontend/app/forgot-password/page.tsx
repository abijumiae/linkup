"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { requestPasswordReset } from "@/src/lib/auth";
import { ThemeToggle } from "../components/ThemeToggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestPasswordReset(email.trim());
      setMessage(result.message);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not send reset link. Please try again.",
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
        <h1 className="linkup-title mt-2">Forgot password</h1>
        <p className="linkup-subtitle">
          Enter your email and we&apos;ll send a reset link if an account
          exists.
        </p>

        {message ? (
          <div className="linkup-alert-success mt-6">{message}</div>
        ) : null}
        {error ? <div className="linkup-alert-error mt-6">{error}</div> : null}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Email
            </span>
            <div className="linkup-input-shell">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                className="linkup-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="linkup-btn-primary w-full min-h-[44px]"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link href="/login" className="font-semibold text-brand-primary dark:text-brand-secondary">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
