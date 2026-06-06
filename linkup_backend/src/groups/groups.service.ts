import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  GroupLiveRoomStatus,
  GroupRole,
  Prisma,
} from '../generated/prisma/client';
import {
  cleanupLocalUploadFiles,
  collectUniqueMediaUrls,
} from '../common/media-cleanup.util';
import {
  buildPaginatedResult,
  PaginatedResult,
  parsePaginationQuery,
} from '../common/pagination.util';
import { NotificationsService } from '../notifications/notifications.service';
import { FeedPost } from '../posts/posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateGroupPostDto } from './dto/create-group-post.dto';

const authorSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  accountType: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const ownerSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export type GroupListItem = {
  id: string;
  name: string;
  description: string;
  coverImage: string | null;
  ownerId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  membersCount: number;
  isMember: boolean;
  isOwner: boolean;
};

export type GroupDetail = GroupListItem & {
  owner: Prisma.UserGetPayload<{ select: typeof ownerSelect }>;
  role: GroupRole | null;
};

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateGroupDto): Promise<GroupDetail> {
    const group = await this.prisma.group.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        coverImage: dto.coverImage?.trim() || null,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: GroupRole.OWNER,
          },
        },
      },
      include: {
        owner: { select: ownerSelect },
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    return this.mapGroupDetail(group, userId, GroupRole.OWNER);
  }

  async updateGroup(
    groupId: string,
    userId: string,
    dto: {
      name?: string;
      description?: string;
      coverImage?: string | null;
    },
  ): Promise<GroupDetail> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, ownerId: true },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.ownerId !== userId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
        select: { role: true },
      });

      if (
        membership?.role !== GroupRole.ADMIN &&
        membership?.role !== GroupRole.OWNER
      ) {
        throw new ForbiddenException('Only hub owner or admin can edit this hub');
      }
    }

    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.coverImage !== undefined
          ? { coverImage: dto.coverImage?.trim() || null }
          : {}),
      },
    });

    return this.findOne(groupId, userId);
  }

  async findAll(
    userId: string,
    query?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<GroupListItem>> {
    const pagination = parsePaginationQuery(query ?? {});

    const groups = await this.prisma.group.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit + 1,
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    const mapped = groups.map((group) =>
      this.mapGroupListItem(group, userId),
    );
    return buildPaginatedResult(mapped, pagination);
  }

  async findOne(groupId: string, userId: string): Promise<GroupDetail> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: { select: ownerSelect },
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = group.members[0];
    return this.mapGroupDetail(
      group,
      userId,
      membership?.role ?? null,
    );
  }

  async join(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const existing = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (existing) {
      throw new ConflictException('You are already a member of this group');
    }

    await this.prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role: GroupRole.MEMBER,
      },
    });

    await this.notificationsService.notifyGroupJoin(userId, groupId);

    return this.findOne(groupId, userId);
  }

  async leave(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this group');
    }

    if (membership.role === GroupRole.OWNER) {
      throw new BadRequestException(
        'Hub host cannot leave without transferring ownership or permanently deleting the hub.',
      );
    }

    await this.prisma.groupMember.delete({
      where: { id: membership.id },
    });

    return this.findOne(groupId, userId);
  }

  async getGroupPosts(
    groupId: string,
    userId: string,
    query?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<FeedPost>> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const pagination = parsePaginationQuery(query ?? {});

    const posts = await this.prisma.post.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit + 1,
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
      },
    });

    const authorIds = [...new Set(posts.map((post) => post.authorId))];
    const followingSet = await this.getFollowingSet(userId, authorIds);

    const mapped = posts.map((post) => this.mapPost(post, followingSet));
    return buildPaginatedResult(mapped, pagination);
  }

  async createGroupPost(
    groupId: string,
    userId: string,
    dto: CreateGroupPostDto,
  ) {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Only group members can create group posts');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        groupId,
        content: dto.content.trim(),
        postType: 'TEXT',
        visibility: 'PUBLIC',
      },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
      },
    });

    const followingSet = await this.getFollowingSet(userId, [post.authorId]);

    return this.mapPost(post, followingSet);
  }

  async transferOwnership(
    groupId: string,
    userId: string,
    targetUserId: string,
  ): Promise<GroupDetail> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, ownerId: true, archivedAt: true },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the hub host can transfer ownership',
      );
    }

    if (targetUserId === userId) {
      throw new BadRequestException('You already own this hub');
    }

    const targetMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    if (!targetMembership) {
      throw new BadRequestException(
        'Ownership can only be transferred to an existing hub member',
      );
    }

    if (
      targetMembership.role !== GroupRole.ADMIN &&
      targetMembership.role !== GroupRole.MODERATOR
    ) {
      throw new BadRequestException(
        'Ownership can only be transferred to a hub admin or moderator',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.group.update({
        where: { id: groupId },
        data: { ownerId: targetUserId },
      });

      await tx.groupMember.update({
        where: { id: targetMembership.id },
        data: { role: GroupRole.OWNER },
      });

      const currentOwnerMembership = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });

      if (currentOwnerMembership) {
        await tx.groupMember.update({
          where: { id: currentOwnerMembership.id },
          data: { role: GroupRole.ADMIN },
        });
      }
    });

    return this.findOne(groupId, targetUserId);
  }

  async archiveGroup(groupId: string, userId: string): Promise<GroupDetail> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, ownerId: true, archivedAt: true },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('Only the hub host can archive this hub');
    }

    if (group.archivedAt) {
      throw new BadRequestException('This hub is already archived');
    }

    await this.prisma.groupLiveRoom.updateMany({
      where: { groupId, status: GroupLiveRoomStatus.ACTIVE },
      data: { status: GroupLiveRoomStatus.ENDED, endedAt: new Date() },
    });

    await this.prisma.group.update({
      where: { id: groupId },
      data: { archivedAt: new Date() },
    });

    return this.findOne(groupId, userId);
  }

  async permanentlyDelete(
    groupId: string,
    userId: string,
    confirmName: string,
    password: string,
  ): Promise<{ deleted: true; groupId: string; groupName: string }> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the hub host can permanently delete this hub',
      );
    }

    if (confirmName.trim() !== group.name.trim()) {
      throw new BadRequestException(
        'Hub name confirmation does not match',
      );
    }

    await this.verifyUserPassword(userId, password);

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const mediaUrls = await this.collectGroupMediaUrls(groupId, group.coverImage);

    await this.prisma.$transaction(async (tx) => {
      await tx.groupLiveRoom.updateMany({
        where: { groupId, status: GroupLiveRoomStatus.ACTIVE },
        data: { status: GroupLiveRoomStatus.ENDED, endedAt: new Date() },
      });

      await tx.notification.deleteMany({ where: { groupId } });

      await tx.groupDeletionLog.create({
        data: {
          groupId: group.id,
          groupName: group.name,
          deletedById: userId,
          deletedByEmail: actor?.email ?? '',
        },
      });

      await tx.group.delete({ where: { id: groupId } });
    });

    cleanupLocalUploadFiles(mediaUrls);

    return { deleted: true, groupId: group.id, groupName: group.name };
  }

  private async collectGroupMediaUrls(
    groupId: string,
    coverImage: string | null,
  ): Promise<string[]> {
    const posts = await this.prisma.post.findMany({
      where: { groupId },
      select: { imageUrl: true, videoUrl: true },
    });

    return collectUniqueMediaUrls([
      coverImage,
      ...posts.flatMap((post) => [post.imageUrl, post.videoUrl]),
    ]);
  }

  private async verifyUserPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, provider: true },
    });

    if (!user?.passwordHash) {
      throw new BadRequestException(
        'Password confirmation is required for accounts with a local password',
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Incorrect password');
    }
  }

  private mapGroupListItem(
    group: {
      id: string;
      name: string;
      description: string;
      coverImage: string | null;
      ownerId: string;
      archivedAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
      _count: { members: number };
      members: { role: GroupRole }[];
    },
    userId: string,
  ): GroupListItem {
    const membership = group.members[0];

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      coverImage: group.coverImage,
      ownerId: group.ownerId,
      archivedAt: group.archivedAt ?? null,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      membersCount: group._count.members,
      isMember: Boolean(membership),
      isOwner: group.ownerId === userId,
    };
  }

  private mapGroupDetail(
    group: {
      id: string;
      name: string;
      description: string;
      coverImage: string | null;
      ownerId: string;
      createdAt: Date;
      updatedAt: Date;
      owner: Prisma.UserGetPayload<{ select: typeof ownerSelect }>;
      _count: { members: number };
      members: { role: GroupRole }[];
    },
    userId: string,
    role: GroupRole | null,
  ): GroupDetail {
    const listItem = this.mapGroupListItem(group, userId);

    return {
      ...listItem,
      owner: group.owner,
      role,
    };
  }

  private async getFollowingSet(userId: string, targetIds: string[]) {
    if (targetIds.length === 0) {
      return new Set<string>();
    }

    const rows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: targetIds },
      },
      select: { followingId: true },
    });

    return new Set(rows.map((row) => row.followingId));
  }

  private mapPost(
    post: {
      id: string;
      authorId: string;
      groupId: string | null;
      content: string;
      postType: string;
      visibility: string;
      imageUrl: string | null;
      videoUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
      author: Prisma.UserGetPayload<{ select: typeof authorSelect }>;
      _count: { likes: number; comments: number };
      likes: { id: string }[];
    },
    followingSet: Set<string>,
  ): FeedPost {
    return {
      id: post.id,
      authorId: post.authorId,
      groupId: post.groupId,
      content: post.content,
      postType: post.postType,
      visibility: post.visibility,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      liked: post.likes.length > 0,
      saved: false,
      isFollowingAuthor: followingSet.has(post.authorId),
    };
  }
}
