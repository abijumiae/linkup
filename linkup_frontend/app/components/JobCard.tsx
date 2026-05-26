"use client";

import Link from "next/link";
import { Briefcase, Building2, CheckCircle2, MapPin } from "lucide-react";
import type { Job } from "@/src/lib/jobs";

type JobCardProps = {
  job: Job;
  onApply?: (jobId: string) => void;
  isApplying?: boolean;
};

export default function JobCard({ job, onApply, isApplying = false }: JobCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-950/5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-violet-500/10 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
            <Building2 className="h-3.5 w-3.5" />
            {job.company}
          </p>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">
            {job.title}
          </h3>
        </div>
        {job.salary ? (
          <p className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
            {job.salary}
          </p>
        ) : null}
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {job.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
          <MapPin className="h-3 w-3 text-violet-500 dark:text-violet-300" />
          {job.location}
        </span>
        {job.jobType ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
            <Briefcase className="h-3 w-3 text-violet-500 dark:text-violet-300" />
            {job.jobType}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Posted by{" "}
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {job.poster.name}
        </span>
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 transition hover:border-violet-400/40 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          View details
        </Link>
        {!job.isOwner ? (
          job.hasApplied ? (
            <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Applied
            </span>
          ) : (
            <button
              type="button"
              disabled={isApplying}
              onClick={() => onApply?.(job.id)}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-md shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500 disabled:opacity-50"
            >
              {isApplying ? "Applying…" : "Apply"}
            </button>
          )
        ) : (
          <span className="inline-flex flex-1 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-violet-700 dark:text-violet-200">
            Your posting
          </span>
        )}
      </div>
    </article>
  );
}
