import { LiveTalkParticipantView } from "@/app/hooks/useGroupLiveTalk";

export type LiveTalkMicStatus = "speaking" | "muted" | "listening" | "idle";

export function participantInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function isParticipantSpeaking(
  p: LiveTalkParticipantView,
  activeMicUserId: string | null | undefined,
): boolean {
  const onMic = Boolean(activeMicUserId && p.userId === activeMicUserId);
  return (onMic && !p.isMuted) || Boolean(p.speaking && !p.isMuted);
}

export function getMicStatus(
  p: LiveTalkParticipantView,
  activeMicUserId: string | null | undefined,
): LiveTalkMicStatus {
  if (p.away) {
    return "idle";
  }
  if (isParticipantSpeaking(p, activeMicUserId)) {
    return "speaking";
  }
  if (p.isMuted) {
    return "muted";
  }
  if (activeMicUserId && p.userId === activeMicUserId) {
    return "listening";
  }
  return "listening";
}

/** Short role label for UI badges */
export function getRoleLabel(
  p: LiveTalkParticipantView,
  liveTalkHostId?: string,
): string | null {
  if (p.userId === liveTalkHostId) {
    return "Host";
  }
  if (p.isTempAdmin) {
    return "Admin";
  }
  if (
    p.groupRole === "OWNER" ||
    p.groupRole === "ADMIN" ||
    p.groupRole === "MODERATOR"
  ) {
    if (p.groupRole === "MODERATOR") {
      return "Mod";
    }
    return "Admin";
  }
  return null;
}

export function getSessionRoleLabel(
  p: LiveTalkParticipantView,
  activeMicUserId: string | null | undefined,
): "Speaker" | "Listener" {
  if (activeMicUserId && p.userId === activeMicUserId) {
    return "Speaker";
  }
  return "Listener";
}

export const micStatusLabel: Record<LiveTalkMicStatus, string> = {
  speaking: "Speaking",
  muted: "Muted",
  listening: "Listening",
  idle: "Away",
};
