"use client";

import Link from "next/link";
import { Briefcase, MapPin, Sparkles } from "lucide-react";
import type { Job } from "@/src/lib/jobs";

type JobCardProps = {
  job: Job;
  onApply?: (jobId: string) => void;
  isApplying?: boolean;
};

export default function JobCard({ job, onApply, isApplying = false }: JobCardProps) {
  return (
    <article className="card-float rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-slate-950/10 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-violet-500/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-violet-300/80">
            {job.company}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{job.title}</h3>
          <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 text-slate-400">
            {job.description}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Posted by {job.poster.name}
          </p>
        </div>
        <div className="space-y-3 text-right">
          {job.salary ? (
            <p className="text-lg font-semibold text-white">{job.salary}</p>
          ) : null}
          {job.jobType ? (
            <div className="rounded-full bg-violet-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
              {job.jobType}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span className="inline-flex items-center gap-2 rounded-3xl bg-slate-900/80 px-3 py-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          {job.location}
        </span>
        {job.jobType ? (
          <span className="inline-flex items-center gap-2 rounded-3xl bg-slate-900/80 px-3 py-2">
            <Briefcase className="h-4 w-4 text-violet-300" />
            {job.jobType}
          </span>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
        >
          View details
        </Link>
        {!job.isOwner && (
          <button
            type="button"
            disabled={job.hasApplied || isApplying}
            onClick={() => onApply?.(job.id)}
            className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:opacity-50"
          >
            {job.hasApplied ? "Applied" : isApplying ? "Applying…" : "Apply"}
            {!job.hasApplied && <Sparkles className="h-4 w-4" />}
          </button>
        )}
      </div>
    </article>
  );
}
