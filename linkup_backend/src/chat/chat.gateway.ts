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
import {
  GroupCallManager,
  GroupCallRoomType,
  groupCallRoomKey,
} from './group-call.manager';
import { WsAuthService } from './ws-auth.service';

type AuthedSocket = Socket & {
  data: {
    userId: string;
    userName?: string;
    userAvatarUrl?: string | null;
    groupCallRoomKey?: string;
    groupCallRoomId?: string;
  };
};

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
  private readonly groupCallManager = new GroupCallManager();

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
      client.data.userName = user.name;
      client.data.userAvatarUrl = user.avatarUrl ?? null;

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
    this.leaveActiveGroupCall(client);

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

  @SubscribeMessage('call_offer')
  handleCallOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      peerId: string;
      sdp: unknown;
      callType?: 'audio' | 'video';
    },
  ) {
    this.relayToPeer(client, payload?.peerId, 'call_offer', {
      sdp: payload.sdp,
      callType: payload.callType ?? 'video',
    });
  }

  @SubscribeMessage('call_answer')
  handleCallAnswer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string; sdp: unknown },
  ) {
    this.relayToPeer(client, payload?.peerId, 'call_answer', {
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage('ice_candidate')
  handleIceCandidate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string; candidate: unknown },
  ) {
    this.relayToPeer(client, payload?.peerId, 'ice_candidate', {
      candidate: payload.candidate,
    });
  }

  @SubscribeMessage('call_end')
  handleCallEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string },
  ) {
    this.relayToPeer(client, payload?.peerId, 'call_end', {});
  }

  /** @deprecated Use call_offer */
  @SubscribeMessage('call:offer')
  handleLegacyCallOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      peerId: string;
      sdp: unknown;
      callType?: 'audio' | 'video';
    },
  ) {
    this.handleCallOffer(client, payload);
  }

  /** @deprecated Use call_answer */
  @SubscribeMessage('call:answer')
  handleLegacyCallAnswer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string; sdp: unknown },
  ) {
    this.handleCallAnswer(client, payload);
  }

  /** @deprecated Use ice_candidate */
  @SubscribeMessage('call:ice-candidate')
  handleLegacyIceCandidate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string; candidate: unknown },
  ) {
    this.handleIceCandidate(client, payload);
  }

  /** @deprecated Use call_end */
  @SubscribeMessage('call:end')
  handleLegacyCallEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId: string },
  ) {
    this.handleCallEnd(client, payload);
  }

  @SubscribeMessage('group_call_join')
  handleGroupCallJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      roomType: GroupCallRoomType;
      roomId: string;
      callType: 'audio' | 'video';
    },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.roomId || !payload?.roomType) {
      client.emit('group_call_error', {
        message: 'Invalid group call join payload',
      });
      return;
    }

    // TODO: enforce hub/group membership when permission helpers are wired here.
    this.leaveActiveGroupCall(client);

    const roomKey = groupCallRoomKey(payload.roomType, payload.roomId);
    const participant = {
      userId,
      name: client.data.userName ?? 'LinkUp user',
      avatarUrl: client.data.userAvatarUrl ?? null,
      callType: payload.callType ?? 'video',
    };

    client.join(roomKey);
    client.data.groupCallRoomKey = roomKey;
    client.data.groupCallRoomId = payload.roomId;
    this.groupCallManager.join(roomKey, participant);

    const participants = this.groupCallManager.getParticipants(roomKey);
    client.emit('group_call_participants', {
      roomId: payload.roomId,
      roomType: payload.roomType,
      callType: payload.callType,
      participants,
    });

    client.to(roomKey).emit('group_call_user_joined', {
      roomId: payload.roomId,
      roomType: payload.roomType,
      user: participant,
      callType: payload.callType,
    });
  }

  @SubscribeMessage('group_call_leave')
  handleGroupCallLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { roomType: GroupCallRoomType; roomId: string },
  ) {
    if (!payload?.roomId || !payload?.roomType) {
      return;
    }
    const roomKey = groupCallRoomKey(payload.roomType, payload.roomId);
    if (client.data.groupCallRoomKey === roomKey) {
      this.leaveActiveGroupCall(client, payload.roomId);
    }
  }

  @SubscribeMessage('group_call_offer')
  handleGroupCallOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      roomId: string;
      targetUserId: string;
      offer: unknown;
    },
  ) {
    this.relayGroupCallSignal(client, payload?.targetUserId, 'group_call_offer', {
      roomId: payload.roomId,
      offer: payload.offer,
    });
  }

  @SubscribeMessage('group_call_answer')
  handleGroupCallAnswer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      roomId: string;
      targetUserId: string;
      answer: unknown;
    },
  ) {
    this.relayGroupCallSignal(client, payload?.targetUserId, 'group_call_answer', {
      roomId: payload.roomId,
      answer: payload.answer,
    });
  }

  @SubscribeMessage('group_ice_candidate')
  handleGroupIceCandidate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      roomId: string;
      targetUserId: string;
      candidate: unknown;
    },
  ) {
    this.relayGroupCallSignal(
      client,
      payload?.targetUserId,
      'group_ice_candidate',
      {
        roomId: payload.roomId,
        candidate: payload.candidate,
      },
    );
  }

  @SubscribeMessage('group_call_end')
  handleGroupCallEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { roomId: string; roomType?: GroupCallRoomType },
  ) {
    if (!payload?.roomId) {
      return;
    }

    const roomKey =
      client.data.groupCallRoomKey ??
      (payload.roomType
        ? groupCallRoomKey(payload.roomType, payload.roomId)
        : null);

    if (roomKey && client.data.groupCallRoomKey === roomKey) {
      this.leaveActiveGroupCall(client, payload.roomId);
    }
  }

  private relayGroupCallSignal(
    client: AuthedSocket,
    targetUserId: string | undefined,
    event: string,
    data: Record<string, unknown>,
  ) {
    const fromUserId = client.data?.userId;
    if (!fromUserId || !targetUserId) {
      return;
    }

    this.server.to(this.userRoom(targetUserId)).emit(event, {
      ...data,
      fromUserId,
    });
  }

  private leaveActiveGroupCall(client: AuthedSocket, roomId?: string) {
    const roomKey =
      client.data.groupCallRoomKey ??
      this.groupCallManager.findRoomKeyForUser(client.data?.userId ?? '');

    const userId = client.data?.userId;
    if (!roomKey || !userId) {
      return;
    }

    const resolvedRoomId =
      roomId ?? client.data.groupCallRoomId ?? roomKey.split(':').slice(1).join(':');

    const removed = this.groupCallManager.leave(roomKey, userId);
    client.leave(roomKey);
    delete client.data.groupCallRoomKey;
    delete client.data.groupCallRoomId;

    if (!removed) {
      return;
    }

    if (this.groupCallManager.isRoomActive(roomKey)) {
      this.server.to(roomKey).emit('group_call_user_left', {
        roomId: resolvedRoomId,
        userId,
      });
      return;
    }

    this.server.to(roomKey).emit('group_call_ended', {
      roomId: resolvedRoomId,
    });
  }

  private relayToPeer(
    client: AuthedSocket,
    peerId: string | undefined,
    event: string,
    data: Record<string, unknown>,
  ) {
    const fromUserId = client.data?.userId;
    if (!fromUserId || !peerId) {
      return;
    }

    this.server.to(this.userRoom(peerId)).emit(event, {
      ...data,
      fromUserId,
    });
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
