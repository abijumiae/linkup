export const WORK_CATEGORY_CHIPS = [
  "All",
  "Remote",
  "Full-time",
  "Part-time",
  "Freelance",
  "Internship",
  "Projects",
  "Creator",
  "Local",
] as const;

export type WorkCategoryChip = (typeof WORK_CATEGORY_CHIPS)[number];

export const WORK_TYPES = [
  "Remote",
  "Full-time",
  "Part-time",
  "Freelance",
  "Internship",
  "Projects",
  "Creator",
  "Local",
  "Hybrid",
  "On-site",
] as const;

export const WORK_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "best_match", label: "Best match" },
] as const;

export type WorkSort = (typeof WORK_SORT_OPTIONS)[number]["value"];

export function parseJobSkills(requirements: string | null | undefined): string[] {
  if (!requirements?.trim()) {
    return [];
  }

  return requirements
    .split(/[,;\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function matchesWorkCategory(
  job: {
    jobType: string | null;
    location: string;
  },
  chip: WorkCategoryChip | null,
): boolean {
  if (!chip || chip === "All") {
    return true;
  }

  if (chip === "Remote") {
    return (
      job.jobType?.toLowerCase() === "remote" ||
      job.location.toLowerCase().includes("remote")
    );
  }

  if (chip === "Local") {
    return (
      !job.location.toLowerCase().includes("remote") &&
      job.jobType?.toLowerCase() !== "remote"
    );
  }

  return job.jobType?.toLowerCase() === chip.toLowerCase();
}

export function sortWorkJobs<T extends { createdAt: string; applicationsCount?: number }>(
  jobs: T[],
  sort: WorkSort = "newest",
): T[] {
  const copy = [...jobs];

  switch (sort) {
    case "trending":
      return copy.sort(
        (a, b) =>
          (b.applicationsCount ?? 0) - (a.applicationsCount ?? 0) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case "best_match":
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case "newest":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}
