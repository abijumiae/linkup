import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MessagesService } from '../messages/messages.service';
import { WsAuthService } from './ws-auth.service';

type AuthedSocket = Socket & { data: { userId: string } };

type ChatType = 'direct' | 'group';

const SOCKET_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://linkup-nu-ruby.vercel.app',
];

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        SOCKET_CORS_ORIGINS.includes(origin) ||
        process.env.NODE_ENV !== 'production'
      ) {
        callback(null, true);
        return;
      }
      callback(null, true);
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly wsAuthService: WsAuthService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

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
    } catch {
      this.logger.warn('Chat socket rejected: invalid auth');
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

  @SubscribeMessage('join_chat')
  handleJoinChat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { chatType: ChatType; targetId: string },
  ) {
    if (!client.data?.userId || !payload?.targetId || !payload?.chatType) {
      return;
    }

    if (payload.chatType === 'group') {
      client.join(this.groupRoom(payload.targetId));
      return;
    }

    client.join(this.directRoom(client.data.userId, payload.targetId));
  }

  /** @deprecated Use join_chat */
  @SubscribeMessage('join:dm')
  handleJoinDm(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string },
  ) {
    if (!client.data?.userId || !payload?.peerId) {
      return;
    }
    client.join(this.directRoom(client.data.userId, payload.peerId));
  }

  /** @deprecated Use join_chat */
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

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      chatType: ChatType;
      receiverId?: string;
      groupId?: string;
      content: string;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      client.emit('message_error', { message: 'Not authenticated' });
      return;
    }

    const content = payload?.content?.trim();
    if (!content) {
      client.emit('message_error', { message: 'Message content is required' });
      return;
    }

    try {
      if (payload.chatType === 'group') {
        if (!payload.groupId) {
          client.emit('message_error', { message: 'Group id is required' });
          return;
        }
        await this.messagesService.sendGroupMessage(
          payload.groupId,
          userId,
          content,
        );
        return;
      }

      if (!payload.receiverId) {
        client.emit('message_error', { message: 'Receiver id is required' });
        return;
      }

      await this.messagesService.sendMessage(userId, payload.receiverId, {
        content,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not send message';
      client.emit('message_error', { message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      chatType: ChatType;
      targetId: string;
      isTyping: boolean;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.targetId || !payload?.chatType) {
      return;
    }

    const eventPayload = {
      chatType: payload.chatType,
      targetId: payload.targetId,
      isTyping: payload.isTyping,
      userId,
    };

    if (payload.chatType === 'group') {
      client
        .to(this.groupRoom(payload.targetId))
        .emit('typing', eventPayload);
      return;
    }

    this.server
      .to(this.directRoom(userId, payload.targetId))
      .emit('typing', eventPayload);
  }

  /** @deprecated Use typing */
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
      client.to(this.groupRoom(payload.groupId)).emit('typing', {
        chatType: 'group' as const,
        targetId: payload.groupId,
        isTyping: true,
        userId,
      });
      return;
    }

    if (payload.peerId) {
      this.server
        .to(this.directRoom(userId, payload.peerId))
        .emit('typing', {
          chatType: 'direct' as const,
          targetId: payload.peerId,
          isTyping: true,
          userId,
        });
    }
  }

  /** @deprecated Use typing */
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
      client.to(this.groupRoom(payload.groupId)).emit('typing', {
        chatType: 'group' as const,
        targetId: payload.groupId,
        isTyping: false,
        userId,
      });
      return;
    }

    if (payload.peerId) {
      this.server
        .to(this.directRoom(userId, payload.peerId))
        .emit('typing', {
          chatType: 'direct' as const,
          targetId: payload.peerId,
          isTyping: false,
          userId,
        });
    }
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
    const room = this.directRoom(message.senderId, message.receiverId);
    const payload = { chatType: 'direct' as const, message };

    this.server.to(room).emit('message_received', payload);
    this.server.to(room).emit('message:new', { type: 'direct', message });

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
    const payload = { chatType: 'group' as const, message };

    this.server.to(this.groupRoom(message.groupId)).emit('message_received', payload);
    this.server
      .to(this.groupRoom(message.groupId))
      .emit('message:new', { type: 'group', message });
  }

  emitMessagesRead(readerId: string, peerId: string) {
    this.server.to(this.directRoom(readerId, peerId)).emit('message:read', {
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

  private directRoom(userA: string, userB: string) {
    const [first, second] = [userA, userB].sort();
    return `direct:${first}:${second}`;
  }
}
