import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { RealtimeEmitter } from '../chat/realtime.emitter';
import {
  buildPaginatedResult,
  parsePaginationQuery,
  PaginatedResult,
} from '../common/pagination.util';
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
const COMMENTS_LIMIT = 30;

type PostWithAuthor = Prisma.PostGetPayload<{ include: typeof postInclude }>;

export type FeedPost = PostWithAuthor & {
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  isFollowingAuthor: boolean;
  boostCount?: number;
  isBoostedByMe?: boolean;
  isSavedByMe?: boolean;
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
    const content = dto.content?.trim() ?? '';
    let imageUrl = dto.imageUrl;
    let videoUrl = dto.videoUrl;
    let postType = dto.postType ?? 'TEXT';

    if (dto.mediaUrl && dto.mediaType) {
      if (dto.mediaType === 'image') {
        imageUrl = dto.mediaUrl;
        postType = 'IMAGE';
      } else {
        videoUrl = dto.mediaUrl;
        postType = 'VIDEO';
      }
    } else if (imageUrl) {
      postType = postType === 'TEXT' ? 'IMAGE' : postType;
    } else if (videoUrl) {
      postType = postType === 'TEXT' ? 'VIDEO' : postType;
    }

    if (!content && !imageUrl && !videoUrl) {
      throw new BadRequestException(
        'Post content or media is required.',
      );
    }

    const post = await this.prisma.post.create({
      data: {
        authorId,
        content,
        postType,
        visibility: dto.visibility ?? 'PUBLIC',
        imageUrl,
        videoUrl,
      },
      include: postInclude,
    });

    this.realtimeEmitter.emitSparkCreated(post);
    return post;
  }

  async getFeed(
    userId: string,
    query: { page?: string; limit?: string } = {},
  ): Promise<PaginatedResult<FeedPost>> {
    const pagination = parsePaginationQuery(query);
    const blockedIds = await this.getBlockedUserIds(userId);

    const posts = await this.prisma.post.findMany({
      where: {
        groupId: null,
        authorId: blockedIds.length ? { notIn: blockedIds } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit + 1,
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
        savedBy: {
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

    const mapped = posts.map((post) => this.toFeedPost(post, followingSet));

    return buildPaginatedResult(mapped, pagination);
  }

  async getPostById(postId: string, userId: string): Promise<FeedPost> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        ...postInclude,
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
        savedBy: { where: { userId }, select: { id: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const following = await this.prisma.follow.findMany({
      where: { followerId: userId, followingId: post.authorId },
      select: { followingId: true },
    });

    return this.toFeedPost(post, new Set(following.map((row) => row.followingId)));
  }

  private toFeedPost(
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
      author: PostWithAuthor['author'];
      _count: { likes: number; comments: number };
      likes: { id: string }[];
      savedBy: { id: string }[];
    },
    followingSet: Set<string>,
  ): FeedPost {
    const likeCount = post._count.likes;
    const liked = post.likes.length > 0;
    const saved = post.savedBy.length > 0;

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
      likeCount,
      commentCount: post._count.comments,
      liked,
      saved,
      isFollowingAuthor: followingSet.has(post.authorId),
      boostCount: likeCount,
      isBoostedByMe: liked,
      isSavedByMe: saved,
    } as FeedPost;
  }

  getMyPosts(authorId: string) {
    return this.prisma.post.findMany({
      where: { authorId, groupId: null },
      orderBy: { createdAt: 'desc' },
      take: FEED_LIMIT,
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

    if (existingLike) {
      this.realtimeEmitter.emitPostUnboosted(postId, likeCount);
    } else {
      this.realtimeEmitter.emitPostBoosted(postId, likeCount);
    }

    return {
      liked: !existingLike,
      likeCount,
      boostCount: likeCount,
      isBoostedByMe: !existingLike,
    };
  }

  async removeBoost(postId: string, userId: string) {
    const existingLike = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      await this.prisma.like.delete({ where: { id: existingLike.id } });
      await this.notificationsService.removeLikeNotification(userId, postId);
    }

    const likeCount = await this.prisma.like.count({ where: { postId } });

    this.realtimeEmitter.emitPostUnboosted(postId, likeCount);

    return {
      liked: false,
      likeCount,
      boostCount: likeCount,
      isBoostedByMe: false,
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

    const commentCount = await this.prisma.comment.count({ where: { postId } });

    this.realtimeEmitter.emitCommentCreated(
      {
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        authorId: comment.authorId,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author,
      },
      commentCount,
    );

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
      take: COMMENTS_LIMIT,
      include: commentInclude,
    });
  }

  async deleteComment(postId: string, commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.postId !== postId) {
      throw new NotFoundException('Comment not found on this post');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    const commentCount = await this.prisma.comment.count({
      where: { postId: comment.postId },
    });

    this.realtimeEmitter.emitCommentDeleted(postId, commentId, commentCount);

    return { message: 'Comment deleted', commentCount };
  }

  /** @deprecated Prefer deleteComment with postId */
  async deleteCommentById(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.deleteComment(comment.postId, commentId, userId);
  }

  async toggleSave(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.prisma.savedPost.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      await this.prisma.savedPost.delete({
        where: { id: existing.id },
      });
      this.realtimeEmitter.emitPostUnsaved(postId, userId);
    } else {
      await this.prisma.savedPost.create({
        data: { userId, postId },
      });
      this.realtimeEmitter.emitPostSaved(postId, userId);
    }

    const saveCount = await this.prisma.savedPost.count({
      where: { postId },
    });

    return {
      saved: !existing,
      saveCount,
      isSavedByMe: !existing,
    };
  }

  async removeSave(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.savedPost.deleteMany({
      where: { userId, postId },
    });

    const saveCount = await this.prisma.savedPost.count({ where: { postId } });

    this.realtimeEmitter.emitPostUnsaved(postId, userId);

    return { saved: false, saveCount, isSavedByMe: false };
  }

  async getSavedPosts(userId: string) {
    const rows = await this.prisma.savedPost.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: FEED_LIMIT,
      include: {
        post: {
          include: {
            ...postInclude,
            _count: { select: { likes: true, comments: true } },
            likes: { where: { userId }, select: { id: true } },
            savedBy: { where: { userId }, select: { id: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.post.id,
      authorId: row.post.authorId,
      groupId: row.post.groupId,
      content: row.post.content,
      postType: row.post.postType,
      visibility: row.post.visibility,
      imageUrl: row.post.imageUrl,
      videoUrl: row.post.videoUrl,
      createdAt: row.post.createdAt,
      updatedAt: row.post.updatedAt,
      author: row.post.author,
      likeCount: row.post._count.likes,
      commentCount: row.post._count.comments,
      liked: row.post.likes.length > 0,
      saved: true,
      isFollowingAuthor: false,
      savedAt: row.createdAt,
    }));
  }

  private async getBlockedUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });

    const ids = new Set<string>();
    for (const row of rows) {
      ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
    }
    return [...ids];
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
