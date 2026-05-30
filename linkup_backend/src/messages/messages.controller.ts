import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@Req() req: { user: SafeUser }) {
    return this.messagesService.getConversations(req.user.id);
  }

  @Get(':userId')
  getConversation(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.messagesService.getConversation(req.user.id, userId);
  }

  @Post(':userId')
  async sendMessage(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
    @Body() dto: CreateMessageDto,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.messagesService.sendMessage(req.user.id, userId, dto);
  }
}
