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

  if (!process.env.FRONTEND_URL?.trim() && !process.env.APP_URL?.trim()) {
    console.warn(
      'APP_URL / FRONTEND_URL not set — email links and OAuth redirects may be incorrect',
    );
  }

  const smtpReady = Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_PORT?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      (process.env.SMTP_FROM?.trim() ||
        process.env.MAIL_FROM?.trim() ||
        process.env.EMAIL_FROM?.trim()),
  );

  if (!smtpReady) {
    console.warn(
      'SMTP not fully configured — signup verification emails will be logged, not sent',
    );
  }
}
