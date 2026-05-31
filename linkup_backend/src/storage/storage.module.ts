import { Module } from '@nestjs/common';
import { CloudStorageService } from './cloud-storage.service';
import { LocalStorageService } from './local-storage.service';
import { StorageService } from './storage.service';

@Module({
  providers: [LocalStorageService, CloudStorageService, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
