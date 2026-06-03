import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupRole } from '../generated/prisma/client';
import { getGroupRoom } from '../chat/chat-rooms.util';
import { RealtimeEmitter } from '../chat/realtime.emitter';
import { PrismaService } from '../prisma/prisma.service';
import { GroupHubPermissionsService } from './group-hub-permissions.service';

const userSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} as const;

export type HubAdminMemberDto = {
  userId: string;
  role: GroupRole;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
};

export type HubAdminsListDto = {
  owner: HubAdminMemberDto;
  admins: HubAdminMemberDto[];
  moderators: HubAdminMemberDto[];
};

@Injectable()
export class GroupHubAdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: GroupHubPermissionsService,
    private readonly realtimeEmitter: RealtimeEmitter,
  ) {}

  async listAdmins(groupId: string, userId: string): Promise<HubAdminsListDto> {
    await this.permissions.getHubActor(userId, groupId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: { select: userSelect },
        members: {
          where: {
            role: { in: [GroupRole.ADMIN, GroupRole.MODERATOR, GroupRole.OWNER] },
          },
          include: { user: { select: userSelect } },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Hub not found');
    }

    const ownerEntry: HubAdminMemberDto = {
      userId: group.owner.id,
      role: GroupRole.OWNER,
      user: group.owner,
    };

    const admins: HubAdminMemberDto[] = [];
    const moderators: HubAdminMemberDto[] = [];

    for (const m of group.members) {
      if (m.userId === group.ownerId) {
        continue;
      }
      const row: HubAdminMemberDto = {
        userId: m.userId,
        role: m.role,
        user: m.user,
      };
      if (m.role === GroupRole.ADMIN) {
        admins.push(row);
      } else if (m.role === GroupRole.MODERATOR) {
        moderators.push(row);
      }
    }

    return { owner: ownerEntry, admins, moderators };
  }

  async addAdmin(
    groupId: string,
    actorId: string,
    targetUserId: string,
    role: 'ADMIN' | 'MODERATOR',
  ) {
    const actor = await this.permissions.getHubActor(actorId, groupId);
    const targetRole =
      role === 'ADMIN' ? GroupRole.ADMIN : GroupRole.MODERATOR;

    if (!this.permissions.canGrantPermanentAdmin(actor, targetRole)) {
      throw new ForbiddenException(
        'You cannot assign this hub role',
      );
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });

    if (!group) {
      throw new NotFoundException('Hub not found');
    }

    if (targetUserId === group.ownerId) {
      throw new BadRequestException('Hub owner already has full permissions');
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    if (!membership) {
      throw new BadRequestException('User must join the hub first');
    }

    if (membership.role === GroupRole.OWNER) {
      throw new BadRequestException('Cannot change hub owner role');
    }

    const updated = await this.prisma.groupMember.update({
      where: { id: membership.id },
      data: { role: targetRole },
      include: { user: { select: userSelect } },
    });

    const event =
      targetRole === GroupRole.ADMIN
        ? 'hub_admin_added'
        : 'hub_moderator_added';

    this.realtimeEmitter.emitToRoom(getGroupRoom(groupId), event, {
      groupId,
      targetUserId,
      role: targetRole,
      grantedByUserId: actorId,
    });

    return {
      userId: updated.userId,
      role: updated.role,
      user: updated.user,
    };
  }

  async removeAdmin(
    groupId: string,
    actorId: string,
    targetUserId: string,
  ) {
    const actor = await this.permissions.getHubActor(actorId, groupId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });

    if (!group) {
      throw new NotFoundException('Hub not found');
    }

    if (targetUserId === group.ownerId) {
      throw new BadRequestException('Cannot remove hub owner');
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    if (!membership) {
      throw new NotFoundException('User is not a hub member');
    }

    if (
      membership.role !== GroupRole.ADMIN &&
      membership.role !== GroupRole.MODERATOR
    ) {
      throw new BadRequestException('User is not a hub admin or moderator');
    }

    if (!this.permissions.canRemovePermanentAdmin(actor, membership.role)) {
      throw new ForbiddenException('You cannot remove this hub role');
    }

    if (targetUserId === actorId) {
      const adminCount = await this.prisma.groupMember.count({
        where: {
          groupId,
          role: { in: [GroupRole.ADMIN, GroupRole.OWNER] },
          userId: { not: group.ownerId },
        },
      });
      if (
        membership.role === GroupRole.ADMIN &&
        adminCount <= 1 &&
        !actor.isGroupOwner
      ) {
        throw new BadRequestException(
          'Cannot remove yourself as the only hub admin',
        );
      }
    }

    const previousRole = membership.role;

    const updated = await this.prisma.groupMember.update({
      where: { id: membership.id },
      data: { role: GroupRole.MEMBER },
      include: { user: { select: userSelect } },
    });

    const event =
      previousRole === GroupRole.ADMIN
        ? 'hub_admin_removed'
        : 'hub_moderator_removed';

    this.realtimeEmitter.emitToRoom(getGroupRoom(groupId), event, {
      groupId,
      targetUserId,
      removedByUserId: actorId,
    });

    return {
      userId: updated.userId,
      role: updated.role,
      user: updated.user,
    };
  }
}
