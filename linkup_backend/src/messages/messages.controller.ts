import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
  private readonly logger = new Logger(MessagesController.name);

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
    FileFieldsInterceptor(
      [
        { name: 'audio', maxCount: 1 },
        { name: 'file', maxCount: 1 },
        { name: 'audioFile', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: AUDIO_UPLOAD_LIMIT },
      },
    ),
  )
  uploadAudio(
    @Req() _req: { user: SafeUser },
    @UploadedFiles()
    files: {
      audio?: Express.Multer.File[];
      file?: Express.Multer.File[];
      audioFile?: Express.Multer.File[];
    },
  ) {
    const file =
      files.audio?.[0] ?? files.file?.[0] ?? files.audioFile?.[0];
    this.logger.log('Upload-audio request received');
    this.logger.log(
      `File received: ${file?.originalname ?? 'none'} ${file?.mimetype ?? 'none'} ${file?.size ?? 0}`,
    );

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadsService.uploadFile(file);
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
    FileFieldsInterceptor(
      [
        { name: 'audioFile', maxCount: 1 },
        { name: 'file', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: AUDIO_UPLOAD_LIMIT },
      },
    ),
  )
  async sendVoiceMessage(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    files: {
      audioFile?: Express.Multer.File[];
      file?: Express.Multer.File[];
      audio?: Express.Multer.File[];
    },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    const audioFile =
      files.audioFile?.[0] ?? files.file?.[0] ?? files.audio?.[0];

    this.logger.log('Voice multipart request received');
    this.logger.log(
      `File received: ${audioFile?.originalname ?? 'none'} ${audioFile?.mimetype ?? 'none'} ${audioFile?.size ?? 0}`,
    );

    if (!audioFile || audioFile.size < 1) {
      throw new BadRequestException('Voice note file is required');
    }

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

  @Post(':userId')
  async sendMessage(
    @Param('userId') userId: string,
    @Req() req: { user: SafeUser },
    @Body() body: Record<string, unknown>,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    const dto = await this.validateCreateMessageDto(body);
    this.logger.log(
      `Voice message request: ${JSON.stringify({
        senderId: req.user.id,
        receiverId: userId,
        type: dto.type ?? 'text',
        hasMediaUrl: Boolean(dto.mediaUrl ?? dto.audioUrl),
        duration: dto.duration ?? dto.audioDuration ?? null,
      })}`,
    );
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
