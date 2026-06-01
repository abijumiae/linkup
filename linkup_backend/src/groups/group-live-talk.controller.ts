import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { UpdateLiveTalkMuteDto } from './dto/update-live-talk-mute.dto';
import { GroupLiveTalkService } from './group-live-talk.service';

@Controller('groups/:groupId/live-talk')
@UseGuards(JwtAuthGuard)
export class GroupLiveTalkController {
  constructor(private readonly groupLiveTalkService: GroupLiveTalkService) {}

  @Post('start')
  start(
    @Param('groupId') groupId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.startRoom(groupId, req.user.id);
  }

  @Get('active')
  active(
    @Param('groupId') groupId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.getActiveRoom(groupId, req.user.id);
  }

  @Post(':roomId/join')
  join(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.joinRoom(groupId, roomId, req.user.id);
  }

  @Post(':roomId/leave')
  leave(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.leaveRoom(groupId, roomId, req.user.id);
  }

  @Post(':roomId/end')
  end(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.endRoom(groupId, roomId, req.user.id);
  }

  @Patch(':roomId/mute')
  mute(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
    @Body() dto: UpdateLiveTalkMuteDto,
  ) {
    return this.groupLiveTalkService.setMuted(
      groupId,
      roomId,
      req.user.id,
      dto.isMuted,
    );
  }
}
