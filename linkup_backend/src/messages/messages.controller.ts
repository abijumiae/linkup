import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
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
import { SafeUser } from '../users/users.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

const AUDIO_UPLOAD_LIMIT = 10 * 1024 * 1024;

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/ogg',
]);

function normalizeAudioMime(mimetype: string): string {
  return mimetype.split(';')[0]?.trim().toLowerCase() ?? mimetype;
}

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  private static readonly RESERVED_PATHS = new Set([
    'upload-audio',
    'conversations',
  ]);

  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@Req() req: { user: SafeUser }) {
    return this.messagesService.getConversations(req.user.id);
  }

  /** Must stay before @Post(':userId') so upload-audio is not treated as a user id. */
  @Post('upload-audio')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: AUDIO_UPLOAD_LIMIT },
      fileFilter: (_req, file, cb) => {
        const normalized = normalizeAudioMime(file.mimetype);
        const allowedByName = /\.(webm|mp3|m4a|wav|ogg)$/i.test(
          file.originalname ?? '',
        );

        if (!ALLOWED_AUDIO_MIMES.has(normalized) && !allowedByName) {
          return cb(
            new BadRequestException(
              `Unsupported audio file type: ${file.mimetype}`,
            ),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: SafeUser },
  ) {
    console.log('UPLOAD HIT');
    console.log('UPLOAD USER:', req.user?.id);
    console.log('UPLOAD FILE:', file?.originalname, file?.mimetype, file?.size);

    this.logger.log('Upload-audio request received');
    this.logger.log(
      `File received: ${file?.originalname ?? 'none'} ${file?.mimetype ?? 'none'} ${file?.size ?? 0}`,
    );

    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    return this.messagesService.uploadAudio(file, req.user.id);
  }

  @Get(':userId')
  getConversation(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
  ) {
    return this.messagesService.getConversation(req.user.id, userId);
  }

  @Post(':userId/voice')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: AUDIO_UPLOAD_LIMIT },
    }),
  )
  async sendVoiceMessage(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
    @Body() body: Record<string, unknown>,
    @UploadedFile() audioFile?: Express.Multer.File,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (!audioFile || audioFile.size < 1) {
      throw new BadRequestException('Voice note file is required');
    }

    const uploaded = await this.messagesService.uploadAudio(
      audioFile,
      req.user.id,
    );
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

  @Post(':userId')
  async sendMessage(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
    @Body() body: Record<string, unknown>,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (MessagesController.RESERVED_PATHS.has(userId)) {
      throw new NotFoundException(`Cannot POST /messages/${userId}`);
    }

    const dto = await this.validateCreateMessageDto(body);
    this.logger.log(
      `Message request: ${JSON.stringify({
        senderId: req.user.id,
        receiverId: userId,
        type: dto.type ?? 'text',
        hasMediaUrl: Boolean(dto.mediaUrl ?? dto.audioUrl),
        duration: dto.duration ?? dto.audioDuration ?? null,
      })}`,
    );
    return this.messagesService.sendMessage(req.user.id, userId, dto);
  }

  private normalizeMessageBody(
    body: Record<string, unknown>,
  ): Record<string, unknown> {
    const rawType = typeof body.type === 'string' ? body.type.toLowerCase() : '';
    const isVoice = rawType === 'voice' || rawType === 'audio';

    if (!isVoice) {
      return body;
    }

    const normalized: Record<string, unknown> = {
      ...body,
      type: 'voice',
    };

    const content =
      typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      delete normalized.content;
    } else {
      normalized.content = content;
    }

    return normalized;
  }

  private async validateCreateMessageDto(
    body: Record<string, unknown>,
  ): Promise<CreateMessageDto> {
    const dto = plainToInstance(
      CreateMessageDto,
      this.normalizeMessageBody(body),
      { enableImplicitConversion: true },
    );
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        Object.values(error.constraints ?? {}),
      );
      this.logger.warn(`Message validation failed: ${messages.join('; ')}`);
      throw new BadRequestException(
        messages[0] ?? 'Invalid message payload',
      );
    }

    return dto;
  }
}
