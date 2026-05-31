"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ApiError, getApiBaseUrl } from "@/src/lib/api";
import { getCurrentUser, getToken } from "@/src/lib/auth";
import { useSocket } from "@/src/components/SocketProvider";

type ModerationReport = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  reporter?: {
    id: string;
    name: string;
    username: string;
  };
};

const STATUS_FILTERS = ["ALL", "OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;

export default function AdminModerationPage() {
  const router = useRouter();
  const user = getCurrentUser();
  const { socket } = useSocket();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("OPEN");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const loadReports = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    try {
      const query =
        statusFilter === "ALL" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
      const response = await fetch(`${getApiBaseUrl()}/admin/reports${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 403) {
        setDenied(true);
        return;
      }

      if (response.ok) {
        setReports((await response.json()) as ModerationReport[]);
      }
    } catch {
      setNotice("Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter]);

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

    void loadReports();
  }, [loadReports, router, user]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const refresh = () => {
      void loadReports();
    };

    socket.on("report_created", refresh);
    socket.on("moderation_status_updated", refresh);

    return () => {
      socket.off("report_created", refresh);
      socket.off("moderation_status_updated", refresh);
    };
  }, [loadReports, socket]);

  async function updateStatus(status: string) {
    if (!selectedReport) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setWorking(true);
    setNotice(null);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/admin/reports/${selectedReport.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new ApiError("Could not update report.", response.status);
      }

      setNotice(`Report marked ${status.toLowerCase()}.`);
      await loadReports();
    } catch (err) {
      setNotice(
        err instanceof ApiError ? err.message : "Could not update report.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (denied) {
    return (
      <div className="linkup-container flex min-h-[60vh] items-center justify-center">
        <div className="linkup-panel max-w-md p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-brand-primary dark:text-brand-secondary" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            Moderator access required
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide space-y-6">
        <header className="linkup-panel p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="linkup-eyebrow">Admin</p>
              <h1 className="linkup-title mt-2">Moderation</h1>
              <p className="linkup-subtitle mt-2">
                Review community reports and update their status.
              </p>
            </div>
            <Link href="/admin" className="linkup-btn-secondary min-h-[44px]">
              Back to admin overview
            </Link>
          </div>
        </header>

        <section className="linkup-panel p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition ${
                  statusFilter === status
                    ? "bg-brand-primary text-white"
                    : "border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200"
                }`}
              >
                {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {notice ? (
            <p className="mt-4 rounded-2xl border border-brand-primary/20 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary dark:text-brand-secondary">
              {notice}
            </p>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
            <div className="min-w-0 overflow-x-auto">
              {loading ? (
                <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
              ) : reports.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No reports in this filter.
                </p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr
                        key={report.id}
                        className={`cursor-pointer border-b border-slate-100 dark:border-white/5 ${
                          selectedId === report.id ? "bg-brand-primary/5" : ""
                        }`}
                        onClick={() => setSelectedId(report.id)}
                      >
                        <td className="px-3 py-3">{report.targetType}</td>
                        <td className="px-3 py-3">{report.reason}</td>
                        <td className="px-3 py-3">{report.status}</td>
                        <td className="px-3 py-3">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-brand-dark/70">
              {selectedReport ? (
                <div className="space-y-4">
                  <div>
                    <p className="linkup-eyebrow">Report detail</p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedReport.reason}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedReport.targetType} · {selectedReport.targetId}
                    </p>
                  </div>
                  {selectedReport.details ? (
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {selectedReport.details}
                    </p>
                  ) : null}
                  {selectedReport.reporter ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Reported by @{selectedReport.reporter.username}
                    </p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {["REVIEWING", "RESOLVED", "DISMISSED"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={working}
                        onClick={() => void updateStatus(status)}
                        className="linkup-btn-secondary min-h-[44px] text-sm disabled:opacity-60"
                      >
                        Mark {status.toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Hide content and suspend user tools remain placeholders for a
                    future admin release.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Select a report to review details and update status.
                </p>
              )}
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
