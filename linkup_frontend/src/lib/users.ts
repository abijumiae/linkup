import { apiRequest, ApiError, toAbsoluteMediaUrl } from "./api";
import { clearAuth, getCurrentUser, getToken, saveUser, User } from "./auth";

export interface ProfileUser extends User {
  bio?: string | null;
  interests?: string | null;
  skills?: string | null;
  website?: string | null;
  openToConnect?: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  hubsCount?: number;
  workCount?: number;
}

export interface UserPost {
  id: string;
  authorId: string;
  content: string;
  postType: string;
  visibility: string;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
}

export interface UpdateProfilePayload {
  name?: string;
  username?: string;
  country?: string;
  language?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  interests?: string;
  skills?: string;
  website?: string;
  openToConnect?: string;
  accountType?: User["accountType"];
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

export async function fetchUserProfile(): Promise<ProfileUser> {
  return withAuth(async () => {
    const data = await apiRequest<{ user: ProfileUser }>("/users/me", {
      headers: authHeaders(),
    });

    saveUser(data.user);
    return {
      ...data.user,
      hubsCount: data.user.hubsCount ?? 0,
      workCount: data.user.workCount ?? 0,
    };
  });
}

export function profileFromCachedUser(user: User): ProfileUser {
  return {
    ...user,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    hubsCount: 0,
    workCount: 0,
  };
}

export async function fetchUserProfileSafe(): Promise<{
  user: ProfileUser;
  warning: string | null;
}> {
  try {
    const user = await fetchUserProfile();
    return { user, warning: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }

    const cached = getCurrentUser();
    if (cached) {
      return {
        user: profileFromCachedUser(cached),
        warning: "Profile data is warming up.",
      };
    }

    throw error;
  }
}

export async function fetchMyPostsSafe(): Promise<UserPost[]> {
  try {
    return await fetchMyPosts();
  } catch {
    return [];
  }
}

export async function fetchMyPosts(): Promise<UserPost[]> {
  return withAuth(() =>
    apiRequest<UserPost[]>("/users/me/posts", {
      headers: authHeaders(),
    }),
  );
}

export async function updateUserProfile(
  payload: UpdateProfilePayload,
): Promise<User> {
  const body: UpdateProfilePayload = {
    ...payload,
    avatarUrl: toAbsoluteMediaUrl(payload.avatarUrl),
    coverUrl: toAbsoluteMediaUrl(payload.coverUrl),
  };

  return withAuth(async () => {
    const data = await apiRequest<{ user: User }>("/users/me", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    saveUser(data.user);
    return data.user;
  });
}
