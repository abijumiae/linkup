import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from '../uploads/uploads.service';
import { SafeUser } from '../users/users.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get('conversations')
  getConversations(@Req() req: { user: SafeUser }) {
    return this.messagesService.getConversations(req.user.id);
  }

  @Post('upload-audio')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAudio(
    @Req() _req: { user: SafeUser },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadFile(file);
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
