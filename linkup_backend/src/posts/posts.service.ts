import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { RealtimeEmitter } from '../chat/realtime.emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';

const authorSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  accountType: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const postInclude = {
  author: {
    select: authorSelect,
  },
} satisfies Prisma.PostInclude;

const commentInclude = {
  author: {
    select: authorSelect,
  },
} satisfies Prisma.CommentInclude;

const FEED_LIMIT = 20;

type PostWithAuthor = Prisma.PostGetPayload<{ include: typeof postInclude }>;

export type FeedPost = PostWithAuthor & {
  likeCount: number;
  commentCount: number;
  liked: boolean;
  isFollowingAuthor: boolean;
};

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => RealtimeEmitter))
    private readonly realtimeEmitter: RealtimeEmitter,
  ) {}

  async create(authorId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        authorId,
        content: dto.content,
        postType: dto.postType ?? 'TEXT',
        visibility: dto.visibility ?? 'PUBLIC',
        imageUrl: dto.imageUrl,
        videoUrl: dto.videoUrl,
      },
      include: postInclude,
    });

    this.realtimeEmitter.emitSparkCreated(post);
    return post;
  }

  async getFeed(userId: string): Promise<FeedPost[]> {
    const posts = await this.prisma.post.findMany({
      where: { groupId: null },
      orderBy: { createdAt: 'desc' },
      take: FEED_LIMIT,
      include: {
        ...postInclude,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    const authorIds = [...new Set(posts.map((post) => post.authorId))];
    const following = authorIds.length
      ? await this.prisma.follow.findMany({
          where: {
            followerId: userId,
            followingId: { in: authorIds },
          },
          select: { followingId: true },
        })
      : [];

    const followingSet = new Set(following.map((row) => row.followingId));

    return posts.map((post) => ({
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
    }));
  }

  getMyPosts(authorId: string) {
    return this.prisma.post.findMany({
      where: { authorId, groupId: null },
      orderBy: { createdAt: 'desc' },
      include: postInclude,
    });
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.like.delete({
        where: { id: existingLike.id },
      });
      await this.notificationsService.removeLikeNotification(userId, postId);
    } else {
      await this.prisma.like.create({
        data: {
          userId,
          postId,
        },
      });
      await this.notificationsService.notifyLike(userId, postId);
    }

    const likeCount = await this.prisma.like.count({
      where: { postId },
    });

    return {
      liked: !existingLike,
      likeCount,
    };
  }

  async createComment(postId: string, userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        postId,
        authorId: userId,
      },
      include: commentInclude,
    });

    await this.notificationsService.notifyComment(userId, postId);

    return comment;
  }

  async getComments(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: commentInclude,
    });
  }

  async delete(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    return { message: 'Post deleted successfully' };
  }
}
