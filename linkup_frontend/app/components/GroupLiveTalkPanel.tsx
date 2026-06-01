"use client";

import { Radio, Users, X } from "lucide-react";
import { LiveTalkRoom } from "@/src/lib/groupLiveTalk";
import { useGroupLiveTalk } from "@/app/hooks/useGroupLiveTalk";
import LiveTalkControls, {
  LiveTalkAudioUnlockBanner,
} from "./live-talk/LiveTalkControls";
import LiveTalkMessages from "./live-talk/LiveTalkMessages";
import LiveTalkParticipantList from "./live-talk/LiveTalkParticipantList";

type GroupLiveTalkPanelProps = {
  groupId: string;
  groupName: string;
  activeRoom: LiveTalkRoom | null;
  isMember: boolean;
  canStart?: boolean;
  canEndRoom: boolean;
  onRoomChange: (room: LiveTalkRoom | null) => void;
};

export default function GroupLiveTalkPanel({
  groupId,
  groupName,
  activeRoom,
  isMember,
  canStart = true,
  canEndRoom,
  onRoomChange,
}: GroupLiveTalkPanelProps) {
  const talk = useGroupLiveTalk({
    groupId,
    activeRoom,
    canStart,
    onRoomChange,
  });

  if (!isMember) {
    return null;
  }

  const canEnd = canEndRoom || talk.isHost;
  const showRoom = talk.inRoom && talk.room;

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-brand-primary/20 bg-gradient-to-br from-brand-primary/8 via-white to-brand-secondary/8 shadow-lg dark:border-brand-primary/25 dark:from-brand-primary/12 dark:via-slate-900/90 dark:to-brand-secondary/10">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-primary dark:text-brand-secondary">
                <Radio className="h-4 w-4" />
                Live Talk
              </p>
              <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
                Live Talk uses your microphone while you are in the room. Audio
                is not recorded or stored.
              </p>
            </div>
            {talk.room ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            ) : (
              <span className="rounded-full bg-slate-200/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-400">
                No active room
              </span>
            )}
          </div>

          {talk.error ? (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {talk.error}
            </p>
          ) : null}
          {talk.info && !talk.error ? (
            <p className="mt-4 rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
              {talk.info}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!talk.room ? (
              talk.canStart ? (
                <button
                  type="button"
                  disabled={talk.loading || !talk.isConnected}
                  onClick={() => void talk.start()}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 disabled:opacity-50"
                >
                  {talk.loading ? "Starting…" : "Start Live Talk"}
                </button>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Only the hub host or moderators can start a voice room.
                </p>
              )
            ) : !talk.inRoom ? (
              <>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Live in {groupName} ·{" "}
                  <span className="font-medium">{talk.participantCount}</span>{" "}
                  in room
                </p>
                <button
                  type="button"
                  disabled={talk.loading || !talk.isConnected}
                  onClick={() => void talk.join()}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
                >
                  {talk.loading ? "Joining…" : "Join Live Talk"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void talk.join()}
                className="inline-flex min-h-11 items-center rounded-full border border-brand-primary/30 px-4 py-2 text-sm font-medium text-brand-primary dark:text-brand-secondary"
              >
                Reconnect audio
              </button>
            )}
          </div>

          {talk.room && !talk.inRoom ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Host: {talk.room.host.name} (@{talk.room.host.username})
            </p>
          ) : null}
        </div>
      </section>

      {showRoom && talk.room ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-100 text-slate-900 dark:bg-gradient-to-b dark:from-slate-950 dark:via-[#0a0f1f] dark:to-slate-950 dark:text-white"
          role="dialog"
          aria-label="Live Talk room"
        >
          <header className="safe-area-top flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:px-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-primary dark:text-brand-secondary">
                  Live Talk
                </span>
              </div>
              <h2 className="truncate text-base font-semibold sm:text-lg">
                {groupName}
              </h2>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Host {talk.room.host.name} · {talk.participantCount} in room
              </p>
              {talk.holdingMic ? (
                <p className="mt-0.5 text-xs font-medium text-brand-primary dark:text-brand-secondary">
                  You are speaking
                </p>
              ) : talk.micBusy && talk.micHolderName ? (
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  Speaking now: {talk.micHolderName}
                </p>
              ) : talk.micAvailable ? (
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  Mic is available
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-slate-200/80 px-2.5 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300 sm:inline-flex">
                <Users className="h-3.5 w-3.5" />
                {talk.participantCount}
              </span>
              <button
                type="button"
                onClick={() => void talk.leave()}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-200 text-slate-600 dark:border-white/15 dark:text-slate-300"
                aria-label="Leave room"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {talk.needsAudioUnlock ? (
            <LiveTalkAudioUnlockBanner onUnlock={() => void talk.unlockAudio()} />
          ) : null}

          <div className="lg:hidden">
            <LiveTalkParticipantList
              participants={talk.participants}
              hostId={talk.room.hostId}
              activeMicUserId={talk.activeMicUserId}
              localUserId={talk.localUserId}
              isUserOnline={talk.isUserOnline}
              compact
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col border-slate-200/80 dark:border-white/10 lg:border-r">
              <LiveTalkMessages
                messages={talk.messages}
                localUserId={talk.localUserId}
              />
            </div>
            <div className="hidden min-h-0 lg:flex">
              <LiveTalkParticipantList
                participants={talk.participants}
                hostId={talk.room.hostId}
                activeMicUserId={talk.activeMicUserId}
                localUserId={talk.localUserId}
                isUserOnline={talk.isUserOnline}
              />
            </div>
          </div>

          <LiveTalkControls
            muted={talk.muted}
            handRaised={talk.handRaised}
            holdingMic={talk.holdingMic}
            micBusy={talk.micBusy}
            micAvailable={talk.micAvailable}
            micHolderName={talk.micHolderName}
            loading={talk.loading}
            canEnd={canEnd}
            messageDraft={talk.messageDraft}
            onMessageDraftChange={talk.setMessageDraft}
            onOpenMic={() => void talk.openMic()}
            onReleaseMic={() => void talk.releaseMic()}
            onToggleMute={() => void talk.toggleMute()}
            onToggleHand={() => void talk.toggleHand()}
            onLeave={() => void talk.leave()}
            onEnd={() => void talk.end()}
            onSendMessage={() => void talk.sendMessage()}
          />
        </div>
      ) : null}
    </>
  );
}
