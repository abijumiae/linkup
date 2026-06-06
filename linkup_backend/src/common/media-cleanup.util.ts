import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/** Remove local /uploads files referenced by stored URLs. */
export function cleanupLocalUploadFiles(mediaUrls: string[]): number {
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    return 0;
  }

  let removed = 0;

  for (const url of mediaUrls) {
    const normalized = url.trim();
    if (!normalized) {
      continue;
    }

    let relativePath: string | null = null;

    if (normalized.startsWith('/uploads/')) {
      relativePath = normalized.replace(/^\//, '');
    } else {
      try {
        const parsed = new URL(normalized);
        if (parsed.pathname.startsWith('/uploads/')) {
          relativePath = parsed.pathname.replace(/^\//, '');
        }
      } catch {
        // not a URL
      }
    }

    if (!relativePath) {
      continue;
    }

    const filePath = join(process.cwd(), relativePath);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
        removed += 1;
      } catch {
        // ignore per-file failures
      }
    }
  }

  return removed;
}

export function collectUniqueMediaUrls(
  values: Array<string | null | undefined>,
): string[] {
  const urls = new Set<string>();

  for (const value of values) {
    if (value?.trim()) {
      urls.add(value.trim());
    }
  }

  return [...urls];
}
