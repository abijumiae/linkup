"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/AuthProvider";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { login } from "@/src/lib/auth";
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
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const { user } = await login(email.trim(), password);
      setUser(user);
      router.push("/home");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-violet-50 px-4 py-10 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-14rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-violet-500/20 via-fuchsia-500/10 to-sky-500/20 blur-3xl dark:from-violet-400/20 dark:via-fuchsia-400/10 dark:to-sky-400/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-18rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-sky-500/10 via-violet-500/10 to-transparent blur-3xl dark:from-sky-400/10 dark:via-violet-400/10"
      />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/85 p-7 text-slate-900 shadow-xl shadow-slate-950/10 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-slate-950/50 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent dark:via-violet-400/40"
        />
        <div className="mb-6 flex justify-center">
          <img
            src="/brand/logo-lockup.png"
            alt="LinkUp"
            className="h-auto w-full max-w-[180px] object-contain sm:max-w-[220px]"
          />
        </div>

        {/* Heading */}
        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Login to LinkUp</h1>
        <p className="mb-7 text-center text-sm text-slate-600 dark:text-slate-300">
          Welcome back. Continue to your social workspace.
        </p>

        {/* Messages */}
        {success && (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Email</span>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
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
            <div className="relative flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
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
                className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Link */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          New to LinkUp?{" "}
          <Link href="/signup" className="font-semibold text-violet-600 transition hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300">
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
