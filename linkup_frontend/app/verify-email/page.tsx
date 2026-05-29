"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { resendVerificationEmail, verifyEmail } from "@/src/lib/auth";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { ThemeToggle } from "../components/ThemeToggle";

const PENDING_EMAIL_KEY = "linkup_pending_email";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const queryEmail = searchParams.get("email");
    const storedEmail =
      typeof window !== "undefined"
        ? sessionStorage.getItem(PENDING_EMAIL_KEY)
        : null;

    setEmail(queryEmail ?? storedEmail ?? "");
  }, [searchParams]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsVerifying(true);

    try {
      const result = await verifyEmail(email.trim(), code.trim());
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
      setSuccess(result.message);
      setTimeout(() => {
        router.push("/login?verified=1");
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to verify email. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsResending(true);

    try {
      const result = await resendVerificationEmail(email.trim());
      sessionStorage.setItem(PENDING_EMAIL_KEY, email.trim());
      setSuccess(result.message);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to resend verification email.");
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-violet-50 px-4 py-10 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="linkup-panel relative w-full max-w-md p-7 sm:p-8">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-sky-500/10 text-violet-600 dark:text-violet-300">
            <ShieldCheck className="h-7 w-7" />
          </div>
        </div>

        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Verify your email
        </h1>
        <p className="mb-7 mt-2 text-center text-sm text-slate-600 dark:text-slate-300">
          We sent a verification code to your email. Enter it below to activate
          your LinkUp account.
        </p>

        {success ? (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-200">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleVerify}>
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
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isVerifying || isResending}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Verification code
            </span>
            <input
              className="linkup-input-shell w-full px-4 py-3 text-center text-lg tracking-[0.35em] text-slate-900 outline-none dark:text-white"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              disabled={isVerifying || isResending}
            />
          </label>

          <button
            type="submit"
            disabled={isVerifying || isResending}
            className="linkup-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isVerifying ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={isVerifying || isResending}
          className="linkup-btn-secondary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResending ? "Sending..." : "Resend verification email"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already verified?{" "}
          <Link
            href="/login"
            className="font-semibold text-violet-600 transition hover:text-violet-500 dark:text-violet-400"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen message="Loading verification..." />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
