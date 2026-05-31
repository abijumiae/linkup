import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CloudStorageService } from './cloud-storage.service';
import { LocalStorageService } from './local-storage.service';
import {
  StorageBackend,
  StorageProviderName,
  StorageUploadResult,
} from './storage.types';
import {
  normalizeMimeType,
  resolveMediaType,
  resolveStorageProviderName,
  validateUploadSize,
} from './storage.validation';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private backend!: StorageBackend;
  private providerName!: StorageProviderName;

  constructor(
    private readonly localStorage: LocalStorageService,
    private readonly cloudStorage: CloudStorageService,
  ) {}

  onModuleInit() {
    const requested = process.env.STORAGE_PROVIDER?.trim().toLowerCase();

    try {
      this.providerName = resolveStorageProviderName();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid storage configuration';
      this.logger.error(message);
      throw error;
    }

    if (
      requested === 'cloudinary' &&
      this.providerName === 'local' &&
      process.env.NODE_ENV !== 'production'
    ) {
      this.logger.warn(
        'STORAGE_PROVIDER=cloudinary but Cloudinary credentials are missing — falling back to local storage for development',
      );
    }

    this.backend =
      this.providerName === 'cloudinary'
        ? this.cloudStorage
        : this.localStorage;

    this.logger.log(`Active storage provider: ${this.providerName}`);
  }

  getActiveProvider(): StorageProviderName {
    return this.providerName;
  }

  async uploadFile(file: Express.Multer.File): Promise<StorageUploadResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const mediaType = resolveMediaType(
      normalizeMimeType(file.mimetype),
      file.originalname,
    );
    validateUploadSize(file.size, mediaType);

    return this.backend.upload(file, mediaType);
  }

  async deleteFile(url: string): Promise<void> {
    if (!this.backend.deleteFile) {
      return;
    }

    await this.backend.deleteFile(url);
  }

  getPublicUrl(path: string): string {
    if (this.backend.getPublicUrl) {
      return this.backend.getPublicUrl(path);
    }

    return path;
  }
}
