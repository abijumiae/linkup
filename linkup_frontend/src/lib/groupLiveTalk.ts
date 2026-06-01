import { apiRequest, ApiError, getApiBaseUrl } from "./api";
import { clearAuth, getToken } from "./auth";

export type LiveTalkUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type LiveTalkGroupRole = "OWNER" | "ADMIN" | "MEMBER";

export type LiveTalkParticipant = {
  id: string;
  userId: string;
  isMuted: boolean;
  handRaised: boolean;
  handRaisedAt: string | null;
  joinedAt: string;
  leftAt: string | null;
  groupRole: LiveTalkGroupRole;
  user: LiveTalkUser;
};

export type RaisedHandQueueItem = {
  userId: string;
  handRaisedAt: string;
  groupRole: LiveTalkGroupRole;
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
  activeMicUserId: string | null;
  activeMicStartedAt: string | null;
  startedAt: string;
  endedAt: string | null;
  host: LiveTalkUser;
  activeMicUser: LiveTalkUser | null;
  participants: LiveTalkParticipant[];
  raisedHands: RaisedHandQueueItem[];
};

export type LiveTalkStatusParticipant = LiveTalkParticipant & {
  speaking: boolean;
  inCall: boolean;
};

export type LiveTalkStatus = {
  active: boolean;
  roomId: string | null;
  room: LiveTalkRoom | null;
  participants: LiveTalkStatusParticipant[];
  raisedHands: RaisedHandQueueItem[];
  speakingUserIds: string[];
};

export class LiveTalkAuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LiveTalkAuthError";
    this.status = status;
  }
}

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

function mapLiveTalkMessage(error: ApiError): string {
  if (error.status === 403) {
    return (
      error.message ||
      "You do not have permission to perform this Live Talk action."
    );
  }
  if (error.status === 401) {
    return "Please sign in to use Live Talk.";
  }
  return error.message;
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
      throw new LiveTalkAuthError(mapLiveTalkMessage(error), 401);
    }
    if (error.status === 403) {
      throw new ApiError(mapLiveTalkMessage(error), 403);
    }
    if (error.status === 409) {
      throw new ApiError(error.message || "Mic is already in use.", 409);
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

export async function fetchLiveTalkStatus(
  groupId: string,
): Promise<LiveTalkStatus> {
  const response = await withAuth(() =>
    apiRequest<LiveTalkStatus>(`/groups/${groupId}/live-talk/status`, {
      headers: authHeaders(),
    }),
  );

  const raisedHands =
    response.raisedHands ?? response.room?.raisedHands ?? [];

  return {
    ...response,
    raisedHands,
    room: response.room
      ? { ...response.room, raisedHands: response.room.raisedHands ?? raisedHands }
      : null,
  };
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
  roomId?: string,
): Promise<LiveTalkRoom> {
  const path = roomId
    ? `/groups/${groupId}/live-talk/${roomId}/join`
    : `/groups/${groupId}/live-talk/join`;
  return withAuth(() =>
    apiRequest<LiveTalkRoom>(path, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function leaveLiveTalk(
  groupId: string,
  roomId?: string,
): Promise<LiveTalkRoom | null> {
  const path = roomId
    ? `/groups/${groupId}/live-talk/${roomId}/leave`
    : `/groups/${groupId}/live-talk/leave`;
  return withAuth(() =>
    apiRequest<LiveTalkRoom | null>(path, {
      method: "POST",
      headers: authHeaders(),
    }),
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

export async function openLiveTalkMic(
  groupId: string,
  roomId: string,
): Promise<LiveTalkRoom> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom>(
      `/groups/${groupId}/live-talk/${roomId}/open-mic`,
      {
        method: "POST",
        headers: authHeaders(),
      },
    ),
  );
}

export async function releaseLiveTalkMic(
  groupId: string,
  roomId: string,
): Promise<LiveTalkRoom> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom>(
      `/groups/${groupId}/live-talk/${roomId}/release-mic`,
      {
        method: "POST",
        headers: authHeaders(),
      },
    ),
  );
}

export async function passLiveTalkMic(
  groupId: string,
  roomId: string,
  targetUserId: string,
): Promise<LiveTalkRoom> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom>(
      `/groups/${groupId}/live-talk/${roomId}/pass-mic`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ targetUserId }),
      },
    ),
  );
}

export async function forceReleaseLiveTalkMic(
  groupId: string,
  roomId: string,
): Promise<LiveTalkRoom> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom>(
      `/groups/${groupId}/live-talk/${roomId}/force-release-mic`,
      {
        method: "POST",
        headers: authHeaders(),
      },
    ),
  );
}

export async function muteLiveTalkParticipant(
  groupId: string,
  roomId: string,
  targetUserId: string,
  isMuted: boolean,
): Promise<LiveTalkRoom> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom>(
      `/groups/${groupId}/live-talk/${roomId}/mute-participant`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ targetUserId, isMuted }),
      },
    ),
  );
}

export async function removeLiveTalkParticipant(
  groupId: string,
  roomId: string,
  targetUserId: string,
): Promise<LiveTalkRoom | null> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom | null>(
      `/groups/${groupId}/live-talk/${roomId}/remove-participant`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ targetUserId }),
      },
    ),
  );
}

export async function clearLiveTalkHand(
  groupId: string,
  roomId: string,
  targetUserId: string,
): Promise<LiveTalkRoom> {
  return withAuth(() =>
    apiRequest<LiveTalkRoom>(
      `/groups/${groupId}/live-talk/${roomId}/clear-hand`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ targetUserId }),
      },
    ),
  );
}

export async function raiseLiveTalkHand(
  groupId: string,
  roomId: string,
): Promise<LiveTalkParticipant> {
  return withAuth(() =>
    apiRequest<LiveTalkParticipant>(
      `/groups/${groupId}/live-talk/${roomId}/raise-hand`,
      {
        method: "POST",
        headers: authHeaders(),
      },
    ),
  );
}

export async function lowerLiveTalkHand(
  groupId: string,
  roomId: string,
): Promise<LiveTalkParticipant> {
  return withAuth(() =>
    apiRequest<LiveTalkParticipant>(
      `/groups/${groupId}/live-talk/${roomId}/lower-hand`,
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
