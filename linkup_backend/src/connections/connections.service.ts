import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const connectionUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  accountType: true,
  isVerified: true,
  bio: true,
  country: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getMyConnections(userId: string) {
    const [following, followers, followingCount, followersCount] =
      await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          following: { select: connectionUserSelect },
        },
      }),
      this.prisma.follow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          follower: { select: connectionUserSelect },
        },
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.follow.count({ where: { followingId: userId } }),
    ]);

    return {
      following: following.map((row) => ({
        ...row.following,
        connectedAt: row.createdAt,
      })),
      followers: followers.map((row) => ({
        ...row.follower,
        connectedAt: row.createdAt,
      })),
      followingCount,
      followersCount,
    };
  }

  async getSuggestions(userId: string) {
    const [followingRows, blockedIds] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      this.prisma.block.findMany({
        where: {
          OR: [{ blockerId: userId }, { blockedId: userId }],
        },
        select: { blockerId: true, blockedId: true },
      }),
    ]);

    const excludeIds = new Set<string>([userId]);
    followingRows.forEach((row) => excludeIds.add(row.followingId));
    blockedIds.forEach((row) => {
      excludeIds.add(row.blockerId);
      excludeIds.add(row.blockedId);
    });

    const suggestions = await this.prisma.user.findMany({
      where: { id: { notIn: [...excludeIds] } },
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: connectionUserSelect,
    });

    return suggestions.map((user) => ({
      ...user,
      isFollowingAuthor: false,
    }));
  }

  connect(userId: string, targetUserId: string) {
    return this.usersService.toggleFollow(userId, targetUserId);
  }

  disconnect(userId: string, targetUserId: string) {
    return this.usersService.toggleFollow(userId, targetUserId);
  }

  async getConnectionStatus(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      return { following: false, connected: false, isSelf: true };
    }

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    return {
      following: Boolean(follow),
      connected: Boolean(follow),
      isSelf: false,
    };
  }
}
