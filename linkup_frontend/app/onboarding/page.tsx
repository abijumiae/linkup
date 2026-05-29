"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, User } from "lucide-react";
import { useAuth } from "@/src/lib/AuthProvider";
import { ApiError } from "@/src/lib/api";
import {
  AccountType,
  completeOnboarding,
  fetchMe,
  getToken,
  needsOnboarding,
} from "@/src/lib/auth";
import Link from "next/link";
import {
  ACCOUNT_TYPES,
  COUNTRIES,
  LANGUAGES,
} from "@/src/lib/profileOptions";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import { ThemeToggle } from "../components/ThemeToggle";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("PERSONAL");
  const [country, setCountry] = useState("United Arab Emirates");
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      const currentUser = user ?? (await fetchMe());

      if (cancelled) {
        return;
      }

      if (!currentUser) {
        router.replace("/login");
        return;
      }

      if (!needsOnboarding(currentUser)) {
        router.replace("/home");
        return;
      }

      setUser(currentUser);
      setCheckingSession(false);
    }

    if (!isLoading) {
      void verifyAccess();
    }

    return () => {
      cancelled = true;
    };
  }, [isLoading, router, setUser, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const updatedUser = await completeOnboarding({
        username: username.trim(),
        accountType,
        country: country.trim(),
        language,
      });
      setUser(updatedUser);
      router.replace("/home");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404 || err.status === 501) {
          setError(
            "Onboarding is being prepared. Please login again or continue to your workspace.",
          );
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error && err.message === "Not authenticated") {
        router.replace("/login");
      } else {
        setError("Unable to complete onboarding. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || checkingSession) {
    return <AuthLoadingScreen message="Loading onboarding..." />;
  }

  return (
    <div className="linkup-auth-shell linkup-page">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="linkup-panel w-full max-w-lg p-7 sm:p-8">
        <p className="linkup-eyebrow">LinkUp</p>
        <h1 className="linkup-title mt-3">Complete your LinkUp Card</h1>
        <p className="linkup-subtitle">
          Your Google account is connected. Add a few details to personalize
          your LinkUp workspace.
        </p>

        {user?.avatarUrl ? (
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-brand-dark/50">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-14 w-14 rounded-2xl object-cover"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {user.name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {user.email}
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="linkup-alert-error mt-6">
            {error}
            {error.includes("Onboarding is being prepared") ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/login" className="font-semibold text-brand-primary underline dark:text-brand-secondary">
                  Go to login
                </Link>
                <Link href="/home" className="font-semibold text-brand-primary underline dark:text-brand-secondary">
                  Continue to workspace
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="linkup-label">Username</span>
            <div className="linkup-input-shell">
              <User className="h-4 w-4 text-slate-500" />
              <input
                className="linkup-input"
                placeholder="yourname"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="linkup-label">Account type</span>
            <select
              className="linkup-input-shell w-full text-sm text-slate-900 dark:text-slate-100"
              value={accountType}
              onChange={(event) =>
                setAccountType(event.target.value as AccountType)
              }
              disabled={isSubmitting}
            >
              {ACCOUNT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="linkup-label">Country</span>
            <div className="linkup-input-shell">
              <Globe className="h-4 w-4 text-slate-500" />
              <select
                className="linkup-input"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                disabled={isSubmitting}
              >
                {COUNTRIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="block space-y-2">
            <span className="linkup-label">Language</span>
            <select
              className="linkup-input-shell w-full text-sm text-slate-900 dark:text-slate-100"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              disabled={isSubmitting}
            >
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="linkup-btn-primary w-full min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Continue to LinkUp"}
          </button>
        </form>
      </div>
    </div>
  );
}
