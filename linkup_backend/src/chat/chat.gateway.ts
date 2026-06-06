import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
import {
  LiveRoomManager,
  LiveRoomType,
  liveRoomKey,
} from './live-room.manager';
import { RealtimeEmitter } from './realtime.emitter';
import { PresenceService } from './presence.service';
import { WsAuthService } from './ws-auth.service';
import {
  getDirectRoom,
  getGroupLiveTalkRoom,
  getGroupRoom,
  getUserRoom,
} from './chat-rooms.util';
import { GroupLiveTalkService } from '../groups/group-live-talk.service';
import { GroupLiveTalkManager } from '../groups/group-live-talk.manager';

type AuthedSocket = Socket & {
  data: {
    userId: string;
    userName?: string;
    userAvatarUrl?: string | null;
    groupCallRoomKey?: string;
    groupCallRoomId?: string;
    liveRoomKey?: string;
    liveRoomId?: string;
    liveTalkRoomKey?: string;
    liveTalkGroupId?: string;
    liveTalkRoomId?: string;
  };
};

type ChatType = 'direct' | 'group';

@WebSocketGateway({
  path: '/socket.io',
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  private readonly groupCallManager = new GroupCallManager();
  private readonly liveRoomManager = new LiveRoomManager();

  constructor(
    private readonly wsAuthService: WsAuthService,
    private readonly presenceService: PresenceService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    private readonly realtimeEmitter: RealtimeEmitter,
    private readonly groupLiveTalkManager: GroupLiveTalkManager,
    @Inject(forwardRef(() => GroupLiveTalkService))
    private readonly groupLiveTalkService: GroupLiveTalkService,
  ) {}

  afterInit() {
    this.realtimeEmitter.bindServer(this.server);
    this.logger.log('Socket.io gateway initialized at /socket.io');
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      const user = await this.wsAuthService.authenticateToken(token);
      client.data.userId = user.id;
      client.data.userName = user.name;
      client.data.userAvatarUrl = user.avatarUrl ?? null;

      client.join(getUserRoom(user.id));
      if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
        client.join('moderation');
      }

      await this.presenceService.registerConnection(user.id, client.id);

      client.emit('socket_ready', { userId: user.id });
      this.logger.log(`Socket connected userId=${user.id} socketId=${client.id}`);
    } catch {
      this.logger.warn('Socket auth failed — connection rejected');
      client.emit('auth_error', { message: 'Session expired or invalid' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.leaveActiveGroupCall(client);
    this.leaveActiveLiveRoom(client);
    void this.leaveActiveGroupLiveTalk(client, undefined, undefined, {
      skipDisconnectNotify: true,
    });

    const userId = client.data?.userId;
    if (!userId) {
      return;
    }

    this.logger.log(`Socket disconnected userId=${userId} socketId=${client.id}`);
    void this.presenceService.unregisterConnection(userId, client.id);
    void this.groupLiveTalkService.handleUserDisconnected(userId);
  }

  @SubscribeMessage('get_online_users')
  async handleGetOnlineUsers(@ConnectedSocket() client: AuthedSocket) {
    const userIds = await this.presenceService.getVisibleOnlineUserIds();
    client.emit('online_users', { userIds });
  }

  @SubscribeMessage('join_direct_chat')
  handleJoinDirectChat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { otherUserId: string },
  ) {
    if (!client.data?.userId || !payload?.otherUserId) {
      return;
    }
    const roomName = getDirectRoom(client.data.userId, payload.otherUserId);
    this.logger.log(
      `join_direct_chat: ${JSON.stringify({
        userId: client.data.userId,
        otherUserId: payload.otherUserId,
        roomName,
      })}`,
    );
    client.join(roomName);
    client.emit('joined_direct_chat', { otherUserId: payload.otherUserId });
  }

  @SubscribeMessage('send_direct_message')
  async handleSendDirectMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      receiverId: string;
      content?: string;
      type?: 'text' | 'voice';
      mediaUrl?: string;
      mediaType?: 'audio';
      duration?: number;
    },
  ) {
    const senderId = client.data?.userId;
    const receiverId = payload?.receiverId;
    const roomName =
      senderId && receiverId ? getDirectRoom(senderId, receiverId) : '';
    this.logger.log(
      `send_direct_message: ${JSON.stringify({
        senderId,
        receiverId,
        roomName,
      })}`,
    );
    await this.handleSendMessage(client, {
      chatType: 'direct',
      receiverId: payload?.receiverId,
      content: payload?.content ?? '',
      type: payload?.type,
      mediaUrl: payload?.mediaUrl,
      mediaType: payload?.mediaType,
      duration: payload?.duration,
    });
  }

  @SubscribeMessage('join_group_chat')
  handleJoinGroupChat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string },
  ) {
    if (!client.data?.userId || !payload?.groupId) {
      return;
    }
    client.join(getGroupRoom(payload.groupId));
    client.emit('joined_group_chat', { groupId: payload.groupId });
  }

  @SubscribeMessage('send_group_message')
  async handleSendGroupMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string; content: string },
  ) {
    await this.handleSendMessage(client, {
      chatType: 'group',
      groupId: payload?.groupId,
      content: payload?.content ?? '',
    });
  }

  @SubscribeMessage('typing_start')
  handleTypingStartEvent(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { chatType: ChatType; targetId: string },
  ) {
    this.emitTypingUpdate(client, payload, true);
  }

  @SubscribeMessage('typing_stop')
  handleTypingStopEvent(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { chatType: ChatType; targetId: string },
  ) {
    this.emitTypingUpdate(client, payload, false);
  }

  @SubscribeMessage('join_pulse')
  handleJoinPulse(@ConnectedSocket() client: AuthedSocket) {
    client.join('pulse');
    client.emit('joined_pulse', { ok: true });
  }

  @SubscribeMessage('join_live_room')
  handleJoinLiveRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { roomId: string; roomType: LiveRoomType },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.roomId || !payload?.roomType) {
      client.emit('group_call_error', { message: 'Invalid live room payload' });
      return;
    }

    this.leaveActiveLiveRoom(client);

    const roomKey = liveRoomKey(payload.roomType, payload.roomId);
    const participant = {
      userId,
      name: client.data.userName ?? 'LinkUp user',
      avatarUrl: client.data.userAvatarUrl ?? null,
    };

    client.join(roomKey);
    client.data.liveRoomKey = roomKey;
    client.data.liveRoomId = payload.roomId;
    this.liveRoomManager.join(roomKey, participant);

    client.emit('live_room_participants', {
      roomId: payload.roomId,
      roomType: payload.roomType,
      participants: this.liveRoomManager.getParticipants(roomKey),
    });

    client.to(roomKey).emit('participant_joined', {
      roomId: payload.roomId,
      roomType: payload.roomType,
      user: participant,
    });
  }

  @SubscribeMessage('leave_live_room')
  handleLeaveLiveRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { roomId: string; roomType?: LiveRoomType },
  ) {
    if (!payload?.roomId) {
      return;
    }
    this.leaveActiveLiveRoom(client, payload.roomId, payload.roomType);
  }

  @SubscribeMessage('live_room_message')
  handleLiveRoomMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { roomId: string; roomType: LiveRoomType; content: string },
  ) {
    const userId = client.data?.userId;
    const content = payload?.content?.trim();
    if (!userId || !payload?.roomId || !payload?.roomType || !content) {
      return;
    }

    const roomKey = liveRoomKey(payload.roomType, payload.roomId);
    const message = {
      id: `live-${Date.now()}-${userId}`,
      roomId: payload.roomId,
      roomType: payload.roomType,
      content,
      senderId: userId,
      senderName: client.data.userName ?? 'LinkUp user',
      createdAt: new Date().toISOString(),
    };

    this.server.to(roomKey).emit('live_room_message_received', message);
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
      client.join(getGroupRoom(payload.targetId));
      return;
    }

    client.join(getDirectRoom(client.data.userId, payload.targetId));
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
    client.join(getDirectRoom(client.data.userId, payload.peerId));
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
    client.join(getGroupRoom(payload.groupId));
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      chatType: ChatType;
      receiverId?: string;
      groupId?: string;
      content?: string;
      type?: 'text' | 'voice';
      mediaUrl?: string;
      mediaType?: 'audio';
      duration?: number;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      client.emit('message_error', { message: 'Not authenticated' });
      return;
    }

    const messageType = payload?.type ?? 'text';
    const content = payload?.content?.trim() ?? '';

    if (messageType === 'voice') {
      if (!payload.mediaUrl) {
        client.emit('message_error', {
          message: 'Voice note media URL is required',
        });
        return;
      }
      if (!payload.duration || payload.duration < 1) {
        client.emit('message_error', {
          message: 'Voice note duration is required',
        });
        return;
      }
    } else if (!content) {
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
        type: messageType,
        mediaUrl: payload.mediaUrl,
        mediaType: payload.mediaType,
        duration: payload.duration,
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
        .to(getGroupRoom(payload.targetId))
        .emit('typing', eventPayload);
      return;
    }

    this.server
      .to(getDirectRoom(userId, payload.targetId))
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
      client.to(getGroupRoom(payload.groupId)).emit('typing', {
        chatType: 'group' as const,
        targetId: payload.groupId,
        isTyping: true,
        userId,
      });
      return;
    }

    if (payload.peerId) {
      this.server
        .to(getDirectRoom(userId, payload.peerId))
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
      client.to(getGroupRoom(payload.groupId)).emit('typing', {
        chatType: 'group' as const,
        targetId: payload.groupId,
        isTyping: false,
        userId,
      });
      return;
    }

    if (payload.peerId) {
      this.server
        .to(getDirectRoom(userId, payload.peerId))
        .emit('typing', {
          chatType: 'direct' as const,
          targetId: payload.peerId,
          isTyping: false,
          userId,
        });
    }
  }

  emitDirectMessage(message: Parameters<RealtimeEmitter['emitDirectMessage']>[0]) {
    this.realtimeEmitter.emitDirectMessage(message);
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

    this.server.to(getGroupRoom(message.groupId)).emit('message_received', payload);
    this.server
      .to(getGroupRoom(message.groupId))
      .emit('group_message_received', { message });
    this.server
      .to(getGroupRoom(message.groupId))
      .emit('message:new', { type: 'group', message });
  }

  emitMessagesRead(readerId: string, peerId: string) {
    this.server.to(getDirectRoom(readerId, peerId)).emit('message:read', {
      readerId,
      peerId,
    });
  }

  isUserOnline(userId: string): boolean {
    return this.presenceService.isConnected(userId);
  }

  private resolveCallTarget(payload?: {
    peerId?: string;
    targetUserId?: string;
  }): string | undefined {
    return payload?.targetUserId ?? payload?.peerId;
  }

  @SubscribeMessage('call_offer')
  handleCallOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      peerId?: string;
      targetUserId?: string;
      sdp?: unknown;
      offer?: unknown;
      callType?: 'audio' | 'video';
    },
  ) {
    const peerId = this.resolveCallTarget(payload);
    const sdp = payload?.sdp ?? payload?.offer;
    if (!peerId || !sdp) {
      client.emit('call_error', { message: 'Invalid call offer payload' });
      return;
    }

    this.relayToPeer(client, peerId, 'call_offer', {
      sdp,
      callType: payload?.callType ?? 'video',
    });
  }

  @SubscribeMessage('call_answer')
  handleCallAnswer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      peerId?: string;
      targetUserId?: string;
      sdp?: unknown;
      answer?: unknown;
    },
  ) {
    const peerId = this.resolveCallTarget(payload);
    const sdp = payload?.sdp ?? payload?.answer;
    if (!peerId || !sdp) {
      client.emit('call_error', { message: 'Invalid call answer payload' });
      return;
    }

    this.relayToPeer(client, peerId, 'call_answer', { sdp });
  }

  @SubscribeMessage('ice_candidate')
  handleIceCandidate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      peerId?: string;
      targetUserId?: string;
      candidate?: unknown;
    },
  ) {
    const peerId = this.resolveCallTarget(payload);
    if (!peerId || payload?.candidate === undefined) {
      client.emit('call_error', { message: 'Invalid ICE candidate payload' });
      return;
    }

    this.relayToPeer(client, peerId, 'ice_candidate', {
      candidate: payload.candidate,
    });
  }

  @SubscribeMessage('call_end')
  handleCallEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId?: string; targetUserId?: string },
  ) {
    const peerId = this.resolveCallTarget(payload);
    if (!peerId) {
      client.emit('call_error', { message: 'Call end requires a target user' });
      return;
    }

    this.relayToPeer(client, peerId, 'call_end', {});
  }

  @SubscribeMessage('call_reject')
  handleCallReject(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { peerId?: string; targetUserId?: string },
  ) {
    const peerId = this.resolveCallTarget(payload);
    if (!peerId) {
      client.emit('call_error', { message: 'Call reject requires a target user' });
      return;
    }

    this.relayToPeer(client, peerId, 'call_rejected', {});
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

  @SubscribeMessage('live_talk_reconnect')
  async handleLiveTalkReconnect(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { groupId: string; roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      client.emit('live_talk_error', {
        message: 'Invalid Live Talk reconnect payload',
      });
      return;
    }

    try {
      const restored = await this.groupLiveTalkService.reconnectRoom(
        payload.groupId,
        payload.roomId,
        userId,
      );

      await this.attachClientToLiveTalkRoom(client, {
        groupId: payload.groupId,
        roomId: payload.roomId,
        isMuted: restored.self.isMuted,
        handRaised: restored.self.handRaised,
        announceSocketJoin: restored.restored,
      });

      client.emit('live_talk_reconnected', {
        groupId: payload.groupId,
        roomId: payload.roomId,
        room: restored.room,
        self: restored.self,
        restored: restored.restored,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not reconnect Live Talk';
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_heartbeat')
  async handleLiveTalkHeartbeat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { groupId: string; roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    try {
      await this.groupLiveTalkService.heartbeat(
        payload.groupId,
        payload.roomId,
        userId,
      );
    } catch {
      // ignore stale heartbeat
    }
  }

  @SubscribeMessage('live_talk_join')
  async handleLiveTalkJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { groupId: string; roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      client.emit('live_talk_error', { message: 'Invalid Live Talk join payload' });
      return;
    }

    try {
      await this.groupLiveTalkService.assertGroupMember(
        payload.groupId,
        userId,
      );
      const dbParticipant =
        await this.groupLiveTalkService.assertActiveParticipant(
          payload.roomId,
          userId,
        );

      await this.leaveActiveGroupLiveTalk(client, undefined, undefined, {
        skipDisconnectNotify: true,
      });

      const participants = await this.attachClientToLiveTalkRoom(client, {
        groupId: payload.groupId,
        roomId: payload.roomId,
        isMuted: dbParticipant.isMuted,
        handRaised: dbParticipant.handRaised,
        announceSocketJoin: true,
      });

      client.emit('live_talk_participants', {
        groupId: payload.groupId,
        roomId: payload.roomId,
        participants,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not join Live Talk';
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_leave')
  handleLiveTalkLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string; roomId: string },
  ) {
    if (!payload?.groupId || !payload?.roomId) {
      return;
    }
    const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
    if (client.data.liveTalkRoomKey === roomKey) {
      void this.leaveActiveGroupLiveTalk(
        client,
        payload.groupId,
        payload.roomId,
        { explicitLeave: true },
      );
    }
  }

  @SubscribeMessage('live_talk_offer')
  handleLiveTalkOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      groupId: string;
      roomId: string;
      targetUserId: string;
      offer: unknown;
    },
  ) {
    this.relayLiveTalkSignal(client, payload, 'live_talk_offer', {
      groupId: payload.groupId,
      roomId: payload.roomId,
      offer: payload.offer,
    });
  }

  @SubscribeMessage('live_talk_answer')
  handleLiveTalkAnswer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      groupId: string;
      roomId: string;
      targetUserId: string;
      answer: unknown;
    },
  ) {
    this.relayLiveTalkSignal(client, payload, 'live_talk_answer', {
      groupId: payload.groupId,
      roomId: payload.roomId,
      answer: payload.answer,
    });
  }

  @SubscribeMessage('live_talk_ice_candidate')
  handleLiveTalkIceCandidate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      groupId: string;
      roomId: string;
      targetUserId: string;
      candidate: unknown;
    },
  ) {
    this.relayLiveTalkSignal(client, payload, 'live_talk_ice_candidate', {
      groupId: payload.groupId,
      roomId: payload.roomId,
      candidate: payload.candidate,
    });
  }

  @SubscribeMessage('live_talk_open_mic')
  async handleLiveTalkOpenMic(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string; roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    try {
      const room = await this.groupLiveTalkService.openMic(
        payload.groupId,
        payload.roomId,
        userId,
      );
      client.emit('live_talk_mic_opened', {
        groupId: payload.groupId,
        roomId: payload.roomId,
        userId,
        room,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not open mic';
      if (message.includes('already in use')) {
        client.emit('live_talk_mic_busy', {
          groupId: payload.groupId,
          roomId: payload.roomId,
          message,
        });
      }
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_release_mic')
  async handleLiveTalkReleaseMic(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string; roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    try {
      await this.groupLiveTalkService.releaseMic(
        payload.groupId,
        payload.roomId,
        userId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not release mic';
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_raise_hand')
  async handleLiveTalkRaiseHand(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string; roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
    if (client.data.liveTalkRoomKey !== roomKey) {
      return;
    }

    try {
      await this.groupLiveTalkService.raiseHand(
        payload.groupId,
        payload.roomId,
        userId,
      );
      this.groupLiveTalkManager.setHandRaised(roomKey, userId, true);
    } catch {
      // Ignore invalid hand updates.
    }
  }

  @SubscribeMessage('live_talk_lower_hand')
  async handleLiveTalkLowerHand(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string; roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
    if (client.data.liveTalkRoomKey !== roomKey) {
      return;
    }

    try {
      await this.groupLiveTalkService.lowerHand(
        payload.groupId,
        payload.roomId,
        userId,
      );
      this.groupLiveTalkManager.setHandRaised(roomKey, userId, false);
    } catch {
      // Ignore invalid hand updates.
    }
  }

  @SubscribeMessage('live_talk_pass_mic')
  async handleLiveTalkPassMic(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { groupId: string; roomId: string; targetUserId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId || !payload?.targetUserId) {
      return;
    }

    try {
      await this.groupLiveTalkService.passMic(
        payload.groupId,
        payload.roomId,
        userId,
        payload.targetUserId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not pass mic';
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_force_release_mic')
  async handleLiveTalkForceReleaseMic(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string; roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    try {
      await this.groupLiveTalkService.forceReleaseMic(
        payload.groupId,
        payload.roomId,
        userId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not release mic';
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_mute_participant')
  async handleLiveTalkMuteParticipant(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      groupId: string;
      roomId: string;
      targetUserId: string;
      isMuted: boolean;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId || !payload?.targetUserId) {
      return;
    }

    try {
      await this.groupLiveTalkService.muteParticipant(
        payload.groupId,
        payload.roomId,
        userId,
        payload.targetUserId,
        Boolean(payload.isMuted),
      );
      const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
      this.groupLiveTalkManager.setMuted(
        roomKey,
        payload.targetUserId,
        Boolean(payload.isMuted),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not mute participant';
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_remove_participant')
  async handleLiveTalkRemoveParticipant(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { groupId: string; roomId: string; targetUserId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId || !payload?.targetUserId) {
      return;
    }

    try {
      await this.groupLiveTalkService.removeParticipant(
        payload.groupId,
        payload.roomId,
        userId,
        payload.targetUserId,
      );

      const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
      const sockets = await this.server.in(roomKey).fetchSockets();
      for (const remote of sockets) {
        const authed = remote as unknown as AuthedSocket;
        if (authed.data?.userId === payload.targetUserId) {
          void this.leaveActiveGroupLiveTalk(
            authed,
            payload.groupId,
            payload.roomId,
          );
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not remove participant';
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_clear_hand')
  async handleLiveTalkClearHand(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { groupId: string; roomId: string; targetUserId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId || !payload?.targetUserId) {
      return;
    }

    try {
      await this.groupLiveTalkService.clearHand(
        payload.groupId,
        payload.roomId,
        userId,
        payload.targetUserId,
      );
      const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
      this.groupLiveTalkManager.setHandRaised(
        roomKey,
        payload.targetUserId,
        false,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not clear raised hand';
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_mute_changed')
  async handleLiveTalkMuteChanged(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { groupId: string; roomId: string; isMuted: boolean },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
    if (client.data.liveTalkRoomKey !== roomKey) {
      return;
    }

    try {
      await this.groupLiveTalkService.setMuted(
        payload.groupId,
        payload.roomId,
        userId,
        Boolean(payload.isMuted),
      );
      this.groupLiveTalkManager.setMuted(
        roomKey,
        userId,
        Boolean(payload.isMuted),
      );
    } catch {
      // Ignore invalid mute updates.
    }
  }

  @SubscribeMessage('live_talk_message')
  async handleLiveTalkMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { groupId: string; roomId: string; content: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId || !payload?.content) {
      return;
    }

    const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
    if (client.data.liveTalkRoomKey !== roomKey) {
      return;
    }

    try {
      await this.groupLiveTalkService.postMessage(
        payload.groupId,
        payload.roomId,
        userId,
        payload.content,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not send message';
      client.emit('live_talk_error', { message });
    }
  }

  @SubscribeMessage('live_talk_hand_changed')
  async handleLiveTalkHandChanged(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: { groupId: string; roomId: string; handRaised: boolean },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
    if (client.data.liveTalkRoomKey !== roomKey) {
      return;
    }

    try {
      await this.groupLiveTalkService.setHandRaised(
        payload.groupId,
        payload.roomId,
        userId,
        Boolean(payload.handRaised),
      );
      this.groupLiveTalkManager.setHandRaised(
        roomKey,
        userId,
        Boolean(payload.handRaised),
      );
    } catch {
      // Ignore invalid hand updates.
    }
  }

  @SubscribeMessage('live_talk_speaking_changed')
  handleLiveTalkSpeakingChanged(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      groupId: string;
      roomId: string;
      speaking: boolean;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
    if (client.data.liveTalkRoomKey !== roomKey) {
      return;
    }

    const speaking = Boolean(payload.speaking);
    this.groupLiveTalkManager.setSpeaking(roomKey, userId, speaking);

    const speakingPayload = {
      groupId: payload.groupId,
      roomId: payload.roomId,
      userId,
      speaking,
    };

    client.to(roomKey).emit('live_talk_speaking_changed', speakingPayload);
    this.server.to(roomKey).emit('user_speaking', speakingPayload);
    this.realtimeEmitter.emitToRoom(
      getGroupRoom(payload.groupId),
      'user_speaking',
      speakingPayload,
    );
  }

  @SubscribeMessage('live_talk_end')
  async handleLiveTalkEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { groupId: string; roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.groupId || !payload?.roomId) {
      return;
    }

    try {
      await this.groupLiveTalkService.endRoom(
        payload.groupId,
        payload.roomId,
        userId,
      );
      await this.endGroupLiveTalkSocketRoom(
        payload.groupId,
        payload.roomId,
        client,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not end Live Talk';
      client.emit('live_talk_error', { message });
    }
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

    this.server.to(getUserRoom(targetUserId)).emit(event, {
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

    const payload = {
      ...data,
      fromUserId,
    };

    this.server.to(getUserRoom(peerId)).emit(event, payload);

    if (event === 'call_offer') {
      this.server.to(getUserRoom(peerId)).emit('incoming_call', {
        ...payload,
        callType: data.callType ?? 'video',
        offer: data.sdp,
      });
    }

    if (event === 'call_end') {
      this.server.to(getUserRoom(peerId)).emit('call_ended', payload);
    }

    if (event === 'call_rejected') {
      this.server.to(getUserRoom(peerId)).emit('call_reject', payload);
    }
  }

  private emitTypingUpdate(
    client: AuthedSocket,
    payload: { chatType?: ChatType; targetId?: string },
    isTyping: boolean,
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.targetId || !payload?.chatType) {
      return;
    }

    const eventPayload = {
      userId,
      chatType: payload.chatType,
      targetId: payload.targetId,
      isTyping,
    };

    if (payload.chatType === 'group') {
      client.to(getGroupRoom(payload.targetId)).emit('typing_update', eventPayload);
      client.to(getGroupRoom(payload.targetId)).emit('typing', eventPayload);
      return;
    }

    client
      .to(getDirectRoom(userId, payload.targetId))
      .emit('typing_update', eventPayload);
    client
      .to(getDirectRoom(userId, payload.targetId))
      .emit('typing', eventPayload);
  }

  private relayLiveTalkSignal(
    client: AuthedSocket,
    payload: { groupId?: string; roomId?: string; targetUserId?: string },
    event: string,
    data: Record<string, unknown>,
  ) {
    const fromUserId = client.data?.userId;
    if (!fromUserId || !payload?.targetUserId || !payload.groupId || !payload.roomId) {
      return;
    }

    const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
    if (client.data.liveTalkRoomKey !== roomKey) {
      return;
    }

    this.server.to(getUserRoom(payload.targetUserId)).emit(event, {
      ...data,
      fromUserId,
    });
  }

  private async attachClientToLiveTalkRoom(
    client: AuthedSocket,
    payload: {
      groupId: string;
      roomId: string;
      isMuted: boolean;
      handRaised: boolean;
      announceSocketJoin: boolean;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      return [];
    }

    const roomKey = getGroupLiveTalkRoom(payload.groupId, payload.roomId);
    const participant = {
      userId,
      name: client.data.userName ?? 'LinkUp user',
      avatarUrl: client.data.userAvatarUrl ?? null,
      isMuted: payload.isMuted,
      handRaised: payload.handRaised,
    };

    client.join(roomKey);
    client.data.liveTalkRoomKey = roomKey;
    client.data.liveTalkGroupId = payload.groupId;
    client.data.liveTalkRoomId = payload.roomId;

    const participants = this.groupLiveTalkManager.join(roomKey, participant);

    if (payload.announceSocketJoin) {
      client.to(roomKey).emit('live_talk_participant_joined', {
        groupId: payload.groupId,
        roomId: payload.roomId,
        participant,
      });

      const joinedPayload = { userId, groupId: payload.groupId };
      this.server.to(roomKey).emit('user_joined_liveTalk', joinedPayload);
      this.realtimeEmitter.emitToRoom(
        getGroupRoom(payload.groupId),
        'user_joined_liveTalk',
        joinedPayload,
      );
    }

    return participants;
  }

  private async leaveActiveGroupLiveTalk(
    client: AuthedSocket,
    groupId?: string,
    roomId?: string,
    options?: { skipDisconnectNotify?: boolean; explicitLeave?: boolean },
  ) {
    const roomKey =
      client.data.liveTalkRoomKey ??
      this.groupLiveTalkManager.findRoomKeyForUser(client.data?.userId ?? '');

    const userId = client.data?.userId;
    if (!roomKey || !userId) {
      return;
    }

    const resolvedGroupId =
      groupId ??
      client.data.liveTalkGroupId ??
      roomKey.split(':')[1] ??
      '';
    const resolvedRoomId =
      roomId ?? client.data.liveTalkRoomId ?? roomKey.split(':')[2] ?? '';

    if (!resolvedGroupId || !resolvedRoomId) {
      return;
    }

    const removed = this.groupLiveTalkManager.leave(roomKey, userId);
    client.leave(roomKey);
    delete client.data.liveTalkRoomKey;
    delete client.data.liveTalkGroupId;
    delete client.data.liveTalkRoomId;

    if (!removed) {
      return;
    }

    if (options?.explicitLeave) {
      await this.groupLiveTalkService.leaveRoom(
        resolvedGroupId,
        resolvedRoomId,
        userId,
      );
    } else if (!options?.skipDisconnectNotify) {
      this.groupLiveTalkService.notifyParticipantDisconnected(
        resolvedGroupId,
        resolvedRoomId,
        userId,
      );
    }

    if (this.groupLiveTalkManager.isRoomActive(roomKey)) {
      this.server.to(roomKey).emit('live_talk_participant_left', {
        groupId: resolvedGroupId,
        roomId: resolvedRoomId,
        userId,
      });
      return;
    }

    await this.endGroupLiveTalkSocketRoom(
      resolvedGroupId,
      resolvedRoomId,
      client,
    );
  }

  private async endGroupLiveTalkSocketRoom(
    groupId: string,
    roomId: string,
    client: AuthedSocket,
  ) {
    const roomKey = getGroupLiveTalkRoom(groupId, roomId);
    this.groupLiveTalkManager.clearRoom(roomKey);
    delete client.data.liveTalkRoomKey;
    delete client.data.liveTalkGroupId;
    delete client.data.liveTalkRoomId;

    this.server.to(roomKey).emit('live_talk_ended', {
      groupId,
      roomId,
    });
  }

  private leaveActiveLiveRoom(
    client: AuthedSocket,
    roomId?: string,
    roomType?: LiveRoomType,
  ) {
    const roomKey =
      client.data.liveRoomKey ??
      (roomId && roomType ? liveRoomKey(roomType, roomId) : null) ??
      this.liveRoomManager.findRoomKeyForUser(client.data?.userId ?? '');

    const userId = client.data?.userId;
    if (!roomKey || !userId) {
      return;
    }

    const resolvedRoomId =
      roomId ?? client.data.liveRoomId ?? roomKey.split(':').slice(2).join(':');

    const removed = this.liveRoomManager.leave(roomKey, userId);
    client.leave(roomKey);
    delete client.data.liveRoomKey;
    delete client.data.liveRoomId;

    if (!removed) {
      return;
    }

    this.server.to(roomKey).emit('participant_left', {
      roomId: resolvedRoomId,
      userId,
    });
  }

}
