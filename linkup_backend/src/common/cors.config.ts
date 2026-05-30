const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3000',
  'https://linkup-nu-ruby.vercel.app',
];

export function getAllowedOrigins(): string[] {
  const fromEnv = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
  ].filter((value): value is string => Boolean(value?.trim()));

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv])];
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return getAllowedOrigins().includes(origin);
}
