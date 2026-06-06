import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ModeratorGuard } from '../common/guards/moderator.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';
import { ModerationService } from './moderation.service';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, ModeratorGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderationService: ModerationService,
  ) {}

  @Get('reports')
  listReports(
    @Query('status') status?: string,
    @Query('targetType') targetType?: string,
  ) {
    return this.moderationService.listReports({ status, targetType });
  }

  @Get('reports/:id')
  getReport(@Param('id') id: string) {
    return this.moderationService.getReport(id);
  }

  @Patch('reports/:id/status')
  updateReportStatus(
    @Param('id') id: string,
    @Req() req: { user: SafeUser },
    @Body() body: UpdateReportStatusDto,
  ) {
    return this.moderationService.updateReportStatus(
      req.user.id,
      id,
      body.status,
      body.notes,
    );
  }

  @Patch('reports/:id/review')
  reviewReport(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.moderationService.updateReportStatus(
      req.user.id,
      id,
      'REVIEWING',
    );
  }

  @Get('stats')
  async getStats() {
    const [users, posts, groups, openReports, deletedHubs] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.post.count(),
        this.prisma.group.count({ where: { archivedAt: null } }),
        this.prisma.report.count({ where: { status: 'OPEN' } }),
        this.prisma.groupDeletionLog.count(),
      ]);

    return { users, posts, groups, openReports, deletedHubs };
  }
}
