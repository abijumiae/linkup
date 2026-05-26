"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/AuthProvider";
import { Lock, Mail } from "lucide-react";
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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl shadow-slate-950/10 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-slate-950/50">
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">LinkUp</p>
        </div>

        {/* Heading */}
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-950 dark:text-white">Login to LinkUp</h1>
        <p className="mb-8 text-center text-sm text-slate-600 dark:text-slate-300">Welcome back. Sign in to continue.</p>

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
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Link */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          New to LinkUp?{" "}
          <Link href="/signup" className="font-semibold text-violet-400 hover:text-violet-300 transition">
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
