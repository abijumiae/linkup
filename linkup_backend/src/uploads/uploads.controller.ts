import {
  BadRequestException,
  Controller,
  HttpCode,
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
import { isAllowedUploadFile, UploadsService } from './uploads.service';

const UPLOAD_LIMIT = 50 * 1024 * 1024;

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_LIMIT },
      fileFilter: (_req, file, callback) => {
        if (isAllowedUploadFile(file.mimetype, file.originalname)) {
          callback(null, true);
          return;
        }

        callback(new BadRequestException('Unsupported file type'), false);
      },
    }),
  )
  upload(
    @Req() req: { user: { id: string; sub?: string } },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.logger.log(
      `Upload request from user ${req.user.id}: ${file?.mimetype ?? 'none'} (${file?.size ?? 0} bytes)`,
    );

    if (!file || file.size < 1) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadsService.uploadFile(file);
  }
}
