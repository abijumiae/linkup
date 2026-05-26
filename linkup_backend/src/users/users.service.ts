import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type SafeUser = Omit<User, 'passwordHash'>;

export type ProfileUser = SafeUser & {
  followersCount: number;
  followingCount: number;
  postsCount: number;
};

export type UserPost = {
  id: string;
  authorId: string;
  content: string;
  postType: string;
  visibility: string;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByIdSafe(id: string): Promise<SafeUser> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitize(user);
  }

  async getProfile(userId: string): Promise<ProfileUser> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [followersCount, followingCount, postsCount] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.post.count({ where: { authorId: userId } }),
    ]);

    return {
      ...this.sanitize(user),
      followersCount,
      followingCount,
      postsCount,
    };
  }

  async getMyPosts(userId: string): Promise<UserPost[]> {
    const posts = await this.prisma.post.findMany({
      where: { authorId: userId, groupId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return posts.map((post) => ({
      id: post.id,
      authorId: post.authorId,
      content: post.content,
      postType: post.postType,
      visibility: post.visibility,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
    }));
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const existingUser = await this.findById(userId);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (dto.username && dto.username !== existingUser.username) {
      const usernameInUse = await this.prisma.user.findFirst({
        where: {
          username: dto.username,
          id: { not: userId },
        },
      });

      if (usernameInUse) {
        throw new ConflictException('Username already taken');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        username: dto.username,
        country: dto.country,
        language: dto.language,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
      },
    });

    return this.sanitize(updatedUser);
  }

  sanitize(user: User): SafeUser {
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const targetUser = await this.findById(followingId);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      await this.prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      await this.notificationsService.removeFollowNotification(
        followerId,
        followingId,
      );
    } else {
      await this.prisma.follow.create({
        data: {
          followerId,
          followingId,
        },
      });
      await this.notificationsService.notifyFollow(followerId, followingId);
    }

    const [targetFollowersCount, followerFollowingCount] = await Promise.all([
      this.prisma.follow.count({ where: { followingId } }),
      this.prisma.follow.count({ where: { followerId } }),
    ]);

    return {
      following: !existingFollow,
      followersCount: targetFollowersCount,
      followingCount: followerFollowingCount,
    };
  }
}
