import { getApiBaseUrl, ApiError, extractErrorMessage } from "./api";
import { AccountType, clearAuth, getToken } from "./auth";
import { FeedPost } from "./posts";

export interface SearchUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  accountType: AccountType;
  isVerified: boolean;
  isFollowingAuthor: boolean;
}

export interface DiscoverPerson {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  accountType: AccountType;
  isVerified: boolean;
  isFollowingAuthor: boolean;
}

export interface DiscoverHub {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  category: string;
  isMember: boolean;
}

export interface DiscoverWatchItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  duration: number | null;
  creator: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

export interface DiscoverMarketItem {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  location: string | null;
}

export interface DiscoverWorkItem {
  id: string;
  title: string;
  company: string;
  location: string;
  jobType: string | null;
}

export interface DiscoverHappening {
  id: string;
  title: string;
  location: string;
  startDate: string;
  category: string | null;
  attendeesCount: number;
}

export interface DiscoverData {
  people: DiscoverPerson[];
  sparks: FeedPost[];
  hubs: DiscoverHub[];
  watch: DiscoverWatchItem[];
  market: DiscoverMarketItem[];
  work: DiscoverWorkItem[];
  happenings: DiscoverHappening[];
  tags: string[];
}

export interface SearchResults {
  users: SearchUser[];
  posts: FeedPost[];
}

export type DiscoverLoadResult = {
  data: DiscoverData;
  warning: string | null;
  usedFallback: boolean;
};

export const DEFAULT_DISCOVER_TAGS = [
  "Tech",
  "Business",
  "Design",
  "Learning",
  "Community",
  "Startup",
];

export const EMPTY_DISCOVER_DATA: DiscoverData = {
  people: [],
  sparks: [],
  hubs: [],
  watch: [],
  market: [],
  work: [],
  happenings: [],
  tags: DEFAULT_DISCOVER_TAGS,
};

function authHeaders(): HeadersInit {
  const token = getToken();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function withAuth<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuth();
    }
    throw error;
  }
}

function parseJsonBody(text: string): unknown {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeDiscoverData(payload: unknown): DiscoverData {
  if (!payload || typeof payload !== "object") {
    return { ...EMPTY_DISCOVER_DATA };
  }

  const record = payload as Record<string, unknown>;

  return {
    people: asArray<DiscoverPerson>(record.people),
    sparks: asArray<FeedPost>(record.sparks),
    hubs: asArray<DiscoverHub>(record.hubs),
    watch: asArray<DiscoverWatchItem>(record.watch),
    market: asArray<DiscoverMarketItem>(record.market),
    work: asArray<DiscoverWorkItem>(record.work),
    happenings: asArray<DiscoverHappening>(record.happenings),
    tags: asArray<string>(record.tags).length
      ? asArray<string>(record.tags)
      : DEFAULT_DISCOVER_TAGS,
  };
}

async function fetchDiscoverEndpoint(path: "/discover" | "/explore") {
  const apiUrl = getApiBaseUrl();
  const token = getToken();
  const url = `${apiUrl}${path}`;

  console.log("Discover API URL:", url);
  console.log("Discover token exists:", !!token);

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const text = await response.text();
  console.log("Discover response status:", response.status);
  console.log("Discover response body:", text);

  return { response, text, parsed: parseJsonBody(text) };
}

async function fetchExploreSparksFallback(): Promise<FeedPost[]> {
  const { response, text, parsed } = await fetchDiscoverEndpoint("/explore");

  if (response.status === 401) {
    throw new ApiError("Not authenticated", 401);
  }

  if (!response.ok) {
    return [];
  }

  if (Array.isArray(parsed)) {
    return parsed as FeedPost[];
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { sparks?: unknown }).sparks)) {
    return (parsed as { sparks: FeedPost[] }).sparks;
  }

  console.warn("Discover explore fallback returned unexpected shape:", text);
  return [];
}

/** Loads discover data; never throws except 401. Falls back to /explore sparks when /discover is missing. */
export async function fetchDiscoverSafe(): Promise<DiscoverLoadResult> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  try {
    const { response, parsed } = await fetchDiscoverEndpoint("/discover");

    if (response.status === 401) {
      clearAuth();
      throw new ApiError("Not authenticated", 401);
    }

    if (response.ok) {
      return {
        data: normalizeDiscoverData(parsed),
        warning: null,
        usedFallback: false,
      };
    }

    if (response.status === 404) {
      console.warn("Discover /discover not found — falling back to /explore");
      const sparks = await fetchExploreSparksFallback();
      return {
        data: { ...EMPTY_DISCOVER_DATA, sparks },
        warning: "Discover data is warming up.",
        usedFallback: true,
      };
    }

    const sparks = await fetchExploreSparksFallback().catch(() => [] as FeedPost[]);
    return {
      data: { ...EMPTY_DISCOVER_DATA, sparks },
      warning: "Discover data is warming up.",
      usedFallback: true,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }

    console.warn("Discover load failed:", error);
    return {
      data: { ...EMPTY_DISCOVER_DATA },
      warning: "Discover data is warming up.",
      usedFallback: true,
    };
  }
}

export async function searchAll(query: string): Promise<SearchResults> {
  const params = new URLSearchParams({ q: query.trim() });
  return withAuth(() =>
    fetch(`${getApiBaseUrl()}/search?${params.toString()}`, {
      headers: authHeaders(),
    }).then(async (response) => {
      const text = await response.text();
      const parsed = parseJsonBody(text);

      if (!response.ok) {
        throw new ApiError(
          extractErrorMessage(parsed, "Search failed"),
          response.status,
        );
      }

      const record =
        parsed && typeof parsed === "object"
          ? (parsed as Record<string, unknown>)
          : {};

      return {
        users: asArray<SearchUser>(record.users),
        posts: asArray<FeedPost>(record.posts),
      };
    }),
  );
}

export async function fetchExplorePosts(): Promise<FeedPost[]> {
  return withAuth(() =>
    fetch(`${getApiBaseUrl()}/explore`, { headers: authHeaders() }).then(
      async (response) => {
        const parsed = parseJsonBody(await response.text());
        if (!response.ok) {
          throw new ApiError(
            extractErrorMessage(parsed, "Explore failed"),
            response.status,
          );
        }
        return Array.isArray(parsed) ? (parsed as FeedPost[]) : [];
      },
    ),
  );
}

/** @deprecated Prefer fetchDiscoverSafe */
export async function fetchDiscover(): Promise<DiscoverData> {
  const result = await fetchDiscoverSafe();
  return result.data;
}
