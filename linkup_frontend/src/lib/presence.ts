import { apiRequest } from "./api";

export async function fetchOnlineUserIds(): Promise<string[]> {
  try {
    const response = await apiRequest<{ userIds: string[] }>("/users/online");
    return response.userIds ?? [];
  } catch {
    return [];
  }
}

export async function notifyLogout(): Promise<void> {
  try {
    await apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
  } catch {
    // Best-effort; socket disconnect also marks the user offline.
  }
}
