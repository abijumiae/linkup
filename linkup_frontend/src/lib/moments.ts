import { apiRequest } from "./api";

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
