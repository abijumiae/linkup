import { buildApiRequestUrl, checkApiHealth } from "./api";
import { logLinkUpDiagnostic } from "./diagnostics";

const WARMUP_INTERVAL_MS = 60_000;
const WARMUP_TIMEOUT_MS = 25_000;

let warmupTimer: number | null = null;
let started = false;
let lastWarmupOk = true;

async function pingBackend(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiRequestUrl("/api/health"), {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return checkApiHealth();
    }

    return true;
  } catch {
    return checkApiHealth();
  } finally {
    clearTimeout(timeout);
  }
}

/** Confirm backend is reachable with staggered health pings before user-facing retries. */
export async function wakeBackend(maxAttempts = 4): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ok = await pingBackend();
    if (ok) {
      lastWarmupOk = true;
      return true;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, 2_000 * (attempt + 1)),
      );
    }
  }

  lastWarmupOk = false;
  logLinkUpDiagnostic("api", "Backend wake-up pings failed");
  return false;
}

export function isBackendWarm(): boolean {
  return lastWarmupOk;
}

export function startBackendWarmup(): void {
  if (typeof window === "undefined" || started) {
    return;
  }

  started = true;

  const run = () => {
    void pingBackend().then((ok) => {
      lastWarmupOk = ok;
      if (!ok) {
        logLinkUpDiagnostic("api", "Background warmup ping failed");
      }
    });
  };

  run();

  warmupTimer = window.setInterval(run, WARMUP_INTERVAL_MS);
}

export function stopBackendWarmup(): void {
  if (warmupTimer) {
    clearInterval(warmupTimer);
    warmupTimer = null;
  }
  started = false;
}
