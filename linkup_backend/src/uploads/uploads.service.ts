import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
  'audio/x-caf',
  'audio/wav',
  'audio/ogg',
  'audio/x-wav',
]);

const AUDIO_EXTENSIONS = new Set([
  '.webm',
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.ogg',
  '.caf',
]);

/** Strip codec parameters (e.g. audio/webm;codecs=opus → audio/webm). */
export function normalizeMimeType(mimetype: string): string {
  return mimetype.split(';')[0]?.trim().toLowerCase() ?? mimetype;
}

export type UploadMediaType = 'image' | 'video' | 'audio';

export type UploadResult = {
  url: string;
  type: UploadMediaType;
  filename: string;
  mimeType: string;
  size: number;
};

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');

  private get publicBaseUrl(): string {
    return (
      process.env.PUBLIC_API_URL ??
      process.env.API_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`
    ).replace(/\/$/, '');
  }

  private get useCloudinary(): boolean {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    );
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const mediaType = this.resolveMediaType(
      normalizeMimeType(file.mimetype),
      file.originalname,
    );
    this.validateSize(file.size, mediaType);

    if (this.useCloudinary) {
      return this.uploadToCloudinary(file, mediaType);
    }

    return this.uploadToLocal(file, mediaType);
  }

  private resolveMediaType(
    mimetype: string,
    originalname?: string,
  ): UploadMediaType {
    if (IMAGE_MIME_TYPES.has(mimetype)) {
      return 'image';
    }

    if (VIDEO_MIME_TYPES.has(mimetype)) {
      return 'video';
    }

    if (AUDIO_MIME_TYPES.has(mimetype)) {
      return 'audio';
    }

    if (
      (mimetype === 'application/octet-stream' || !mimetype) &&
      originalname
    ) {
      const extension = extname(originalname).toLowerCase();
      if (AUDIO_EXTENSIONS.has(extension)) {
        return 'audio';
      }
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
        return 'image';
      }
      if (['.mp4', '.webm', '.mov'].includes(extension)) {
        return 'video';
      }
    }

    throw new BadRequestException('Unsupported file type');
  }

  private validateSize(size: number, mediaType: UploadMediaType) {
    if (mediaType === 'image' && size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('File too large');
    }

    if (mediaType === 'video' && size > MAX_VIDEO_BYTES) {
      throw new BadRequestException('File too large');
    }

    if (mediaType === 'audio' && size > MAX_AUDIO_BYTES) {
      throw new BadRequestException('File too large');
    }
  }

  private safeExtension(originalname: string, mimetype: string): string {
    const normalized = normalizeMimeType(mimetype);
    const fromName = extname(originalname).toLowerCase();
    const allowed = new Set([
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.mp4',
      '.webm',
      '.mov',
      '.mp3',
      '.wav',
      '.ogg',
      '.m4a',
      '.aac',
      '.caf',
    ]);

    if (allowed.has(fromName)) {
      return fromName;
    }

    switch (normalized) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'video/mp4':
        return '.mp4';
      case 'video/webm':
        return '.webm';
      case 'video/quicktime':
        return '.mov';
      case 'audio/mpeg':
        return '.mp3';
      case 'audio/wav':
      case 'audio/x-wav':
        return '.wav';
      case 'audio/ogg':
        return '.ogg';
      case 'audio/mp4':
      case 'audio/aac':
      case 'audio/x-m4a':
        return '.m4a';
      case 'audio/x-caf':
        return '.caf';
      case 'audio/webm':
        return '.webm';
      default:
        return '';
    }
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    mediaType: UploadMediaType,
  ): Promise<UploadResult> {
    // TODO: Move uploaded voice/media files to Cloudinary/S3/Supabase Storage for permanent production storage.
    // Render local filesystem is temporary; files may disappear after restart/redeploy.
    await mkdir(this.uploadDir, { recursive: true });

    const extension = this.safeExtension(
      file.originalname,
      normalizeMimeType(file.mimetype),
    );
    const filename = `media-${Date.now()}-${randomBytes(6).toString('hex')}${extension}`;
    const destination = join(this.uploadDir, filename);

    await writeFile(destination, file.buffer);

    this.logger.log(
      `Stored upload locally as ${filename}. Configure Cloudinary or S3 for production persistence.`,
    );

    return {
      url: `/uploads/${filename}`,
      type: mediaType,
      filename,
      mimeType: normalizeMimeType(file.mimetype),
      size: file.size,
    };
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    mediaType: UploadMediaType,
  ): Promise<UploadResult> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const apiKey = process.env.CLOUDINARY_API_KEY!;
    const apiSecret = process.env.CLOUDINARY_API_SECRET!;
    const timestamp = Math.round(Date.now() / 1000);
    const folder = process.env.CLOUDINARY_FOLDER ?? 'linkup';
    const signature = createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname,
    );
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: 'POST',
        body: form,
      },
    );

    const data = (await response.json()) as {
      secure_url?: string;
      public_id?: string;
      error?: { message?: string };
    };

    if (!response.ok || !data.secure_url) {
      throw new InternalServerErrorException(
        data.error?.message ?? 'Cloud upload failed',
      );
    }

    return {
      url: data.secure_url,
      type: mediaType,
      filename: data.public_id ?? file.originalname,
      mimeType: normalizeMimeType(file.mimetype),
      size: file.size,
    };
  }
}
