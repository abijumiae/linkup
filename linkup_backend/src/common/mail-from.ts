export function getMailFromAddress(): string | undefined {
  const value =
    process.env.SMTP_FROM?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim();
  return value || undefined;
}
