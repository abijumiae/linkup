import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

const UPLOAD_LIMIT = 50 * 1024 * 1024;
const AUDIO_UPLOAD_LIMIT = 10 * 1024 * 1024;

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_LIMIT },
    }),
  )
  upload(
    @Req() req: { user: { id: string; sub?: string } },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('UPLOAD HIT');
    console.log('UPLOAD USER:', req.user?.id || req.user?.sub || 'unknown');
    console.log(
      'UPLOAD FILE:',
      file?.originalname,
      file?.mimetype,
      file?.size,
    );

    this.logger.log('Upload request received');
    this.logger.log(
      `File received: ${file?.originalname ?? 'none'} ${file?.mimetype ?? 'none'} ${file?.size ?? 0}`,
    );

    if (!file || file.size < 1) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > AUDIO_UPLOAD_LIMIT) {
      const normalized =
        file.mimetype.split(';')[0]?.trim().toLowerCase() ?? '';
      const isAudio =
        normalized.startsWith('audio/') ||
        Boolean(
          file.originalname.match(/\.(webm|mp3|m4a|aac|wav|ogg|caf)$/i),
        );

      if (isAudio) {
        throw new BadRequestException('Audio must be 10MB or smaller.');
      }
    }

    return this.uploadsService.uploadFile(file);
  }
}
