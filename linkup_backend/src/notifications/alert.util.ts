import { NotificationType } from '../generated/prisma/client';

export type AlertCategory =
  | 'chat'
  | 'boost'
  | 'reply'
  | 'connect'
  | 'hub'
  | 'work'
  | 'happening';

type ActorShape = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

type SavedNotificationShape = {
  id: string;
  type: NotificationType;
  message: string;
  recipientId: string;
  actorId: string;
  postId: string | null;
  read: boolean;
  createdAt: Date;
  actor: ActorShape;
};

export type RealtimeAlertPayload = {
  id: string;
  type: AlertCategory;
  message: string;
  actorId: string;
  actorName: string;
  createdAt: string;
  isRead: boolean;
  read: boolean;
  recipientId: string;
  postId: string | null;
  actor: ActorShape;
  notificationType: NotificationType | 'CHAT';
  peerId?: string;
};

export function mapNotificationTypeToAlertCategory(
  type: NotificationType,
): AlertCategory {
  switch (type) {
    case NotificationType.LIKE:
      return 'boost';
    case NotificationType.COMMENT:
      return 'reply';
    case NotificationType.FOLLOW:
      return 'connect';
    case NotificationType.GROUP_JOIN:
      return 'hub';
    case NotificationType.JOB_APPLICATION:
      return 'work';
    case NotificationType.EVENT_JOIN:
      return 'happening';
    case NotificationType.MARKETPLACE_INQUIRY:
      return 'chat';
    default:
      return 'chat';
  }
}

export function buildRealtimeAlertPayload(
  notification: SavedNotificationShape,
): RealtimeAlertPayload {
  return {
    id: notification.id,
    type: mapNotificationTypeToAlertCategory(notification.type),
    message: notification.message,
    actorId: notification.actorId,
    actorName: notification.actor.name,
    createdAt: notification.createdAt.toISOString(),
    isRead: notification.read,
    read: notification.read,
    recipientId: notification.recipientId,
    postId: notification.postId,
    actor: notification.actor,
    notificationType: notification.type,
  };
}

export function buildChatAlertPayload(params: {
  messageId: string;
  sender: ActorShape;
  recipientId: string;
}): RealtimeAlertPayload {
  return {
    id: `chat-${params.messageId}`,
    type: 'chat',
    message: `${params.sender.name} sent you a chat`,
    actorId: params.sender.id,
    actorName: params.sender.name,
    createdAt: new Date().toISOString(),
    isRead: false,
    read: false,
    recipientId: params.recipientId,
    postId: null,
    actor: params.sender,
    notificationType: 'CHAT',
    peerId: params.sender.id,
  };
}
