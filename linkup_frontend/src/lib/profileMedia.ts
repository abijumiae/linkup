import { getApiBaseUrl } from "./api";
import { User } from "./auth";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_COVER_BYTES = 8 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function resolveProfileImageUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url?.trim()) {
    return undefined;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${getApiBaseUrl()}${url}`;
  }

  return url;
}

export function getProfileInitials(user: Pick<User, "name" | "username">): string {
  const parts = user.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (user.name?.[0] ?? user.username?.[0] ?? "U").toUpperCase();
}

export function validateAvatarImageFile(file: File): string | null {
  const type = file.type.split(";")[0]?.trim().toLowerCase();
  if (!IMAGE_TYPES.has(type)) {
    return "LinkUp Avatar accepts JPEG, PNG, or WebP.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "LinkUp Avatar must be 5MB or smaller.";
  }
  return null;
}

export function validateCoverImageFile(file: File): string | null {
  const type = file.type.split(";")[0]?.trim().toLowerCase();
  if (!IMAGE_TYPES.has(type)) {
    return "Pulse Cover accepts JPEG, PNG, or WebP.";
  }
  if (file.size > MAX_COVER_BYTES) {
    return "Pulse Cover must be 8MB or smaller.";
  }
  return null;
}
