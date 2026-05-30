import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { getDirectRoom, getUserRoom } from './chat-rooms.util';

export type RealtimeDirectMessage = {
  id: string;
  type?: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  duration?: number | null;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  sender: unknown;
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

  emitNotification(recipientId: string, notification: unknown) {
    this.emitToUser(recipientId, 'notification_received', notification);
  }

  emitAlert(recipientId: string, alert: unknown) {
    this.emitNotification(recipientId, alert);
  }

  emitSparkCreated(post: unknown) {
    this.emitToRoom('pulse', 'spark_created', post);
  }

  emitMomentCreated(moment: unknown) {
    this.emitToRoom('pulse', 'moment_created', moment);
  }

  emitMomentDeleted(momentId: string, userId: string) {
    this.emitToRoom('pulse', 'moment_deleted', { momentId, userId });
  }

  emitNewMessageNotification(
    recipientId: string,
    payload: { peerId: string; message: unknown },
  ) {
    this.emitToUser(recipientId, 'new_message_notification', payload);
  }

  emitDirectMessage(message: RealtimeDirectMessage) {
    if (!this.server) {
      this.logger.warn(
        'Cannot emit direct message: socket server not ready',
      );
      return;
    }

    const serialized = {
      ...message,
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
      this.logger.log(`emitting direct_message_received to: ${target}`);
      this.server.to(target).emit('message_received', payload);
      this.server.to(target).emit('direct_message_received', directPayload);
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
