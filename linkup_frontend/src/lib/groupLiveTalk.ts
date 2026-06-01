import { apiRequest, ApiError, getApiBaseUrl } from "./api";
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
  handRaised: boolean;
  joinedAt: string;
  leftAt: string | null;
  user: LiveTalkUser;
};

export type LiveTalkMessage = {
  id: string;
  roomId: string;
  userId: string | null;
  kind: "text" | "system";
  content: string;
  createdAt: string;
  user: LiveTalkUser | null;
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

async function liveTalkBackendHint(): Promise<string> {
  try {
    const health = await fetch(`${getApiBaseUrl()}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!health.ok) {
      return "Cannot reach the LinkUp API. Check that linkup_backend is running.";
    }
    const body = (await health.json()) as {
      features?: { liveTalk?: boolean };
    };
    if (body.features?.liveTalk) {
      return "Live Talk route failed unexpectedly. Refresh and try again.";
    }
  } catch {
    // fall through
  }

  if (process.env.NODE_ENV === "development") {
    return "Live Talk needs a fresh backend. In linkup_backend run: npm run build && npm run start:dev (stop any old server on port 3000 first).";
  }

  return "Live Talk is not ready yet. Redeploy linkup-backend on Render, then try again.";
}

async function mapLiveTalkApiError(error: unknown): Promise<never> {
  if (error instanceof ApiError) {
    if (
      error.status === 404 &&
      /cannot (post|get|patch)/i.test(error.message)
    ) {
      throw new ApiError(await liveTalkBackendHint(), error.status);
    }
    if (error.status === 401) {
      clearAuth();
    }
  }
  throw error;
}

async function withAuth<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    return await mapLiveTalkApiError(error);
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

export async function setLiveTalkHand(
  groupId: string,
  roomId: string,
  handRaised: boolean,
): Promise<LiveTalkParticipant> {
  return withAuth(() =>
    apiRequest<LiveTalkParticipant>(
      `/groups/${groupId}/live-talk/${roomId}/hand`,
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ handRaised }),
      },
    ),
  );
}

export async function fetchLiveTalkMessages(
  groupId: string,
  roomId: string,
): Promise<LiveTalkMessage[]> {
  return withAuth(() =>
    apiRequest<LiveTalkMessage[]>(
      `/groups/${groupId}/live-talk/${roomId}/messages`,
      { headers: authHeaders() },
    ),
  );
}

export async function postLiveTalkMessage(
  groupId: string,
  roomId: string,
  content: string,
): Promise<LiveTalkMessage> {
  return withAuth(() =>
    apiRequest<LiveTalkMessage>(
      `/groups/${groupId}/live-talk/${roomId}/messages`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content }),
      },
    ),
  );
}
