import { apiRequest, ApiError } from "./api";
import { apiWarningFromError } from "./apiWarnings";

export type WatchCreator = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type WatchProgressInfo = {
  progress: number;
  completed: boolean;
};

export type WatchVideo = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  category: string | null;
  type: string | null;
  duration: number | null;
  creatorId: string | null;
  isPublished: boolean;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
  creator: WatchCreator | null;
  progress?: WatchProgressInfo | null;
  watchProgress?: number;
  watchCompleted?: boolean;
  lastWatchedAt?: string;
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
};

export type CreateWatchVideoInput = {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category?: string;
  type?: string;
  duration?: number;
};

export type WatchFilters = {
  category?: string;
  type?: string;
  search?: string;
};

export const WATCH_CATEGORIES = [
  "All",
  "Shows",
  "Shorts",
  "Podcasts",
  "Learning",
  "Local Pulse",
  "Live",
] as const;

export type WatchCategory = (typeof WATCH_CATEGORIES)[number];

const CATEGORY_TYPE_MAP: Record<string, string | undefined> = {
  Shows: "series",
  Shorts: "short",
  Podcasts: "podcast",
  Live: "live",
};

const CATEGORY_NAME_MAP: Record<string, string | undefined> = {
  Learning: "Learning",
  "Local Pulse": "Local Pulse",
};

export function getWatchQueryParams(category: WatchCategory): WatchFilters {
  if (category === "All") {
    return {};
  }

  const type = CATEGORY_TYPE_MAP[category];
  if (type) {
    return { type };
  }

  const categoryName = CATEGORY_NAME_MAP[category];
  if (categoryName) {
    return { category: categoryName };
  }

  return {};
}

export function formatWatchDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) {
    return "—";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

export function formatWatchType(type: string | null | undefined): string {
  if (!type) {
    return "Video";
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

export const DEMO_WATCH_VIDEOS: WatchVideo[] = [
  {
    id: "demo-big-buck",
    title: "Creator Drop: Big Buck Bunny",
    description:
      "A playful short film drop — the kind of creative energy LinkUp Watch is built for.",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    category: "Local Pulse",
    type: "short",
    duration: 596,
    creatorId: null,
    isPublished: true,
    isPremium: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: {
      id: "demo-creator-1",
      name: "LinkUp Studios",
      username: "linkupstudios",
      avatarUrl: null,
    },
    viewsCount: 12400,
    likesCount: 890,
    commentsCount: 42,
  },
  {
    id: "demo-elephants",
    title: "Short Films: Elephants Dream",
    description:
      "An indie animation pick from the Fresh Drops shelf — moody, visual, and worth the watch.",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    category: "Learning",
    type: "short",
    duration: 653,
    creatorId: null,
    isPublished: true,
    isPremium: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: {
      id: "demo-creator-2",
      name: "Pulse Collective",
      username: "pulsecollective",
      avatarUrl: null,
    },
    viewsCount: 8200,
    likesCount: 612,
    commentsCount: 28,
  },
  {
    id: "demo-forrest",
    title: "Creator Shows: Forrest Gump Teaser",
    description:
      "Sample episode-style drop to preview how shows feel inside LinkUp Watch.",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
    category: "Shows",
    type: "series",
    duration: 15,
    creatorId: null,
    isPublished: true,
    isPremium: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: {
      id: "demo-creator-3",
      name: "Night Shift Media",
      username: "nightshift",
      avatarUrl: null,
    },
    viewsCount: 5600,
    likesCount: 401,
    commentsCount: 19,
  },
  {
    id: "demo-podcast",
    title: "Podcasts: LinkUp Audio Session",
    description:
      "A podcast-style visual session — talk, culture, and creator voice in one feed.",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnailUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg",
    category: "Podcasts",
    type: "podcast",
    duration: 15,
    creatorId: null,
    isPublished: true,
    isPremium: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: {
      id: "demo-creator-4",
      name: "LinkUp Audio",
      username: "linkupaudio",
      avatarUrl: null,
    },
    viewsCount: 3100,
    likesCount: 256,
    commentsCount: 11,
  },
];

export function isDemoWatchVideo(id: string): boolean {
  return id.startsWith("demo-");
}

export function getDemoWatchVideo(id: string): WatchVideo | null {
  return DEMO_WATCH_VIDEOS.find((video) => video.id === id) ?? null;
}

export function mergeWithDemoVideos(videos: WatchVideo[]): WatchVideo[] {
  if (videos.length > 0) {
    return videos;
  }
  return DEMO_WATCH_VIDEOS;
}

export type WatchVideosResult = {
  items: WatchVideo[];
  warning: string | null;
  live: boolean;
};

export function watchWarningFromError(error: unknown): string {
  return apiWarningFromError(error, "Watch is warming up. Try again shortly.");
}

export async function fetchWatchVideosSafe(
  filters: WatchFilters = {},
): Promise<WatchVideosResult> {
  try {
    const items = await fetchWatchVideos(filters);
    return { items, warning: null, live: true };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    return {
      items: [],
      warning: watchWarningFromError(error),
      live: false,
    };
  }
}

export async function fetchContinueWatchingSafe(): Promise<{
  items: WatchVideo[];
  warning: string | null;
}> {
  try {
    const items = await fetchContinueWatching();
    return { items, warning: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    return { items: [], warning: null };
  }
}

export async function fetchWatchVideos(
  filters: WatchFilters = {},
): Promise<WatchVideo[]> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.type) params.set("type", filters.type);
  if (filters.search) params.set("search", filters.search);

  const query = params.toString();
  const path = query ? `/watch?${query}` : "/watch";
  return apiRequest<WatchVideo[]>(path);
}

export async function fetchWatchVideo(id: string): Promise<WatchVideo> {
  return apiRequest<WatchVideo>(`/watch/${id}`);
}

export async function fetchContinueWatching(): Promise<WatchVideo[]> {
  return apiRequest<WatchVideo[]>("/watch/progress/me");
}

export async function updateWatchProgress(
  videoId: string,
  progress: number,
  completed?: boolean,
): Promise<{
  videoId: string;
  progress: number;
  completed: boolean;
  updatedAt: string;
}> {
  return apiRequest(`/watch/${videoId}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ progress, completed }),
  });
}

export async function createWatchVideo(
  input: CreateWatchVideoInput,
): Promise<WatchVideo> {
  return apiRequest<WatchVideo>("/watch", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
