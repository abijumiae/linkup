"use client";

import { useOnlinePresence } from "@/src/lib/OnlinePresenceProvider";

/** Realtime online/offline presence for LinkUp users. */
export function useOnlineStatus() {
  const { isUserOnline, getLastSeenAt, onlineUsers, lastSeenAt } =
    useOnlinePresence();

  return {
    isOnline: isUserOnline,
    isUserOnline,
    getLastSeenAt,
    onlineUsers,
    lastSeenAt,
  };
}
