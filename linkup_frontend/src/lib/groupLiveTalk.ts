import { apiRequest, ApiError } from "./api";
import { clearAuth, getToken } from "./auth";

export type LiveTalkUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type LiveTalkParticipant = {
  id: string;
  userId: string;
  isMuted: boolean;
  joinedAt: string;
  leftAt: string | null;
  user: LiveTalkUser;
};

export type LiveTalkRoom = {
  id: string;
  groupId: string;
  hostId: string;
  status: "ACTIVE" | "ENDED";
  startedAt: string;
  endedAt: string | null;
  host: LiveTalkUser;
  participants: LiveTalkParticipant[];
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

export async function fetchActiveLiveTalk(
  groupId: string,
): Promise<LiveTalkRoom | null> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom | null>(`/groups/${groupId}/live-talk/active`, {
      headers: authHeaders(),
    }),
  );
}

export async function startLiveTalk(groupId: string): Promise<LiveTalkRoom> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom>(`/groups/${groupId}/live-talk/start`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function joinLiveTalk(
  groupId: string,
  roomId: string,
): Promise<LiveTalkRoom> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom>(
      `/groups/${groupId}/live-talk/${roomId}/join`,
      {
        method: "POST",
        headers: authHeaders(),
      },
    ),
  );
}

export async function leaveLiveTalk(
  groupId: string,
  roomId: string,
): Promise<LiveTalkRoom | null> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom | null>(
      `/groups/${groupId}/live-talk/${roomId}/leave`,
      {
        method: "POST",
        headers: authHeaders(),
      },
    ),
  );
}

export async function endLiveTalk(
  groupId: string,
  roomId: string,
): Promise<LiveTalkRoom | null> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom | null>(
      `/groups/${groupId}/live-talk/${roomId}/end`,
      {
        method: "POST",
        headers: authHeaders(),
      },
    ),
  );
}

export async function setLiveTalkMuted(
  groupId: string,
  roomId: string,
  isMuted: boolean,
): Promise<LiveTalkParticipant> {
  return withAuth(() =>
    apiRequest<LiveTalkParticipant>(
      `/groups/${groupId}/live-talk/${roomId}/mute`,
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isMuted }),
      },
    ),
  );
}
