import { StorageProviderName } from '../storage/storage.types';
import { hasCloudinaryCredentials } from '../storage/storage.validation';

/**
 * Returns the configured storage provider name for logging and static file hints.
 */
export function getConfiguredStorageHint(): StorageProviderName | 's3' | 'supabase' {
  const configured = process.env.STORAGE_PROVIDER?.trim().toLowerCase();

  if (configured === 'cloudinary' && hasCloudinaryCredentials()) {
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
