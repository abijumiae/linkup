export type UploadMediaType = 'image' | 'video' | 'audio' | 'file';

export type StorageProviderName =
  | 'local'
  | 'cloudinary'
  | 's3'
  | 'supabase';

export type StorageUploadResult = {
  url: string;
  type: UploadMediaType;
  filename: string;
  mimeType: string;
  size: number;
  provider: StorageProviderName;
};

export type StorageUploadOptions = {
  mediaType?: UploadMediaType;
};

export interface StorageBackend {
  readonly name: StorageProviderName;
  upload(
    file: Express.Multer.File,
    mediaType: UploadMediaType,
  ): Promise<StorageUploadResult>;
  deleteFile?(url: string): Promise<void>;
  getPublicUrl?(path: string): string;
}
