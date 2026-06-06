export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const required = ['DATABASE_URL', 'JWT_SECRET'] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    console.error(
      `FATAL: Missing required production env: ${missing.join(', ')}`,
    );
    process.exit(1);
  }

  const hasCorsConfig =
    process.env.CORS_ORIGINS?.trim() ||
    process.env.CORS_ORIGIN?.trim() ||
    process.env.FRONTEND_URL?.trim();

  if (!hasCorsConfig) {
    console.warn(
      'CORS_ORIGINS / FRONTEND_URL not set — using built-in thelinkupzone.com defaults',
    );
  }

  if (!process.env.FRONTEND_URL?.trim()) {
    console.warn(
      'FRONTEND_URL not set — email links and OAuth redirects may be incorrect',
    );
  }
}
