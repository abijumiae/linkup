"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useSocket } from "@/src/components/SocketProvider";
import { getCurrentUser } from "@/src/lib/auth";
import { fetchOnlineStatus } from "@/src/lib/presence";

type OnlinePresenceContextValue = {
  onlineUsers: Set<string>;
  lastSeenAt: Map<string, string>;
  isUserOnline: (userId: string) => boolean;
  getLastSeenAt: (userId: string) => string | null;
};

const OnlinePresenceContext = createContext<OnlinePresenceContextValue | null>(
  null,
);

function applyStatusPayload(
  payload: { onlineUserIds?: string[]; users?: { id: string; lastSeenAt: string | null }[] },
  setOnlineUsers: Dispatch<SetStateAction<Set<string>>>,
  setLastSeenAt: Dispatch<SetStateAction<Map<string, string>>>,
) {
  if (payload.onlineUserIds?.length) {
    setOnlineUsers((current) => {
      const next = new Set(current);
      payload.onlineUserIds?.forEach((userId) => next.add(userId));
      return next;
    });
  }

  const users = payload.users;
  if (users?.length) {
    setOnlineUsers((current) => {
      const next = new Set(current);
      for (const user of users) {
        if (user.id) {
          next.add(user.id);
        }
      }
      return next;
    });
    setLastSeenAt((current) => {
      const next = new Map(current);
      for (const user of payload.users ?? []) {
        if (user.lastSeenAt) {
          next.set(user.id, user.lastSeenAt);
        }
      }
      return next;
    });
  }
}

export function OnlinePresenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenAt, setLastSeenAt] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const addUser = (userId: string) => {
      setOnlineUsers((current) => {
        if (current.has(userId)) {
          return current;
        }
        const next = new Set(current);
        next.add(userId);
        return next;
      });
    };

    const removeUser = (userId: string, seenAt?: string) => {
      setOnlineUsers((current) => {
        if (!current.has(userId)) {
          return current;
        }
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      if (seenAt) {
        setLastSeenAt((current) => {
          const next = new Map(current);
          next.set(userId, seenAt);
          return next;
        });
      }
    };

    const onOnlineUsers = (payload: { userIds?: string[] }) => {
      if (!payload.userIds?.length) {
        return;
      }
      setOnlineUsers((current) => {
        const next = new Set(current);
        payload.userIds?.forEach((userId) => next.add(userId));
        return next;
      });
    };

    const onUserOnline = (payload: { userId: string }) => {
      if (payload.userId) {
        addUser(payload.userId);
      }
    };

    const onUserOffline = (payload: { userId: string; lastSeenAt?: string }) => {
      if (payload.userId) {
        removeUser(payload.userId, payload.lastSeenAt);
      }
    };

    const syncOnlineUsers = () => {
      socket.emit("get_online_users");
      void fetchOnlineStatus().then((status) => {
        applyStatusPayload(status, setOnlineUsers, setLastSeenAt);
      });
    };

    socket.on("online_users", onOnlineUsers);
    socket.on("user_online", onUserOnline);
    socket.on("user_offline", onUserOffline);
    socket.on("connect", syncOnlineUsers);

    syncOnlineUsers();

    return () => {
      socket.off("online_users", onOnlineUsers);
      socket.off("user_online", onUserOnline);
      socket.off("user_offline", onUserOffline);
      socket.off("connect", syncOnlineUsers);
    };
  }, [socket, isConnected]);

  const isUserOnline = useCallback(
    (userId: string) => {
      const self = getCurrentUser();
      if (self?.id === userId && isConnected) {
        return true;
      }
      return onlineUsers.has(userId);
    },
    [onlineUsers, isConnected],
  );

  const getLastSeenAt = useCallback(
    (userId: string) => lastSeenAt.get(userId) ?? null,
    [lastSeenAt],
  );

  const value = useMemo(
    () => ({
      onlineUsers,
      lastSeenAt,
      isUserOnline,
      getLastSeenAt,
    }),
    [onlineUsers, lastSeenAt, isUserOnline, getLastSeenAt],
  );

  return (
    <OnlinePresenceContext.Provider value={value}>
      {children}
    </OnlinePresenceContext.Provider>
  );
}

export function useOnlinePresence(): OnlinePresenceContextValue {
  const context = useContext(OnlinePresenceContext);

  if (!context) {
    throw new Error("useOnlinePresence must be used within OnlinePresenceProvider");
  }

  return context;
}
