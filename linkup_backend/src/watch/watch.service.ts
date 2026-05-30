import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWatchVideoDto } from './dto/create-watch-video.dto';
import { UpdateWatchProgressDto } from './dto/update-watch-progress.dto';

const creatorSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} as const;

@Injectable()
export class WatchService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeVideo(
    video: {
      id: string;
      title: string;
      description: string | null;
      videoUrl: string;
      thumbnailUrl: string | null;
      category: string | null;
      type: string | null;
      duration: number | null;
      creatorId: string | null;
      isPublished: boolean;
      isPremium: boolean;
      createdAt: Date;
      updatedAt: Date;
      creator: {
        id: string;
        name: string;
        username: string;
        avatarUrl: string | null;
      } | null;
    },
    progress?: { progress: number; completed: boolean } | null,
    counts?: { viewsCount?: number },
  ) {
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      category: video.category,
      type: video.type,
      duration: video.duration,
      creatorId: video.creatorId,
      isPublished: video.isPublished,
      isPremium: video.isPremium,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      creator: video.creator,
      progress: progress ?? null,
      viewsCount: counts?.viewsCount ?? 0,
      likesCount: 0,
      commentsCount: 0,
    };
  }

  private async getViewCounts(
    videoIds: string[],
  ): Promise<Map<string, number>> {
    if (videoIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.watchProgress.groupBy({
      by: ['videoId'],
      where: { videoId: { in: videoIds }, progress: { gt: 0 } },
      _count: { userId: true },
    });

    return new Map(rows.map((row) => [row.videoId, row._count.userId]));
  }

  async findAll(filters: {
    category?: string;
    type?: string;
    search?: string;
    userId?: string;
  }) {
    const where: {
      isPublished: boolean;
      category?: string;
      type?: string;
      OR?: Array<{
        title?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
    } = { isPublished: true };

    if (filters.category && filters.category !== 'All') {
      where.category = filters.category;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const videos = await this.prisma.watchVideo.findMany({
      where,
      include: { creator: { select: creatorSelect } },
      orderBy: { createdAt: 'desc' },
    });

    const viewCounts = await this.getViewCounts(videos.map((video) => video.id));

    if (!filters.userId) {
      return videos.map((video) =>
        this.serializeVideo(video, null, {
          viewsCount: viewCounts.get(video.id) ?? 0,
        }),
      );
    }

    const progressRows = await this.prisma.watchProgress.findMany({
      where: {
        userId: filters.userId,
        videoId: { in: videos.map((video) => video.id) },
      },
    });

    const progressMap = new Map(
      progressRows.map((row) => [
        row.videoId,
        { progress: row.progress, completed: row.completed },
      ]),
    );

    return videos.map((video) =>
      this.serializeVideo(video, progressMap.get(video.id), {
        viewsCount: viewCounts.get(video.id) ?? 0,
      }),
    );
  }

  async findOne(id: string, userId?: string) {
    const video = await this.prisma.watchVideo.findFirst({
      where: { id, isPublished: true },
      include: { creator: { select: creatorSelect } },
    });

    if (!video) {
      throw new NotFoundException('Video not found.');
    }

    let progress: { progress: number; completed: boolean } | null = null;

    if (userId) {
      const row = await this.prisma.watchProgress.findUnique({
        where: { userId_videoId: { userId, videoId: id } },
      });
      if (row) {
        progress = { progress: row.progress, completed: row.completed };
      }
    }

    const viewCounts = await this.getViewCounts([id]);

    return this.serializeVideo(video, progress, {
      viewsCount: viewCounts.get(id) ?? 0,
    });
  }

  async create(userId: string, dto: CreateWatchVideoDto) {
    const video = await this.prisma.watchVideo.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        videoUrl: dto.videoUrl.trim(),
        thumbnailUrl: dto.thumbnailUrl?.trim() || null,
        category: dto.category?.trim() || null,
        type: dto.type || null,
        duration: dto.duration ?? null,
        creatorId: userId,
        isPublished: true,
        isPremium: false,
      },
      include: { creator: { select: creatorSelect } },
    });

    return this.serializeVideo(video);
  }

  async updateProgress(
    videoId: string,
    userId: string,
    dto: UpdateWatchProgressDto,
  ) {
    const video = await this.prisma.watchVideo.findFirst({
      where: { id: videoId, isPublished: true },
    });

    if (!video) {
      throw new NotFoundException('Video not found.');
    }

    const completed =
      dto.completed ??
      (video.duration
        ? dto.progress >= Math.max(video.duration - 5, 0)
        : false);

    const row = await this.prisma.watchProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: {
        userId,
        videoId,
        progress: dto.progress,
        completed,
      },
      update: {
        progress: dto.progress,
        completed,
      },
    });

    return {
      videoId: row.videoId,
      progress: row.progress,
      completed: row.completed,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getMyProgress(userId: string) {
    const rows = await this.prisma.watchProgress.findMany({
      where: {
        userId,
        completed: false,
        progress: { gt: 0 },
      },
      include: {
        video: {
          include: { creator: { select: creatorSelect } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return rows
      .filter((row) => row.video.isPublished)
      .map((row) => ({
        ...this.serializeVideo(row.video, {
          progress: row.progress,
          completed: row.completed,
        }),
        watchProgress: row.progress,
        watchCompleted: row.completed,
        lastWatchedAt: row.updatedAt.toISOString(),
      }));
  }
}
