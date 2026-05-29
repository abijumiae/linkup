"use client";

import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "./api";
import { getToken } from "./auth";

let socket: Socket | null = null;

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

  return socket;
}

export function getSocket(): Socket | null {
  return connectSocket();
}

export function isSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** @deprecated Use connectSocket */
export const getChatSocket = connectSocket;

/** @deprecated Use disconnectSocket */
export const disconnectChatSocket = disconnectSocket;

export type ChatSocketMessage = MessageReceivedPayload & {
  type?: "direct" | "group";
};
