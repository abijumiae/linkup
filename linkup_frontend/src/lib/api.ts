import { logLinkUpDiagnostic } from "./diagnostics";

const PRODUCTION_API_URL = "https://api.thelinkupzone.com";
const LOCAL_API_URL = "http://localhost:3000";

let hasWarnedLocalApiUrl = false;

export function getDirectApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (envUrl) {
    const normalized = envUrl.replace(/\/$/, "");

    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production" &&
      normalized.includes("localhost") &&
      !hasWarnedLocalApiUrl
    ) {
      hasWarnedLocalApiUrl = true;
      console.error(
        "NEXT_PUBLIC_API_URL points to localhost in a production build. Remove it or set https://api.thelinkupzone.com in Vercel.",
      );
    }

    return normalized;
  }

  if (process.env.NODE_ENV === "development") {
    return LOCAL_API_URL;
  }

  return PRODUCTION_API_URL;
}

/** Direct backend URL — OAuth redirects and media asset URLs. */
export function getApiBaseUrl(): string {
  return getDirectApiBaseUrl();
}

/**
 * Realtime server URL — must point at the always-on API host (Render/Railway/VPS).
 * Never use the Vercel frontend URL; Vercel cannot host persistent WebSockets.
 */
export function getSocketBaseUrl(): string {
  const socketEnv = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  const direct = socketEnv
    ? socketEnv.replace(/\/$/, "")
    : getDirectApiBaseUrl();

  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    return direct;
  }

  try {
    const backend = new URL(direct);
    const pageHost = window.location.hostname;

    if (pageHost !== "localhost" && pageHost !== "127.0.0.1") {
      return `${backend.protocol}//${pageHost}:${backend.port || "3000"}`;
    }

    return direct;
  } catch {
    return direct;
  }
}

/**
 * Browser HTTP calls use the same-origin /api proxy (next.config rewrites).
 * Avoids CORS issues and works when testing from a phone on the LAN.
 */
export function buildApiRequestUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    return `/api${normalizedPath}`;
  }

  return `${getDirectApiBaseUrl()}${normalizedPath}`;
}

export const API_BASE_URL = getDirectApiBaseUrl();

const DEFAULT_TIMEOUT_MS =
  process.env.NODE_ENV === "production" ? 45_000 : 20_000;
const DEFAULT_RETRIES = process.env.NODE_ENV === "production" ? 4 : 1;

export function getBackendUnreachableMessage(): string {
  if (process.env.NODE_ENV === "development") {
    return "Cannot reach the backend. Start linkup_backend on http://localhost:3000.";
  }

  return "LinkUp is temporarily unavailable. Please try again.";
}

export function getRequestTimeoutMessage(): string {
  if (process.env.NODE_ENV === "development") {
    return "Request timed out. Check that linkup_backend is running and the database is reachable.";
  }

  return "This request took too long. Please try again.";
}

export function toAbsoluteMediaUrl(url?: string | null): string | undefined {
  if (!url?.trim()) {
    return undefined;
  }

  const trimmed = url.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${getDirectApiBaseUrl()}${path}`;
}

export function resolveMediaUrl(url?: string | null): string | undefined {
  return toAbsoluteMediaUrl(url);
}

/** Blob/data URLs pass through; relative API paths become absolute. */
export function resolvePreviewMediaUrl(
  url: string | null | undefined,
): string | null {
  if (!url) {
    return null;
  }
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return resolveMediaUrl(url) ?? url;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("linkup_access_token");
}

const LEGACY_WAKE_PATTERNS =
  /waking up|warming up|may be waking|server may be waking/i;

function sanitizeApiErrorMessage(message: string): string {
  if (process.env.NODE_ENV === "development") {
    return message;
  }
  if (LEGACY_WAKE_PATTERNS.test(message)) {
    return getBackendUnreachableMessage();
  }
  return message;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(sanitizeApiErrorMessage(message));
    this.name = "ApiError";
    this.status = status;
  }
}

export type ApiRequestOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 502 || status === 503 || status === 504;
}

async function retryDelayMs(attempt: number): Promise<void> {
  const base = process.env.NODE_ENV === "production" ? 2_000 : 1_000;
  await sleep(base * (attempt + 1));
}

async function apiRequestOnce<T>(
  path: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Authorization")) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await fetch(buildApiRequestUrl(path), {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(getRequestTimeoutMessage(), 0);
    }

    if (error instanceof TypeError) {
      throw new ApiError(getBackendUnreachableMessage(), 0);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = extractErrorMessage(data, "Request failed");
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    retries = DEFAULT_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...fetchOptions
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiRequestOnce<T>(path, fetchOptions, timeoutMs);
    } catch (error) {
      lastError = error;

      if (
        attempt < retries &&
        error instanceof ApiError &&
        isRetryableStatus(error.status)
      ) {
        if (process.env.NODE_ENV === "production" && error.status === 0) {
          const { wakeBackend } = await import("./backendWarmup");
          await wakeBackend(3);
        }
        await retryDelayMs(attempt);
        continue;
      }

      if (attempt >= retries) {
        logLinkUpDiagnostic(
          "api",
          `Request failed for ${path}`,
          error instanceof ApiError
            ? { status: error.status, message: error.message }
            : error,
        );
      }

      throw error;
    }
  }

  throw lastError;
}

export async function checkApiHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(buildApiRequestUrl("/api/health"), {
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.ok) {
      return true;
    }

    const fallback = await fetch(buildApiRequestUrl("/health"), {
      signal: controller.signal,
      cache: "no-store",
    });
    return fallback.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const record = data as Record<string, unknown>;
  const message = record.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallback;
}
