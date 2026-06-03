/**
 * WebRTC ICE configuration for Live Talk / calls.
 *
 * TODO: For reliable production Live Talk behind strict NAT/mobile carriers,
 * configure a TURN server (STUN alone is not enough on all networks).
 *
 * Env placeholders (do not commit secrets):
 * - NEXT_PUBLIC_WEBRTC_STUN_URL (default: Google STUN)
 * - NEXT_PUBLIC_WEBRTC_TURN_URL
 * - NEXT_PUBLIC_WEBRTC_TURN_USERNAME
 * - NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL
 */

export function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  const stun =
    process.env.NEXT_PUBLIC_WEBRTC_STUN_URL?.trim() ||
    "stun:stun.l.google.com:19302";
  servers.push({ urls: stun });

  const turnUrl = process.env.NEXT_PUBLIC_WEBRTC_TURN_URL?.trim();
  const turnUser = process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME?.trim();
  const turnCred = process.env.NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL?.trim();

  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    });
  }

  return servers;
}

/** Dev-only Live Talk / WebRTC logs (never log tokens or message bodies). */
export function ltDebug(message: string, detail?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  if (detail) {
    console.log(`[LiveTalk] ${message}`, detail);
  } else {
    console.log(`[LiveTalk] ${message}`);
  }
}

export function mapGetUserMediaError(err: unknown): string {
  if (typeof window === "undefined") {
    return "Live Talk is not supported in this browser.";
  }

  if (
    typeof RTCPeerConnection === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return "Live Talk is not supported in this browser.";
  }

  const name = err instanceof DOMException ? err.name : "";
  const message = err instanceof Error ? err.message : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Microphone permission is required for Live Talk.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone found.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Microphone is in use by another app.";
  }
  if (name === "SecurityError" || message.includes("secure")) {
    return "Live Talk requires HTTPS (or localhost) for microphone access.";
  }

  return "Could not access microphone. Please try again.";
}
