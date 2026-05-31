import { UploadMediaType, UploadResult } from './uploads.service';

/**
 * Storage abstraction for LinkUp media (avatars, covers, posts, voice notes, etc.).
 *
 * - LocalStorageProvider: dev / fallback (Render disk is ephemeral)
 * - CloudinaryStorageProvider: production when CLOUDINARY_* env vars are set
 *
 * TODO: Add S3StorageProvider or SupabaseStorageProvider when env vars are configured.
 */
export interface StorageProvider {
  readonly name: string;
  upload(file: Express.Multer.File, mediaType: UploadMediaType): Promise<UploadResult>;
}

export function getConfiguredStorageHint(): string {
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    return 'cloudinary';
  }

  if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
    return 's3';
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return 'supabase';
  }

  return 'local';
}
