"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Globe, Lock, Mail, Sparkles, User } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { AccountType, signup } from "@/src/lib/auth";

export default function SignupPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">LinkUp</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Create your LinkUp account</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Start your premium social feed demo and connect with friends, communities, and trending topics.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-900/70 p-4 text-right text-sm text-slate-300 shadow-xl shadow-slate-950/20">
            <p className="text-violet-300">Original branding</p>
            <p className="mt-2 text-slate-500">Clean, bold, and crafted for first impressions.</p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-8 shadow-xl shadow-slate-950/20">
            <div className="mb-8 space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-violet-300/80">New account</p>
              <h2 className="text-3xl font-semibold text-white">Join LinkUp</h2>
              <p className="text-sm leading-6 text-slate-400">
                Complete the form below and sign in to access your home dashboard.
              </p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error ? (
                <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
              <label className="block space-y-3">
                <span className="text-sm font-medium text-slate-300">Full name</span>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
                  <User className="h-4 w-4 text-violet-300" />
                  <input
                    className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="Sam Wilder"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </label>
              <label className="block space-y-3">
                <span className="text-sm font-medium text-slate-300">Username</span>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
                  <User className="h-4 w-4 text-violet-300" />
                  <input
                    className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="samwilder"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </label>
              <label className="block space-y-3">
                <span className="text-sm font-medium text-slate-300">Email address</span>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
                  <Mail className="h-4 w-4 text-violet-300" />
                  <input
                    className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="sam@linkup.com"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </label>
              <label className="block space-y-3">
                <span className="text-sm font-medium text-slate-300">Password</span>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
                  <Lock className="h-4 w-4 text-violet-300" />
                  <input
                    className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
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
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block space-y-3">
                  <span className="text-sm font-medium text-slate-300">Account type</span>
                  <select
                    className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none"
                    value={accountType}
                    onChange={(event) => setAccountType(event.target.value as AccountType)}
                    disabled={isLoading}
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="CREATOR">Creator</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </label>
                <label className="block space-y-3">
                  <span className="text-sm font-medium text-slate-300">Country</span>
                  <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
                    <Globe className="h-4 w-4 text-violet-300" />
                    <input
                      className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                      placeholder="UAE"
                      type="text"
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </label>
              </div>
              <label className="block space-y-3">
                <span className="text-sm font-medium text-slate-300">Language</span>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
                  <Globe className="h-4 w-4 text-violet-300" />
                  <input
                    className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Creating account..." : "Create account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-6 text-sm text-slate-400">
              Already have an account? <Link href="/login" className="font-semibold text-violet-300 hover:text-violet-200">Login</Link>
            </p>
          </section>

          <aside className="space-y-6 rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-sky-400/5 p-8 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-6">
              <div className="inline-flex items-center gap-3 rounded-3xl bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                <Sparkles className="h-4 w-4" />
                Premium onboarding
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Your launch-ready MVP</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Build confidence with a polished login flow, responsive dashboard, and modern visual system.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                { title: "Soft rounded cards", description: "Easy to read and touch-friendly on mobile." },
                { title: "Gradient accents", description: "Purple and blue tones with premium depth." },
                { title: "Solid spacing", description: "Clean layouts that feel composed." },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
