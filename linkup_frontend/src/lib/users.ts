import { apiRequest, ApiError } from "./api";
import { clearAuth, getToken, saveUser, User } from "./auth";

export interface ProfileUser extends User {
  bio?: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
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
    return data.user;
  });
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
  return withAuth(async () => {
    const data = await apiRequest<{ user: User }>("/users/me", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    saveUser(data.user);
    return data.user;
  });
}
