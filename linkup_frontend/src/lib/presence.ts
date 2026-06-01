import { apiRequest } from "./api";

export type OnlineStatusUser = {
  id: string;
  online: boolean;
  lastSeenAt: string | null;
};

export type OnlineStatusResponse = {
  onlineUserIds: string[];
  users?: OnlineStatusUser[];
};

export async function fetchOnlineStatus(): Promise<OnlineStatusResponse> {
  try {
    const response = await apiRequest<OnlineStatusResponse>(
      "/users/online-status",
    );
    return {
      onlineUserIds: response.onlineUserIds ?? [],
      users: response.users ?? [],
    };
  } catch {
    try {
      const legacy = await apiRequest<{ userIds: string[] }>("/users/online");
      return {
        onlineUserIds: legacy.userIds ?? [],
        users: (legacy.userIds ?? []).map((id) => ({
          id,
          online: true,
          lastSeenAt: null,
        })),
      };
    } catch {
      return { onlineUserIds: [], users: [] };
    }
  }
}

/** @deprecated Use fetchOnlineStatus */
export async function fetchOnlineUserIds(): Promise<string[]> {
  const status = await fetchOnlineStatus();
  return status.onlineUserIds;
}

export function formatLastSeen(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) {
    return "Offline";
  }

  const then = new Date(lastSeenAt).getTime();
  if (Number.isNaN(then)) {
    return "Offline";
  }

  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "Last seen just now";
  }
  if (minutes < 60) {
    return `Last seen ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Last seen ${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `Last seen ${days}d ago`;
}

export async function notifyLogout(): Promise<void> {
  try {
    await apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
  } catch {
    // Best-effort; socket disconnect also marks the user offline.
  }
}
