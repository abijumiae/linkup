import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

/** Alias routes for LinkUp chat API (`/chats/*`). */
@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':userId')
  getConversation(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.messagesService.getConversation(req.user.id, userId);
  }

  @Post(':userId/messages')
  sendMessage(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.sendMessage(req.user.id, userId, dto);
  }
}
