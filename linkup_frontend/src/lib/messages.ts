import { apiRequest, ApiError, getApiBaseUrl } from "./api";
import { clearAuth, getToken } from "./auth";

export interface MessageUser {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface Conversation {
  user: MessageUser;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

export interface ChatMessage {
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
  sender: MessageUser;
}

export function getMessagePreview(message: Pick<ChatMessage, "type" | "content">) {
  const type = message.type?.toLowerCase();
  if (type === "voice" || type === "audio") {
    return "Voice note";
  }
  return message.content;
}

export function formatVoiceDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export interface ConversationDetail {
  user: MessageUser;
  messages: ChatMessage[];
  hasMore?: boolean;
}

function authHeaders(): HeadersInit {
  const token = getToken();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function withAuth<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuth();
    }
    throw error;
  }
}

export async function fetchConversations(): Promise<Conversation[]> {
  return withAuth(() =>
    apiRequest<Conversation[]>("/messages/conversations", {
      headers: authHeaders(),
    }),
  );
}

export async function fetchConversation(
  userId: string,
): Promise<ConversationDetail> {
  return withAuth(() =>
    apiRequest<ConversationDetail>(`/messages/${userId}`, {
      headers: authHeaders(),
    }),
  );
}

export async function sendMessage(
  userId: string,
  content: string,
  options?: { marketplaceItemId?: string },
): Promise<ChatMessage> {
  const receiverId = userId.trim();

  if (!receiverId) {
    throw new ApiError("Select a chat first", 400);
  }

  return withAuth(() =>
    apiRequest<ChatMessage>(`/messages/${receiverId}`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content.trim(),
        ...(options?.marketplaceItemId
          ? { marketplaceItemId: options.marketplaceItemId }
          : {}),
      }),
    }),
  );
}

export async function uploadVoiceNote(file: File): Promise<{
  url: string;
  type: string;
  filename: string;
}> {
  const token = getToken();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  const formData = new FormData();
  formData.append("audio", file);

  const response = await fetch(`${getApiBaseUrl()}/messages/upload-audio`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
    }
    throw new ApiError("Could not send voice note. Please try again.", response.status);
  }

  return data as { url: string; type: string; filename: string };
}

export async function sendVoiceMessage(
  userId: string,
  payload: {
    mediaUrl: string;
    duration: number;
    content?: string;
  },
): Promise<ChatMessage> {
  return withAuth(() =>
    apiRequest<ChatMessage>(`/messages/${userId}`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "voice",
        content: payload.content ?? "",
        mediaUrl: payload.mediaUrl,
        mediaType: "audio",
        duration: payload.duration,
      }),
    }),
  );
}
