import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('reports')
  async listReports() {
    return this.prisma.report.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
      },
    });
  }

  @Patch('reports/:id/review')
  async reviewReport(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.prisma.report.update({
      where: { id },
      data: { status: 'REVIEWED' },
      select: {
        id: true,
        status: true,
      },
    });
  }

  @Get('stats')
  async getStats() {
    const [users, posts, openReports] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.post.count(),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
    ]);

    return { users, posts, openReports };
  }
}
