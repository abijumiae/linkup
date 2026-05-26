"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  fetchJob,
  fetchJobApplications,
  Job,
  JobApplication,
} from "@/src/lib/jobs";
import AuthLoadingScreen from "./AuthLoadingScreen";

type JobApplicationsClientProps = {
  jobId: string;
};

export default function JobApplicationsClient({
  jobId,
}: JobApplicationsClientProps) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [jobData, apps] = await Promise.all([
        fetchJob(jobId),
        fetchJobApplications(jobId),
      ]);

      if (!jobData.isOwner) {
        router.replace(`/jobs/${jobId}`);
        return;
      }

      setJob(jobData);
      setApplications(apps);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        router.replace(`/jobs/${jobId}`);
        return;
      }
      setError("Unable to load applications. Please try again.");
    }
  }, [jobId, router]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    }
    void init();
  }, [load]);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/jobs/${jobId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to job
        </Link>

        <header className="mb-8 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
            Applications
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {job?.title ?? "Job"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {applications.length}{" "}
            {applications.length === 1 ? "application" : "applications"}
          </p>
        </header>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {applications.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
            No applications yet.
          </p>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <article
                key={application.id}
                className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {application.applicant.name}
                    </p>
                    <p className="text-sm text-slate-400">
                      @{application.applicant.username} ·{" "}
                      {application.applicant.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
                    {application.status}
                  </span>
                </div>
                {application.coverLetter && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {application.coverLetter}
                  </p>
                )}
                {application.resumeUrl && (
                  <a
                    href={application.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-sm text-violet-300 hover:text-violet-200"
                  >
                    View resume
                  </a>
                )}
                <p className="mt-4 text-xs text-slate-500">
                  Applied {new Date(application.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
