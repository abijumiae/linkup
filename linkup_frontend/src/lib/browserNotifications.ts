"use client";

const BROWSER_ALERTS_KEY = "linkup_browser_alerts_enabled";

export type BrowserAlertStatus =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export function getBrowserAlertStatus(): BrowserAlertStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function isBrowserAlertsEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(BROWSER_ALERTS_KEY) === "true";
  } catch {
    return false;
  }
}

export function setBrowserAlertsEnabled(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(BROWSER_ALERTS_KEY, enabled ? "true" : "false");
}

export async function requestBrowserAlertPermission(): Promise<BrowserAlertStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    setBrowserAlertsEnabled(true);
  }

  return permission;
}

export function showBrowserAlert(title: string, options?: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted" || !isBrowserAlertsEnabled()) {
    return;
  }

  try {
    new Notification(title, {
      icon: "/brand/app-icon.png",
      badge: "/brand/app-icon.png",
      ...options,
    });
  } catch {
    // Ignore browsers that block programmatic notifications.
  }
}
