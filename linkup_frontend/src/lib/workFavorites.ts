const SAVED_KEY = "linkup_work_saved";

export function getSavedJobs(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function isJobSaved(id: string): boolean {
  return getSavedJobs().includes(id);
}

export function toggleSavedJob(id: string): boolean {
  const current = getSavedJobs();
  const exists = current.includes(id);
  const next = exists
    ? current.filter((jobId) => jobId !== id)
    : [...current, id];

  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return !exists;
}
