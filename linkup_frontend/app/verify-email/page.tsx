"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { CheckCircle2, Mail, ShieldCheck, XCircle } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  resendVerificationEmail,
  verifyEmail,
  verifyEmailByToken,
} from "@/src/lib/auth";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { ThemeToggle } from "../components/ThemeToggle";

const PENDING_EMAIL_KEY = "linkup_pending_email";

type VerifyState = "idle" | "verifying" | "success" | "expired" | "invalid";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const queryEmail = searchParams.get("email");
  const justSignedUp = searchParams.get("sent") === "1";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [tokenState, setTokenState] = useState<VerifyState>("idle");

  useEffect(() => {
    const storedEmail =
      typeof window !== "undefined"
        ? sessionStorage.getItem(PENDING_EMAIL_KEY)
        : null;

    setEmail(queryEmail ?? storedEmail ?? "");
  }, [queryEmail]);

  useEffect(() => {
    if (!token?.trim()) {
      return;
    }

    let cancelled = false;
    setTokenState("verifying");
    setError(null);

    void verifyEmailByToken(token.trim())
      .then((result) => {
        if (cancelled) {
          return;
        }
        sessionStorage.removeItem(PENDING_EMAIL_KEY);
        setEmail(result.email);
        setSuccess(result.message);
        setTokenState("success");
        setTimeout(() => {
          router.push("/login?verified=1");
        }, 1800);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof ApiError
            ? err.message
            : "Unable to verify email. Please try again.";
        setError(message);
        if (message.toLowerCase().includes("expired")) {
          setTokenState("expired");
        } else {
          setTokenState("invalid");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsVerifying(true);

    try {
      const result = await verifyEmail(email.trim(), code.trim());
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
      setSuccess(result.message);
      setTokenState("success");
      setTimeout(() => {
        router.push("/login?verified=1");
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.message.toLowerCase().includes("expired")) {
          setTokenState("expired");
        }
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
      setTokenState("idle");
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

  if (token && tokenState === "verifying") {
    return (
      <div className="linkup-auth-shell">
        <AuthLoadingScreen message="Verifying your email…" />
      </div>
    );
  }

  if (tokenState === "success" && success) {
    return (
      <div className="linkup-auth-shell">
        <div className="linkup-panel w-full max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            Email verified
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {success}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-auth-shell bg-gradient-to-br from-slate-50 via-white to-brand-primary/5 text-slate-900 dark:from-brand-dark dark:via-brand-dark dark:to-brand-dark dark:text-white">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="linkup-panel relative w-full max-w-md p-7 sm:p-8">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/15 to-brand-secondary/10 text-brand-primary dark:text-brand-secondary">
            {tokenState === "expired" || tokenState === "invalid" ? (
              <XCircle className="h-7 w-7 text-rose-500" />
            ) : (
              <ShieldCheck className="h-7 w-7" />
            )}
          </div>
        </div>

        <h1 className="text-center text-2xl font-semibold tracking-tight text-brand-text dark:text-brand-light">
          {tokenState === "expired"
            ? "Link expired"
            : tokenState === "invalid"
              ? "Invalid link"
              : "Verify your email"}
        </h1>
        <p className="mb-7 mt-2 text-center text-sm text-slate-600 dark:text-slate-300">
          {justSignedUp
            ? "Account created. Please check your email to verify your account."
            : tokenState === "expired"
              ? "Your verification link has expired. Request a new one below."
              : tokenState === "invalid"
                ? "This verification link is invalid or was already used."
                : "We sent a verification link to your email. Click the link or enter the 6-digit code below."}
        </p>

        {success ? (
          <div className="linkup-alert-success mb-6">{success}</div>
        ) : null}
        {error ? (
          <div className="linkup-alert-error mb-6">{error}</div>
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
              Verification code (optional)
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
              disabled={isVerifying || isResending}
            />
          </label>

          <button
            type="submit"
            disabled={isVerifying || isResending || code.length !== 6}
            className="linkup-btn-primary w-full min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isVerifying ? "Verifying…" : "Verify with code"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={isVerifying || isResending}
          className="linkup-btn-secondary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResending ? "Sending…" : "Resend verification email"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already verified?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-primary transition hover:text-brand-primary dark:text-brand-secondary"
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
    <Suspense fallback={<AuthLoadingScreen message="Loading verification…" />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
