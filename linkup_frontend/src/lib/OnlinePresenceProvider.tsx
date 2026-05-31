"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSocket } from "@/src/components/SocketProvider";
import { fetchOnlineUserIds } from "@/src/lib/presence";

type OnlinePresenceContextValue = {
  onlineUsers: Set<string>;
  isUserOnline: (userId: string) => boolean;
};

const OnlinePresenceContext = createContext<OnlinePresenceContextValue | null>(
  null,
);

export function OnlinePresenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

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

    const removeUser = (userId: string) => {
      setOnlineUsers((current) => {
        if (!current.has(userId)) {
          return current;
        }
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
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

    const onUserOffline = (payload: { userId: string }) => {
      if (payload.userId) {
        removeUser(payload.userId);
      }
    };

    const syncOnlineUsers = () => {
      socket.emit("get_online_users");
      void fetchOnlineUserIds().then((userIds) => {
        if (userIds.length === 0) {
          return;
        }
        setOnlineUsers((current) => {
          const next = new Set(current);
          userIds.forEach((userId) => next.add(userId));
          return next;
        });
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
    (userId: string) => onlineUsers.has(userId),
    [onlineUsers],
  );

  const value = useMemo(
    () => ({
      onlineUsers,
      isUserOnline,
    }),
    [onlineUsers, isUserOnline],
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
