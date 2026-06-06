"use client";

export const REALTIME_FALLBACK_SYNC_EVENT = "linkup:realtime-fallback-sync";

export function dispatchRealtimeFallbackSync(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(REALTIME_FALLBACK_SYNC_EVENT));
}

export function subscribeRealtimeFallbackSync(
  handler: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = () => handler();
  window.addEventListener(REALTIME_FALLBACK_SYNC_EVENT, listener);
  return () => window.removeEventListener(REALTIME_FALLBACK_SYNC_EVENT, listener);
}
