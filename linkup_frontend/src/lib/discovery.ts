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
