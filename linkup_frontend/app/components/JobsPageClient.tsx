"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Search, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { createJob, fetchJobs, Job, JobsFilters } from "@/src/lib/jobs";
import { jobTypes } from "../data/linkupData";
import AuthLoadingScreen from "./AuthLoadingScreen";
import JobCard from "./JobCard";
import JobApplyModal from "./JobApplyModal";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50";

function JobSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/80">
      <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-3 w-full rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-3 w-5/6 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mt-5 h-9 w-full rounded-full bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

export default function JobsPageClient() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
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

  function buildFilters(overrides?: Partial<JobsFilters>): JobsFilters {
    return {
      q: searchInput.trim() || undefined,
      location: locationInput.trim() || undefined,
      jobType: activeJobType ?? undefined,
      ...overrides,
    };
  }

  const loadJobs = useCallback(async (filters: JobsFilters) => {
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
  }, [router]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadJobs({});
      setIsLoading(false);
    }
    void init();
  }, [loadJobs]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    await loadJobs(buildFilters());
    setIsLoading(false);
  };

  const handleJobTypeFilter = async (jobType: string | null) => {
    setActiveJobType(jobType);
    setIsLoading(true);
    await loadJobs(buildFilters({ jobType: jobType ?? undefined }));
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
      setJobs((prev) => [
        created,
        ...prev.filter((job) => job.id !== created.id),
      ]);
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
    return <AuthLoadingScreen message="Loading jobs..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-600 dark:text-violet-300/80">
                Jobs
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                Search roles and post new opportunities
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Discover open roles or share your own job posting with the
                community.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500"
            >
              <Plus className="h-4 w-4" />
              Create job
            </button>
          </div>

          <form onSubmit={handleSearch} className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950/80">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Search jobs"
                />
              </div>
              <div className="relative flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950/80">
                <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Filter by location"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="h-11 rounded-full border border-slate-200 bg-slate-100 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {isLoading ? "Searching…" : "Search"}
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleJobTypeFilter(null)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeJobType === null
                  ? "border-violet-500/50 bg-violet-600 text-white shadow-md shadow-violet-600/20 dark:bg-violet-600"
                  : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              All types
            </button>
            {jobTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleJobTypeFilter(type)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeJobType === type
                    ? "border-violet-500/50 bg-violet-600 text-white shadow-md shadow-violet-600/20 dark:bg-violet-600"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </header>

        {error ? (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {isLoading && jobs.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <JobSkeleton key={index} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-slate-900/60">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No jobs yet. Try adjusting your filters or post the first
              opportunity.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500"
            >
              <Plus className="h-4 w-4" />
              Create job
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Create job
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Post a new opportunity to the jobs board.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Title
                </span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Job title"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Company
                </span>
                <input
                  required
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder="Company name"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Description
                </span>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={4}
                  placeholder="Role overview and responsibilities"
                  className={`${inputClass} resize-none`}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Location
                </span>
                <input
                  required
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="City, country, or Remote"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Job type
                </span>
                <select
                  value={form.jobType}
                  onChange={(e) =>
                    setForm({ ...form, jobType: e.target.value })
                  }
                  className={inputClass}
                >
                  {jobTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Salary (optional)
                </span>
                <input
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="e.g. $80k – $100k"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Requirements (optional)
                </span>
                <textarea
                  value={form.requirements}
                  onChange={(e) =>
                    setForm({ ...form, requirements: e.target.value })
                  }
                  rows={3}
                  placeholder="Skills and qualifications"
                  className={`${inputClass} resize-none`}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Contact email (optional)
                </span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm({ ...form, contactEmail: e.target.value })
                  }
                  placeholder="hiring@company.com"
                  className={inputClass}
                />
              </label>
              {createError ? (
                <p className="text-sm text-red-600 dark:text-red-300">
                  {createError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-full bg-gradient-to-r from-violet-600 to-sky-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-sky-500 disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Publish job"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {applyJobId ? (
        <JobApplyModal
          jobId={applyJobId}
          onClose={() => setApplyJobId(null)}
          onApplied={handleApplied}
          onApplyingChange={(id) => setApplyingJobId(id)}
        />
      ) : null}
    </div>
  );
}
