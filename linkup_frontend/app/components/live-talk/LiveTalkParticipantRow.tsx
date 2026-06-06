"use client";

import { Hand, Mic, MicOff, MoreVertical } from "lucide-react";
import { memo, useMemo } from "react";
import { LiveTalkParticipantView } from "@/app/hooks/useGroupLiveTalk";
import AudioWaveBars from "./AudioWaveBars";
import {
  getMicStatus,
  getRoleLabel,
  getSessionRoleLabel,
  isParticipantSpeaking,
  micStatusLabel,
  participantInitials,
} from "./liveTalkParticipantUtils";

export type LiveTalkParticipantRowProps = {
  participant: LiveTalkParticipantView;
  hostId?: string;
  activeMicUserId?: string | null;
  localUserId: string;
  isOnline: boolean;
  menuOpen: boolean;
  showHostMenu: boolean;
  canGrantRoomAdmin: boolean;
  onToggleMenu: () => void;
  onGrantRoomAdmin?: (userId: string) => void;
  onRemoveRoomAdmin?: (userId: string) => void;
  onMakeHost?: (userId: string) => void;
  onPassMic?: (userId: string) => void;
  onMuteParticipant?: (userId: string, isMuted: boolean) => void;
  onClearHand?: (userId: string) => void;
  onRemoveParticipant?: (userId: string) => void;
};

function MicStatusIcon({
  status,
}: {
  status: ReturnType<typeof getMicStatus>;
}) {
  if (status === "speaking") {
    return <Mic className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />;
  }
  if (status === "muted") {
    return <MicOff className="h-3.5 w-3.5 text-slate-400" />;
  }
  return <Mic className="h-3.5 w-3.5 text-slate-400/80" />;
}

function LiveTalkParticipantRowComponent({
  participant: p,
  hostId,
  activeMicUserId,
  localUserId,
  isOnline,
  menuOpen,
  showHostMenu,
  canGrantRoomAdmin,
  onToggleMenu,
  onGrantRoomAdmin,
  onRemoveRoomAdmin,
  onMakeHost,
  onPassMic,
  onMuteParticipant,
  onClearHand,
  onRemoveParticipant,
}: LiveTalkParticipantRowProps) {
  const speaking = isParticipantSpeaking(p, activeMicUserId);
  const micStatus = getMicStatus(p, activeMicUserId);
  const roleLabel = getRoleLabel(p, hostId);
  const sessionRole = getSessionRoleLabel(p, activeMicUserId);

  const displayName = useMemo(
    () => (p.userId === localUserId ? "You" : p.name),
    [p.userId, p.name, localUserId],
  );

  return (
    <li
      className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors duration-200 sm:gap-3 sm:px-3 sm:py-2.5 ${
        speaking
          ? "linkup-lt-speaker-row bg-emerald-500/[0.07] ring-1 ring-emerald-500/20 dark:bg-emerald-500/10"
          : "hover:bg-slate-50/90 dark:hover:bg-white/[0.04]"
      }`}
    >
      <div className="relative shrink-0">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 transition-shadow duration-300 dark:bg-slate-700 dark:text-slate-100 sm:h-10 sm:w-10 ${
            speaking ? "linkup-lt-speaker-avatar text-white" : ""
          }`}
        >
          {participantInitials(p.name)}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
            isOnline ? "bg-emerald-500" : "bg-slate-400"
          }`}
          title={isOnline ? "Online" : "Offline"}
        />
        {p.handRaised ? (
          <span className="absolute -left-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white">
            <Hand className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {displayName}
          </p>
          <AudioWaveBars active={speaking} size="sm" />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {roleLabel ? (
            <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
              {roleLabel}
            </span>
          ) : null}
          <span className="rounded-md bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
            {sessionRole}
          </span>
          {p.away ? (
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              Reconnecting
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div
          className="flex flex-col items-end gap-0.5"
          title={micStatusLabel[micStatus]}
        >
          <MicStatusIcon status={micStatus} />
          <span
            className={`hidden text-[10px] sm:block ${
              speaking
                ? "font-medium text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {micStatusLabel[micStatus]}
          </span>
        </div>

        {showHostMenu ? (
          <div className="relative">
            <button
              type="button"
              onClick={onToggleMenu}
              className="flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 sm:min-h-[44px] sm:min-w-[44px]"
              aria-label={`Actions for ${p.name}`}
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-900">
                {canGrantRoomAdmin && !p.isTempAdmin && onGrantRoomAdmin ? (
                  <button
                    type="button"
                    className="block min-h-[44px] w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                    onClick={() => onGrantRoomAdmin(p.userId)}
                  >
                    Make Room Admin
                  </button>
                ) : null}
                {canGrantRoomAdmin && p.isTempAdmin && onRemoveRoomAdmin ? (
                  <button
                    type="button"
                    className="block min-h-[44px] w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                    onClick={() => onRemoveRoomAdmin(p.userId)}
                  >
                    Remove Room Admin
                  </button>
                ) : null}
                {onMakeHost ? (
                  <button
                    type="button"
                    className="block min-h-[44px] w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                    onClick={() => onMakeHost(p.userId)}
                  >
                    Make host
                  </button>
                ) : null}
                <button
                  type="button"
                  className="block min-h-[44px] w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                  onClick={() => onPassMic?.(p.userId)}
                >
                  Pass mic
                </button>
                <button
                  type="button"
                  className="block min-h-[44px] w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                  onClick={() =>
                    onMuteParticipant?.(p.userId, !p.isMuted)
                  }
                >
                  {p.isMuted ? "Unmute" : "Mute"}
                </button>
                {p.handRaised ? (
                  <button
                    type="button"
                    className="block min-h-[44px] w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                    onClick={() => onClearHand?.(p.userId)}
                  >
                    Clear hand
                  </button>
                ) : null}
                <button
                  type="button"
                  className="block min-h-[44px] w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                  onClick={() => onRemoveParticipant?.(p.userId)}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default memo(LiveTalkParticipantRowComponent);
