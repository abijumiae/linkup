"use client";

import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "./api";
import { getToken } from "./auth";

let socket: Socket | null = null;
let statusSocket: Socket | null = null;

export type SocketConnectionStatus = "connected" | "reconnecting" | "offline";

const statusListeners = new Set<(status: SocketConnectionStatus) => void>();
let currentStatus: SocketConnectionStatus = "offline";

function notifyStatus(status: SocketConnectionStatus) {
  currentStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

function detachStatusListeners(activeSocket: Socket) {
  activeSocket.off("connect");
  activeSocket.off("disconnect");
  activeSocket.off("reconnect_attempt");
  activeSocket.off("reconnect");
  activeSocket.off("connect_error");
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
    if (process.env.NODE_ENV === "development") {
      console.log("Socket connected:", activeSocket.id);
    }
    notifyStatus("connected");
  });

  activeSocket.on("disconnect", () => {
    notifyStatus("offline");
  });

  activeSocket.on("reconnect_attempt", () => {
    notifyStatus("reconnecting");
  });

  activeSocket.on("reconnect", () => {
    notifyStatus("connected");
  });

  activeSocket.on("connect_error", (err: Error) => {
    console.log("Socket connect_error:", err.message);
    if (!activeSocket.connected) {
      notifyStatus("reconnecting");
    }
  });
}

export type ReceivedDirectMessage = {
  chatType: "direct";
  message: {
    id: string;
    type?: string;
    content: string;
    mediaUrl?: string | null;
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

/** Connect to LinkUp real-time socket with JWT auth. */
export function connectSocket(token?: string | null): Socket | null {
  if (typeof window === "undefined") {
    return null;
  }

  const authToken = token ?? getToken();
  if (process.env.NODE_ENV === "development") {
    console.log("Socket token exists:", Boolean(authToken));
  }

  if (!authToken) {
    disconnectSocket();
    return null;
  }

  const apiUrl = getApiBaseUrl();
  if (process.env.NODE_ENV === "development") {
    console.log("Socket connecting to:", apiUrl);
  }

  if (socket?.connected) {
    socket.auth = { token: authToken };
    return socket;
  }

  if (socket) {
    detachStatusListeners(socket);
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    statusSocket = null;
  }

  socket = io(apiUrl, {
    auth: { token: authToken },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    withCredentials: true,
  });

  attachStatusListeners(socket);
  notifyStatus(socket.connected ? "connected" : "reconnecting");

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function getSocketStatus(): SocketConnectionStatus {
  return currentStatus;
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

export function isSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

export function disconnectSocket() {
  if (socket) {
    detachStatusListeners(socket);
    socket.disconnect();
    socket = null;
    statusSocket = null;
    notifyStatus("offline");
  }
}

/** @deprecated Use connectSocket */
export const getChatSocket = connectSocket;

/** @deprecated Use disconnectSocket */
export const disconnectChatSocket = disconnectSocket;

export type ChatSocketMessage = MessageReceivedPayload & {
  type?: "direct" | "group";
};
