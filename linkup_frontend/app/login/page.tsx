"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/AuthProvider";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { getPostLoginPath, login } from "@/src/lib/auth";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { ThemeToggle } from "../components/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/home");
    }
  }, [isAuthenticated, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setSuccess("Account created successfully. Sign in to continue.");
    }
    if (searchParams.get("verified") === "1") {
      setSuccess("Email verified successfully. You can now sign in.");
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const { user } = await login(email.trim(), password);
      setUser(user);
      router.push(getPostLoginPath(user));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (
          err.status === 403 &&
          err.message.toLowerCase().includes("verify your email")
        ) {
          sessionStorage.setItem("linkup_pending_email", email.trim());
        }
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="linkup-auth-shell bg-gradient-to-br from-slate-50 via-white to-brand-primary/5 text-slate-900 dark:from-brand-dark dark:via-brand-dark dark:to-brand-dark dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-14rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-brand-primary/20 via-brand-primary/10 to-brand-secondary/20 blur-3xl dark:from-brand-primary/20 dark:via-brand-primary/10 dark:to-brand-secondary/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-18rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-brand-secondary/10 via-brand-primary/10 to-transparent blur-3xl dark:from-brand-secondary/10 dark:via-brand-primary/10"
      />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="linkup-panel relative w-full max-w-md p-7 text-slate-900 dark:text-white sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent dark:via-brand-primary/40"
        />
        <div className="mb-6 flex justify-center">
          <img
            src="/brand/logo-transparent.png"
            alt="LinkUp"
            className="h-auto max-w-[180px] object-contain"
          />
        </div>

        {/* Heading */}
        <h1 className="text-center text-2xl font-semibold tracking-tight text-brand-text dark:text-brand-light">Login to LinkUp</h1>
        <p className="mb-7 text-center text-sm text-slate-600 dark:text-slate-300">
          Welcome back. Continue to your social workspace.
        </p>

        {/* Messages */}
        {success && (
          <div className="linkup-alert-success mb-6">{success}</div>
        )}
        {error && (
          <div className="linkup-alert-error mb-6">
            {error}
            {error.toLowerCase().includes("verify your email") ? (
              <p className="mt-2">
                <Link
                  href={`/verify-email?email=${encodeURIComponent(email.trim())}`}
                  className="font-semibold text-brand-primary underline dark:text-brand-secondary"
                >
                  Go to email verification
                </Link>
              </p>
            ) : null}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Email</span>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark/70 dark:focus-within:border-brand-primary/50">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Password</span>
            <div className="relative flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark/70 dark:focus-within:border-brand-primary/50">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent pr-10 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                disabled={isLoading}
                className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="linkup-btn-primary w-full min-h-[44px] py-3"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Link */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          New to LinkUp?{" "}
          <Link href="/signup" className="font-semibold text-brand-primary transition hover:text-brand-primary dark:text-brand-secondary dark:hover:text-brand-secondary">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen message="Loading sign in..." />}>
      <LoginForm />
    </Suspense>
  );
}
