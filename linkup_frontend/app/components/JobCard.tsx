"use client";

import Link from "next/link";
import { memo, useState } from "react";
import {
  Bookmark,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";
import type { Job } from "@/src/lib/jobs";
import { formatTimeAgo } from "@/src/lib/posts";
import { parseJobSkills } from "@/src/lib/workConstants";
import { isJobSaved, toggleSavedJob } from "@/src/lib/workFavorites";

type JobCardProps = {
  job: Job;
  onApply?: (jobId: string) => void;
  isApplying?: boolean;
  compact?: boolean;
};

function JobCardComponent({
  job,
  onApply,
  isApplying = false,
  compact = false,
}: JobCardProps) {
  const [saved, setSaved] = useState(() => isJobSaved(job.id));
  const skills = parseJobSkills(job.requirements);

  function handleSave(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSaved(toggleSavedJob(job.id));
  }

  return (
    <article className="linkup-panel group flex h-full flex-col p-5 transition duration-200 hover:border-brand-primary/25 hover:shadow-lg hover:shadow-brand-primary/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            {job.company}
          </p>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">
            {job.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
            saved
              ? "border-brand-primary/40 bg-brand-primary text-white"
              : "border-slate-200/90 bg-white text-slate-500 hover:border-brand-primary/30 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-400"
          }`}
          aria-label={saved ? "Unsave opportunity" : "Save opportunity"}
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        </button>
      </div>

      {job.salary ? (
        <p className="mt-3 inline-flex w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
          {job.salary}
        </p>
      ) : null}

      {!compact ? (
        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {job.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
          <MapPin className="h-3 w-3 text-brand-primary dark:text-brand-secondary" />
          {job.location}
        </span>
        {job.jobType ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
            <Briefcase className="h-3 w-3 text-brand-primary dark:text-brand-secondary" />
            {job.jobType}
          </span>
        ) : null}
      </div>

      {skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-brand-primary/15 bg-brand-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-brand-primary dark:text-brand-secondary"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{job.poster.name}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTimeAgo(job.createdAt)}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/jobs/${job.id}`}
          className="linkup-btn-secondary inline-flex flex-1 items-center justify-center min-h-[44px] text-xs font-semibold uppercase tracking-[0.12em]"
        >
          View Details
        </Link>
        {!job.isOwner ? (
          job.hasApplied ? (
            <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200 min-h-[44px]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Applied
            </span>
          ) : (
            <button
              type="button"
              disabled={isApplying}
              onClick={() => onApply?.(job.id)}
              className="linkup-btn-primary inline-flex flex-1 items-center justify-center min-h-[44px] text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-50"
            >
              {isApplying ? "Applying…" : "Apply"}
            </button>
          )
        ) : (
          <span className="inline-flex flex-1 items-center justify-center rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary dark:text-brand-secondary min-h-[44px]">
            Your post
          </span>
        )}
      </div>
    </article>
  );
}

const JobCard = memo(JobCardComponent);
JobCard.displayName = "JobCard";

export default JobCard;
