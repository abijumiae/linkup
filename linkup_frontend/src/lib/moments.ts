import { apiRequest, ApiError, getApiBaseUrl } from "./api";

export type MomentUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type Moment = {
  id: string;
  userId: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  background: string | null;
  expiresAt: string;
  createdAt: string;
  user: MomentUser;
};

export type MomentGroup = {
  user: MomentUser;
  moments: Moment[];
};

export type MomentsFeed = {
  groups: MomentGroup[];
};

export type CreateMomentInput = {
  content?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "text";
  background?: string;
};

function momentsWarningFromError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      const api = getApiBaseUrl();
      if (api.includes("onrender.com")) {
        return "Moments API is not deployed on Render yet. Redeploy linkup-backend (clear build cache), then refresh.";
      }
      return `Moments API returned 404 from ${api}. Run: cd linkup_backend && npm run start:dev`;
    }
    if (error.status === 0) {
      if (error.message.includes("timed out")) {
        return "Backend or database timed out. Check Neon connection in linkup_backend/.env and restart the backend.";
      }
      return "Cannot reach the backend. Start linkup_backend on http://localhost:3000.";
    }
  }

  return "Moments are warming up.";
}

export async function fetchMomentsFeedSafe(): Promise<{
  groups: MomentGroup[];
  warning: string | null;
}> {
  try {
    const feed = await fetchMomentsFeed();
    return { groups: feed.groups ?? [], warning: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    return { groups: [], warning: momentsWarningFromError(error) };
  }
}

export async function fetchMyMomentsSafe(): Promise<{
  moments: Moment[];
  warning: string | null;
}> {
  try {
    const moments = await apiRequest<Moment[]>("/moments/me");
    return { moments: moments ?? [], warning: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    return { moments: [], warning: momentsWarningFromError(error) };
  }
}

export async function fetchMomentsFeed(): Promise<MomentsFeed> {
  return apiRequest<MomentsFeed>("/moments");
}

export async function fetchUserMoments(userId: string): Promise<Moment[]> {
  return apiRequest<Moment[]>(`/moments/${userId}`);
}

export async function createMoment(input: CreateMomentInput): Promise<Moment> {
  return apiRequest<Moment>("/moments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteMoment(momentId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/moments/${momentId}`, {
    method: "DELETE",
  });
}

export function userHasActiveMoments(groups: MomentGroup[], userId: string): boolean {
  return groups.some(
    (group) => group.user.id === userId && group.moments.length > 0,
  );
}
