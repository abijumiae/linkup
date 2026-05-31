import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    if (dto.targetType === 'USER' && dto.targetId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }

    if (dto.targetType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where: { id: dto.targetId },
      });
      if (!post) {
        throw new NotFoundException('Post not found');
      }
    }

    if (dto.targetType === 'USER') {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.targetId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

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
        reason: dto.reason.trim(),
        details: dto.details?.trim() || null,
      },
      select: {
        id: true,
        targetType: true,
        status: true,
        createdAt: true,
      },
    });

    return report;
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
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

    return { blocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({
      where: { blockerId, blockedId },
    });

    return { blocked: false };
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
