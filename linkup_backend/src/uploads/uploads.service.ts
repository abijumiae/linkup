import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { StorageUploadResult } from '../storage/storage.types';
import {
  isAllowedUploadFile,
  normalizeMimeType,
} from '../storage/storage.validation';

export {
  isAllowedUploadFile,
  normalizeMimeType,
} from '../storage/storage.validation';

export type UploadMediaType = 'image' | 'video' | 'audio';

export type UploadResult = StorageUploadResult;

@Injectable()
export class UploadsService {
  constructor(private readonly storageService: StorageService) {}

  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    return this.storageService.uploadFile(file);
  }

  getActiveProvider() {
    return this.storageService.getActiveProvider();
  }
}
