const INTERESTED_KEY = "linkup_happenings_interested";

export function getInterestedEvents(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(INTERESTED_KEY);
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

export function isEventInterested(id: string): boolean {
  return getInterestedEvents().includes(id);
}

export function toggleEventInterested(id: string): boolean {
  const current = getInterestedEvents();
  const exists = current.includes(id);
  const next = exists
    ? current.filter((eventId) => eventId !== id)
    : [...current, id];

  localStorage.setItem(INTERESTED_KEY, JSON.stringify(next));
  return !exists;
}
