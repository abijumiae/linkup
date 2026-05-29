"use client";

import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "./api";
import { getToken } from "./auth";

let socket: Socket | null = null;

export type ChatSocketMessage =
  | {
      type: "direct";
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
    }
  | {
      type: "group";
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

export function getChatSocket(): Socket | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = getToken();
  if (!token) {
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  if (socket && !socket.connected) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(`${getApiBaseUrl()}/chat`, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  return socket;
}

export function disconnectChatSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
