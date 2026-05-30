import { apiRequest, ApiError } from "./api";
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

export async function searchAll(query: string): Promise<SearchResults> {
  const params = new URLSearchParams({ q: query.trim() });
  return withAuth(() =>
    apiRequest<SearchResults>(`/search?${params.toString()}`, {
      headers: authHeaders(),
    }),
  );
}

export async function fetchExplorePosts(): Promise<FeedPost[]> {
  return withAuth(() =>
    apiRequest<FeedPost[]>("/explore", {
      headers: authHeaders(),
    }),
  );
}

export async function fetchDiscover(): Promise<DiscoverData> {
  return withAuth(() =>
    apiRequest<DiscoverData>("/discover", {
      headers: authHeaders(),
    }),
  );
}
