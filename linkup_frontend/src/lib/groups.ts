import { apiRequest, ApiError } from "./api";
import { PaginatedResponse, unwrapPaginated } from "./pagination";
import { clearAuth, getToken } from "./auth";
import { FeedPost } from "./posts";

export interface GroupOwner {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  coverImage: string | null;
  ownerId: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  membersCount: number;
  isMember: boolean;
  isOwner: boolean;
}

export interface GroupDetail extends Group {
  owner: GroupOwner;
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | null;
}

export interface CreateGroupPayload {
  name: string;
  description: string;
  coverImage?: string;
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

export async function fetchGroups(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Group>> {
  return withAuth(() =>
    apiRequest<PaginatedResponse<Group> | Group[]>(
      `/groups?page=${page}&limit=${limit}`,
      {
        headers: authHeaders(),
      },
    ).then(unwrapPaginated),
  );
}

export async function fetchGroup(id: string): Promise<GroupDetail> {
  return withAuth(() =>
    apiRequest<GroupDetail>(`/groups/${id}`, {
      headers: authHeaders(),
    }),
  );
}

export type UpdateGroupPayload = {
  name?: string;
  description?: string;
  coverImage?: string | null;
};

export async function updateGroup(
  groupId: string,
  payload: UpdateGroupPayload,
): Promise<GroupDetail> {
  return withAuth(() =>
    apiRequest<GroupDetail>(`/groups/${groupId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function createGroup(
  payload: CreateGroupPayload,
): Promise<GroupDetail> {
  return withAuth(() =>
    apiRequest<GroupDetail>("/groups", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function joinGroup(id: string): Promise<GroupDetail> {
  return withAuth(() =>
    apiRequest<GroupDetail>(`/groups/${id}/join`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function leaveGroup(id: string): Promise<GroupDetail> {
  return withAuth(() =>
    apiRequest<GroupDetail>(`/groups/${id}/leave`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export type PaginatedGroupPosts = {
  items: FeedPost[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export async function fetchGroupPosts(
  groupId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedGroupPosts> {
  const response = await withAuth(() =>
    apiRequest<PaginatedGroupPosts | FeedPost[]>(
      `/groups/${groupId}/posts?page=${page}&limit=${limit}`,
      { headers: authHeaders() },
    ),
  );

  if (Array.isArray(response)) {
    return {
      items: response,
      page: 1,
      limit: response.length,
      hasMore: false,
    };
  }

  const items = Array.isArray(response?.items) ? response.items : [];

  return {
    items,
    page: response?.page ?? page,
    limit: response?.limit ?? limit,
    hasMore: response?.hasMore ?? false,
  };
}

export async function createGroupPost(
  groupId: string,
  content: string,
): Promise<FeedPost> {
  return withAuth(() =>
    apiRequest<FeedPost>(`/groups/${groupId}/posts`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    }),
  );
}

export async function transferGroupOwnership(
  groupId: string,
  targetUserId: string,
): Promise<GroupDetail> {
  return withAuth(() =>
    apiRequest<GroupDetail>(`/groups/${groupId}/transfer-ownership`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ targetUserId }),
    }),
  );
}

export async function archiveGroup(groupId: string): Promise<GroupDetail> {
  return withAuth(() =>
    apiRequest<GroupDetail>(`/groups/${groupId}/archive`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function permanentlyDeleteGroup(
  groupId: string,
  confirmName: string,
  password: string,
): Promise<{ deleted: true; groupId: string; groupName: string }> {
  return withAuth(() =>
    apiRequest<{ deleted: true; groupId: string; groupName: string }>(
      `/groups/${groupId}`,
      {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ confirmName, password }),
      },
    ),
  );
}
