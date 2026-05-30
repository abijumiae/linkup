import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: UPLOAD_LIMIT },
      },
    ),
  )
  upload(
    @Req() _req: { user: { id: string } },
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      audio?: Express.Multer.File[];
    },
  ) {
    const file = files.file?.[0] ?? files.audio?.[0];
    this.logger.log('Upload request received');
    this.logger.log(
      `File received: ${file?.originalname ?? 'none'} ${file?.mimetype ?? 'none'} ${file?.size ?? 0}`,
    );

    if (file && file.size > AUDIO_UPLOAD_LIMIT) {
      const normalized = file.mimetype.split(';')[0]?.trim().toLowerCase() ?? '';
      const isAudio =
        normalized.startsWith('audio/') ||
        file.originalname.match(/\.(webm|mp3|m4a|aac|wav|ogg|caf)$/i);

      if (isAudio) {
        throw new BadRequestException('Audio must be 10MB or smaller.');
      }
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadsService.uploadFile(file);
  }
}
