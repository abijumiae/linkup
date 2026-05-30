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

function parseJsonBody(text: string): unknown {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
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

  // Production + local: always POST /messages/upload-audio (never /uploads).
  const response = await fetch(`${apiUrl}/messages/upload-audio`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const responseText = await response.text();
  const responseBody = parseJsonBody(responseText);

  console.log("VOICE UPLOAD STATUS:", response.status);
  console.log("VOICE UPLOAD BODY:", responseText);
  console.log("VOICE UPLOAD PATH:", "/messages/upload-audio");

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
    }

    console.error(
      "Voice upload failed:",
      extractErrorMessage(responseBody, "Upload failed"),
    );
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
  if (!uploaded?.url) {
    console.error("Upload response missing url:", responseBody);
    throw new ApiError("Upload response missing audio URL", 500);
  }

  console.log("VOICE UPLOAD URL:", uploaded.url);
  return uploaded as UploadVoiceResult;
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

  const requestBody: Record<string, unknown> = {
    type: "voice",
    mediaUrl: payload.mediaUrl,
    mediaType: "audio",
    duration: Math.floor(payload.duration),
  };

  if (payload.content?.trim()) {
    requestBody.content = payload.content.trim();
  }

  console.log("VOICE MESSAGE PAYLOAD:", {
    receiverId,
    type: requestBody.type,
    hasMediaUrl: Boolean(requestBody.mediaUrl),
    duration: requestBody.duration,
  });

  const response = await fetch(`${apiUrl}/messages/${encodeURIComponent(receiverId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  const responseBody = parseJsonBody(responseText);

  console.log("VOICE MESSAGE STATUS:", response.status);
  console.log("VOICE MESSAGE BODY:", responseText);

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
}

/** Upload audio, then create a voice message via JSON POST. */
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

  console.log("VOICE STEP 7: starting upload");
  const uploaded = await uploadVoiceNote(file);

  console.log("VOICE STEP 8: starting message send");
  return sendVoiceMessageByUrl(receiverId, {
    mediaUrl: uploaded.url,
    duration: Math.floor(duration),
  });
}
