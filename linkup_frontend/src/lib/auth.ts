import { apiRequest } from "./api";

export type AccountType =
  | "PERSONAL"
  | "CREATOR"
  | "BUSINESS"
  | "STUDENT"
  | "PROFESSIONAL";

export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  accountType: AccountType;
  country: string | null;
  language: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  isVerified: boolean;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignupPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  accountType: AccountType;
  country?: string;
  language?: string;
}

export interface OnboardingPayload {
  username: string;
  accountType: AccountType;
  country: string;
  language: string;
}

const TOKEN_KEY = "linkup_access_token";
const USER_KEY = "linkup_user";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setAuth(accessToken: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function saveUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout(): void {
  clearAuth();
}

export async function signup(
  payload: SignupPayload,
): Promise<{ message: string; email: string; emailDelivery: string }> {
  return apiRequest<{ message: string; email: string; emailDelivery: string }>(
    "/auth/signup",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function verifyEmail(
  email: string,
  code: string,
): Promise<{ message: string; email: string }> {
  return apiRequest<{ message: string; email: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export async function resendVerificationEmail(
  email: string,
): Promise<{ message: string; email?: string; emailDelivery?: string }> {
  return apiRequest<{ message: string; email?: string; emailDelivery?: string }>(
    "/auth/resend-verification",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export async function login(
  email: string,
  password: string,
): Promise<{ accessToken: string; user: User }> {
  const data = await apiRequest<{ accessToken: string; user: User }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );

  setAuth(data.accessToken, data.user);
  return data;
}

export async function completeOnboarding(
  payload: OnboardingPayload,
): Promise<User> {
  const token = getToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await apiRequest<{ user: User }>("/auth/onboarding", {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  saveUser(data.user);
  return data.user;
}

export async function fetchMe(): Promise<User | null> {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const data = await apiRequest<{ user: User }>("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    saveUser(data.user);
    return data.user;
  } catch {
    clearAuth();
    return null;
  }
}
