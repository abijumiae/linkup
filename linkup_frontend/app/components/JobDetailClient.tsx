"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  deleteJob,
  fetchJob,
  fetchJobsSafe,
  Job,
  updateJob,
} from "@/src/lib/jobs";
import { formatTimeAgo } from "@/src/lib/posts";
import {
  parseJobSkills,
  WORK_TYPES,
} from "@/src/lib/workConstants";
import { isJobSaved, toggleSavedJob } from "@/src/lib/workFavorites";
import JobApplyModal from "./JobApplyModal";
import JobCard from "./JobCard";

type JobDetailClientProps = {
  jobId: string;
};

function getInitials(name: string): string {
  return (name[0] ?? "S").toUpperCase();
}

export default function JobDetailClient({ jobId }: JobDetailClientProps) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    company: "",
    description: "",
    location: "",
    jobType: "",
    salary: "",
    requirements: "",
    contactEmail: "",
  });

  const load = useCallback(async () => {
    try {
      const data = await fetchJob(jobId);
      setJob(data);
      setSaved(isJobSaved(data.id));
      setEditForm({
        title: data.title,
        company: data.company,
        description: data.description,
        location: data.location,
        jobType: data.jobType ?? WORK_TYPES[0],
        salary: data.salary ?? "",
        requirements: data.requirements ?? "",
        contactEmail: data.contactEmail ?? "",
      });
      setError(null);

      const { items } = await fetchJobsSafe({ limit: 12 });
      setSimilarJobs(
        items
          .filter(
            (item) =>
              item.id !== data.id &&
              (item.jobType === data.jobType ||
                item.company === data.company),
          )
          .slice(0, 3),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Work drops are warming up. Try again shortly.");
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

  const skills = useMemo(
    () => parseJobSkills(job?.requirements),
    [job?.requirements],
  );

  const handleEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!job) return;

    setIsSaving(true);
    try {
      const updated = await updateJob(job.id, {
        title: editForm.title.trim(),
        company: editForm.company.trim(),
        description: editForm.description.trim(),
        location: editForm.location.trim(),
        jobType: editForm.jobType.trim() || undefined,
        salary: editForm.salary.trim() || undefined,
        requirements: editForm.requirements.trim() || undefined,
        contactEmail: editForm.contactEmail.trim() || undefined,
      });
      setJob(updated);
      setShowEditModal(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to update work post.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!job || !confirm("Delete this work post permanently?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteJob(job.id);
      router.push("/jobs");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to delete work post.",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="linkup-page">
        <div className="mx-auto max-w-4xl px-4 py-8 animate-pulse">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-6 h-8 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-4 h-6 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-8 h-40 rounded-3xl bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="linkup-page flex min-h-[50vh] items-center justify-center px-4">
        <div className="linkup-panel max-w-md p-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {error ?? "Work opportunity not found."}
          </p>
          <Link href="/jobs" className="linkup-btn-primary mt-4 inline-flex min-h-[44px]">
            Back to Work
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="linkup-page">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/jobs"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Work
        </Link>

        <article className="linkup-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="linkup-eyebrow">{job.company}</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                {job.title}
              </h1>
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4" />
                Posted {formatTimeAgo(job.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSaved(toggleSavedJob(job.id))}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                saved
                  ? "border-brand-primary/40 bg-brand-primary text-white"
                  : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-brand-dark/70"
              }`}
              aria-label={saved ? "Unsave" : "Save"}
            >
              <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 px-3 py-1 text-sm dark:border-white/10">
              <MapPin className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
              {job.location}
            </span>
            {job.jobType ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 px-3 py-1 text-sm dark:border-white/10">
                <Briefcase className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                {job.jobType}
              </span>
            ) : null}
            {job.salary ? (
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                {job.salary}
              </span>
            ) : null}
          </div>

          {skills.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-brand-primary/15 bg-brand-primary/5 px-3 py-1 text-xs font-medium text-brand-primary dark:text-brand-secondary"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Description
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
              {job.description}
            </p>
          </section>

          {job.requirements ? (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Requirements & skills
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
                {job.requirements}
              </p>
            </section>
          ) : null}

          <div className="mt-8 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-brand-dark/60">
            <p className="linkup-eyebrow">Posted by</p>
            <div className="mt-3 flex items-center gap-3">
              {job.poster.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={job.poster.avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary text-sm font-semibold text-white">
                  {getInitials(job.poster.name)}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {job.poster.name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  @{job.poster.username}
                </p>
              </div>
            </div>
            {job.contactEmail ? (
              <p className="mt-4 text-sm text-brand-primary dark:text-brand-secondary">
                Apply: {job.contactEmail}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {job.isOwner ? (
              <>
                <Link
                  href={`/jobs/${job.id}/applications`}
                  className="linkup-btn-primary inline-flex min-h-[44px] items-center gap-2 px-5"
                >
                  <Users className="h-4 w-4" />
                  View applications ({job.applicationsCount})
                </Link>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="linkup-btn-secondary inline-flex min-h-[44px] items-center gap-2 px-5"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-5 text-sm font-semibold text-rose-700 dark:text-rose-200"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={job.hasApplied}
                onClick={() => setShowApplyModal(true)}
                className="linkup-btn-primary inline-flex min-h-[44px] items-center gap-2 px-5 disabled:opacity-50"
              >
                {job.hasApplied ? "Applied" : "Apply"}
              </button>
            )}
          </div>
        </article>

        {similarJobs.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Similar opportunities
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarJobs.map((similar) => (
                <JobCard key={similar.id} job={similar} compact />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {showApplyModal && !job.isOwner ? (
        <JobApplyModal
          jobId={job.id}
          onClose={() => setShowApplyModal(false)}
          onApplied={() => {
            setJob((prev) => (prev ? { ...prev, hasApplied: true } : prev));
            setShowApplyModal(false);
          }}
        />
      ) : null}

      {showEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-dark/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Edit work post
              </h2>
              <button type="button" onClick={() => setShowEditModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <input
                required
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <input
                required
                value={editForm.company}
                onChange={(e) =>
                  setEditForm({ ...editForm, company: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <textarea
                required
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="linkup-btn-primary w-full min-h-[44px] disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
