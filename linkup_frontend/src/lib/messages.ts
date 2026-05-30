import { apiRequest, ApiError, extractErrorMessage, getApiBaseUrl } from "./api";
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
  audioUrl?: string | null;
  mediaType?: string | null;
  duration?: number | null;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  sender: MessageUser;
}

export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${getApiBaseUrl()}${url}`;
  }

  return url;
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

type UploadVoiceResult = {
  url: string;
  type: string;
  filename: string;
};

export async function uploadVoiceNote(file: File): Promise<UploadVoiceResult> {
  const token = getToken();
  const apiUrl = getApiBaseUrl();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  if (file.size < 1) {
    throw new ApiError("Voice note recording is empty", 400);
  }

  const formData = new FormData();
  formData.append("file", file, file.name || `voice-${Date.now()}.webm`);

  let response: Response | undefined;
  let responseBody: unknown = null;

  try {
    response = await fetch(`${apiUrl}/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        clearAuth();
      }

      console.error("Voice upload failed:", extractErrorMessage(responseBody, "Upload failed"));
      console.error("Upload response status:", response.status);
      console.error("Upload response body:", responseBody);

      throw new ApiError(
        extractErrorMessage(
          responseBody,
          "Could not send voice note. Please try again.",
        ),
        response.status,
      );
    }

    const uploaded = responseBody as Partial<UploadVoiceResult>;
    if (!uploaded.url) {
      console.error("Upload response missing url:", responseBody);
      throw new ApiError("Upload response missing audio URL", 500);
    }

    return uploaded as UploadVoiceResult;
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("Voice upload failed:", error);
      console.error("Upload response status:", response?.status);
      console.error("Upload response body:", responseBody);
    }
    throw error;
  }
}

export async function sendVoiceMessageByUrl(
  userId: string,
  payload: {
    mediaUrl: string;
    duration: number;
    content?: string;
  },
): Promise<ChatMessage> {
  const receiverId = userId.trim();

  if (!receiverId) {
    throw new ApiError("Select a chat first", 400);
  }

  if (payload.duration < 1) {
    throw new ApiError("Voice note duration is required", 400);
  }

  const token = getToken();
  const apiUrl = getApiBaseUrl();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  let response: Response | undefined;
  let responseBody: unknown = null;

  try {
    response = await fetch(`${apiUrl}/messages/${encodeURIComponent(receiverId)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "voice",
        mediaUrl: payload.mediaUrl,
        mediaType: "audio",
        duration: Math.floor(payload.duration),
        content: payload.content ?? "",
      }),
    });

    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        clearAuth();
      }

      console.error(
        "Voice message send failed:",
        extractErrorMessage(responseBody, "Send failed"),
      );
      console.error("Message send response status:", response.status);
      console.error("Message send response body:", responseBody);

      throw new ApiError(
        extractErrorMessage(
          responseBody,
          "Could not send voice note. Please try again.",
        ),
        response.status,
      );
    }

    return responseBody as ChatMessage;
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("Voice message send failed:", error);
      console.error("Message send response status:", response?.status);
      console.error("Message send response body:", responseBody);
    }
    throw error;
  }
}

/** Upload audio to /uploads, then create a voice message via JSON POST. */
export async function sendVoiceMessage(
  userId: string,
  file: File,
  duration: number,
): Promise<ChatMessage> {
  const receiverId = userId.trim();

  if (!receiverId) {
    throw new ApiError("Select a chat first", 400);
  }

  if (duration < 1) {
    throw new ApiError("Voice note duration is required", 400);
  }

  if (file.size < 1) {
    throw new ApiError("Voice note recording is empty", 400);
  }

  const uploaded = await uploadVoiceNote(file);

  return sendVoiceMessageByUrl(receiverId, {
    mediaUrl: uploaded.url,
    duration: Math.floor(duration),
  });
}
