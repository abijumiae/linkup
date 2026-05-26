"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/AuthProvider";
import { Globe, Lock, Mail, User } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { AccountType, signup } from "@/src/lib/auth";
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
  const [accountType, setAccountType] = useState<AccountType>("PERSONAL");
  const [country, setCountry] = useState("UAE");
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signup({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        accountType,
        country: country.trim() || undefined,
        language: language.trim() || "en",
      });
      router.push("/login?registered=1");
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
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-950 dark:text-white">Create your LinkUp account</h1>
        <p className="mb-8 text-center text-sm text-slate-600 dark:text-slate-300">Join our community and connect with others.</p>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
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
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Create a secure password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isLoading}
              />
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
                <option value="PERSONAL">Personal</option>
                <option value="CREATOR">Creator</option>
                <option value="BUSINESS">Business</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Country</span>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
                <Globe className="h-4 w-4 text-slate-500" />
                <input
                  className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                  placeholder="UAE"
                  type="text"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  disabled={isLoading}
                />
              </div>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">Language</span>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-violet-400/60 dark:border-white/10 dark:bg-slate-950/70 dark:focus-within:border-violet-400/50">
              <Globe className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                placeholder="en"
                type="text"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                disabled={isLoading}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {/* Link */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-violet-400 hover:text-violet-300 transition">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
