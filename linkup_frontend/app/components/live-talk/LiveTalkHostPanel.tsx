"use client";

import { MicOff, Shield, Square, UserMinus } from "lucide-react";
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
      className={`flex flex-col gap-3 ${compact ? "p-4" : "border-b border-slate-200/80 p-3 dark:border-white/10 lg:border-b-0 lg:border-l"}`}
    >
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Host Controls
        </h3>
      </div>

      <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-3 dark:border-brand-secondary/25 dark:bg-brand-primary/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
          Active speaker
        </p>
        <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
          {micHolderName ?? "Mic is available"}
        </p>
        {room.activeMicUserId ? (
          <button
            type="button"
            disabled={loading}
            onClick={onForceRelease}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 dark:border-white/15 dark:bg-brand-dark/80 dark:text-slate-100"
          >
            <MicOff className="h-4 w-4" />
            Force release mic
          </button>
        ) : null}
      </div>

      <LiveTalkMicQueue
        raisedHands={raisedHands}
        loading={loading}
        canHost
        onPassMic={onPassMic}
        onClearHand={onClearHand}
      />

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 dark:border-white/10 dark:bg-brand-dark/50">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Quick actions
        </p>
        <div className="flex flex-col gap-2">
          {room.participants
            .filter((p) => p.userId !== room.hostId)
            .slice(0, compact ? 4 : 8)
            .map((p) => (
              <div
                key={p.userId}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-2 py-2 dark:bg-white/5"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                  {p.user.name}
                </span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onMuteParticipant(p.userId, !p.isMuted)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 px-3 text-[11px] font-semibold dark:border-white/10"
                >
                  {p.isMuted ? "Unmute" : "Mute"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onRemoveParticipant(p.userId)}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-red-600/90 text-white"
                  aria-label={`Remove ${p.user.name}`}
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
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white"
      >
        <Square className="h-4 w-4" />
        End Live Talk
      </button>
    </div>
  );
}
