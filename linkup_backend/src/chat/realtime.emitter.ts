import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeEmitter {
  private server: Server | null = null;

  bindServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
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

  emitNewMessageNotification(
    recipientId: string,
    payload: { peerId: string; message: unknown },
  ) {
    this.emitToUser(recipientId, 'new_message_notification', payload);
  }
}
