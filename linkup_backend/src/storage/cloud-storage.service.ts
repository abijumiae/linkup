import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { normalizeMimeType } from './storage.validation';
import {
  StorageBackend,
  StorageUploadResult,
  UploadMediaType,
} from './storage.types';

@Injectable()
export class CloudStorageService implements StorageBackend {
  readonly name = 'cloudinary' as const;
  private readonly logger = new Logger(CloudStorageService.name);

  async upload(
    file: Express.Multer.File,
    mediaType: UploadMediaType,
  ): Promise<StorageUploadResult> {
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
      this.logger.error(
        `Cloudinary upload failed: ${data.error?.message ?? response.statusText}`,
      );
      throw new InternalServerErrorException(
        data.error?.message ?? 'Cloud upload failed',
      );
    }

    this.logger.log(
      `Stored upload in Cloudinary folder ${folder} as ${data.public_id ?? file.originalname}`,
    );

    return {
      url: data.secure_url,
      type: mediaType,
      filename: data.public_id ?? file.originalname,
      mimeType: normalizeMimeType(file.mimetype),
      size: file.size,
      provider: 'cloudinary',
    };
  }

  getPublicUrl(path: string): string {
    return path;
  }
}
