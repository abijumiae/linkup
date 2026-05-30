import { Notification } from "./notifications";

export function getNotificationHref(notification: Notification): string | null {
  if (notification.alertCategory === "chat" || notification.peerId) {
    return "/messages";
  }

  switch (notification.type) {
    case "LIKE":
    case "COMMENT":
      return notification.postId ? "/home" : null;
    case "FOLLOW":
      return notification.actor?.username
        ? `/profile`
        : null;
    case "GROUP_JOIN":
      return notification.groupId
        ? `/groups/${notification.groupId}`
        : "/groups";
    case "MARKETPLACE_INQUIRY":
      return notification.marketplaceItemId
        ? `/marketplace/${notification.marketplaceItemId}`
        : "/marketplace";
    case "JOB_APPLICATION":
      return notification.jobId ? `/jobs/${notification.jobId}` : "/jobs";
    case "EVENT_JOIN":
      return notification.eventId
        ? `/events/${notification.eventId}`
        : "/events";
    default:
      return null;
  }
}

export function getNotificationActionLabel(
  notification: Notification,
): string {
  if (notification.alertCategory === "chat" || notification.peerId) {
    return "Open chat";
  }

  switch (notification.type) {
    case "LIKE":
    case "COMMENT":
      return "View Spark";
    case "FOLLOW":
      return "View profile";
    case "GROUP_JOIN":
      return "Open hub";
    case "MARKETPLACE_INQUIRY":
      return "View listing";
    case "JOB_APPLICATION":
      return "View work";
    case "EVENT_JOIN":
      return "View event";
    default:
      return "Open";
  }
}
