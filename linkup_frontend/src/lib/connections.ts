import { apiRequest, ApiError } from "./api";
import { AccountType, clearAuth, getToken } from "./auth";

export interface ConnectionUser {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  accountType: AccountType;
  isVerified: boolean;
  bio?: string | null;
  country?: string | null;
  isFollowingAuthor?: boolean;
  connectedAt?: string;
}

export interface ConnectionsResponse {
  following: ConnectionUser[];
  followers: ConnectionUser[];
  followingCount: number;
  followersCount: number;
}

export interface FollowResponse {
  following: boolean;
  followersCount: number;
  followingCount: number;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }
  return { Authorization: `Bearer ${token}` };
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

export async function fetchMyConnections(): Promise<ConnectionsResponse> {
  return withAuth(() =>
    apiRequest<ConnectionsResponse>("/connections/me", {
      headers: authHeaders(),
    }),
  );
}

export async function fetchConnectionSuggestions(): Promise<ConnectionUser[]> {
  return withAuth(() =>
    apiRequest<ConnectionUser[]>("/connections/suggestions", {
      headers: authHeaders(),
    }),
  );
}

export async function fetchConnectionSuggestionsSafe(): Promise<ConnectionUser[]> {
  try {
    return await fetchConnectionSuggestions();
  } catch {
    return [];
  }
}

export async function connectUser(userId: string): Promise<FollowResponse> {
  return withAuth(() =>
    apiRequest<FollowResponse>(`/connections/${userId}`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function disconnectUser(userId: string): Promise<FollowResponse> {
  return withAuth(() =>
    apiRequest<FollowResponse>(`/connections/${userId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  );
}

export async function fetchConnectionStatus(userId: string): Promise<{
  following: boolean;
  connected: boolean;
  isSelf: boolean;
}> {
  return withAuth(() =>
    apiRequest<{ following: boolean; connected: boolean; isSelf: boolean }>(
      `/connections/${userId}/status`,
      { headers: authHeaders() },
    ),
  );
}
