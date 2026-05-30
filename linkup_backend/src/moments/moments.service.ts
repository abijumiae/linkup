import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEmitter } from '../chat/realtime.emitter';
import { CreateMomentDto } from './dto/create-moment.dto';

const MOMENT_TTL_MS = 24 * 60 * 60 * 1000;
const MOMENT_FEED_LIMIT = 100;

const momentUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} as const;

@Injectable()
export class MomentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeEmitter,
  ) {}

  private activeWhere(now = new Date()) {
    return { expiresAt: { gt: now } };
  }

  private serializeMoment(moment: {
    id: string;
    userId: string;
    content: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
    background: string | null;
    expiresAt: Date;
    createdAt: Date;
    user: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    };
  }) {
    return {
      id: moment.id,
      userId: moment.userId,
      content: moment.content,
      mediaUrl: moment.mediaUrl,
      mediaType: moment.mediaType,
      background: moment.background,
      expiresAt: moment.expiresAt.toISOString(),
      createdAt: moment.createdAt.toISOString(),
      user: moment.user,
    };
  }

  async create(userId: string, dto: CreateMomentDto) {
    const hasContent = Boolean(dto.content?.trim());
    const hasMedia = Boolean(dto.mediaUrl?.trim());

    if (!hasContent && !hasMedia) {
      throw new BadRequestException('Moment content or media is required');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + MOMENT_TTL_MS);

    let mediaType = dto.mediaType ?? null;
    if (hasMedia && !mediaType) {
      mediaType = 'image';
    }
    if (!hasMedia && hasContent) {
      mediaType = mediaType ?? 'text';
    }

    const moment = await this.prisma.moment.create({
      data: {
        userId,
        content: dto.content?.trim() || null,
        mediaUrl: dto.mediaUrl?.trim() || null,
        mediaType,
        background: dto.background?.trim() || null,
        expiresAt,
      },
      include: { user: { select: momentUserSelect } },
    });

    const serialized = this.serializeMoment(moment);
    this.realtime.emitMomentCreated(serialized);

    return serialized;
  }

  async findActiveFeed(viewerId: string) {
    try {
      const following = await this.prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      });

      const networkIds = [
        viewerId,
        ...following.map((row) => row.followingId),
      ];

      const moments = await this.prisma.moment.findMany({
        where: {
          ...this.activeWhere(),
          userId: { in: networkIds },
        },
        include: { user: { select: momentUserSelect } },
        orderBy: { createdAt: 'desc' },
        take: MOMENT_FEED_LIMIT,
      });

      if (moments.length === 0) {
        const fallback = await this.prisma.moment.findMany({
          where: this.activeWhere(),
          include: { user: { select: momentUserSelect } },
          orderBy: { createdAt: 'desc' },
          take: 40,
        });
        return this.groupByUser(fallback, viewerId);
      }

      return this.groupByUser(moments, viewerId);
    } catch {
      return { groups: [] };
    }
  }

  async findActiveByUser(userId: string) {
    try {
      const moments = await this.prisma.moment.findMany({
        where: {
          userId,
          ...this.activeWhere(),
        },
        include: { user: { select: momentUserSelect } },
        orderBy: { createdAt: 'asc' },
        take: MOMENT_FEED_LIMIT,
      });

      return moments.map((moment) => this.serializeMoment(moment));
    } catch {
      return [];
    }
  }

  async userHasActiveMoment(userId: string) {
    const count = await this.prisma.moment.count({
      where: { userId, ...this.activeWhere() },
    });
    return count > 0;
  }

  async delete(momentId: string, userId: string) {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
    });

    if (!moment) {
      throw new NotFoundException('Moment not found.');
    }

    if (moment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own moments.');
    }

    await this.prisma.moment.delete({ where: { id: momentId } });
    this.realtime.emitMomentDeleted(momentId, userId);
    return { success: true };
  }

  private groupByUser(
    moments: Array<{
      id: string;
      userId: string;
      content: string | null;
      mediaUrl: string | null;
      mediaType: string | null;
      background: string | null;
      expiresAt: Date;
      createdAt: Date;
      user: {
        id: string;
        name: string;
        username: string;
        avatarUrl: string | null;
      };
    }>,
    viewerId: string,
  ) {
    const grouped = new Map<
      string,
      {
        user: (typeof moments)[0]['user'];
        moments: ReturnType<MomentsService['serializeMoment']>[];
      }
    >();

    for (const moment of moments) {
      const existing = grouped.get(moment.userId);
      const serialized = this.serializeMoment(moment);
      if (existing) {
        existing.moments.push(serialized);
      } else {
        grouped.set(moment.userId, {
          user: moment.user,
          moments: [serialized],
        });
      }
    }

    for (const entry of grouped.values()) {
      entry.moments.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    const groups = Array.from(grouped.values()).sort((a, b) => {
      if (a.user.id === viewerId) return -1;
      if (b.user.id === viewerId) return 1;
      const aLatest = a.moments[a.moments.length - 1]?.createdAt ?? '';
      const bLatest = b.moments[b.moments.length - 1]?.createdAt ?? '';
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    return { groups };
  }
}
