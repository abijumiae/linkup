import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FeedPost } from '../posts/posts.service';

const authorSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  accountType: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const userSearchSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatarUrl: true,
  accountType: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

export type SearchUser = Prisma.UserGetPayload<{
  select: typeof userSearchSelect;
}> & {
  isFollowingAuthor: boolean;
};

export type SearchResults = {
  users: SearchUser[];
  posts: FeedPost[];
};

const EXPLORE_LIMIT = 30;
const SEARCH_LIMIT = 20;

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, userId: string): Promise<SearchResults> {
    const q = query.trim();

    if (!q) {
      return { users: [], posts: [] };
    }

    const [users, posts] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: SEARCH_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: userSearchSelect,
      }),
      this.prisma.post.findMany({
        where: {
          visibility: 'PUBLIC',
          groupId: null,
          content: { contains: q, mode: 'insensitive' },
        },
        take: SEARCH_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: authorSelect },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId }, select: { id: true } },
        },
      }),
    ]);

    const following = await this.getFollowingSet(
      userId,
      users.map((user) => user.id),
    );

    const authorIds = [...new Set(posts.map((post) => post.authorId))];
    const postFollowing = await this.getFollowingSet(userId, authorIds);

    return {
      users: users.map((user) => ({
        ...user,
        isFollowingAuthor: following.has(user.id),
      })),
      posts: posts.map((post) => this.mapPost(post, postFollowing)),
    };
  }

  async getExplore(userId: string): Promise<FeedPost[]> {
    const posts = await this.prisma.post.findMany({
      where: { visibility: 'PUBLIC', groupId: null },
      take: EXPLORE_LIMIT,
      orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
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
      isFollowingAuthor: followingSet.has(post.authorId),
    };
  }
}
