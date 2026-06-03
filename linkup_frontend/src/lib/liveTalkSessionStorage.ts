const STORAGE_KEY = "linkup_live_talk_session";

export type StoredLiveTalkSession = {
  groupId: string;
  roomId: string;
  userId: string;
  savedAt: number;
};

export function saveLiveTalkSession(session: StoredLiveTalkSession) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota errors
  }
}

export function readLiveTalkSession(
  groupId: string,
  userId: string,
): StoredLiveTalkSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredLiveTalkSession;
    if (parsed.groupId !== groupId || parsed.userId !== userId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLiveTalkSession() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
