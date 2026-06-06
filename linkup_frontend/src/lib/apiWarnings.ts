import {
  ApiError,
  getApiBaseUrl,
  getBackendUnreachableMessage,
  getRequestTimeoutMessage,
} from "./api";

const LEGACY_WAKE_PATTERNS =
  /waking up|warming up|may be waking|server may be waking/i;

/** Strip legacy cold-start copy from any cached or stale error strings. */
export function sanitizeProductionError(message: string): string {
  if (process.env.NODE_ENV === "development") {
    return message;
  }

  if (LEGACY_WAKE_PATTERNS.test(message)) {
    return getBackendUnreachableMessage();
  }

  return message;
}

export function featureUnavailable(feature: string): string {
  if (process.env.NODE_ENV === "development") {
    return `${feature} unavailable. Start linkup_backend on http://localhost:3000.`;
  }

  return `Could not load ${feature}. Please try again.`;
}

export function apiUnavailableMessage(): string {
  if (process.env.NODE_ENV === "development") {
    const api = getApiBaseUrl();
    if (api.includes("thelinkupzone.com") || api.includes("onrender.com")) {
      return "API route not found. Redeploy linkup_backend, then refresh.";
    }
    return `API not reachable at ${api}. Run: cd linkup_backend && npm run start:dev`;
  }

  return "LinkUp is temporarily unavailable. Please try again.";
}

export function apiWarningFromError(error: unknown, feature: string): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return apiUnavailableMessage();
    }
    if (error.status === 0) {
      if (error.message.toLowerCase().includes("timed out")) {
        return process.env.NODE_ENV === "development"
          ? "Request timed out. Check the backend and database connection."
          : getRequestTimeoutMessage();
      }
      return getBackendUnreachableMessage();
    }
    return sanitizeProductionError(error.message);
  }

  return featureUnavailable(feature);
}

export function hubAdminWarningFromError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "You need hub owner or admin permission to manage hub admins.";
    }
    if (error.status === 401) {
      return "Sign in again to manage hub admins.";
    }
    if (error.status === 404) {
      const msg = error.message.toLowerCase();
      if (msg.includes("hub not found")) {
        return "This hub no longer exists.";
      }
      if (
        process.env.NODE_ENV === "development" &&
        (msg.includes("cannot get") || msg.includes("cannot post"))
      ) {
        return "Hub admins API is not available. Restart linkup_backend (npm run start:dev).";
      }
      return apiUnavailableMessage();
    }
    if (error.status === 0) {
      return getBackendUnreachableMessage();
    }
    return sanitizeProductionError(error.message);
  }

  return featureUnavailable("Hub admins");
}
