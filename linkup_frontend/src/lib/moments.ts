import { apiRequest, ApiError, toAbsoluteMediaUrl } from "./api";
import { apiWarningFromError } from "./apiWarnings";

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
  return apiWarningFromError(error, "moments");
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
  const body: CreateMomentInput = {
    ...input,
    mediaUrl: toAbsoluteMediaUrl(input.mediaUrl),
  };

  return apiRequest<Moment>("/moments", {
    method: "POST",
    body: JSON.stringify(body),
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
