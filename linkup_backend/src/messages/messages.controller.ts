import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from '../uploads/uploads.service';
import { SafeUser } from '../users/users.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

const AUDIO_UPLOAD_LIMIT = 10 * 1024 * 1024;

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
      limits: { fileSize: AUDIO_UPLOAD_LIMIT },
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
  @UseInterceptors(
    FileInterceptor('audioFile', {
      storage: memoryStorage(),
      limits: { fileSize: AUDIO_UPLOAD_LIMIT },
    }),
  )
  async sendMessage(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
    @Body() body: Record<string, unknown>,
    @UploadedFile() audioFile?: Express.Multer.File,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (audioFile) {
      const uploaded = await this.uploadsService.uploadFile(audioFile);
      const duration = Number(body.duration ?? body.audioDuration ?? 0);

      if (!Number.isFinite(duration) || duration < 1) {
        throw new BadRequestException('Voice note duration is required');
      }

      return this.messagesService.sendMessage(req.user.id, userId, {
        type: 'voice',
        mediaUrl: uploaded.url,
        audioUrl: uploaded.url,
        mediaType: 'audio',
        duration: Math.floor(duration),
        content: typeof body.content === 'string' ? body.content : '',
        marketplaceItemId:
          typeof body.marketplaceItemId === 'string'
            ? body.marketplaceItemId
            : undefined,
      });
    }

    const dto = await this.validateCreateMessageDto(body);
    return this.messagesService.sendMessage(req.user.id, userId, dto);
  }

  private async validateCreateMessageDto(
    body: Record<string, unknown>,
  ): Promise<CreateMessageDto> {
    const dto = plainToInstance(CreateMessageDto, body);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        Object.values(error.constraints ?? {}),
      );
      throw new BadRequestException(
        messages[0] ?? 'Invalid message payload',
      );
    }

    return dto;
  }
}
