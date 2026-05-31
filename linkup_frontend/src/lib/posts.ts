import { apiRequest, ApiError } from "./api";
import { PaginatedResponse, unwrapPaginated } from "./pagination";
import { AccountType, clearAuth, getToken } from "./auth";

export interface PostAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  accountType: AccountType;
  isVerified: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  groupId?: string | null;
  content: string;
  postType: string;
  visibility: string;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
}

export interface FeedPost extends Post {
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  isFollowingAuthor: boolean;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
}

export interface CreatePostPayload {
  content?: string;
  postType?: string;
  visibility?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}

export interface LikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface SaveResponse {
  saved: boolean;
  saveCount: number;
}

export interface DeleteCommentResponse {
  message: string;
  commentCount: number;
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

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  return withAuth(() =>
    apiRequest<Post>("/posts", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchFeed(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<FeedPost>> {
  return withAuth(() =>
    apiRequest<PaginatedResponse<FeedPost> | FeedPost[]>(
      `/posts/feed?page=${page}&limit=${limit}`,
      {
        headers: authHeaders(),
      },
    ).then(unwrapPaginated),
  );
}

export async function toggleLike(postId: string): Promise<LikeResponse> {
  return withAuth(() =>
    apiRequest<LikeResponse>(`/posts/${postId}/like`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function createComment(
  postId: string,
  content: string,
): Promise<Comment> {
  return withAuth(() =>
    apiRequest<Comment>(`/posts/${postId}/comments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    }),
  );
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  return withAuth(() =>
    apiRequest<Comment[]>(`/posts/${postId}/comments`, {
      headers: authHeaders(),
    }),
  );
}

export interface FollowResponse {
  following: boolean;
  followersCount: number;
  followingCount: number;
}

export async function toggleSave(postId: string): Promise<SaveResponse> {
  return withAuth(() =>
    apiRequest<SaveResponse>(`/posts/${postId}/save`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function deleteComment(
  commentId: string,
): Promise<DeleteCommentResponse> {
  return withAuth(() =>
    apiRequest<DeleteCommentResponse>(`/posts/comments/${commentId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  );
}

export async function fetchSavedPosts(): Promise<FeedPost[]> {
  return withAuth(() =>
    apiRequest<FeedPost[]>("/posts/saved", {
      headers: authHeaders(),
    }),
  );
}

export async function toggleFollow(userId: string): Promise<FollowResponse> {
  return withAuth(() =>
    apiRequest<FollowResponse>(`/users/${userId}/follow`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return "Just now";
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  const diffHours = Math.floor(diffMins / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatAccountType(accountType: AccountType): string {
  switch (accountType) {
    case "CREATOR":
      return "Creator";
    case "BUSINESS":
      return "Business";
    case "STUDENT":
      return "Student";
    case "PROFESSIONAL":
      return "Professional";
    default:
      return "Personal";
  }
}
