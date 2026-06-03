import { ForbiddenException, Injectable } from '@nestjs/common';
import { GroupLiveRole, GroupRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type HubActorContext = {
  userId: string;
  groupId: string;
  hubRole: GroupRole | null;
  isGroupOwner: boolean;
};

export type LiveTalkActorContext = HubActorContext & {
  roomId: string;
  roomHostId: string;
  isLiveTalkHost: boolean;
  isTempAdmin: boolean;
  liveRole: GroupLiveRole;
  isActiveParticipant: boolean;
};

@Injectable()
export class GroupHubPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHubActor(userId: string, groupId: string): Promise<HubActorContext> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });

    if (!group) {
      throw new ForbiddenException('Hub not found');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true },
    });

    const isGroupOwner = group.ownerId === userId;
    const hubRole = isGroupOwner
      ? GroupRole.OWNER
      : (member?.role ?? null);

    return {
      userId,
      groupId,
      hubRole,
      isGroupOwner,
    };
  }

  async getLiveTalkActor(
    userId: string,
    groupId: string,
    roomId: string,
  ): Promise<LiveTalkActorContext> {
    const hub = await this.getHubActor(userId, groupId);

    const room = await this.prisma.groupLiveRoom.findFirst({
      where: { id: roomId, groupId },
      select: { hostId: true, status: true },
    });

    if (!room) {
      throw new ForbiddenException('Live Talk room not found');
    }

    const participant = await this.prisma.groupLiveParticipant.findFirst({
      where: { roomId, userId, leftAt: null },
      select: {
        liveRole: true,
        isTempAdmin: true,
      },
    });

    return {
      ...hub,
      roomId,
      roomHostId: room.hostId,
      isLiveTalkHost: room.hostId === userId,
      isTempAdmin: participant?.isTempAdmin ?? false,
      liveRole: participant?.liveRole ?? GroupLiveRole.LISTENER,
      isActiveParticipant: Boolean(participant),
    };
  }

  canManageHub(actor: HubActorContext): boolean {
    return (
      actor.isGroupOwner ||
      actor.hubRole === GroupRole.OWNER ||
      actor.hubRole === GroupRole.ADMIN
    );
  }

  canManageLiveTalk(actor: LiveTalkActorContext): boolean {
    if (!actor.isActiveParticipant && !this.canManageHub(actor)) {
      return false;
    }
    return (
      this.canManageHub(actor) ||
      actor.hubRole === GroupRole.MODERATOR ||
      actor.isLiveTalkHost ||
      actor.isTempAdmin
    );
  }

  canGrantTempAdmin(actor: LiveTalkActorContext): boolean {
    return (
      actor.isLiveTalkHost ||
      actor.isGroupOwner ||
      actor.hubRole === GroupRole.OWNER ||
      actor.hubRole === GroupRole.ADMIN
    );
  }

  canGrantPermanentAdmin(
    actor: HubActorContext,
    targetRole: 'ADMIN' | 'MODERATOR',
  ): boolean {
    if (targetRole === 'ADMIN') {
      return actor.isGroupOwner || actor.hubRole === GroupRole.OWNER;
    }
    return (
      actor.isGroupOwner ||
      actor.hubRole === GroupRole.OWNER ||
      actor.hubRole === GroupRole.ADMIN
    );
  }

  canRemovePermanentAdmin(
    actor: HubActorContext,
    targetRole: GroupRole,
  ): boolean {
    if (targetRole === GroupRole.MODERATOR) {
      return this.canGrantPermanentAdmin(actor, GroupRole.MODERATOR);
    }
    if (targetRole === GroupRole.ADMIN) {
      return actor.isGroupOwner || actor.hubRole === GroupRole.OWNER;
    }
    return false;
  }

  canRemoveParticipant(actor: LiveTalkActorContext): boolean {
    return this.canManageLiveTalk(actor);
  }

  canEndRoom(actor: LiveTalkActorContext): boolean {
    return (
      actor.isLiveTalkHost ||
      actor.isGroupOwner ||
      actor.hubRole === GroupRole.OWNER ||
      actor.hubRole === GroupRole.ADMIN
    );
  }

  assertCanManageHub(userId: string, groupId: string) {
    return this.getHubActor(userId, groupId).then((actor) => {
      if (!this.canManageHub(actor)) {
        throw new ForbiddenException('Hub admin permission required');
      }
      return actor;
    });
  }

  assertCanManageLiveTalk(userId: string, groupId: string, roomId: string) {
    return this.getLiveTalkActor(userId, groupId, roomId).then((actor) => {
      if (!this.canManageLiveTalk(actor)) {
        throw new ForbiddenException('Live Talk management permission required');
      }
      return actor;
    });
  }
}
