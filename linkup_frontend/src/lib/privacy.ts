import { apiRequest, ApiError } from "./api";
import { clearAuth, getToken } from "./auth";

export type ProfileVisibility = "public" | "connections" | "private";
export type MessagePermission = "everyone" | "connections" | "none";

export type PrivacySettings = {
  profileVisibility: ProfileVisibility;
  messagePermission: MessagePermission;
  showOnlineStatus: boolean;
  showCountry: boolean;
  showActivity: boolean;
};

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }
  return { Authorization: `Bearer ${token}` };
}

async function withAuth<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuth();
    }
    throw error;
  }
}

export async function fetchPrivacySettings(): Promise<PrivacySettings> {
  return withAuth(() =>
    apiRequest<PrivacySettings>("/privacy/me", {
      headers: authHeaders(),
    }),
  );
}

export async function updatePrivacySettings(
  payload: Partial<PrivacySettings>,
): Promise<PrivacySettings> {
  return withAuth(() =>
    apiRequest<PrivacySettings>("/privacy/me", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export function mapUiVisibilityToApi(
  value: "PUBLIC" | "CONNECTIONS" | "PRIVATE",
): ProfileVisibility {
  switch (value) {
    case "CONNECTIONS":
      return "connections";
    case "PRIVATE":
      return "private";
    default:
      return "public";
  }
}

export function mapApiVisibilityToUi(
  value: string,
): "PUBLIC" | "CONNECTIONS" | "PRIVATE" {
  switch (value) {
    case "connections":
      return "CONNECTIONS";
    case "private":
      return "PRIVATE";
    default:
      return "PUBLIC";
  }
}

export function mapUiMessagesToApi(
  value: "EVERYONE" | "FOLLOWERS" | "NO_ONE",
): MessagePermission {
  switch (value) {
    case "FOLLOWERS":
      return "connections";
    case "NO_ONE":
      return "none";
    default:
      return "everyone";
  }
}

export function mapApiMessagesToUi(
  value: string,
): "EVERYONE" | "FOLLOWERS" | "NO_ONE" {
  switch (value) {
    case "connections":
      return "FOLLOWERS";
    case "none":
      return "NO_ONE";
    default:
      return "EVERYONE";
  }
}
