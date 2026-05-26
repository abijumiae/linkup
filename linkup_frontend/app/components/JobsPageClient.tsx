"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { createJob, fetchJobs, Job } from "@/src/lib/jobs";
import { jobTypes } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";
import JobCard from "./JobCard";
import JobApplyModal from "./JobApplyModal";

export default function JobsPageClient() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeJobType, setActiveJobType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    location: "",
    jobType: jobTypes[0] ?? "Remote",
    salary: "",
    requirements: "",
    contactEmail: "",
  });

  const loadJobs = useCallback(
    async (filters?: { q?: string; jobType?: string }) => {
      try {
        const data = await fetchJobs(filters);
        setJobs(data);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("Unable to load jobs. Please try again.");
      }
    },
    [router],
  );

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadJobs();
      setIsLoading(false);
    }
    void init();
  }, [loadJobs]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    await loadJobs({
      q: searchInput,
      jobType: activeJobType ?? undefined,
    });
    setIsLoading(false);
  };

  const handleJobTypeFilter = async (jobType: string | null) => {
    setActiveJobType(jobType);
    setIsLoading(true);
    await loadJobs({
      q: searchInput || undefined,
      jobType: jobType ?? undefined,
    });
    setIsLoading(false);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const created = await createJob({
        title: form.title.trim(),
        company: form.company.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        jobType: form.jobType.trim() || undefined,
        salary: form.salary.trim() || undefined,
        requirements: form.requirements.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
      });
      setJobs((prev) => [created, ...prev.filter((job) => job.id !== created.id)]);
      setShowCreateModal(false);
      setForm({
        title: "",
        company: "",
        description: "",
        location: "",
        jobType: jobTypes[0] ?? "Remote",
        salary: "",
        requirements: "",
        contactEmail: "",
      });
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Unable to create job.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleApplied = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, hasApplied: true } : job,
      ),
    );
    setApplyJobId(null);
    setApplyingJobId(null);
  };

  if (isLoading && jobs.length === 0) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">
                Jobs
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                Search roles and post new opportunities
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400"
            >
              <Sparkles className="h-4 w-4" />
              Post job
            </button>
          </div>
          <form
            onSubmit={handleSearch}
            className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr] xl:grid-cols-[1.8fr_1fr]"
          >
            <div className="relative rounded-[1.75rem] border border-white/10 bg-slate-950/80 px-4 py-3">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent pl-11 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="Search jobs"
              />
            </div>
            <button
              type="submit"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 lg:hidden"
            >
              Search
            </button>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleJobTypeFilter(null)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  activeJobType === null
                    ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                All
              </button>
              {jobTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleJobTypeFilter(type)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    activeJobType === type
                      ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </form>
        </div>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {jobs.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
            No jobs found. Post the first opportunity.
          </p>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isApplying={applyingJobId === job.id}
                onApply={(id) => setApplyJobId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Post a job</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Job title"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400/50"
              />
              <input
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400/50"
              />
              <textarea
                required
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
                placeholder="Description"
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400/50"
              />
              <input
                required
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                placeholder="Location"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400/50"
              />
              <select
                value={form.jobType}
                onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                {jobTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                placeholder="Salary (optional)"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <textarea
                value={form.requirements}
                onChange={(e) =>
                  setForm({ ...form, requirements: e.target.value })
                }
                rows={3}
                placeholder="Requirements (optional)"
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
                placeholder="Contact email (optional)"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              />
              {createError && (
                <p className="text-sm text-red-300">{createError}</p>
              )}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-full bg-violet-500 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {isCreating ? "Posting…" : "Publish job"}
              </button>
            </form>
          </div>
        </div>
      )}

      {applyJobId && (
        <JobApplyModal
          jobId={applyJobId}
          onClose={() => setApplyJobId(null)}
          onApplied={handleApplied}
          onApplyingChange={(id) => setApplyingJobId(id)}
        />
      )}
    </div>
  );
}
