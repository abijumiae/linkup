"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Socket } from "socket.io-client";
import { useAuth } from "@/src/lib/AuthProvider";
import { getToken } from "@/src/lib/auth";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  SocketConnectionStatus,
  subscribeSocketStatus,
} from "@/src/lib/socket";

type SocketContextValue = {
  socket: Socket | null;
  status: SocketConnectionStatus;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<SocketConnectionStatus>("offline");

  useEffect(() => {
    return subscribeSocketStatus(setStatus);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !getToken()) {
      disconnectSocket();
      setSocket(null);
      return;
    }

    const activeSocket = connectSocket();
    setSocket(activeSocket);

    return () => {
      // Keep the shared socket alive for the app session; auth logout disconnects explicitly.
    };
  }, [isAuthenticated, isLoading]);

  const value = useMemo(
    () => ({
      socket: socket ?? getSocket(),
      status,
      isConnected: status === "connected",
    }),
    [socket, status],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }

  return context;
}
