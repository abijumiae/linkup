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
import { PostLiveTalkMessageDto } from './dto/post-live-talk-message.dto';
import { UpdateLiveTalkHandDto } from './dto/update-live-talk-hand.dto';
import { UpdateLiveTalkMuteDto } from './dto/update-live-talk-mute.dto';
import { GroupLiveTalkService } from './group-live-talk.service';

/** Full paths on each handler so Nest registers routes reliably. */
@Controller()
@UseGuards(JwtAuthGuard)
export class GroupLiveTalkController {
  constructor(private readonly groupLiveTalkService: GroupLiveTalkService) {}

  @Post('groups/:groupId/live-talk/start')
  start(
    @Param('groupId') groupId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.startRoom(groupId, req.user.id);
  }

  @Get('groups/:groupId/live-talk/active')
  active(
    @Param('groupId') groupId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.getActiveRoom(groupId, req.user.id);
  }

  @Post('groups/:groupId/live-talk/:roomId/join')
  join(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.joinRoom(groupId, roomId, req.user.id);
  }

  @Post('groups/:groupId/live-talk/:roomId/leave')
  leave(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.leaveRoom(groupId, roomId, req.user.id);
  }

  @Post('groups/:groupId/live-talk/:roomId/end')
  end(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.endRoom(groupId, roomId, req.user.id);
  }

  @Patch('groups/:groupId/live-talk/:roomId/mute')
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

  @Patch('groups/:groupId/live-talk/:roomId/hand')
  hand(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
    @Body() dto: UpdateLiveTalkHandDto,
  ) {
    return this.groupLiveTalkService.setHandRaised(
      groupId,
      roomId,
      req.user.id,
      dto.handRaised,
    );
  }

  @Get('groups/:groupId/live-talk/:roomId/messages')
  messages(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.groupLiveTalkService.getMessages(
      groupId,
      roomId,
      req.user.id,
    );
  }

  @Post('groups/:groupId/live-talk/:roomId/messages')
  sendMessage(
    @Param('groupId') groupId: string,
    @Param('roomId') roomId: string,
    @Req() req: { user: SafeUser },
    @Body() dto: PostLiveTalkMessageDto,
  ) {
    return this.groupLiveTalkService.postMessage(
      groupId,
      roomId,
      req.user.id,
      dto.content,
    );
  }
}
