"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, FileText, Plus, Search } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  fetchJobsSafe,
  fetchMyApplicationsSafe,
  Job,
  MyJobApplication,
} from "@/src/lib/jobs";
import {
  matchesWorkCategory,
  parseJobSkills,
  sortWorkJobs,
  WORK_CATEGORY_CHIPS,
  WORK_SORT_OPTIONS,
  WorkCategoryChip,
  WorkSort,
} from "@/src/lib/workConstants";
import JobApplyModal from "./JobApplyModal";
import JobCard from "./JobCard";
import PostWorkModal from "./work/PostWorkModal";
import WorkSidebar from "./work/WorkSidebar";
import { WorkCardSkeleton } from "./work/WorkSkeleton";

function WorkEmptyState({
  title,
  description,
  showPostButton,
  onPost,
}: {
  title: string;
  description: string;
  showPostButton?: boolean;
  onPost?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300/90 bg-gradient-to-br from-white to-slate-50/80 p-10 text-center dark:border-white/15 dark:from-brand-dark/80 dark:to-brand-dark/60">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/15 to-brand-secondary/15 text-brand-primary dark:text-brand-secondary">
        <Briefcase className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
      {showPostButton && onPost ? (
        <button
          type="button"
          onClick={onPost}
          className="linkup-btn-primary mt-5 inline-flex min-h-[44px] items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Post Work
        </button>
      ) : null}
    </div>
  );
}

function WorkSection({
  title,
  subtitle,
  jobs,
  onApply,
  applyingJobId,
  compact,
}: {
  title: string;
  subtitle?: string;
  jobs: Job[];
  onApply: (id: string) => void;
  applyingJobId: string | null;
  compact?: boolean;
}) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            compact={compact}
            isApplying={applyingJobId === job.id}
            onApply={onApply}
          />
        ))}
      </div>
    </section>
  );
}

export default function JobsPageClient() {
  const router = useRouter();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [myApplications, setMyApplications] = useState<MyJobApplication[]>([]);
  const [listPage, setListPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState<WorkCategoryChip | null>(
    null,
  );
  const [activeSort, setActiveSort] = useState<WorkSort>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [showApplications, setShowApplications] = useState(false);

  const loadData = useCallback(async (page = 1, append = false) => {
    const [{ items, hasMore: more, warning: jobsWarning }, appsResult] =
      await Promise.all([
        fetchJobsSafe({ page, limit: 24, sort: activeSort }),
        fetchMyApplicationsSafe(),
      ]);

    setAllJobs((current) => (append ? [...current, ...items] : items));
    setListPage(page);
    setHasMore(more);
    setMyApplications(appsResult.applications);
    setWarning(jobsWarning ?? appsResult.warning);
  }, [activeSort]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        await loadData();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        }
      } finally {
        setIsLoading(false);
      }
    }
    void init();
  }, [loadData, router]);

  const filteredJobs = useMemo(() => {
    let result = [...allJobs];

    if (searchInput.trim()) {
      const q = searchInput.trim().toLowerCase();
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          job.description.toLowerCase().includes(q) ||
          (job.requirements?.toLowerCase().includes(q) ?? false) ||
          job.poster.name.toLowerCase().includes(q),
      );
    }

    if (locationFilter.trim()) {
      const loc = locationFilter.trim().toLowerCase();
      result = result.filter((job) =>
        job.location.toLowerCase().includes(loc),
      );
    }

    if (workTypeFilter.trim()) {
      const type = workTypeFilter.trim().toLowerCase();
      result = result.filter(
        (job) => job.jobType?.toLowerCase() === type,
      );
    }

    if (salaryFilter.trim()) {
      const salary = salaryFilter.trim().toLowerCase();
      result = result.filter((job) =>
        job.salary?.toLowerCase().includes(salary),
      );
    }

    if (experienceFilter.trim()) {
      const exp = experienceFilter.trim().toLowerCase();
      result = result.filter((job) =>
        job.requirements?.toLowerCase().includes(exp),
      );
    }

    if (activeCategory && activeCategory !== "All") {
      result = result.filter((job) => matchesWorkCategory(job, activeCategory));
    }

    return sortWorkJobs(result, activeSort);
  }, [
    allJobs,
    searchInput,
    locationFilter,
    workTypeFilter,
    experienceFilter,
    salaryFilter,
    activeCategory,
    activeSort,
  ]);

  const trendingSkills = useMemo(() => {
    const skills = new Set<string>();
    for (const job of allJobs) {
      for (const skill of parseJobSkills(job.requirements)) {
        skills.add(skill);
        if (skills.size >= 8) {
          break;
        }
      }
    }
    return Array.from(skills);
  }, [allJobs]);

  const featured = useMemo(
    () => sortWorkJobs(allJobs, "trending").slice(0, 3),
    [allJobs],
  );
  const fresh = useMemo(
    () => sortWorkJobs(allJobs, "newest").slice(0, 6),
    [allJobs],
  );
  const remotePicks = useMemo(
    () =>
      allJobs
        .filter((job) => matchesWorkCategory(job, "Remote"))
        .slice(0, 3),
    [allJobs],
  );
  const projects = useMemo(
    () =>
      allJobs
        .filter(
          (job) =>
            job.jobType?.toLowerCase() === "projects" ||
            job.jobType?.toLowerCase() === "freelance",
        )
        .slice(0, 3),
    [allJobs],
  );

  const hasSearchQuery =
    searchInput.trim().length > 0 ||
    locationFilter.trim().length > 0 ||
    workTypeFilter.trim().length > 0;

  const handleApplied = (jobId: string) => {
    setAllJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, hasApplied: true } : job,
      ),
    );
    setApplyJobId(null);
    setApplyingJobId(null);
    void fetchMyApplicationsSafe().then((result) =>
      setMyApplications(result.applications),
    );
  };

  return (
    <div className="linkup-page">
      <div className="linkup-container-wide">
        <header className="linkup-panel mb-6 p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="linkup-eyebrow">LinkUp</p>
              <h1 className="linkup-title mt-2">Work</h1>
              <p className="linkup-subtitle mt-2">
                Find roles, projects, collaborations, and opportunities across
                your network.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowApplications((v) => !v)}
                className="linkup-btn-secondary inline-flex min-h-[44px] items-center gap-2 px-5"
              >
                <FileText className="h-4 w-4" />
                My Applications
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="linkup-btn-primary inline-flex min-h-[44px] items-center gap-2 px-5"
              >
                <Plus className="h-4 w-4" />
                Post Work
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-brand-dark/70">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                placeholder="Search roles, projects, skills, companies..."
              />
            </div>
          </div>

          <div className="mt-4 linkup-chip-row">
            <div className="flex min-w-min gap-2">
              {WORK_CATEGORY_CHIPS.map((category) => {
                const isActive =
                  category === "All"
                    ? !activeCategory || activeCategory === "All"
                    : activeCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setActiveCategory(category === "All" ? null : category)
                    }
                    className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md shadow-brand-primary/20"
                        : "border border-slate-200/90 bg-white text-slate-700 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-200"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Location"
              className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-dark/70 dark:text-white"
            />
            <input
              value={workTypeFilter}
              onChange={(e) => setWorkTypeFilter(e.target.value)}
              placeholder="Work type"
              className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-dark/70 dark:text-white"
            />
            <input
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
              placeholder="Experience / skills"
              className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-dark/70 dark:text-white"
            />
            <input
              value={salaryFilter}
              onChange={(e) => setSalaryFilter(e.target.value)}
              placeholder="Salary / budget"
              className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-brand-dark/70 dark:text-white"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {WORK_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveSort(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  activeSort === option.value
                    ? "border-brand-primary/40 bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
                    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        {warning ? (
          <p className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </p>
        ) : null}

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {showApplications ? (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Your Applications
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Track roles and projects you&apos;ve applied to.
                </p>
                {myApplications.length === 0 ? (
                  <div className="mt-6">
                    <WorkEmptyState
                      title="Your applications will appear here"
                      description="Apply to opportunities and track your progress in one place."
                    />
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {myApplications.map((application) => (
                      <Link
                        key={application.id}
                        href={`/jobs/${application.jobId}`}
                        className="linkup-panel block p-5 transition hover:border-brand-primary/25"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
                          {application.status}
                        </p>
                        <h3 className="mt-2 font-semibold text-slate-900 dark:text-white">
                          {application.job.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {application.job.company}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <WorkCardSkeleton key={index} />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <WorkEmptyState
                title={
                  hasSearchQuery
                    ? "No matching opportunities found"
                    : "No opportunities yet"
                }
                description={
                  hasSearchQuery
                    ? "Try different keywords or filters."
                    : "Work drops will appear here as your network grows."
                }
                showPostButton={!hasSearchQuery}
                onPost={() => setShowCreateModal(true)}
              />
            ) : (
              <>
                {!hasSearchQuery && !activeCategory ? (
                  <>
                    <WorkSection
                      title="Featured Opportunities"
                      subtitle="High-interest roles and projects from your network"
                      jobs={featured}
                      onApply={setApplyJobId}
                      applyingJobId={applyingJobId}
                      compact
                    />
                    <WorkSection
                      title="Fresh Work Drops"
                      subtitle="Newest opportunities just posted"
                      jobs={fresh}
                      onApply={setApplyJobId}
                      applyingJobId={applyingJobId}
                    />
                    <WorkSection
                      title="Remote Picks"
                      jobs={remotePicks}
                      onApply={setApplyJobId}
                      applyingJobId={applyingJobId}
                      compact
                    />
                    <WorkSection
                      title="Projects & Collaborations"
                      jobs={projects}
                      onApply={setApplyJobId}
                      applyingJobId={applyingJobId}
                      compact
                    />
                  </>
                ) : (
                  <section>
                    <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                      Results
                    </h2>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          isApplying={applyingJobId === job.id}
                          onApply={setApplyJobId}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {hasMore && !hasSearchQuery && !activeCategory ? (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setLoadingMore(true);
                        void loadData(listPage + 1, true).finally(() =>
                          setLoadingMore(false),
                        );
                      }}
                      disabled={loadingMore}
                      className="linkup-btn-secondary min-h-[44px] disabled:opacity-60"
                    >
                      {loadingMore ? "Loading…" : "Load more opportunities"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="hidden xl:block">
            <WorkSidebar
              trendingSkills={trendingSkills}
              activeCategory={activeCategory}
              onCategorySelect={(category) =>
                setActiveCategory(category as WorkCategoryChip | null)
              }
            />
          </div>
        </div>

        <div className="mt-8 xl:hidden">
          <WorkSidebar
            trendingSkills={trendingSkills}
            activeCategory={activeCategory}
            onCategorySelect={(category) =>
              setActiveCategory(category as WorkCategoryChip | null)
            }
          />
        </div>
      </div>

      <PostWorkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(created) => {
          setAllJobs((prev) => [
            created,
            ...prev.filter((job) => job.id !== created.id),
          ]);
        }}
      />

      {applyJobId ? (
        <JobApplyModal
          jobId={applyJobId}
          onClose={() => setApplyJobId(null)}
          onApplied={handleApplied}
          onApplyingChange={setApplyingJobId}
        />
      ) : null}
    </div>
  );
}
