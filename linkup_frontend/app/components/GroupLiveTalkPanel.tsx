"use client";

import { useState } from "react";
import { Mic, Radio, Shield, Users, X } from "lucide-react";
import LiveTalkHostPanel from "./live-talk/LiveTalkHostPanel";
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
  canHostControls?: boolean;
  onRoomChange: (room: LiveTalkRoom | null) => void;
};

export default function GroupLiveTalkPanel({
  groupId,
  groupName,
  activeRoom,
  isMember,
  canStart = true,
  canEndRoom,
  canHostControls = false,
  onRoomChange,
}: GroupLiveTalkPanelProps) {
  const talk = useGroupLiveTalk({
    groupId,
    activeRoom,
    canStart,
    canHostControls,
    onRoomChange,
  });

  if (!isMember) {
    return null;
  }

  const canEnd = canEndRoom || talk.isHost;
  const showHostControls = talk.canHostControls;
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const showRoom = talk.inRoom && talk.room;

  function handleConfirmEnd() {
    setEndConfirmOpen(false);
    void talk.end();
  }

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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!talk.room ? (
              talk.canStart ? (
                <button
                  type="button"
                  disabled={talk.loading || !talk.isConnected}
                  onClick={() => void talk.start()}
                  aria-label="Start Live Talk"
                  title="Start Live Talk"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 disabled:opacity-50"
                >
                  <Radio className="h-5 w-5" />
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
                  aria-label="Join Live Talk"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
                >
                  <Radio className="h-5 w-5" />
                  {talk.loading ? "Joining…" : "Join"}
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
          className="fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-gradient-to-b dark:from-slate-950 dark:via-[#0a0f1f] dark:to-slate-950 dark:text-white"
          role="dialog"
          aria-label="Live Talk room"
        >
          <header
            className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/70 bg-white/90 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:gap-3 sm:px-4 sm:py-2.5"
            style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
                <h2 className="truncate text-sm font-semibold sm:text-base">
                  {groupName}
                </h2>
              </div>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {talk.room.host.name} · {talk.participantCount} in room
                {talk.holdingMic
                  ? " · You are speaking"
                  : talk.micBusy && talk.micHolderName
                    ? ` · ${talk.micHolderName} speaking`
                    : talk.micAvailable
                      ? " · Mic available"
                      : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {showHostControls ? (
                <button
                  type="button"
                  onClick={() => talk.setHostPanelOpen(true)}
                  aria-label="Open host controls"
                  title="Host controls"
                  className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary lg:hidden dark:text-brand-secondary"
                >
                  <Shield className="h-5 w-5" />
                </button>
              ) : null}
              <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300 sm:inline-flex">
                <Users className="h-3.5 w-3.5" />
                {talk.participantCount}
              </span>
              <button
                type="button"
                onClick={() => void talk.leave()}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                aria-label="Leave room"
                title="Leave"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {talk.needsAudioUnlock ? (
            <LiveTalkAudioUnlockBanner onUnlock={() => void talk.unlockAudio()} />
          ) : talk.inRoom &&
            talk.audioStatus === "connecting" &&
            !talk.holdingMic ? (
            <p
              className="mx-3 mt-1.5 text-center text-xs font-medium text-brand-primary dark:text-brand-secondary"
              aria-live="polite"
            >
              Connecting audio…
            </p>
          ) : talk.inRoom && talk.audioStatus === "connected" && !talk.holdingMic ? (
            <p className="mx-3 mt-1 text-center text-[11px] text-emerald-700 dark:text-emerald-300">
              Listening
            </p>
          ) : null}

          {talk.micPassedPrompt ? (
            <div className="mx-3 mt-1.5 flex items-center gap-2 rounded-xl bg-brand-primary/10 px-3 py-2 dark:bg-brand-primary/15">
              <p className="min-w-0 flex-1 text-xs text-slate-800 dark:text-slate-200">
                Host passed the mic to you
              </p>
              <button
                type="button"
                disabled={talk.loading}
                onClick={() => void talk.acceptPassedMic()}
                aria-label="Open microphone"
                title="Open mic"
                className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => talk.setMicPassedPrompt(false)}
                aria-label="Decline microphone"
                title="Not now"
                className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {talk.error ? (
            <p className="mx-3 mt-1.5 truncate rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-700 dark:text-red-200">
              {talk.error}
            </p>
          ) : null}

          <div className="shrink-0 lg:hidden">
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
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:border-r lg:border-slate-200/60 dark:lg:border-white/10">
              <LiveTalkMessages
                messages={talk.messages}
                localUserId={talk.localUserId}
              />
            </div>
            <div className="hidden min-h-0 w-full max-w-xs flex-col overflow-hidden lg:flex xl:max-w-sm">
              {showHostControls ? (
                <LiveTalkHostPanel
                  room={talk.room}
                  loading={talk.loading}
                  micHolderName={talk.micHolderName}
                  onForceRelease={() => void talk.forceReleaseMic()}
                  onEndRoom={() => setEndConfirmOpen(true)}
                  onPassMic={(userId) => void talk.passMicTo(userId)}
                  onClearHand={(userId) => void talk.clearParticipantHand(userId)}
                  onMuteParticipant={(userId, isMuted) =>
                    void talk.muteParticipant(userId, isMuted)
                  }
                  onRemoveParticipant={(userId) =>
                    void talk.removeParticipant(userId)
                  }
                />
              ) : null}
              <LiveTalkParticipantList
                participants={talk.participants}
                hostId={talk.room.hostId}
                activeMicUserId={talk.activeMicUserId}
                localUserId={talk.localUserId}
                isUserOnline={talk.isUserOnline}
                canHostControls={showHostControls}
                onMakeHost={(userId) => void talk.transferHostTo(userId)}
                onPassMic={(userId) => void talk.passMicTo(userId)}
                onMuteParticipant={(userId, isMuted) =>
                  void talk.muteParticipant(userId, isMuted)
                }
                onRemoveParticipant={(userId) =>
                  void talk.removeParticipant(userId)
                }
                onClearHand={(userId) => void talk.clearParticipantHand(userId)}
              />
            </div>
          </div>

          {showHostControls && talk.hostPanelOpen ? (
            <div className="fixed inset-0 z-[60] lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label="Close host controls"
                onClick={() => talk.setHostPanelOpen(false)}
              />
              <div
                className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-slate-950"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              >
                <div className="sticky top-0 flex items-center justify-between bg-white px-3 py-2 dark:bg-slate-950">
                  <h3 className="text-sm font-semibold">Host controls</h3>
                  <button
                    type="button"
                    onClick={() => talk.setHostPanelOpen(false)}
                    aria-label="Close host controls"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <LiveTalkHostPanel
                  room={talk.room}
                  loading={talk.loading}
                  micHolderName={talk.micHolderName}
                  compact
                  onForceRelease={() => void talk.forceReleaseMic()}
                  onEndRoom={() => setEndConfirmOpen(true)}
                  onPassMic={(userId) => void talk.passMicTo(userId)}
                  onClearHand={(userId) => void talk.clearParticipantHand(userId)}
                  onMuteParticipant={(userId, isMuted) =>
                    void talk.muteParticipant(userId, isMuted)
                  }
                  onRemoveParticipant={(userId) =>
                    void talk.removeParticipant(userId)
                  }
                />
              </div>
            </div>
          ) : null}

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
            onEnd={() => setEndConfirmOpen(true)}
            onSendMessage={() => void talk.sendMessage()}
            onSendQuickReaction={(emoji) => void talk.sendQuickReaction(emoji)}
          />
        </div>
      ) : null}

      {endConfirmOpen && showRoom ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-label="Confirm end Live Talk"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              End Live Talk
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              End Live Talk for everyone? This cannot be undone.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                disabled={talk.loading}
                onClick={handleConfirmEnd}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-red-600 px-4 text-sm font-semibold text-white"
              >
                End Live Talk
              </button>
              <button
                type="button"
                onClick={() => setEndConfirmOpen(false)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
