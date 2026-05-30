export const HAPPENINGS_TIME_TABS = [
  "All",
  "Live Now",
  "Upcoming",
  "Past",
] as const;

export type HappeningsTimeTab = (typeof HAPPENINGS_TIME_TABS)[number];

export const HAPPENINGS_CATEGORIES = [
  "Tech",
  "Creators",
  "Business",
  "Local",
  "Online",
] as const;

export type HappeningsCategory = (typeof HAPPENINGS_CATEGORIES)[number];

export type EventTimeframe = "all" | "live" | "upcoming" | "past";

export function getEventTimeframeParam(tab: HappeningsTimeTab): EventTimeframe {
  switch (tab) {
    case "Live Now":
      return "live";
    case "Upcoming":
      return "upcoming";
    case "Past":
      return "past";
    default:
      return "all";
  }
}

export function getEventTimingStatus(event: {
  startDate: string;
  endDate: string | null;
}): "live" | "upcoming" | "past" {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const end = event.endDate ? new Date(event.endDate).getTime() : null;

  if (end !== null && end < now) {
    return "past";
  }
  if (start > now) {
    return "upcoming";
  }
  if (start <= now && (end === null || end >= now)) {
    return "live";
  }
  return "past";
}

export function isOnlineLocation(location: string): boolean {
  return /online|virtual|remote|zoom|livestream/i.test(location);
}

export function appendTagsToDescription(description: string, tags: string): string {
  const trimmedTags = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (trimmedTags.length === 0) {
    return description.trim();
  }

  return `${description.trim()}\n\nTags: ${trimmedTags.join(", ")}`;
}

export function parseTagsFromDescription(description: string): {
  body: string;
  tags: string[];
} {
  const match = description.match(/\n\nTags:\s*(.+)$/i);
  if (!match) {
    return { body: description, tags: [] };
  }

  return {
    body: description.slice(0, match.index).trim(),
    tags: match[1]
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}
