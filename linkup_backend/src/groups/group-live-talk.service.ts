import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupLiveRoomStatus,
  GroupRole,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEmitter } from '../chat/realtime.emitter';
import {
  getGroupLiveTalkRoom,
  getGroupRoom,
  getUserRoom,
} from '../chat/chat-rooms.util';
import { GroupLiveTalkManager } from './group-live-talk.manager';

const userSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export type LiveTalkParticipantDto = {
  id: string;
  userId: string;
  isMuted: boolean;
  handRaised: boolean;
  handRaisedAt: Date | null;
  joinedAt: Date;
  leftAt: Date | null;
  groupRole: GroupRole;
  user: Prisma.UserGetPayload<{ select: typeof userSelect }>;
};

export type RaisedHandQueueDto = {
  userId: string;
  handRaisedAt: Date;
  groupRole: GroupRole;
  user: Prisma.UserGetPayload<{ select: typeof userSelect }>;
};

export type LiveTalkMessageDto = {
  id: string;
  roomId: string;
  userId: string | null;
  kind: 'text' | 'system';
  content: string;
  createdAt: Date;
  user: Prisma.UserGetPayload<{ select: typeof userSelect }> | null;
};

export type LiveTalkRoomDto = {
  id: string;
  groupId: string;
  hostId: string;
  status: GroupLiveRoomStatus;
  activeMicUserId: string | null;
  activeMicStartedAt: Date | null;
  startedAt: Date;
  endedAt: Date | null;
  host: Prisma.UserGetPayload<{ select: typeof userSelect }>;
  activeMicUser: Prisma.UserGetPayload<{ select: typeof userSelect }> | null;
  participants: LiveTalkParticipantDto[];
  raisedHands: RaisedHandQueueDto[];
};

export type LiveTalkStatusParticipantDto = LiveTalkParticipantDto & {
  speaking: boolean;
  inCall: boolean;
};

export type LiveTalkStatusDto = {
  active: boolean;
  roomId: string | null;
  room: LiveTalkRoomDto | null;
  participants: LiveTalkStatusParticipantDto[];
  raisedHands: RaisedHandQueueDto[];
  speakingUserIds: string[];
};

@Injectable()
export class GroupLiveTalkService {
  /** Grace period before marking a disconnected user as left (rejoin protection). */
  private static readonly DISCONNECT_LEAVE_MS = 30_000;

  private readonly pendingLeaveTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitter,
    private readonly liveTalkManager: GroupLiveTalkManager,
  ) {}

  async assertGroupMember(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, ownerId: true },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.ownerId === userId) {
      return { role: GroupRole.OWNER as GroupRole };
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('You must be a hub member to use Live Talk');
    }

    return membership;
  }

  private async assertCanStartLiveTalk(groupId: string, userId: string) {
    const membership = await this.assertGroupMember(groupId, userId);
    const canStart =
      membership.role === GroupRole.OWNER ||
      membership.role === GroupRole.ADMIN;

    if (!canStart) {
      throw new ForbiddenException(
        'Only the hub host or moderators can start Live Talk',
      );
    }
  }

  private emitLiveTalkUserJoined(groupId: string, userId: string) {
    const payload = { userId, groupId };
    this.realtimeEmitter.emitToRoom(
      getGroupRoom(groupId),
      'user_joined_liveTalk',
      payload,
    );
  }

  private emitLiveTalkUserLeft(groupId: string, userId: string) {
    const payload = { userId, groupId };
    this.realtimeEmitter.emitToRoom(
      getGroupRoom(groupId),
      'user_left_liveTalk',
      payload,
    );
  }

  private emitLiveTalkRoomEvent(
    groupId: string,
    roomId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    this.realtimeEmitter.emitToRoom(
      getGroupLiveTalkRoom(groupId, roomId),
      event,
      payload,
    );
    this.realtimeEmitter.emitToRoom(getGroupRoom(groupId), event, payload);
  }

  private async assertHostModerator(
    groupId: string,
    actorId: string,
    liveTalkHostId: string,
  ) {
    if (liveTalkHostId === actorId) {
      return { role: GroupRole.OWNER as GroupRole };
    }

    const membership = await this.assertGroupMember(groupId, actorId);
    if (
      membership.role === GroupRole.OWNER ||
      membership.role === GroupRole.ADMIN
    ) {
      return membership;
    }

    throw new ForbiddenException(
      'Only the hub host or moderators can use host controls',
    );
  }

  private async getParticipantRoles(
    groupId: string,
    participantUserIds: string[],
  ): Promise<Map<string, GroupRole>> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });

    const roles = new Map<string, GroupRole>();
    if (!group) {
      return roles;
    }

    roles.set(group.ownerId, GroupRole.OWNER);

    if (participantUserIds.length === 0) {
      return roles;
    }

    const members = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: participantUserIds },
      },
      select: { userId: true, role: true },
    });

    for (const member of members) {
      roles.set(member.userId, member.role);
    }

    for (const userId of participantUserIds) {
      if (!roles.has(userId)) {
        roles.set(userId, GroupRole.MEMBER);
      }
    }

    return roles;
  }

  private async mapRoom(
    room: Prisma.GroupLiveRoomGetPayload<{
      include: {
        host: { select: typeof userSelect };
        activeMicUser: { select: typeof userSelect };
        participants: {
          where: { leftAt: null };
          include: { user: { select: typeof userSelect } };
        };
      };
    }>,
  ): Promise<LiveTalkRoomDto> {
    const roles = await this.getParticipantRoles(
      room.groupId,
      room.participants.map((p) => p.userId),
    );

    const participants: LiveTalkParticipantDto[] = room.participants.map(
      (p) => ({
        id: p.id,
        userId: p.userId,
        isMuted: p.isMuted,
        handRaised: p.handRaised,
        handRaisedAt: p.handRaisedAt,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        groupRole: roles.get(p.userId) ?? GroupRole.MEMBER,
        user: p.user,
      }),
    );

    const raisedHands: RaisedHandQueueDto[] = participants
      .filter((p) => p.handRaised)
      .sort(
        (a, b) =>
          (a.handRaisedAt?.getTime() ?? a.joinedAt.getTime()) -
          (b.handRaisedAt?.getTime() ?? b.joinedAt.getTime()),
      )
      .map((p) => ({
        userId: p.userId,
        handRaisedAt: p.handRaisedAt ?? p.joinedAt,
        groupRole: p.groupRole,
        user: p.user,
      }));

    return {
      id: room.id,
      groupId: room.groupId,
      hostId: room.hostId,
      status: room.status,
      activeMicUserId: room.activeMicUserId,
      activeMicStartedAt: room.activeMicStartedAt,
      startedAt: room.startedAt,
      endedAt: room.endedAt,
      host: room.host,
      activeMicUser: room.activeMicUser,
      participants,
      raisedHands,
    };
  }

  private async publishRoomUpdate(
    groupId: string,
    roomId: string,
  ): Promise<LiveTalkRoomDto> {
    const room = await this.prisma.groupLiveRoom.findUniqueOrThrow({
      where: { id: roomId },
      include: this.roomInclude(),
    });

    const mapped = await this.mapRoom(room);
    this.emitLiveTalkRoomEvent(groupId, roomId, 'live_talk_room_updated', {
      groupId,
      roomId,
      room: mapped,
    });

    return mapped;
  }

  private mapMessage(
    message: Prisma.GroupLiveTalkMessageGetPayload<{
      include: { user: { select: typeof userSelect } };
    }>,
  ): LiveTalkMessageDto {
    return {
      id: message.id,
      roomId: message.roomId,
      userId: message.userId,
      kind: message.kind === 'system' ? 'system' : 'text',
      content: message.content,
      createdAt: message.createdAt,
      user: message.user,
    };
  }

  private messageInclude() {
    return { user: { select: userSelect } };
  }

  async getMessages(
    groupId: string,
    roomId: string,
    userId: string,
    limit = 100,
  ): Promise<LiveTalkMessageDto[]> {
    await this.assertGroupMember(groupId, userId);
    await this.getActiveRoomRecord(groupId, roomId);

    const rows = await this.prisma.groupLiveTalkMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: this.messageInclude(),
    });

    return rows.map((row) => this.mapMessage(row));
  }

  async postMessage(
    groupId: string,
    roomId: string,
    userId: string,
    content: string,
  ): Promise<LiveTalkMessageDto> {
    await this.assertGroupMember(groupId, userId);
    await this.getActiveRoomRecord(groupId, roomId);
    await this.assertActiveParticipant(roomId, userId);

    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty');
    }

    const created = await this.prisma.groupLiveTalkMessage.create({
      data: {
        roomId,
        userId,
        kind: 'text',
        content: trimmed,
      },
      include: this.messageInclude(),
    });

    const mapped = this.mapMessage(created);
    this.emitRoomMessage(groupId, roomId, mapped);
    return mapped;
  }

  async postSystemMessage(
    roomId: string,
    groupId: string,
    content: string,
  ): Promise<LiveTalkMessageDto> {
    const created = await this.prisma.groupLiveTalkMessage.create({
      data: {
        roomId,
        kind: 'system',
        content,
      },
      include: this.messageInclude(),
    });

    const mapped = this.mapMessage(created);
    this.emitRoomMessage(groupId, roomId, mapped);
    return mapped;
  }

  private emitRoomMessage(
    groupId: string,
    roomId: string,
    message: LiveTalkMessageDto,
  ) {
    this.realtimeEmitter.emitToRoom(
      getGroupLiveTalkRoom(groupId, roomId),
      'live_talk_message',
      { groupId, roomId, message },
    );
  }

  async setHandRaised(
    groupId: string,
    roomId: string,
    userId: string,
    handRaised: boolean,
  ): Promise<LiveTalkParticipantDto> {
    await this.assertGroupMember(groupId, userId);
    await this.getActiveRoomRecord(groupId, roomId);

    const participant = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId, leftAt: null },
      include: { user: { select: userSelect } },
    });

    if (!participant) {
      throw new BadRequestException('You are not in this Live Talk');
    }

    const updated = await this.prisma.groupLiveParticipant.update({
      where: { id: participant.id },
      data: {
        handRaised,
        handRaisedAt: handRaised ? new Date() : null,
      },
      include: { user: { select: userSelect } },
    });

    const event = handRaised ? 'live_talk_hand_raised' : 'live_talk_hand_lowered';
    this.emitLiveTalkRoomEvent(groupId, roomId, event, {
      groupId,
      roomId,
      userId,
      handRaised,
    });

    await this.publishRoomUpdate(groupId, roomId);

    const roles = await this.getParticipantRoles(groupId, [userId]);

    return {
      id: updated.id,
      userId: updated.userId,
      isMuted: updated.isMuted,
      handRaised: updated.handRaised,
      handRaisedAt: updated.handRaisedAt,
      joinedAt: updated.joinedAt,
      leftAt: updated.leftAt,
      groupRole: roles.get(userId) ?? GroupRole.MEMBER,
      user: updated.user,
    };
  }

  private roomInclude() {
    return {
      host: { select: userSelect },
      activeMicUser: { select: userSelect },
      participants: {
        where: { leftAt: null },
        include: { user: { select: userSelect } },
        orderBy: { joinedAt: 'asc' as const },
      },
    };
  }

  private async getRoomWithMic(groupId: string, roomId: string) {
    const room = await this.prisma.groupLiveRoom.findFirst({
      where: {
        id: roomId,
        groupId,
        status: GroupLiveRoomStatus.ACTIVE,
      },
      include: this.roomInclude(),
    });

    if (!room) {
      throw new NotFoundException('Live Talk is not active');
    }

    return room;
  }

  async openMic(
    groupId: string,
    roomId: string,
    userId: string,
  ): Promise<LiveTalkRoomDto> {
    await this.assertGroupMember(groupId, userId);
    const room = await this.getRoomWithMic(groupId, roomId);
    await this.assertActiveParticipant(roomId, userId);

    if (room.activeMicUserId && room.activeMicUserId !== userId) {
      const holder = room.activeMicUser;
      this.emitLiveTalkRoomEvent(groupId, roomId, 'live_talk_mic_busy', {
        groupId,
        roomId,
        activeMicUserId: room.activeMicUserId,
        activeMicUserName: holder?.name ?? 'Someone',
      });
      throw new ConflictException('Mic is already in use.');
    }

    if (room.activeMicUserId === userId) {
      await this.prisma.groupLiveParticipant.updateMany({
        where: { roomId, userId, leftAt: null },
        data: { isMuted: false },
      });
    } else {
      await this.prisma.$transaction([
        this.prisma.groupLiveRoom.update({
          where: { id: roomId },
          data: {
            activeMicUserId: userId,
            activeMicStartedAt: new Date(),
          },
        }),
        this.prisma.groupLiveParticipant.updateMany({
          where: { roomId, userId, leftAt: null },
          data: {
            isMuted: false,
            handRaised: false,
            handRaisedAt: null,
          },
        }),
      ]);
    }

    const holder = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    await this.postSystemMessage(
      roomId,
      groupId,
      `${holder?.name ?? 'Someone'} opened the mic`,
    );

    const refreshed = await this.prisma.groupLiveRoom.findUniqueOrThrow({
      where: { id: roomId },
      include: this.roomInclude(),
    });

    const mapped = await this.mapRoom(refreshed);
    this.emitLiveTalkRoomEvent(groupId, roomId, 'live_talk_mic_opened', {
      groupId,
      roomId,
      userId,
      room: mapped,
    });

    return mapped;
  }

  async releaseMic(
    groupId: string,
    roomId: string,
    userId: string,
    force = false,
  ): Promise<LiveTalkRoomDto> {
    const membership = await this.assertGroupMember(groupId, userId);
    const room = await this.getRoomWithMic(groupId, roomId);

    if (!room.activeMicUserId) {
      const mapped = await this.mapRoom(room);
      return mapped;
    }

    const canForce =
      force ||
      room.hostId === userId ||
      membership.role === GroupRole.OWNER ||
      membership.role === GroupRole.ADMIN;

    if (room.activeMicUserId !== userId && !canForce) {
      throw new ForbiddenException('Only the active speaker can release the mic');
    }

    const previousHolderId = room.activeMicUserId;

    await this.prisma.$transaction([
      this.prisma.groupLiveRoom.update({
        where: { id: roomId },
        data: {
          activeMicUserId: null,
          activeMicStartedAt: null,
        },
      }),
      this.prisma.groupLiveParticipant.updateMany({
        where: { roomId, userId: previousHolderId, leftAt: null },
        data: { isMuted: true },
      }),
    ]);

    const holder = await this.prisma.user.findUnique({
      where: { id: previousHolderId },
      select: { name: true },
    });
    await this.postSystemMessage(
      roomId,
      groupId,
      `${holder?.name ?? 'Someone'} released the mic · Mic is available`,
    );

    const refreshed = await this.prisma.groupLiveRoom.findUniqueOrThrow({
      where: { id: roomId },
      include: this.roomInclude(),
    });

    const mapped = await this.mapRoom(refreshed);
    this.emitLiveTalkRoomEvent(groupId, roomId, 'live_talk_mic_released', {
      groupId,
      roomId,
      userId: previousHolderId,
      room: mapped,
    });

    return mapped;
  }

  async passMic(
    groupId: string,
    roomId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<LiveTalkRoomDto> {
    const room = await this.getRoomWithMic(groupId, roomId);
    await this.assertHostModerator(groupId, actorId, room.hostId);

    const target = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId: targetUserId, leftAt: null },
    });

    if (!target) {
      throw new BadRequestException('Target user is not in this Live Talk');
    }

    const previousHolderId = room.activeMicUserId;

    await this.prisma.$transaction([
      ...(previousHolderId
        ? [
            this.prisma.groupLiveParticipant.updateMany({
              where: { roomId, userId: previousHolderId, leftAt: null },
              data: { isMuted: true },
            }),
          ]
        : []),
      this.prisma.groupLiveRoom.update({
        where: { id: roomId },
        data: {
          activeMicUserId: targetUserId,
          activeMicStartedAt: new Date(),
        },
      }),
      this.prisma.groupLiveParticipant.updateMany({
        where: { roomId, userId: targetUserId, leftAt: null },
        data: {
          isMuted: false,
          handRaised: false,
          handRaisedAt: null,
        },
      }),
    ]);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true },
    });
    await this.postSystemMessage(
      roomId,
      groupId,
      `Mic passed to ${targetUser?.name ?? 'participant'}`,
    );

    const refreshed = await this.prisma.groupLiveRoom.findUniqueOrThrow({
      where: { id: roomId },
      include: this.roomInclude(),
    });

    const mapped = await this.mapRoom(refreshed);
    this.emitLiveTalkRoomEvent(groupId, roomId, 'live_talk_mic_passed', {
      groupId,
      roomId,
      fromUserId: previousHolderId,
      toUserId: targetUserId,
      room: mapped,
      requiresUserAction: true,
    });

    this.realtimeEmitter.emitToRoom(
      getUserRoom(targetUserId),
      'live_talk_mic_passed',
      {
        groupId,
        roomId,
        fromUserId: previousHolderId,
        toUserId: targetUserId,
        requiresUserAction: true,
      },
    );

    return mapped;
  }

  async forceReleaseMic(
    groupId: string,
    roomId: string,
    actorId: string,
  ): Promise<LiveTalkRoomDto> {
    const room = await this.getRoomWithMic(groupId, roomId);
    await this.assertHostModerator(groupId, actorId, room.hostId);

    if (!room.activeMicUserId) {
      return this.mapRoom(room);
    }

    return this.releaseMic(groupId, roomId, actorId, true);
  }

  async muteParticipant(
    groupId: string,
    roomId: string,
    actorId: string,
    targetUserId: string,
    isMuted: boolean,
  ): Promise<LiveTalkRoomDto> {
    const room = await this.getRoomWithMic(groupId, roomId);
    await this.assertHostModerator(groupId, actorId, room.hostId);

    const participant = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId: targetUserId, leftAt: null },
    });

    if (!participant) {
      throw new BadRequestException('Target user is not in this Live Talk');
    }

    await this.prisma.groupLiveParticipant.update({
      where: { id: participant.id },
      data: { isMuted },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });
    await this.postSystemMessage(
      roomId,
      groupId,
      `${actor?.name ?? 'Host'} ${isMuted ? 'muted' : 'unmuted'} a participant`,
    );

    this.emitLiveTalkRoomEvent(groupId, roomId, 'live_talk_mute_changed', {
      groupId,
      roomId,
      userId: targetUserId,
      isMuted,
      byHost: true,
    });

    return this.publishRoomUpdate(groupId, roomId);
  }

  async removeParticipant(
    groupId: string,
    roomId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<LiveTalkRoomDto | null> {
    const room = await this.getRoomWithMic(groupId, roomId);
    await this.assertHostModerator(groupId, actorId, room.hostId);

    if (targetUserId === actorId) {
      throw new BadRequestException('Use Leave to exit Live Talk yourself');
    }

    const target = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId: targetUserId, leftAt: null },
      include: { user: { select: userSelect } },
    });

    if (!target) {
      throw new BadRequestException('Target user is not in this Live Talk');
    }

    if (room.activeMicUserId === targetUserId) {
      await this.prisma.$transaction([
        this.prisma.groupLiveRoom.update({
          where: { id: roomId },
          data: {
            activeMicUserId: null,
            activeMicStartedAt: null,
          },
        }),
        this.prisma.groupLiveParticipant.updateMany({
          where: { roomId, userId: targetUserId, leftAt: null },
          data: { isMuted: true },
        }),
      ]);
    }

    await this.markParticipantLeft(roomId, targetUserId);
    await this.postSystemMessage(
      roomId,
      groupId,
      `${target.user.name ?? 'Participant'} was removed from Live Talk`,
    );

    const roomKey = getGroupLiveTalkRoom(groupId, roomId);
    this.liveTalkManager.leave(roomKey, targetUserId);

    const payload = {
      groupId,
      roomId,
      userId: targetUserId,
      removedBy: actorId,
    };

    this.emitLiveTalkRoomEvent(
      groupId,
      roomId,
      'live_talk_participant_removed',
      payload,
    );
    this.realtimeEmitter.emitToRoom(
      getUserRoom(targetUserId),
      'live_talk_participant_removed',
      payload,
    );

    const activeCount = await this.countActiveParticipants(roomId);
    if (activeCount === 0) {
      return this.endRoomInternal(roomId, groupId);
    }

    return this.publishRoomUpdate(groupId, roomId);
  }

  async clearHand(
    groupId: string,
    roomId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<LiveTalkRoomDto> {
    const room = await this.getRoomWithMic(groupId, roomId);
    await this.assertHostModerator(groupId, actorId, room.hostId);

    const participant = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId: targetUserId, leftAt: null },
    });

    if (!participant) {
      throw new BadRequestException('Target user is not in this Live Talk');
    }

    await this.prisma.groupLiveParticipant.update({
      where: { id: participant.id },
      data: { handRaised: false, handRaisedAt: null },
    });

    this.emitLiveTalkRoomEvent(groupId, roomId, 'live_talk_hand_lowered', {
      groupId,
      roomId,
      userId: targetUserId,
      handRaised: false,
      byHost: true,
    });

    return this.publishRoomUpdate(groupId, roomId);
  }

  async raiseHand(
    groupId: string,
    roomId: string,
    userId: string,
  ): Promise<LiveTalkParticipantDto> {
    return this.setHandRaised(groupId, roomId, userId, true);
  }

  async lowerHand(
    groupId: string,
    roomId: string,
    userId: string,
  ): Promise<LiveTalkParticipantDto> {
    return this.setHandRaised(groupId, roomId, userId, false);
  }

  async getActiveRoom(
    groupId: string,
    userId: string,
  ): Promise<LiveTalkRoomDto | null> {
    await this.assertGroupMember(groupId, userId);

    const room = await this.prisma.groupLiveRoom.findFirst({
      where: { groupId, status: GroupLiveRoomStatus.ACTIVE },
      include: this.roomInclude(),
    });

    if (!room) {
      return null;
    }

    return this.mapRoom(room);
  }

  async getLiveTalkStatus(
    groupId: string,
    userId: string,
  ): Promise<LiveTalkStatusDto> {
    await this.assertGroupMember(groupId, userId);

    const room = await this.prisma.groupLiveRoom.findFirst({
      where: { groupId, status: GroupLiveRoomStatus.ACTIVE },
      include: this.roomInclude(),
    });

    if (!room) {
      return {
        active: false,
        roomId: null,
        room: null,
        participants: [],
        raisedHands: [],
        speakingUserIds: [],
      };
    }

    const mapped = await this.mapRoom(room);
    const roomKey = getGroupLiveTalkRoom(groupId, room.id);
    const inCall = this.liveTalkManager.getParticipants(roomKey);
    const inCallIds = new Set(inCall.map((p) => p.userId));
    const speakingUserIds = room.activeMicUserId
      ? [room.activeMicUserId]
      : this.liveTalkManager.getSpeakingUserIds(roomKey);

    const participants: LiveTalkStatusParticipantDto[] = mapped.participants.map(
      (p) => ({
        ...p,
        speaking: p.userId === room.activeMicUserId && !p.isMuted,
        inCall: inCallIds.has(p.userId),
      }),
    );

    return {
      active: true,
      roomId: room.id,
      room: mapped,
      participants,
      raisedHands: mapped.raisedHands,
      speakingUserIds,
    };
  }

  async startRoom(groupId: string, userId: string): Promise<LiveTalkRoomDto> {
    await this.assertGroupMember(groupId, userId);

    const existing = await this.prisma.groupLiveRoom.findFirst({
      where: { groupId, status: GroupLiveRoomStatus.ACTIVE },
      include: this.roomInclude(),
    });

    if (existing) {
      const alreadyIn = existing.participants.some((p) => p.userId === userId);
      if (!alreadyIn) {
        await this.addParticipant(existing.id, userId);
        const refreshed = await this.prisma.groupLiveRoom.findUniqueOrThrow({
          where: { id: existing.id },
          include: this.roomInclude(),
        });
        return this.mapRoom(refreshed);
      }
      return this.mapRoom(existing);
    }

    await this.assertCanStartLiveTalk(groupId, userId);

    const room = await this.prisma.groupLiveRoom.create({
      data: {
        groupId,
        hostId: userId,
        participants: {
          create: { userId, isMuted: true },
        },
      },
      include: this.roomInclude(),
    });

    const mapped = await this.mapRoom(room);
    const hostName = mapped.host.name ?? 'Someone';
    await this.postSystemMessage(
      room.id,
      groupId,
      `${hostName} started Live Talk`,
    );
    this.realtimeEmitter.emitToRoom(getGroupRoom(groupId), 'live_talk_started', {
      groupId,
      room: mapped,
    });

    return mapped;
  }

  async joinActiveRoom(
    groupId: string,
    userId: string,
  ): Promise<LiveTalkRoomDto> {
    const active = await this.prisma.groupLiveRoom.findFirst({
      where: { groupId, status: GroupLiveRoomStatus.ACTIVE },
      select: { id: true },
    });

    if (!active) {
      throw new NotFoundException('No active Live Talk in this hub');
    }

    return this.joinRoom(groupId, active.id, userId);
  }

  async joinRoom(
    groupId: string,
    roomId: string,
    userId: string,
  ): Promise<LiveTalkRoomDto> {
    await this.assertGroupMember(groupId, userId);
    this.cancelScheduledLeave(roomId, userId);
    const room = await this.getActiveRoomRecord(groupId, roomId);
    const wasInRoom = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId: room.id, userId, leftAt: null },
    });
    await this.addParticipant(room.id, userId);

    if (!wasInRoom) {
      const member = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await this.postSystemMessage(
        room.id,
        groupId,
        `${member?.name ?? 'Someone'} joined Live Talk`,
      );
      this.emitLiveTalkUserJoined(groupId, userId);
    }

    const refreshed = await this.prisma.groupLiveRoom.findUniqueOrThrow({
      where: { id: room.id },
      include: this.roomInclude(),
    });

    return this.mapRoom(refreshed);
  }

  async leaveActiveRoom(
    groupId: string,
    userId: string,
  ): Promise<LiveTalkRoomDto | null> {
    const active = await this.prisma.groupLiveRoom.findFirst({
      where: { groupId, status: GroupLiveRoomStatus.ACTIVE },
      select: { id: true },
    });

    if (!active) {
      return null;
    }

    return this.leaveRoom(groupId, active.id, userId);
  }

  scheduleParticipantLeave(
    groupId: string,
    roomId: string,
    userId: string,
    delayMs = GroupLiveTalkService.DISCONNECT_LEAVE_MS,
  ) {
    const key = this.leaveTimerKey(roomId, userId);
    this.cancelScheduledLeave(roomId, userId);
    const timer = setTimeout(() => {
      this.pendingLeaveTimers.delete(key);
      void this.leaveRoom(groupId, roomId, userId).catch(() => {
        /* room may already be ended */
      });
    }, delayMs);
    this.pendingLeaveTimers.set(key, timer);
  }

  cancelScheduledLeave(roomId: string, userId: string) {
    const key = this.leaveTimerKey(roomId, userId);
    const existing = this.pendingLeaveTimers.get(key);
    if (existing) {
      clearTimeout(existing);
      this.pendingLeaveTimers.delete(key);
    }
  }

  async transferHost(
    groupId: string,
    roomId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<LiveTalkRoomDto> {
    const room = await this.getActiveRoomRecord(groupId, roomId);
    await this.assertHostModerator(groupId, actorId, room.hostId);

    if (targetUserId === room.hostId) {
      return this.publishRoomUpdate(groupId, roomId);
    }

    const target = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId: targetUserId, leftAt: null },
    });

    if (!target) {
      throw new BadRequestException('Target user is not in this Live Talk');
    }

    return this.applyHostTransfer(
      groupId,
      roomId,
      room.hostId,
      targetUserId,
      'manual',
    );
  }

  async leaveRoom(
    groupId: string,
    roomId: string,
    userId: string,
  ): Promise<LiveTalkRoomDto | null> {
    await this.assertGroupMember(groupId, userId);
    this.cancelScheduledLeave(roomId, userId);

    const room = await this.getActiveRoomRecord(groupId, roomId);

    const openParticipant = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId: room.id, userId, leftAt: null },
    });

    if (!openParticipant) {
      const activeCount = await this.countActiveParticipants(room.id);
      if (activeCount === 0) {
        return this.endRoomInternal(room.id, groupId);
      }
      const refreshed = await this.prisma.groupLiveRoom.findUnique({
        where: { id: room.id },
        include: this.roomInclude(),
      });
      return refreshed ? this.mapRoom(refreshed) : null;
    }

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (room.activeMicUserId === userId) {
      await this.releaseMic(groupId, room.id, userId, true);
    }

    const wasHost = room.hostId === userId;

    await this.markParticipantLeft(room.id, userId);
    await this.postSystemMessage(
      room.id,
      groupId,
      `${member?.name ?? 'Someone'} left Live Talk`,
    );
    this.emitLiveTalkUserLeft(groupId, userId);

    const roomKey = getGroupLiveTalkRoom(groupId, room.id);
    this.liveTalkManager.leave(roomKey, userId);

    const roomAfterLeave = await this.prisma.groupLiveRoom.findUnique({
      where: { id: room.id },
    });

    if (!roomAfterLeave || roomAfterLeave.status === GroupLiveRoomStatus.ENDED) {
      return null;
    }

    const activeCount = await this.countActiveParticipants(room.id);
    if (activeCount === 0) {
      return this.endRoomInternal(room.id, groupId);
    }

    if (wasHost) {
      const newHostId = await this.pickNewHostId(room.id, groupId, userId);
      if (!newHostId) {
        return this.endRoomInternal(room.id, groupId);
      }
      return this.applyHostTransfer(
        groupId,
        room.id,
        userId,
        newHostId,
        'host_left',
      );
    }

    const refreshed = await this.prisma.groupLiveRoom.findUnique({
      where: { id: room.id },
      include: this.roomInclude(),
    });

    return refreshed ? this.mapRoom(refreshed) : null;
  }

  async endRoom(
    groupId: string,
    roomId: string,
    userId: string,
  ): Promise<LiveTalkRoomDto | null> {
    const membership = await this.assertGroupMember(groupId, userId);
    const room = await this.getActiveRoomRecord(groupId, roomId);

    const canEnd =
      room.hostId === userId ||
      membership.role === GroupRole.OWNER ||
      membership.role === GroupRole.ADMIN;

    if (!canEnd) {
      throw new ForbiddenException('Only the host or hub admins can end Live Talk');
    }

    return this.endRoomInternal(room.id, groupId);
  }

  async setMuted(
    groupId: string,
    roomId: string,
    userId: string,
    isMuted: boolean,
  ): Promise<LiveTalkParticipantDto> {
    await this.assertGroupMember(groupId, userId);
    const room = await this.getRoomWithMic(groupId, roomId);

    if (room.activeMicUserId !== userId) {
      throw new ForbiddenException(
        'Only the active speaker can mute or unmute while holding the mic',
      );
    }

    const participant = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId, leftAt: null },
      include: { user: { select: userSelect } },
    });

    if (!participant) {
      throw new BadRequestException('You are not in this Live Talk');
    }

    const updated = await this.prisma.groupLiveParticipant.update({
      where: { id: participant.id },
      data: { isMuted },
      include: { user: { select: userSelect } },
    });

    this.emitLiveTalkRoomEvent(groupId, roomId, 'live_talk_mute_changed', {
      groupId,
      roomId,
      userId,
      isMuted,
    });

    const roles = await this.getParticipantRoles(groupId, [userId]);

    return {
      id: updated.id,
      userId: updated.userId,
      isMuted: updated.isMuted,
      handRaised: updated.handRaised,
      handRaisedAt: updated.handRaisedAt,
      joinedAt: updated.joinedAt,
      leftAt: updated.leftAt,
      groupRole: roles.get(userId) ?? GroupRole.MEMBER,
      user: updated.user,
    };
  }

  async assertActiveParticipant(roomId: string, userId: string) {
    const participant = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId, leftAt: null },
    });

    if (!participant) {
      throw new ForbiddenException('Join Live Talk before connecting audio');
    }

    return participant;
  }

  async getRoomMeta(roomId: string) {
    return this.prisma.groupLiveRoom.findUnique({
      where: { id: roomId },
      select: { id: true, groupId: true, hostId: true, status: true },
    });
  }

  async handleUserDisconnected(userId: string) {
    const active = await this.prisma.groupLiveParticipant.findMany({
      where: { userId, leftAt: null, room: { status: GroupLiveRoomStatus.ACTIVE } },
      include: { room: true },
    });

    for (const row of active) {
      this.scheduleParticipantLeave(
        row.room.groupId,
        row.room.id,
        userId,
        GroupLiveTalkService.DISCONNECT_LEAVE_MS,
      );
    }
  }

  private async getActiveRoomRecord(groupId: string, roomId: string) {
    const room = await this.prisma.groupLiveRoom.findFirst({
      where: {
        id: roomId,
        groupId,
        status: GroupLiveRoomStatus.ACTIVE,
      },
    });

    if (!room) {
      throw new NotFoundException('Live Talk is not active');
    }

    return room;
  }

  private async addParticipant(roomId: string, userId: string) {
    const open = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId, leftAt: null },
    });

    if (open) {
      return open;
    }

    const previous = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId },
      orderBy: { joinedAt: 'desc' },
    });

    if (previous?.leftAt) {
      return this.prisma.groupLiveParticipant.update({
        where: { id: previous.id },
        data: {
          leftAt: null,
          joinedAt: new Date(),
          isMuted: true,
          handRaised: false,
          handRaisedAt: null,
        },
      });
    }

    if (previous) {
      return previous;
    }

    return this.prisma.groupLiveParticipant.create({
      data: { roomId, userId, isMuted: true },
    });
  }

  private async markParticipantLeft(roomId: string, userId: string) {
    await this.prisma.groupLiveParticipant.updateMany({
      where: { roomId, userId, leftAt: null },
      data: { leftAt: new Date() },
    });
  }

  private async countActiveParticipants(roomId: string) {
    return this.prisma.groupLiveParticipant.count({
      where: { roomId, leftAt: null },
    });
  }

  private leaveTimerKey(roomId: string, userId: string) {
    return `${roomId}:${userId}`;
  }

  /** Pick next Live Talk host: hub admin/mod in room, then earliest join, then any. */
  private async pickNewHostId(
    roomId: string,
    groupId: string,
    excludingUserId: string,
  ): Promise<string | null> {
    const participants = await this.prisma.groupLiveParticipant.findMany({
      where: { roomId, leftAt: null, userId: { not: excludingUserId } },
      orderBy: { joinedAt: 'asc' },
    });

    if (participants.length === 0) {
      return null;
    }

    const roles = await this.getParticipantRoles(
      groupId,
      participants.map((p) => p.userId),
    );

    const moderator = participants.find((p) => {
      const role = roles.get(p.userId);
      return role === GroupRole.ADMIN || role === GroupRole.OWNER;
    });

    return moderator?.userId ?? participants[0]!.userId;
  }

  private async applyHostTransfer(
    groupId: string,
    roomId: string,
    oldHostId: string,
    newHostId: string,
    reason: 'host_left' | 'manual',
  ): Promise<LiveTalkRoomDto> {
    const newHost = await this.prisma.user.findUnique({
      where: { id: newHostId },
      select: { name: true },
    });

    await this.prisma.groupLiveRoom.update({
      where: { id: roomId },
      data: { hostId: newHostId },
    });

    const message =
      reason === 'host_left'
        ? `Host left. ${newHost?.name ?? 'Someone'} is now hosting.`
        : `${newHost?.name ?? 'Someone'} is now hosting Live Talk.`;

    await this.postSystemMessage(roomId, groupId, message);

    const mapped = await this.publishRoomUpdate(groupId, roomId);

    this.emitLiveTalkRoomEvent(groupId, roomId, 'live_talk_host_changed', {
      groupId,
      roomId,
      oldHostId,
      newHostId,
      room: mapped,
    });

    return mapped;
  }

  private async endRoomInternal(
    roomId: string,
    groupId: string,
  ): Promise<LiveTalkRoomDto | null> {
    const room = await this.prisma.groupLiveRoom.findUnique({
      where: { id: roomId },
    });

    if (!room || room.status === GroupLiveRoomStatus.ENDED) {
      return null;
    }

    await this.prisma.groupLiveParticipant.updateMany({
      where: { roomId, leftAt: null },
      data: { leftAt: new Date() },
    });

    await this.postSystemMessage(roomId, groupId, 'Live Talk ended');

    const ended = await this.prisma.groupLiveRoom.update({
      where: { id: roomId },
      data: {
        status: GroupLiveRoomStatus.ENDED,
        endedAt: new Date(),
        activeMicUserId: null,
        activeMicStartedAt: null,
      },
      include: this.roomInclude(),
    });

    const roomKey = getGroupLiveTalkRoom(groupId, roomId);
    this.liveTalkManager.clearRoom(roomKey);

    this.realtimeEmitter.emitToRoom(getGroupRoom(groupId), 'live_talk_ended', {
      groupId,
      roomId,
    });

    return this.mapRoom(ended);
  }
}
