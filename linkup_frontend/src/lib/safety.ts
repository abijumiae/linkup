import { apiRequest, ApiError } from "./api";
import { clearAuth, getToken } from "./auth";

export type ReportTargetType =
  | "POST"
  | "USER"
  | "COMMENT"
  | "GROUP"
  | "MARKET"
  | "JOB"
  | "EVENT";

export interface CreateReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason?: string;
  category?: string;
  details?: string;
  description?: string;
}

export interface BlockedUser {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export type BlockStatus = {
  blockedByMe: boolean;
  blockedMe: boolean;
  isBlocked: boolean;
};

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

export async function createReport(
  payload: CreateReportPayload,
): Promise<{ id: string; message?: string }> {
  const body = {
    targetType: payload.targetType,
    targetId: payload.targetId,
    category: payload.category ?? payload.reason,
    description: payload.description ?? payload.details,
  };

  return withAuth(() =>
    apiRequest<{ id: string; message?: string }>("/reports", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    }),
  );
}

export async function blockUser(userId: string): Promise<{ blocked: boolean }> {
  return withAuth(() =>
    apiRequest<{ blocked: boolean }>(`/blocks/${userId}`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function unblockUser(userId: string): Promise<{ blocked: boolean }> {
  return withAuth(() =>
    apiRequest<{ blocked: boolean }>(`/blocks/${userId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  );
}

export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  return withAuth(() =>
    apiRequest<BlockedUser[]>("/blocks/me", {
      headers: authHeaders(),
    }),
  );
}

export async function fetchBlockStatus(userId: string): Promise<BlockStatus> {
  return withAuth(() =>
    apiRequest<BlockStatus>(`/blocks/${userId}/status`, {
      headers: authHeaders(),
    }),
  );
}

export const REPORT_CATEGORIES = [
  "Spam",
  "Harassment",
  "Hate or abuse",
  "Violence",
  "Scam or fraud",
  "Nudity or sexual content",
  "Misinformation",
  "Other",
] as const;

/** @deprecated Use REPORT_CATEGORIES */
export const REPORT_REASONS = REPORT_CATEGORIES;
