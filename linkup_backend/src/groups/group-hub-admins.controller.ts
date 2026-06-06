import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { SetHubAdminDto } from './dto/set-hub-admin.dto';
import { GroupHubAdminsService } from './group-hub-admins.service';

@Controller(['groups/:groupId/admins', 'hubs/:groupId/admins'])
@UseGuards(JwtAuthGuard)
export class GroupHubAdminsController {
  constructor(private readonly hubAdminsService: GroupHubAdminsService) {}

  @Get()
  list(@Param('groupId') groupId: string, @Req() req: { user: SafeUser }) {
    return this.hubAdminsService.listAdmins(groupId, req.user.id);
  }

  @Post()
  add(
    @Param('groupId') groupId: string,
    @Req() req: { user: SafeUser },
    @Body() dto: SetHubAdminDto,
  ) {
    return this.hubAdminsService.addAdmin(
      groupId,
      req.user.id,
      dto.targetUserId,
      dto.role,
    );
  }

  @Delete(':targetUserId')
  remove(
    @Param('groupId') groupId: string,
    @Param('targetUserId') targetUserId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.hubAdminsService.removeAdmin(
      groupId,
      req.user.id,
      targetUserId,
    );
  }
}
