"use client";

import { MicOff, Shield, Square, UserMinus, VolumeX, Volume2 } from "lucide-react";
import { LiveTalkRoom } from "@/src/lib/groupLiveTalk";
import LiveTalkMicQueue from "./LiveTalkMicQueue";

type LiveTalkHostPanelProps = {
  room: LiveTalkRoom;
  loading: boolean;
  micHolderName: string | null;
  onForceRelease: () => void;
  onEndRoom: () => void;
  onPassMic: (userId: string) => void;
  onClearHand: (userId: string) => void;
  onMuteParticipant: (userId: string, isMuted: boolean) => void;
  onRemoveParticipant: (userId: string) => void;
  compact?: boolean;
};

const hostBtn =
  "inline-flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95 disabled:opacity-45 dark:bg-white/10 dark:text-slate-100";

export default function LiveTalkHostPanel({
  room,
  loading,
  micHolderName,
  onForceRelease,
  onEndRoom,
  onPassMic,
  onClearHand,
  onMuteParticipant,
  onRemoveParticipant,
  compact = false,
}: LiveTalkHostPanelProps) {
  const raisedHands = room.raisedHands ?? [];

  return (
    <div
      className={`flex flex-col gap-2 ${compact ? "p-3" : "border-b border-slate-200/60 p-3 dark:border-white/10 lg:border-b-0 lg:border-l"}`}
    >
      {!compact ? (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Host
          </h3>
        </div>
      ) : null}

      <div className="rounded-xl bg-brand-primary/5 px-3 py-2 dark:bg-brand-primary/10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
              Active speaker
            </p>
            <p className="truncate text-sm text-slate-800 dark:text-slate-200">
              {micHolderName ?? "Mic available"}
            </p>
          </div>
          {room.activeMicUserId ? (
            <button
              type="button"
              disabled={loading}
              onClick={onForceRelease}
              aria-label="Force release microphone"
              title="Force release mic"
              className={hostBtn}
            >
              <MicOff className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <LiveTalkMicQueue
        raisedHands={raisedHands}
        loading={loading}
        canHost
        onPassMic={onPassMic}
        onClearHand={onClearHand}
      />

      <div className="rounded-xl bg-slate-50/80 px-2 py-2 dark:bg-white/[0.03]">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Participants
        </p>
        <div className="flex flex-col gap-1">
          {room.participants
            .filter((p) => p.userId !== room.hostId)
            .slice(0, compact ? 4 : 8)
            .map((p) => (
              <div
                key={p.userId}
                className="flex items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1.5 dark:bg-white/5"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                  {p.user.name}
                </span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onMuteParticipant(p.userId, !p.isMuted)}
                  aria-label={p.isMuted ? `Unmute ${p.user.name}` : `Mute ${p.user.name}`}
                  title={p.isMuted ? "Unmute" : "Mute"}
                  className={hostBtn}
                >
                  {p.isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onRemoveParticipant(p.userId)}
                  className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-red-600/90 text-white"
                  aria-label={`Remove ${p.user.name}`}
                  title="Remove"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </div>
            ))}
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onEndRoom}
        aria-label="End Live Talk"
        title="End Live Talk"
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-red-600/90 px-4 text-sm font-semibold text-white"
      >
        <Square className="h-4 w-4" />
        End Live Talk
      </button>
    </div>
  );
}
