const PRODUCTION_API_URL = "https://api.thelinkupzone.com";
const LOCAL_API_URL = "http://localhost:3000";

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return LOCAL_API_URL;
  }

  return PRODUCTION_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();

export function getBackendUnreachableMessage(): string {
  if (process.env.NODE_ENV === "development") {
    return "Cannot reach the backend. Start linkup_backend on http://localhost:3000.";
  }

  return "Cannot reach the backend. Please try again shortly.";
}

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/uploads") || url.startsWith("/")) {
    return `${getApiBaseUrl()}${url}`;
  }

  return url;
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

const API_TIMEOUT_MS = 15_000;

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
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
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "Request timed out. The backend or database may be unreachable.",
        0,
      );
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
