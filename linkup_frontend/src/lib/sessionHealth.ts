"use client";

import { checkApiHealth } from "./api";
import { logLinkUpDiagnostic } from "./diagnostics";
import { getToken, refreshAccessToken } from "./auth";
import { getSocketStatus, reconnectSocket } from "./socket";

const HEALTH_INTERVAL_MS = 5 * 60 * 1000;
const TOKEN_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

let healthTimer: number | null = null;
let tokenTimer: number | null = null;
let started = false;

async function runHealthCheck(): Promise<void> {
  const ok = await checkApiHealth();
  if (!ok) {
    logLinkUpDiagnostic("api", "Backend health check failed");
    return;
  }

  const socketStatus = getSocketStatus();
  if (getToken() && socketStatus !== "connected") {
    logLinkUpDiagnostic("socket", `Socket status is ${socketStatus} — reconnecting`);
    reconnectSocket();
  }
}

async function runTokenRefresh(): Promise<void> {
  if (!getToken()) {
    return;
  }

  const token = await refreshAccessToken();
  if (token) {
    reconnectSocket();
    return;
  }

  logLinkUpDiagnostic("auth", "Background token refresh did not return a new token");
}

export function startSessionHealthMonitor(): void {
  if (typeof window === "undefined" || started) {
    return;
  }

  started = true;

  const onVisible = () => {
    if (document.visibilityState !== "visible" || !getToken()) {
      return;
    }

    void runHealthCheck();
    void refreshAccessToken().then((token) => {
      if (token) {
        reconnectSocket();
      }
    });
  };

  document.addEventListener("visibilitychange", onVisible);

  void runHealthCheck();

  healthTimer = window.setInterval(() => {
    void runHealthCheck();
  }, HEALTH_INTERVAL_MS);

  tokenTimer = window.setInterval(() => {
    void runTokenRefresh();
  }, TOKEN_REFRESH_INTERVAL_MS);
}

export function stopSessionHealthMonitor(): void {
  if (healthTimer) {
    clearInterval(healthTimer);
    healthTimer = null;
  }

  if (tokenTimer) {
    clearInterval(tokenTimer);
    tokenTimer = null;
  }

  started = false;
}
