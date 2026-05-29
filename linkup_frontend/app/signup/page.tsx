"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/AuthProvider";
import { Eye, EyeOff, Globe, Lock, Mail, User } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { AccountType, signup } from "@/src/lib/auth";
import { ACCOUNT_TYPES, COUNTRIES } from "@/src/lib/profileOptions";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { ThemeToggle } from "../components/ThemeToggle";

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/home");
    }
  }, [isAuthenticated, router]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("PERSONAL");
  const [country, setCountry] = useState("United Arab Emirates");
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signup({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        accountType,
        country: country.trim() || undefined,
        language: language.trim() || "en",
      });
      sessionStorage.setItem("linkup_pending_email", email.trim());
      router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="linkup-auth-shell bg-gradient-to-br from-slate-50 via-white to-violet-50 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white">
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
      <div className="linkup-panel relative w-full max-w-md p-7 text-slate-900 dark:text-white sm:max-w-lg sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent dark:via-violet-400/40"
        />
        <div className="mb-6 flex justify-center">
          <img
            src="/brand/logo-transparent.png"
            alt="LinkUp"
            className="h-auto max-w-[180px] object-contain"
          />
        </div>

        {/* Heading */}
        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Create your LinkUp account</h1>
        <p className="mb-7 text-center text-sm text-slate-600 dark:text-slate-300">
          Set up your profile and start collaborating in minutes.
        </p>

        {/* Error Message */}
        {error && (
          <div className="linkup-alert-error mb-6">{error}</div>
        )}

        {/* Google + Form */}
        <div className="space-y-4">
          <GoogleSignInButton />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-xs uppercase tracking-wide text-slate-500">
              or
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Full name</span>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
              <User className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Sam Wilder"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Username</span>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
              <User className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                placeholder="samwilder"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </label>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Email</span>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                placeholder="sam@example.com"
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
                placeholder="Create a secure password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
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

          {/* Two Column Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Account type</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:focus:border-violet-400/50"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value as AccountType)}
                disabled={isLoading}
              >
                {ACCOUNT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Country</span>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
                <Globe className="h-4 w-4 text-slate-500" />
                <select
                  className="w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  disabled={isLoading}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Language</span>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
              <Globe className="h-4 w-4 text-slate-500" />
              <select
                className="w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                disabled={isLoading}
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
                <option value="ur">Urdu</option>
              </select>
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="linkup-btn-primary mt-2 w-full min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>
        </div>

        {/* Link */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-violet-600 transition hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
