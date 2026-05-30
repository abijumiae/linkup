export const MARKET_CATEGORIES = [
  "All",
  "Electronics",
  "Fashion",
  "Jobs",
  "Services",
  "Events",
  "Local",
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export const MARKET_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "price_asc", label: "Price low→high" },
  { value: "price_desc", label: "Price high→low" },
] as const;

export type MarketSort = (typeof MARKET_SORT_OPTIONS)[number]["value"];

export function formatListingStatus(status: string): "Available" | "Sold" {
  return status === "SOLD" || status === "sold" ? "Sold" : "Available";
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

  const body = description.slice(0, match.index).trim();
  const tags = match[1]
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return { body, tags };
}
