import { apiRequest, ApiError } from "./api";
import { clearAuth, getToken } from "./auth";

export type ReportTargetType = "POST" | "USER";

export interface CreateReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
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
  return withAuth(() =>
    apiRequest<{ id: string; message?: string }>("/reports", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
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
    apiRequest<BlockedUser[]>("/blocks", {
      headers: authHeaders(),
    }),
  );
}

export const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Inappropriate content",
  "Misinformation",
  "Impersonation",
  "Other",
] as const;
