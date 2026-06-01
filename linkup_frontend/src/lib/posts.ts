import { apiRequest, ApiError, toAbsoluteMediaUrl } from "./api";
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

export interface UpdatePostPayload {
  content?: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  removeMedia?: boolean;
}

export interface DeletePostResponse {
  success: boolean;
  id: string;
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

function normalizeCreatePostPayload(
  payload: CreatePostPayload,
): CreatePostPayload {
  return {
    ...payload,
    imageUrl: toAbsoluteMediaUrl(payload.imageUrl),
    videoUrl: toAbsoluteMediaUrl(payload.videoUrl),
    mediaUrl: toAbsoluteMediaUrl(payload.mediaUrl),
  };
}

function normalizeUpdatePostPayload(
  payload: UpdatePostPayload,
): UpdatePostPayload {
  const normalized: UpdatePostPayload = { ...payload };

  if (payload.mediaUrl) {
    normalized.mediaUrl = toAbsoluteMediaUrl(payload.mediaUrl);
  }

  return normalized;
}

export function getCreatePostErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    const message = error.message.toLowerCase();
    if (
      message.includes("mediaurl") ||
      message.includes("imageurl") ||
      message.includes("videourl") ||
      message.includes("url address")
    ) {
      return "Media URL format is invalid. Please re-upload and try again.";
    }
  }

  return "Could not drop your Spark. Please try again.";
}

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  const body = normalizeCreatePostPayload(payload);

  return withAuth(() =>
    apiRequest<Post>("/posts", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    }),
  );
}

export async function updatePost(
  postId: string,
  payload: UpdatePostPayload,
): Promise<FeedPost> {
  const body = normalizeUpdatePostPayload(payload);

  return withAuth(() =>
    apiRequest<FeedPost>(`/posts/${postId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    }),
  );
}

export async function deletePost(postId: string): Promise<DeletePostResponse> {
  return withAuth(() =>
    apiRequest<DeletePostResponse>(`/posts/${postId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  );
}

export async function fetchFeed(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<FeedPost>> {
  const started =
    process.env.NODE_ENV === "development" ? performance.now() : 0;

  const result = await withAuth(() =>
    apiRequest<PaginatedResponse<FeedPost> | FeedPost[]>(
      `/posts/feed?page=${page}&limit=${limit}`,
      {
        headers: authHeaders(),
      },
    ).then(unwrapPaginated),
  );

  if (process.env.NODE_ENV === "development") {
    console.debug(
      `[perf] feed page=${page} limit=${limit} ${Math.round(performance.now() - started)}ms`,
    );
  }

  return result;
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
  postId?: string,
): Promise<DeleteCommentResponse> {
  const path = postId
    ? `/posts/${postId}/comments/${commentId}`
    : `/posts/comments/${commentId}`;

  return withAuth(() =>
    apiRequest<DeleteCommentResponse>(path, {
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

export async function fetchSavedPostsSafe(): Promise<FeedPost[]> {
  try {
    return await fetchSavedPosts();
  } catch {
    return [];
  }
}

export function mapProfilePostToFeedPost(
  post: {
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
  },
  author: PostAuthor,
  options?: { liked?: boolean; saved?: boolean },
): FeedPost {
  return {
    id: post.id,
    authorId: post.authorId,
    groupId: null,
    content: post.content,
    postType: post.postType,
    visibility: post.visibility,
    imageUrl: post.imageUrl,
    videoUrl: post.videoUrl,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    liked: options?.liked ?? false,
    saved: options?.saved ?? false,
    isFollowingAuthor: false,
  };
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
