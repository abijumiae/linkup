import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { NotificationsService } from './notifications.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  getUnreadCount(@Req() req: { user: SafeUser }) {
    return this.notificationsService
      .getUnreadCount(req.user.id)
      .then((unreadCount) => ({ unreadCount }));
  }

  @Get()
  getAlerts(
    @Req() req: { user: SafeUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getForUser(req.user.id, { page, limit });
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: { user: SafeUser }) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}
