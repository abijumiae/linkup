"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Pencil,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  deleteJob,
  fetchJob,
  Job,
  updateJob,
} from "@/src/lib/jobs";
import { jobTypes } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";
import JobApplyModal from "./JobApplyModal";

type JobDetailClientProps = {
  jobId: string;
};

export default function JobDetailClient({ jobId }: JobDetailClientProps) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setEditForm({
        title: data.title,
        company: data.company,
        description: data.description,
        location: data.location,
        jobType: data.jobType ?? jobTypes[0] ?? "Remote",
        salary: data.salary ?? "",
        requirements: data.requirements ?? "",
        contactEmail: data.contactEmail ?? "",
      });
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Unable to load job. Please try again.");
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
        err instanceof ApiError ? err.message : "Unable to update job.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!job || !confirm("Delete this job permanently?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteJob(job.id);
      router.push("/jobs");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to delete job.",
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        {error ?? "Job not found."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/jobs"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>

        <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
            {job.company}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{job.title}</h1>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
              <MapPin className="h-4 w-4 text-slate-400" />
              {job.location}
            </span>
            {job.jobType && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                <Briefcase className="h-4 w-4 text-violet-300" />
                {job.jobType}
              </span>
            )}
            {job.salary && (
              <span className="rounded-full border border-white/10 px-3 py-1 font-semibold text-white">
                {job.salary}
              </span>
            )}
          </div>

          <div className="mt-8 space-y-6">
            <section>
              <h2 className="text-sm uppercase tracking-[0.25em] text-slate-500">
                Description
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {job.description}
              </p>
            </section>

            {job.requirements && (
              <section>
                <h2 className="text-sm uppercase tracking-[0.25em] text-slate-500">
                  Requirements
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {job.requirements}
                </p>
              </section>
            )}

            {job.contactEmail && (
              <section>
                <h2 className="text-sm uppercase tracking-[0.25em] text-slate-500">
                  Contact
                </h2>
                <p className="mt-2 text-sm text-violet-200">{job.contactEmail}</p>
              </section>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Posted by
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {job.poster.name}
            </p>
            <p className="text-sm text-slate-400">@{job.poster.username}</p>
          </div>

          {error && (
            <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {job.isOwner ? (
              <>
                <Link
                  href={`/jobs/${job.id}/applications`}
                  className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-violet-400"
                >
                  <Users className="h-4 w-4" />
                  View applications ({job.applicationsCount})
                </Link>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
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
                className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-violet-400 disabled:opacity-50"
              >
                {job.hasApplied ? "Applied" : "Apply now"}
                {!job.hasApplied && <Sparkles className="h-4 w-4" />}
              </button>
            )}
          </div>
        </article>
      </div>

      {showApplyModal && !job.isOwner && (
        <JobApplyModal
          jobId={job.id}
          onClose={() => setShowApplyModal(false)}
          onApplied={() => {
            setJob((prev) => (prev ? { ...prev, hasApplied: true } : prev));
            setShowApplyModal(false);
          }}
        />
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Edit job</h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
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
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <input
                required
                value={editForm.company}
                onChange={(e) =>
                  setEditForm({ ...editForm, company: e.target.value })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <textarea
                required
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <input
                required
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <select
                value={editForm.jobType}
                onChange={(e) =>
                  setEditForm({ ...editForm, jobType: e.target.value })
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                {jobTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                value={editForm.salary}
                onChange={(e) =>
                  setEditForm({ ...editForm, salary: e.target.value })
                }
                placeholder="Salary"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <textarea
                value={editForm.requirements}
                onChange={(e) =>
                  setEditForm({ ...editForm, requirements: e.target.value })
                }
                rows={3}
                placeholder="Requirements"
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <input
                type="email"
                value={editForm.contactEmail}
                onChange={(e) =>
                  setEditForm({ ...editForm, contactEmail: e.target.value })
                }
                placeholder="Contact email"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-full bg-violet-500 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
