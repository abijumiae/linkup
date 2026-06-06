type DiagnosticCategory = "auth" | "socket" | "api" | "session";

const lastLoggedAt = new Map<string, number>();
const DEDUPE_MS = 8_000;

export function logLinkUpDiagnostic(
  category: DiagnosticCategory,
  message: string,
  detail?: unknown,
): void {
  const key = `${category}:${message}`;
  const now = Date.now();
  const last = lastLoggedAt.get(key) ?? 0;

  if (now - last < DEDUPE_MS) {
    return;
  }

  lastLoggedAt.set(key, now);

  if (detail !== undefined) {
    console.warn(`[LinkUp:${category}]`, message, detail);
    return;
  }

  console.warn(`[LinkUp:${category}]`, message);
}
