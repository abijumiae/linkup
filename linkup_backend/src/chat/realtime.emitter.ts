import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { getDirectRoom, getUserRoom } from './chat-rooms.util';

export type RealtimeDirectMessage = {
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
  createdAt: Date | string;
  updatedAt: Date | string;
  sender: unknown;
};

export type RealtimeCommentPayload = {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
};

@Injectable()
export class RealtimeEmitter {
  private readonly logger = new Logger(RealtimeEmitter.name);
  private server: Server | null = null;

  bindServer(server: Server) {
    this.server = server;
    this.logger.log('Realtime socket server bound');
  }

  isReady(): boolean {
    return Boolean(this.server);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(getUserRoom(userId)).emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: unknown) {
    this.server?.to(room).emit(event, payload);
  }

  emitToPulse(event: string, payload: unknown) {
    this.emitToRoom('pulse', event, payload);
  }

  emitNotification(recipientId: string, notification: unknown) {
    this.emitToUser(recipientId, 'notification_received', notification);
  }

  emitAlert(recipientId: string, alert: unknown) {
    this.emitNotification(recipientId, alert);
  }

  emitNotificationRead(recipientId: string, payload: { id: string }) {
    this.emitToUser(recipientId, 'notification_read', payload);
  }

  emitNotificationsReadAll(recipientId: string) {
    this.emitToUser(recipientId, 'notifications_read_all', { ok: true });
  }

  emitSparkCreated(post: unknown) {
    this.emitPostCreated(post);
  }

  emitPostCreated(post: unknown) {
    this.emitToPulse('spark_created', post);
    this.emitToPulse('post_created', post);
  }

  emitPostBoosted(postId: string, boostCount: number) {
    const payload = { postId, likeCount: boostCount, boostCount };
    this.emitToPulse('post_boosted', payload);
  }

  emitPostUnboosted(postId: string, boostCount: number) {
    const payload = { postId, likeCount: boostCount, boostCount };
    this.emitToPulse('post_unboosted', payload);
  }

  emitPostCommented(postId: string, commentCount: number) {
    this.emitToPulse('post_commented', { postId, commentCount });
  }

  emitCommentCreated(comment: RealtimeCommentPayload, commentCount: number) {
    const payload = { ...comment, commentCount };
    this.emitToPulse('comment_created', payload);
    this.emitToPulse('post_commented', { postId: comment.postId, commentCount });
  }

  emitCommentDeleted(
    postId: string,
    commentId: string,
    commentCount: number,
  ) {
    this.emitToPulse('comment_deleted', { postId, commentId, commentCount });
    this.emitToPulse('post_commented', { postId, commentCount });
  }

  emitPostSaved(postId: string, userId: string) {
    this.emitToPulse('post_saved', { postId, userId });
  }

  emitPostUnsaved(postId: string, userId: string) {
    this.emitToPulse('post_unsaved', { postId, userId });
  }

  emitPostUpdated(payload: {
    id: string;
    content: string;
    mediaUrl: string | null;
    mediaType: 'image' | 'video' | null;
    imageUrl: string | null;
    videoUrl: string | null;
    postType: string;
    updatedAt: string;
    authorId: string;
  }) {
    this.emitToPulse('post_updated', payload);
  }

  emitPostDeleted(postId: string) {
    this.emitToPulse('post_deleted', { id: postId });
  }

  emitMomentCreated(moment: unknown) {
    this.emitToPulse('moment_created', moment);
  }

  emitMomentDeleted(momentId: string, userId: string) {
    this.emitToPulse('moment_deleted', { momentId, userId });
  }

  emitUserBlocked(blockerId: string, blockedUserId: string) {
    const payload = { userId: blockedUserId };
    this.emitToUser(blockerId, 'user_blocked', payload);
    this.emitToUser(blockedUserId, 'user_blocked', { userId: blockerId });
  }

  emitUserUnblocked(blockerId: string, blockedUserId: string) {
    this.emitToUser(blockerId, 'user_unblocked', { userId: blockedUserId });
    this.emitToUser(blockedUserId, 'user_unblocked', { userId: blockerId });
  }

  emitReportCreatedToStaff(report: Record<string, unknown>) {
    this.emitToRoom('moderation', 'report_created', report);
  }

  emitModerationStatusUpdated(payload: Record<string, unknown>) {
    this.emitToRoom('moderation', 'moderation_status_updated', payload);
  }

  emitNewMessageNotification(
    recipientId: string,
    payload: { peerId: string; message: unknown },
  ) {
    this.emitToUser(recipientId, 'new_message_notification', payload);
  }

  emitDirectMessage(message: RealtimeDirectMessage) {
    if (!this.server) {
      this.logger.warn('Cannot emit direct message: socket server not ready');
      return;
    }

    const isVoice = message.type === 'voice' || message.type === 'audio';
    const serialized = {
      ...message,
      audioUrl: isVoice ? (message.mediaUrl ?? null) : null,
      createdAt:
        message.createdAt instanceof Date
          ? message.createdAt.toISOString()
          : message.createdAt,
      updatedAt:
        message.updatedAt instanceof Date
          ? message.updatedAt.toISOString()
          : message.updatedAt,
    };

    const room = getDirectRoom(message.senderId, message.receiverId);
    const payload = { chatType: 'direct' as const, message: serialized };
    const directPayload = { message: serialized };
    const notificationPayload = { type: 'chat' as const, message: serialized };

    const targets = new Set([
      room,
      getUserRoom(message.receiverId),
      getUserRoom(message.senderId),
    ]);

    for (const target of targets) {
      this.logger.debug(`direct_message_received → ${target}`);
      this.server.to(target).emit('message_received', payload);
      this.server.to(target).emit('direct_message_received', directPayload);
      if (isVoice) {
        this.server.to(target).emit('voice_message_received', directPayload);
      }
    }

    this.server
      .to(getUserRoom(message.receiverId))
      .emit('new_message_notification', notificationPayload);

    this.server
      .to(getUserRoom(message.receiverId))
      .emit('conversation:update', { peerId: message.senderId });
    this.server
      .to(getUserRoom(message.senderId))
      .emit('conversation:update', { peerId: message.receiverId });
  }
}
