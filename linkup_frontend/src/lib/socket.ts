"use client";

import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "./api";
import { getToken } from "./auth";

let socket: Socket | null = null;
let statusListenersAttached = false;

export type SocketConnectionStatus = "connected" | "reconnecting" | "offline";

const statusListeners = new Set<(status: SocketConnectionStatus) => void>();
let currentStatus: SocketConnectionStatus = "offline";

function notifyStatus(status: SocketConnectionStatus) {
  currentStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

function attachStatusListeners(activeSocket: Socket) {
  if (statusListenersAttached) {
    return;
  }

  statusListenersAttached = true;

  activeSocket.on("connect", () => notifyStatus("connected"));
  activeSocket.on("disconnect", () => notifyStatus("offline"));
  activeSocket.on("reconnect_attempt", () => notifyStatus("reconnecting"));
  activeSocket.on("reconnect", () => notifyStatus("connected"));
  activeSocket.on("connect_error", () => {
    if (!activeSocket.connected) {
      notifyStatus("reconnecting");
    }
  });
}

export type ReceivedDirectMessage = {
  chatType: "direct";
  message: {
    id: string;
    content: string;
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

  if ("chatType" in payload && "message" in payload) {
    return normalizeReceivedMessage(payload as MessageReceivedPayload);
  }

  if ("message" in payload) {
    const message = (payload as { message: Record<string, unknown> }).message;
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

  return null;
}

/** Connect to LinkUp real-time chat namespace with JWT auth. */
export function connectSocket(token?: string | null): Socket | null {
  if (typeof window === "undefined") {
    return null;
  }

  const authToken = token ?? getToken();
  if (!authToken) {
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  if (socket && !socket.connected) {
    socket.auth = { token: authToken };
    attachStatusListeners(socket);
    notifyStatus("reconnecting");
    socket.connect();
    return socket;
  }

  socket = io(`${getApiBaseUrl()}/chat`, {
    auth: { token: authToken },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
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
    socket.disconnect();
    socket = null;
    statusListenersAttached = false;
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
