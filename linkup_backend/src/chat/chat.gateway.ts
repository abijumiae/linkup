import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthService } from './ws-auth.service';

type AuthedSocket = Socket & { data: { userId: string } };

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(private readonly wsAuthService: WsAuthService) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      const user = await this.wsAuthService.authenticateToken(token);
      client.data.userId = user.id;

      if (!this.onlineUsers.has(user.id)) {
        this.onlineUsers.set(user.id, new Set());
      }
      this.onlineUsers.get(user.id)?.add(client.id);

      client.join(this.userRoom(user.id));
      this.server.emit('presence:update', {
        userId: user.id,
        online: true,
        lastActive: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Chat socket rejected: ${String(error)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    const userId = client.data?.userId;
    if (!userId) {
      return;
    }

    const sockets = this.onlineUsers.get(userId);
    sockets?.delete(client.id);
    if (sockets && sockets.size === 0) {
      this.onlineUsers.delete(userId);
      this.server.emit('presence:update', {
        userId,
        online: false,
        lastActive: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('join:dm')
  handleJoinDm(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string },
  ) {
    if (!client.data?.userId || !payload?.peerId) {
      return;
    }
    client.join(this.dmRoom(client.data.userId, payload.peerId));
  }

  @SubscribeMessage('leave:dm')
  handleLeaveDm(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string },
  ) {
    if (!client.data?.userId || !payload?.peerId) {
      return;
    }
    client.leave(this.dmRoom(client.data.userId, payload.peerId));
  }

  @SubscribeMessage('join:group')
  handleJoinGroup(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string },
  ) {
    if (!client.data?.userId || !payload?.groupId) {
      return;
    }
    client.join(this.groupRoom(payload.groupId));
  }

  @SubscribeMessage('leave:group')
  handleLeaveGroup(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string },
  ) {
    if (!client.data?.userId || !payload?.groupId) {
      return;
    }
    client.leave(this.groupRoom(payload.groupId));
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { peerId?: string; groupId?: string },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      return;
    }

    if (payload.groupId) {
      client.to(this.groupRoom(payload.groupId)).emit('typing:start', {
        userId,
        groupId: payload.groupId,
      });
      return;
    }

    if (payload.peerId) {
      this.server.to(this.dmRoom(userId, payload.peerId)).emit('typing:start', {
        userId,
        peerId: payload.peerId,
      });
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { peerId?: string; groupId?: string },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      return;
    }

    if (payload.groupId) {
      client.to(this.groupRoom(payload.groupId)).emit('typing:stop', {
        userId,
        groupId: payload.groupId,
      });
      return;
    }

    if (payload.peerId) {
      this.server.to(this.dmRoom(userId, payload.peerId)).emit('typing:stop', {
        userId,
        peerId: payload.peerId,
      });
    }
  }

  @SubscribeMessage('call:offer')
  handleCallOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      peerId: string;
      sdp: unknown;
      callType: 'audio' | 'video';
    },
  ) {
    if (!client.data?.userId || !payload?.peerId) {
      return;
    }
    this.server.to(this.userRoom(payload.peerId)).emit('call:offer', {
      fromUserId: client.data.userId,
      sdp: payload.sdp,
      callType: payload.callType ?? 'video',
    });
  }

  @SubscribeMessage('call:answer')
  handleCallAnswer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string; sdp: unknown },
  ) {
    if (!client.data?.userId || !payload?.peerId) {
      return;
    }
    this.server.to(this.userRoom(payload.peerId)).emit('call:answer', {
      fromUserId: client.data.userId,
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage('call:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string; candidate: unknown },
  ) {
    if (!client.data?.userId || !payload?.peerId) {
      return;
    }
    this.server.to(this.userRoom(payload.peerId)).emit('call:ice-candidate', {
      fromUserId: client.data.userId,
      candidate: payload.candidate,
    });
  }

  @SubscribeMessage('call:end')
  handleCallEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string },
  ) {
    if (!client.data?.userId || !payload?.peerId) {
      return;
    }
    this.server.to(this.userRoom(payload.peerId)).emit('call:end', {
      fromUserId: client.data.userId,
    });
  }

  @SubscribeMessage('call:decline')
  handleCallDecline(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string },
  ) {
    if (!client.data?.userId || !payload?.peerId) {
      return;
    }
    this.server.to(this.userRoom(payload.peerId)).emit('call:decline', {
      fromUserId: client.data.userId,
    });
  }

  emitDirectMessage(message: {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
    sender: unknown;
  }) {
    const room = this.dmRoom(message.senderId, message.receiverId);
    this.server.to(room).emit('message:new', {
      type: 'direct',
      message,
    });
    this.server
      .to(this.userRoom(message.receiverId))
      .emit('conversation:update', { peerId: message.senderId });
    this.server
      .to(this.userRoom(message.senderId))
      .emit('conversation:update', { peerId: message.receiverId });
  }

  emitGroupMessage(message: {
    id: string;
    content: string;
    groupId: string;
    senderId: string;
    createdAt: Date;
    updatedAt: Date;
    sender: unknown;
  }) {
    this.server.to(this.groupRoom(message.groupId)).emit('message:new', {
      type: 'group',
      message,
    });
  }

  emitMessagesRead(readerId: string, peerId: string) {
    this.server.to(this.dmRoom(readerId, peerId)).emit('message:read', {
      readerId,
      peerId,
    });
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private groupRoom(groupId: string) {
    return `group:${groupId}`;
  }

  private dmRoom(userA: string, userB: string) {
    const [first, second] = [userA, userB].sort();
    return `dm:${first}:${second}`;
  }
}
