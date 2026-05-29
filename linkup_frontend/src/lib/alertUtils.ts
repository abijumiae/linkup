import { Notification, NotificationType } from "./notifications";

export type RealtimeAlertPayload = {
  id: string;
  type?: Notification["alertCategory"];
  message: string;
  actorId: string;
  actorName?: string;
  createdAt: string;
  isRead?: boolean;
  read?: boolean;
  recipientId?: string;
  postId?: string | null;
  actor?: Notification["actor"];
  notificationType?: NotificationType | "CHAT";
  peerId?: string;
};

function mapAlertCategoryToNotificationType(
  category: Notification["alertCategory"],
  fallback?: NotificationType | "CHAT",
): NotificationType {
  if (fallback && fallback !== "CHAT") {
    return fallback;
  }

  switch (category) {
    case "boost":
      return "LIKE";
    case "reply":
      return "COMMENT";
    case "connect":
      return "FOLLOW";
    case "hub":
      return "GROUP_JOIN";
    case "work":
      return "JOB_APPLICATION";
    case "happening":
      return "EVENT_JOIN";
    case "chat":
      return "MARKETPLACE_INQUIRY";
    default:
      return "MARKETPLACE_INQUIRY";
  }
}

export function normalizeRealtimeAlert(payload: RealtimeAlertPayload): Notification {
  const actor =
    payload.actor ??
    ({
      id: payload.actorId,
      name: payload.actorName ?? "LinkUp user",
      username: payload.actorName?.toLowerCase().replace(/\s+/g, "") ?? "user",
      avatarUrl: null,
    } satisfies Notification["actor"]);

  const alertCategory =
    payload.type ??
    (payload.notificationType === "CHAT" ? "chat" : undefined);

  return {
    id: payload.id,
    type: mapAlertCategoryToNotificationType(
      alertCategory,
      payload.notificationType,
    ),
    message: payload.message,
    recipientId: payload.recipientId ?? "",
    actorId: payload.actorId,
    postId: payload.postId ?? null,
    read: payload.isRead ?? payload.read ?? false,
    createdAt: payload.createdAt,
    actor,
    alertCategory,
    peerId: payload.peerId,
  };
}

export function isChatAlert(notification: Notification) {
  return notification.alertCategory === "chat";
}
