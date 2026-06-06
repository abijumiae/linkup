const DEFAULT_FRONTEND_URL = 'http://localhost:3001';

export function getFrontendUrl(): string {
  const value =
    process.env.APP_URL?.trim() ||
    process.env.FRONTEND_URL?.trim();
  return (value || DEFAULT_FRONTEND_URL).replace(/\/$/, '');
}

export function buildFrontendPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getFrontendUrl()}${normalizedPath}`;
}
