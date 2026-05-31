import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { RealtimeEmitter } from '../chat/realtime.emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReportDto,
  REPORT_CATEGORIES,
} from './dto/create-report.dto';

@Injectable()
export class SafetyService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeEmitter))
    private readonly realtimeEmitter: RealtimeEmitter,
  ) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    const reason = (dto.reason ?? dto.category)?.trim();
    const details = (dto.description ?? dto.details)?.trim() || null;

    if (!reason) {
      throw new BadRequestException('Report category is required');
    }

    if (!REPORT_CATEGORIES.includes(reason as (typeof REPORT_CATEGORIES)[number])) {
      throw new BadRequestException('Invalid report category');
    }

    if (dto.targetType === 'USER' && dto.targetId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }

    await this.validateReportTarget(dto.targetType, dto.targetId);

    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: 'OPEN',
      },
    });

    if (existing) {
      return { message: 'Report already submitted', id: existing.id };
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason,
        details,
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });

    this.realtimeEmitter.emitReportCreatedToStaff({
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      status: report.status,
      createdAt:
        report.createdAt instanceof Date
          ? report.createdAt.toISOString()
          : String(report.createdAt),
    });

    return { ...report, message: 'Thanks. Your report has been sent.' };
  }

  private async validateReportTarget(
    targetType: CreateReportDto['targetType'],
    targetId: string,
  ) {
    switch (targetType) {
      case 'POST': {
        const post = await this.prisma.post.findUnique({ where: { id: targetId } });
        if (!post) throw new NotFoundException('Post not found');
        return;
      }
      case 'USER': {
        const user = await this.prisma.user.findUnique({ where: { id: targetId } });
        if (!user) throw new NotFoundException('User not found');
        return;
      }
      case 'COMMENT': {
        const comment = await this.prisma.comment.findUnique({ where: { id: targetId } });
        if (!comment) throw new NotFoundException('Comment not found');
        return;
      }
      case 'GROUP': {
        const group = await this.prisma.group.findUnique({ where: { id: targetId } });
        if (!group) throw new NotFoundException('Group not found');
        return;
      }
      case 'MARKET': {
        const item = await this.prisma.marketplaceItem.findUnique({
          where: { id: targetId },
        });
        if (!item) throw new NotFoundException('Listing not found');
        return;
      }
      case 'JOB': {
        const job = await this.prisma.job.findUnique({ where: { id: targetId } });
        if (!job) throw new NotFoundException('Job not found');
        return;
      }
      case 'EVENT': {
        const event = await this.prisma.event.findUnique({ where: { id: targetId } });
        if (!event) throw new NotFoundException('Event not found');
        return;
      }
      default:
        throw new BadRequestException('Unsupported report target');
    }
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (existing) {
      return { blocked: true };
    }

    await this.prisma.$transaction([
      this.prisma.block.create({
        data: { blockerId, blockedId },
      }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      }),
    ]);

    this.realtimeEmitter.emitUserBlocked(blockerId, blockedId);

    return { blocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({
      where: { blockerId, blockedId },
    });

    this.realtimeEmitter.emitUserUnblocked(blockerId, blockedId);

    return { blocked: false };
  }

  async getBlockStatus(viewerId: string, targetUserId: string) {
    const [blockedByMe, blockedMe] = await Promise.all([
      this.prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: viewerId,
            blockedId: targetUserId,
          },
        },
        select: { id: true },
      }),
      this.prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: targetUserId,
            blockedId: viewerId,
          },
        },
        select: { id: true },
      }),
    ]);

    return {
      blockedByMe: Boolean(blockedByMe),
      blockedMe: Boolean(blockedMe),
      isBlocked: Boolean(blockedByMe || blockedMe),
    };
  }

  async assertNotBlocked(userA: string, userB: string) {
    const status = await this.getBlockStatus(userA, userB);
    if (status.isBlocked) {
      throw new ForbiddenException("You can't message this user");
    }
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    const status = await this.getBlockStatus(userA, userB);
    return status.isBlocked;
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });

    const ids = new Set<string>();
    for (const row of rows) {
      if (row.blockerId === userId) {
        ids.add(row.blockedId);
      } else {
        ids.add(row.blockerId);
      }
    }
    return [...ids];
  }

  async listBlocks(userId: string) {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      user: row.blocked,
      createdAt: row.createdAt,
    }));
  }
}
