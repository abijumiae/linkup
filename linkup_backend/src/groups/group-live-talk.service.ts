import {
  BadRequestException,
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
import { getGroupRoom } from '../chat/chat-rooms.util';

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
  joinedAt: Date;
  leftAt: Date | null;
  user: Prisma.UserGetPayload<{ select: typeof userSelect }>;
};

export type LiveTalkRoomDto = {
  id: string;
  groupId: string;
  hostId: string;
  status: GroupLiveRoomStatus;
  startedAt: Date;
  endedAt: Date | null;
  host: Prisma.UserGetPayload<{ select: typeof userSelect }>;
  participants: LiveTalkParticipantDto[];
};

@Injectable()
export class GroupLiveTalkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEmitter: RealtimeEmitter,
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

  private async mapRoom(
    room: Prisma.GroupLiveRoomGetPayload<{
      include: {
        host: { select: typeof userSelect };
        participants: {
          where: { leftAt: null };
          include: { user: { select: typeof userSelect } };
        };
      };
    }>,
  ): Promise<LiveTalkRoomDto> {
    return {
      id: room.id,
      groupId: room.groupId,
      hostId: room.hostId,
      status: room.status,
      startedAt: room.startedAt,
      endedAt: room.endedAt,
      host: room.host,
      participants: room.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        isMuted: p.isMuted,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        user: p.user,
      })),
    };
  }

  private roomInclude() {
    return {
      host: { select: userSelect },
      participants: {
        where: { leftAt: null },
        include: { user: { select: userSelect } },
        orderBy: { joinedAt: 'asc' as const },
      },
    };
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

    const room = await this.prisma.groupLiveRoom.create({
      data: {
        groupId,
        hostId: userId,
        participants: {
          create: { userId, isMuted: false },
        },
      },
      include: this.roomInclude(),
    });

    const mapped = await this.mapRoom(room);
    this.realtimeEmitter.emitToRoom(getGroupRoom(groupId), 'live_talk_started', {
      groupId,
      room: mapped,
    });

    return mapped;
  }

  async joinRoom(
    groupId: string,
    roomId: string,
    userId: string,
  ): Promise<LiveTalkRoomDto> {
    await this.assertGroupMember(groupId, userId);
    const room = await this.getActiveRoomRecord(groupId, roomId);
    await this.addParticipant(room.id, userId);

    const refreshed = await this.prisma.groupLiveRoom.findUniqueOrThrow({
      where: { id: room.id },
      include: this.roomInclude(),
    });

    return this.mapRoom(refreshed);
  }

  async leaveRoom(
    groupId: string,
    roomId: string,
    userId: string,
  ): Promise<LiveTalkRoomDto | null> {
    await this.assertGroupMember(groupId, userId);
    const room = await this.getActiveRoomRecord(groupId, roomId);

    await this.markParticipantLeft(room.id, userId);

    if (room.hostId === userId) {
      return this.endRoomInternal(room.id, groupId);
    }

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
      data: { isMuted },
      include: { user: { select: userSelect } },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      isMuted: updated.isMuted,
      joinedAt: updated.joinedAt,
      leftAt: updated.leftAt,
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
      await this.leaveRoom(row.room.groupId, row.room.id, userId);
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
        data: { leftAt: null, joinedAt: new Date(), isMuted: false },
      });
    }

    if (previous) {
      return previous;
    }

    return this.prisma.groupLiveParticipant.create({
      data: { roomId, userId },
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

    const ended = await this.prisma.groupLiveRoom.update({
      where: { id: roomId },
      data: {
        status: GroupLiveRoomStatus.ENDED,
        endedAt: new Date(),
      },
      include: this.roomInclude(),
    });

    this.realtimeEmitter.emitToRoom(getGroupRoom(groupId), 'live_talk_ended', {
      groupId,
      roomId,
    });

    return this.mapRoom(ended);
  }
}
