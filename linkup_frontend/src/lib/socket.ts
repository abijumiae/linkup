"use client";

import { io, Socket } from "socket.io-client";
import { getSocketBaseUrl } from "./api";
import { logLinkUpDiagnostic } from "./diagnostics";
import { getToken } from "./auth";

let socket: Socket | null = null;
let statusSocket: Socket | null = null;
let reconnectAttempt = 0;
let heartbeatTimer: number | null = null;
let loggedSocketUrl = false;

const connectHandlers = new Set<() => void>();

export type SocketConnectionStatus = "connected" | "reconnecting" | "offline";

const statusListeners = new Set<(status: SocketConnectionStatus) => void>();
const attemptListeners = new Set<(attempt: number) => void>();
let currentStatus: SocketConnectionStatus = "offline";

function notifyStatus(status: SocketConnectionStatus) {
  currentStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

function notifyReconnectAttempt(attempt: number) {
  reconnectAttempt = attempt;
  attemptListeners.forEach((listener) => listener(attempt));
}

function runConnectHandlers() {
  connectHandlers.forEach((handler) => {
    try {
      handler();
    } catch (error) {
      logLinkUpDiagnostic("socket", "Connect handler failed", error);
    }
  });
}

export function registerSocketConnectHandler(handler: () => void): () => void {
  connectHandlers.add(handler);
  if (socket?.connected) {
    handler();
  }
  return () => {
    connectHandlers.delete(handler);
  };
}

function startHeartbeat(activeSocket: Socket) {
  stopHeartbeat();
  heartbeatTimer = window.setInterval(() => {
    if (activeSocket.connected) {
      activeSocket.emit("client_ping");
    }
  }, 30_000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function detachStatusListeners(activeSocket: Socket) {
  activeSocket.off("connect");
  activeSocket.off("disconnect");
  activeSocket.off("reconnect_attempt");
  activeSocket.off("reconnect");
  activeSocket.off("connect_error");
  activeSocket.off("auth_error");
  activeSocket.io.off("open");
}

function attachStatusListeners(activeSocket: Socket) {
  if (statusSocket === activeSocket) {
    return;
  }

  if (statusSocket) {
    detachStatusListeners(statusSocket);
  }

  statusSocket = activeSocket;

  activeSocket.on("connect", () => {
    reconnectAttempt = 0;
    notifyReconnectAttempt(0);
    if (process.env.NODE_ENV === "development") {
      console.log("Socket connected:", activeSocket.id);
    }
    notifyStatus("connected");
    runConnectHandlers();
    startHeartbeat(activeSocket);
  });

  activeSocket.on("socket_ready", () => {
    runConnectHandlers();
  });

  activeSocket.on("disconnect", (reason) => {
    stopHeartbeat();
    logLinkUpDiagnostic("socket", `Disconnected (${reason})`);
    if (reason === "io client disconnect") {
      notifyStatus("offline");
      return;
    }
    notifyStatus("reconnecting");
  });

  activeSocket.on("reconnect_attempt", (attempt) => {
    notifyReconnectAttempt(attempt);
    notifyStatus("reconnecting");
    logLinkUpDiagnostic("socket", `Reconnect attempt ${attempt}`);
  });

  activeSocket.on("reconnect", (attempt) => {
    reconnectAttempt = 0;
    notifyReconnectAttempt(0);
    logLinkUpDiagnostic("socket", `Reconnected after ${attempt} attempts`);
    notifyStatus("connected");
    runConnectHandlers();
    startHeartbeat(activeSocket);
  });

  activeSocket.on("connect_error", (err: Error) => {
    logLinkUpDiagnostic("socket", `Connect error: ${err.message}`);
    notifyStatus("reconnecting");
  });

  activeSocket.io.on("open", () => {
    if (!activeSocket.connected) {
      notifyStatus("reconnecting");
    }
  });

  activeSocket.on("auth_error", (payload: { message?: string }) => {
    logLinkUpDiagnostic(
      "socket",
      payload?.message ?? "Socket authentication failed",
    );
    activeSocket.io.opts.reconnection = false;
    notifyStatus("offline");
    activeSocket.disconnect();
  });
}

export type ReceivedDirectMessage = {
  chatType: "direct";
  message: {
    id: string;
    type?: string;
    content: string;
    mediaUrl?: string | null;
    audioUrl?: string | null;
    mediaType?: string | null;
    duration?: number | null;
    senderId: string;
    receiverId: string;
    read: boolean;
    createdAt: string;
    updatedAt: string;
    sender: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    };
  };
};

export type ReceivedGroupMessage = {
  chatType: "group";
  message: {
    id: string;
    content: string;
    groupId: string;
    senderId: string;
    createdAt: string;
    updatedAt: string;
    sender: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    };
  };
};

export type MessageReceivedPayload =
  | ReceivedDirectMessage
  | ReceivedGroupMessage;

export type TypingPayload = {
  chatType: "direct" | "group";
  targetId: string;
  isTyping: boolean;
  userId: string;
};

function normalizeDate(value: string | Date): string {
  return typeof value === "string" ? value : new Date(value).toISOString();
}

export function normalizeReceivedMessage(
  payload: MessageReceivedPayload,
): MessageReceivedPayload {
  if (payload.chatType === "direct") {
    return {
      chatType: "direct",
      message: {
        ...payload.message,
        createdAt: normalizeDate(payload.message.createdAt),
        updatedAt: normalizeDate(payload.message.updatedAt),
      },
    };
  }

  return {
    chatType: "group",
    message: {
      ...payload.message,
      createdAt: normalizeDate(payload.message.createdAt),
      updatedAt: normalizeDate(payload.message.updatedAt),
    },
  };
}

export function toMessageReceivedPayload(
  payload: unknown,
): MessageReceivedPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (
    record.type === "chat" &&
    record.message &&
    typeof record.message === "object"
  ) {
    return toMessageReceivedPayload({ message: record.message });
  }

  if ("chatType" in record && "message" in record) {
    return normalizeReceivedMessage(payload as MessageReceivedPayload);
  }

  if ("message" in record) {
    const message = (record as { message: Record<string, unknown> }).message;
    if (typeof message.groupId === "string") {
      return normalizeReceivedMessage({
        chatType: "group",
        message: message as ReceivedGroupMessage["message"],
      });
    }

    return normalizeReceivedMessage({
      chatType: "direct",
      message: message as ReceivedDirectMessage["message"],
    });
  }

  if (
    typeof record.id === "string" &&
    typeof record.senderId === "string" &&
    typeof record.receiverId === "string" &&
    !("groupId" in record)
  ) {
    return normalizeReceivedMessage({
      chatType: "direct",
      message: record as ReceivedDirectMessage["message"],
    });
  }

  return null;
}

export function hasAuthToken(): boolean {
  return Boolean(getToken());
}

function teardownSocket() {
  if (!socket) {
    return;
  }
  stopHeartbeat();
  detachStatusListeners(socket);
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  statusSocket = null;
}

connectHandlers.add(() => {
  socket?.emit("join_pulse");
});

/** Connect to LinkUp real-time socket with JWT auth. */
export function connectSocket(token?: string | null): Socket | null {
  if (typeof window === "undefined") {
    return null;
  }

  const authToken = token ?? getToken();

  if (!authToken) {
    disconnectSocket();
    return null;
  }

  const socketUrl = getSocketBaseUrl();
  if (!loggedSocketUrl) {
    loggedSocketUrl = true;
    logLinkUpDiagnostic("socket", `Connecting to ${socketUrl}`);
    if (process.env.NODE_ENV === "development") {
      console.log("Socket connecting to:", socketUrl);
    }
  }

  const existingToken = (socket?.auth as { token?: string } | undefined)?.token;
  if (socket?.connected && existingToken === authToken) {
    return socket;
  }

  if (socket && existingToken === authToken) {
    socket.auth = { token: authToken };
    socket.io.opts.reconnection = true;
    if (!socket.connected) {
      socket.connect();
    }
    attachStatusListeners(socket);
    notifyStatus(socket.connected ? "connected" : "offline");
    return socket;
  }

  if (socket) {
    teardownSocket();
  }

  socket = io(socketUrl, {
    path: "/socket.io",
    auth: { token: authToken },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 30_000,
    randomizationFactor: 0.4,
    timeout: process.env.NODE_ENV === "production" ? 45_000 : 20_000,
    withCredentials: true,
  });

  attachStatusListeners(socket);
  notifyStatus(socket.connected ? "connected" : "offline");

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function getSocketStatus(): SocketConnectionStatus {
  return currentStatus;
}

export function getSocketReconnectAttempt(): number {
  return reconnectAttempt;
}

export function subscribeSocketStatus(
  listener: (status: SocketConnectionStatus) => void,
): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export function subscribeSocketReconnectAttempt(
  listener: (attempt: number) => void,
): () => void {
  attemptListeners.add(listener);
  listener(reconnectAttempt);
  return () => {
    attemptListeners.delete(listener);
  };
}

export function isSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

export function disconnectSocket() {
  teardownSocket();
  reconnectAttempt = 0;
  notifyReconnectAttempt(0);
  notifyStatus("offline");
}

/** Reconnect with the latest JWT (e.g. after token refresh). */
export function reconnectSocket(): Socket | null {
  return connectSocket(getToken());
}

/** @deprecated Use connectSocket */
export const getChatSocket = connectSocket;

/** @deprecated Use disconnectSocket */
export const disconnectChatSocket = disconnectSocket;

export type ChatSocketMessage = MessageReceivedPayload & {
  type?: "direct" | "group";
};
