import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { UploadMediaType } from './storage.types';

export const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export const AUDIO_MIME_TYPES = new Set([
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

export const AUDIO_EXTENSIONS = new Set([
  '.webm',
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.ogg',
  '.caf',
]);

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/** Strip codec parameters (e.g. audio/webm;codecs=opus → audio/webm). */
export function normalizeMimeType(mimetype: string): string {
  return mimetype.split(';')[0]?.trim().toLowerCase() ?? mimetype;
}

export function isAllowedUploadFile(
  mimetype: string,
  originalname?: string,
): boolean {
  const normalized = normalizeMimeType(mimetype);

  if (
    IMAGE_MIME_TYPES.has(normalized) ||
    VIDEO_MIME_TYPES.has(normalized) ||
    AUDIO_MIME_TYPES.has(normalized)
  ) {
    return true;
  }

  if (
    (normalized === 'application/octet-stream' || !normalized) &&
    originalname
  ) {
    const extension = extname(originalname).toLowerCase();
    return (
      AUDIO_EXTENSIONS.has(extension) ||
      ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.mov'].includes(
        extension,
      )
    );
  }

  return false;
}

export function resolveMediaType(
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

export function validateUploadSize(size: number, mediaType: UploadMediaType) {
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

export function safeUploadExtension(
  originalname: string,
  mimetype: string,
): string {
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

export function hasCloudinaryCredentials(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

export function resolveStorageProviderName(): 'local' | 'cloudinary' {
  const configured = process.env.STORAGE_PROVIDER?.trim().toLowerCase();

  if (configured === 'cloudinary') {
    if (!hasCloudinaryCredentials()) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'STORAGE_PROVIDER=cloudinary but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required',
        );
      }
      return 'local';
    }
    return 'cloudinary';
  }

  if (configured && configured !== 'local') {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${configured}`);
  }

  return 'local';
}
