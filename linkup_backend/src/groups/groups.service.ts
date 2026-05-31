import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupRole, Prisma } from '../generated/prisma/client';
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

  async findAll(
    userId: string,
    query?: { page?: string; limit?: string },
  ): Promise<PaginatedResult<GroupListItem>> {
    const pagination = parsePaginationQuery(query ?? {});

    const groups = await this.prisma.group.findMany({
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
        'Group owner cannot leave. Transfer ownership is not supported yet.',
      );
    }

    await this.prisma.groupMember.delete({
      where: { id: membership.id },
    });

    return this.findOne(groupId, userId);
  }

  async getGroupPosts(groupId: string, userId: string): Promise<FeedPost[]> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const posts = await this.prisma.post.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
      },
    });

    const authorIds = [...new Set(posts.map((post) => post.authorId))];
    const followingSet = await this.getFollowingSet(userId, authorIds);

    return posts.map((post) => this.mapPost(post, followingSet));
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

  private mapGroupListItem(
    group: {
      id: string;
      name: string;
      description: string;
      coverImage: string | null;
      ownerId: string;
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
