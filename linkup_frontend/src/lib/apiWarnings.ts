import { ApiError, getApiBaseUrl } from "./api";

export function apiUnavailableMessage(api: string): string {
  if (api.includes("thelinkupzone.com") || api.includes("onrender.com")) {
    return "API is not deployed yet. Redeploy the backend (clear build cache), then refresh.";
  }
  return `API returned 404 from ${api}. Run: cd linkup_backend && npm run start:dev`;
}

export function apiWarningFromError(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return apiUnavailableMessage(getApiBaseUrl());
    }
    if (error.status === 0) {
      if (error.message.includes("timed out")) {
        return "Backend or database timed out. Check Neon connection and restart the backend.";
      }
      return "Cannot reach the backend. Start linkup_backend on http://localhost:3000.";
    }
  }

  return fallback;
}
