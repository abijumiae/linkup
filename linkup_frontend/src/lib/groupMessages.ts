import { apiRequest, ApiError } from "./api";
import { clearAuth, getToken } from "./auth";
import { MessageUser } from "./messages";

export interface GroupChatSummary {
  group: {
    id: string;
    name: string;
    coverImage: string | null;
  };
  membersCount: number;
  lastMessage: GroupChatMessage | null;
}

export interface GroupChatMessage {
  id: string;
  content: string;
  groupId: string;
  senderId: string;
  createdAt: string;
  updatedAt: string;
  sender: MessageUser;
}

export interface GroupConversationDetail {
  group: {
    id: string;
    name: string;
    description: string | null;
    coverImage: string | null;
  };
  messages: GroupChatMessage[];
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

export async function fetchGroupChats(): Promise<GroupChatSummary[]> {
  return withAuth(() =>
    apiRequest<GroupChatSummary[]>("/groups/chats/list", {
      headers: authHeaders(),
    }),
  );
}

export async function fetchGroupConversation(
  groupId: string,
): Promise<GroupConversationDetail> {
  return withAuth(() =>
    apiRequest<GroupConversationDetail>(`/groups/${groupId}/messages`, {
      headers: authHeaders(),
    }),
  );
}

export async function sendGroupMessage(
  groupId: string,
  content: string,
): Promise<GroupChatMessage> {
  return withAuth(() =>
    apiRequest<GroupChatMessage>(`/groups/${groupId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    }),
  );
}
