"use client";

import { checkApiHealth } from "./api";
import { logLinkUpDiagnostic } from "./diagnostics";
import { getToken, refreshAccessToken } from "./auth";
import {
  getSocketStatus,
  isSocketConnected,
  reconnectSocket,
} from "./socket";

const SOCKET_WATCH_MS = 25_000;
const HEALTH_INTERVAL_MS = 60_000;
const TOKEN_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

let socketWatchTimer: number | null = null;
let healthTimer: number | null = null;
let tokenTimer: number | null = null;
let started = false;

async function ensureSocketConnected(): Promise<void> {
  if (!getToken()) {
    return;
  }

  if (isSocketConnected()) {
    return;
  }

  logLinkUpDiagnostic(
    "socket",
    `Watchdog reconnect (status=${getSocketStatus()})`,
  );
  reconnectSocket();
}

async function runHealthCheck(): Promise<void> {
  const ok = await checkApiHealth();
  if (!ok) {
    logLinkUpDiagnostic("api", "Backend health check failed");
    return;
  }

  await ensureSocketConnected();
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
  void ensureSocketConnected();

  socketWatchTimer = window.setInterval(() => {
    void ensureSocketConnected();
  }, SOCKET_WATCH_MS);

  healthTimer = window.setInterval(() => {
    void runHealthCheck();
  }, HEALTH_INTERVAL_MS);

  tokenTimer = window.setInterval(() => {
    void runTokenRefresh();
  }, TOKEN_REFRESH_INTERVAL_MS);
}

export function stopSessionHealthMonitor(): void {
  if (socketWatchTimer) {
    clearInterval(socketWatchTimer);
    socketWatchTimer = null;
  }

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
