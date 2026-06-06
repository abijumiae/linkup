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
 * Socket.io must use same-origin in dev (Next.js rewrites /socket.io → backend).
 * In production, connect directly to the API host (Vercel cannot proxy WebSockets).
 */
export function getSocketBaseUrl(): string {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return window.location.origin;
  }

  return getDirectApiBaseUrl();
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
const DEFAULT_RETRIES = process.env.NODE_ENV === "production" ? 3 : 1;

export function getBackendUnreachableMessage(): string {
  if (process.env.NODE_ENV === "development") {
    return "Cannot reach the backend. Start linkup_backend on http://localhost:3000.";
  }

  return "Cannot reach the server. It may be waking up — wait a moment and try again.";
}

export function getRequestTimeoutMessage(): string {
  if (process.env.NODE_ENV === "development") {
    return "Request timed out. Check that linkup_backend is running and the database is reachable.";
  }

  return "Request timed out. The server may be waking up — please wait a moment and try again.";
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

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
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
        await sleep(1_500 * (attempt + 1));
        continue;
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
    const response = await fetch(buildApiRequestUrl("/health"), {
      signal: controller.signal,
      cache: "no-store",
    });
    return response.ok;
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
