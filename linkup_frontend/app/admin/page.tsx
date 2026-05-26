// Development preview only. Later this route will require ADMIN role via backend auth.
import AdminStatCard from "../components/AdminStatCard";
import AdminTable from "../components/AdminTable";
import { ShieldCheck, Sparkles, Users, Zap } from "lucide-react";

const stats = [
  { label: "Total users", value: "24,800", detail: "+320 today" },
  { label: "New users today", value: "320", detail: "Organic growth" },
  { label: "Total posts", value: "86,200", detail: "Active feeds" },
  { label: "Reports pending", value: "18", detail: "Needs review" },
  { label: "Active groups", value: "1,240", detail: "Community spaces" },
  { label: "Marketplace listings", value: "2,180", detail: "Live offers" },
  { label: "Jobs posted", value: "540", detail: "Open roles" },
  { label: "Events created", value: "140", detail: "Upcoming sessions" },
];

const recentReports = [
  ["User report", "@neal.reyes", "Spam content", "2h ago"],
  ["Event issue", "@mila", "Inappropriate description", "4h ago"],
  ["Marketplace review", "@nova", "False listing details", "6h ago"],
];

const recentUsers = [
  ["Avery Lane", "Creator", "Verified", "Joined 1h ago"],
  ["Milo Chen", "Growth", "Pending", "Joined 2h ago"],
  ["Rae Walker", "Curator", "Verified", "Joined 5h ago"],
];

const sidebarLinks = [
  { label: "Overview" },
  { label: "Users" },
  { label: "Reports" },
  { label: "Marketplace" },
  { label: "Events" },
  { label: "Jobs" },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">Admin</p>
              <h1 className="mt-3 text-2xl font-semibold text-white">Dashboard</h1>
              <p className="mt-3 text-sm text-slate-400">Manage users, reports, listings, events, and platform health.</p>
            </div>
            <div className="space-y-3">
              {sidebarLinks.map((item) => (
                <button key={item.label} className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/5">
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <main className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-2">
              {stats.slice(0, 4).map((stat) => (
                <AdminStatCard key={stat.label} {...stat} />
              ))}
            </section>
            <section className="grid gap-6 xl:grid-cols-4">
              {stats.slice(4).map((stat) => (
                <AdminStatCard key={stat.label} {...stat} />
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">Recent reports</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Action required</h2>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                    <ShieldCheck className="h-4 w-4 text-violet-300" />
                    Review all
                  </button>
                </div>
                <div className="mt-6">
                  <AdminTable headers={["Type", "Reported by", "Issue", "Time"]} rows={recentReports} actions />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">Users</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Recent signups</h2>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                    <Users className="h-4 w-4 text-violet-300" />
                    Manage
                  </button>
                </div>
                <div className="mt-6">
                  <AdminTable headers={["Name", "Role", "Status", "Joined"]} rows={recentUsers} actions />
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
