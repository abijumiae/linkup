import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ReportStatus } from '../generated/prisma/client';
import { RealtimeEmitter } from '../chat/realtime.emitter';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_STATUSES: ReportStatus[] = [
  'OPEN',
  'REVIEWING',
  'REVIEWED',
  'RESOLVED',
  'DISMISSED',
];

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeEmitter))
    private readonly realtimeEmitter: RealtimeEmitter,
  ) {}

  async listReports(filters?: {
    status?: string;
    targetType?: string;
  }) {
    const status =
      filters?.status && ALLOWED_STATUSES.includes(filters.status as ReportStatus)
        ? (filters.status as ReportStatus)
        : undefined;

    return this.prisma.report.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(filters?.targetType
          ? { targetType: filters.targetType as never }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        reporter: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
  }

  async getReport(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        reporter: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async updateReportStatus(
    adminId: string,
    reportId: string,
    status: string,
    notes?: string,
  ) {
    if (!ALLOWED_STATUSES.includes(status as ReportStatus)) {
      throw new BadRequestException('Invalid report status');
    }

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, targetType: true, targetId: true, status: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: status as ReportStatus },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        status: true,
        updatedAt: true,
      },
    });

    await this.prisma.moderationLog.create({
      data: {
        adminId,
        action: `report_status_${status.toLowerCase()}`,
        targetType: 'report',
        targetId: reportId,
        notes: notes?.trim() || null,
      },
    });

    this.realtimeEmitter.emitModerationStatusUpdated({
      id: updated.id,
      status: updated.status,
      targetType: updated.targetType,
      targetId: updated.targetId,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }
}
