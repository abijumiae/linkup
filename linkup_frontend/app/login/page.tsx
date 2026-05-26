"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/AuthProvider";
import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { login } from "@/src/lib/auth";
import AuthLoadingScreen from "../components/AuthLoadingScreen";

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">LinkUp</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Login to your premium workspace</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Access your dashboard, communities, trends, and connections with a dark experience designed for impact.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-900/70 p-4 text-right text-sm text-slate-300 shadow-xl shadow-slate-950/20">
            <p className="text-violet-300">Connect Everything</p>
            <p className="mt-2 text-slate-500">Modern, elevated, and ready for your MVP launch.</p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-8 shadow-xl shadow-slate-950/20">
            <div className="mb-8 space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-violet-300/80">Welcome back</p>
              <h2 className="text-3xl font-semibold text-white">Sign in to LinkUp</h2>
              <p className="text-sm leading-6 text-slate-400">
                Enter your credentials and jump into your personalized feed, communities, and stories.
              </p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {success ? (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {success}
                </div>
              ) : null}
              {error ? (
                <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
              <label className="block space-y-3">
                <span className="text-sm font-medium text-slate-300">Email</span>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3">
                  <Mail className="h-4 w-4 text-violet-300" />
                  <input
                    className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="you@linkup.com"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Signing in..." : "Login"}
                {!isLoading ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>
            <p className="mt-6 text-sm text-slate-400">
              New to LinkUp? <Link href="/signup" className="font-semibold text-violet-300 hover:text-violet-200">Create an account</Link>
            </p>
          </section>

          <aside className="space-y-6 rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-sky-400/5 p-8 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-6">
              <div className="inline-flex items-center gap-3 rounded-3xl bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                <Sparkles className="h-4 w-4" />
                Premium Dark Mode
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Stay productive in style</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Quickly move between feeds, stories, and communities with beautiful spacing and soft rounded surfaces.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                { title: "Fast feed", description: "Get curated updates without clutter." },
                { title: "Smart navigation", description: "Sidebar and mobile nav for every screen." },
                { title: "Community focus", description: "Show trending topics and suggested people." },
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

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen message="Loading sign in..." />}>
      <LoginForm />
    </Suspense>
  );
}
