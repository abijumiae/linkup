"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { getApiBaseUrl } from "@/src/lib/api";
import { getCurrentUser, getToken } from "@/src/lib/auth";
import AdminStatCard from "../components/AdminStatCard";
import AdminTable from "../components/AdminTable";

type AdminStats = {
  users: number;
  posts: number;
  openReports: number;
};

type AdminReport = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
};

const sidebarLinks = ["Overview", "Reports", "Users", "Moderation"];

export default function AdminPage() {
  const router = useRouter();
  const user = getCurrentUser();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
      setDenied(true);
      setLoading(false);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadAdminData() {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const base = getApiBaseUrl();
        const [statsRes, reportsRes] = await Promise.all([
          fetch(`${base}/admin/stats`, { headers }),
          fetch(`${base}/admin/reports`, { headers }),
        ]);

        if (statsRes.status === 403 || reportsRes.status === 403) {
          setDenied(true);
          return;
        }

        if (statsRes.ok) {
          setStats((await statsRes.json()) as AdminStats);
        }

        if (reportsRes.ok) {
          setReports((await reportsRes.json()) as AdminReport[]);
        }
      } catch {
        // Show placeholder dashboard on API failure.
      } finally {
        setLoading(false);
      }
    }

    void loadAdminData();
  }, [router, user]);

  if (denied) {
    return (
      <div className="linkup-container flex min-h-[60vh] items-center justify-center">
        <div className="linkup-panel max-w-md p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-brand-primary dark:text-brand-secondary" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            Admin access required
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            This area is restricted to LinkUp administrators.
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total users", value: stats ? String(stats.users) : "—", detail: "Platform members" },
    { label: "Total posts", value: stats ? String(stats.posts) : "—", detail: "Sparks & hub posts" },
    { label: "Open reports", value: stats ? String(stats.openReports) : "—", detail: "Needs review" },
    { label: "Platform", value: "Live", detail: "Production ready" },
  ];

  const reportRows = reports.map((report) => [
    report.targetType,
    report.reason,
    report.targetId.slice(0, 8),
    new Date(report.createdAt).toLocaleDateString(),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="linkup-container-wide">
        <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-brand-secondary/80">Admin</p>
            <h1 className="mt-3 text-2xl font-semibold text-white">Moderation</h1>
            <p className="mt-3 text-sm text-slate-400">
              Review reports and monitor platform health.
            </p>
            <div className="mt-6 space-y-2">
              {sidebarLinks.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <main className="space-y-6">
            {loading ? (
              <div className="h-40 animate-pulse rounded-[2rem] bg-slate-900/80" />
            ) : (
              <>
                <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                  {statCards.map((stat) => (
                    <AdminStatCard key={stat.label} {...stat} />
                  ))}
                </section>

                <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-brand-secondary/80">
                        Reports
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-white">Open reports</h2>
                    </div>
                    <Link href="/admin/moderation" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">
                      Open moderation
                    </Link>
                  </div>
                  <div className="mt-6">
                    {reportRows.length > 0 ? (
                      <AdminTable
                        headers={["Type", "Reason", "Target", "Date"]}
                        rows={reportRows}
                        actions
                      />
                    ) : (
                      <p className="text-sm text-slate-400">No open reports right now.</p>
                    )}
                  </div>
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
                    <Users className="h-5 w-5 text-brand-secondary" />
                    <h3 className="mt-3 font-semibold text-white">User moderation</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Suspend user and content removal tools are planned for the next admin release.
                    </p>
                  </div>
                  <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
                    <Sparkles className="h-5 w-5 text-brand-secondary" />
                    <h3 className="mt-3 font-semibold text-white">Content moderation</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Hide or remove reported sparks from the admin panel — coming soon.
                    </p>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
