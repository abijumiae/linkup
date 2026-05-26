import Link from "next/link";
import { ArrowRight, Grid, Sparkles, Users } from "lucide-react";
import { landingFeatures, landingMetrics } from "./data/linkupData";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl sm:p-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-br from-violet-500/20 via-transparent to-sky-400/10 opacity-80 blur-3xl" />
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-white/5 px-4 py-2 text-sm text-violet-200">
                <Sparkles className="h-4 w-4 text-violet-300" />
                Built for ambitious communities
              </span>
              <div className="space-y-6">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                  LinkUp
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-sky-300 to-cyan-200">
                    Connect Everything
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Create a modern social destination with premium dark mode, responsive cards,
                  curated communities, and a feed experience built for every device.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400"
                >
                  Start building
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/home"
                  className="inline-flex items-center justify-center rounded-full border border-slate-600/70 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500/90 hover:bg-white/5"
                >
                  Explore Dashboard
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {landingMetrics.map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                    <p className="text-3xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 shadow-xl shadow-slate-950/40">
              <div className="space-y-6">
                <div className="rounded-3xl bg-gradient-to-r from-violet-500/15 via-sky-500/10 to-cyan-300/10 p-6">
                  <p className="text-sm uppercase tracking-[0.3em] text-violet-300">LinkUp</p>
                  <h2 className="mt-4 text-3xl font-semibold text-white">Own every connection</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Launch your MVP with a premium dashboard, shared stories, and a feed that feels modern
                    from the first impression.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {landingFeatures.map((feature) => (
                    <div
                      key={feature.title}
                      className="rounded-3xl border border-white/10 bg-slate-950/80 p-5"
                    >
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                        <Grid className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-3xl border border-violet-500/10 bg-violet-500/5 p-5 text-sm text-slate-300">
                  <p className="font-medium text-violet-200">Premium design, zero backend lock-in.</p>
                  <p className="mt-2 text-slate-400">
                    LinkUp is built to feel high-end and polished while staying easy to extend and launch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-6">
            <h2 className="text-lg font-semibold text-white">Designed for creators</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Premium layouts, soft shadows, and a dark/purple gradient palette that reads beautifully on any
              display.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-6">
            <h2 className="text-lg font-semibold text-white">Responsive everywhere</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              From mobile navigation to desktop dashboards, LinkUp scales seamlessly across breakpoints.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-6">
            <h2 className="text-lg font-semibold text-white">Launch your MVP</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              No backend required yet. Use these pages to present a polished product concept or investor demo.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
