const LIKED_KEY = "linkup_watch_liked";

export function getLikedVideos(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(LIKED_KEY);
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

export function isVideoLiked(id: string): boolean {
  return getLikedVideos().includes(id);
}

export function toggleVideoLike(id: string): boolean {
  const current = getLikedVideos();
  const exists = current.includes(id);
  const next = exists
    ? current.filter((videoId) => videoId !== id)
    : [...current, id];

  localStorage.setItem(LIKED_KEY, JSON.stringify(next));
  return !exists;
}

export function displayLikeCount(
  videoId: string,
  serverCount = 0,
): number {
  return serverCount + (isVideoLiked(videoId) ? 1 : 0);
}

export function formatViewCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(count);
}
