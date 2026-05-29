import { apiRequest, ApiError } from "./api";
import { clearAuth, getToken } from "./auth";

export type NotificationType =
  | "LIKE"
  | "COMMENT"
  | "FOLLOW"
  | "GROUP_JOIN"
  | "MARKETPLACE_INQUIRY"
  | "JOB_APPLICATION"
  | "EVENT_JOIN";

export type AlertCategory =
  | "chat"
  | "boost"
  | "reply"
  | "connect"
  | "hub"
  | "work"
  | "happening";

export interface NotificationActor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  recipientId: string;
  actorId: string;
  postId: string | null;
  read: boolean;
  createdAt: string;
  actor: NotificationActor;
  alertCategory?: AlertCategory;
  peerId?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
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

export async function fetchNotifications(): Promise<NotificationsResponse> {
  return withAuth(() =>
    apiRequest<NotificationsResponse>("/notifications", {
      headers: authHeaders(),
    }),
  );
}

export async function markNotificationRead(
  notificationId: string,
): Promise<Notification> {
  return withAuth(() =>
    apiRequest<Notification>(`/notifications/${notificationId}/read`, {
      method: "PATCH",
      headers: authHeaders(),
    }),
  );
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  return withAuth(() =>
    apiRequest<{ message: string }>("/notifications/read-all", {
      method: "PATCH",
      headers: authHeaders(),
    }),
  );
}
