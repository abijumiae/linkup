import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  normalizeMimeType,
  safeUploadExtension,
} from './storage.validation';
import {
  StorageBackend,
  StorageUploadResult,
  UploadMediaType,
} from './storage.types';

@Injectable()
export class LocalStorageService implements StorageBackend {
  readonly name = 'local' as const;
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');

  getPublicUrl(path: string): string {
    const base = (
      process.env.PUBLIC_API_URL ??
      process.env.API_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`
    ).replace(/\/$/, '');

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async upload(
    file: Express.Multer.File,
    mediaType: UploadMediaType,
  ): Promise<StorageUploadResult> {
    await mkdir(this.uploadDir, { recursive: true });

    const extension = safeUploadExtension(
      file.originalname,
      normalizeMimeType(file.mimetype),
    );
    const filename = `media-${Date.now()}-${randomBytes(6).toString('hex')}${extension}`;
    const destination = join(this.uploadDir, filename);

    await writeFile(destination, file.buffer);

    this.logger.log(`Stored upload locally as ${filename}`);

    return {
      url: `/uploads/${filename}`,
      type: mediaType,
      filename,
      mimeType: normalizeMimeType(file.mimetype),
      size: file.size,
      provider: 'local',
    };
  }

  async deleteFile(url: string): Promise<void> {
    if (!url.startsWith('/uploads/')) {
      return;
    }

    const filename = url.replace(/^\/uploads\//, '');
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return;
    }

    try {
      await unlink(join(this.uploadDir, filename));
    } catch {
      // File may already be gone.
    }
  }
}
