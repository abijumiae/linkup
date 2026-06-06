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
  getSocketReconnectAttempt,
  SocketConnectionStatus,
  subscribeSocketReconnectAttempt,
  subscribeSocketStatus,
} from "@/src/lib/socket";

type SocketContextValue = {
  socket: Socket | null;
  status: SocketConnectionStatus;
  reconnectAttempt: number;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<SocketConnectionStatus>("offline");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    return subscribeSocketStatus(setStatus);
  }, []);

  useEffect(() => {
    return subscribeSocketReconnectAttempt(setReconnectAttempt);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !getToken()) {
      disconnectSocket();
      setSocket(null);
      return;
    }

    const activeSocket = connectSocket();
    setSocket(activeSocket);
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      socket: socket ?? getSocket(),
      status,
      reconnectAttempt: reconnectAttempt || getSocketReconnectAttempt(),
      isConnected: status === "connected",
    }),
    [socket, status, reconnectAttempt],
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
