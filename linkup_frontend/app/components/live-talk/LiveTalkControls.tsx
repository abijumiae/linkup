"use client";

import {
  Hand,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Send,
  Square,
  Volume2,
} from "lucide-react";

type LiveTalkControlsProps = {
  muted: boolean;
  handRaised: boolean;
  pushToTalk: boolean;
  loading: boolean;
  canEnd: boolean;
  messageDraft: string;
  onMessageDraftChange: (value: string) => void;
  onToggleMute: () => void;
  onToggleHand: () => void;
  onPushToTalkStart: () => void;
  onPushToTalkEnd: () => void;
  onLeave: () => void;
  onEnd: () => void;
  onSendMessage: () => void;
};

export default function LiveTalkControls({
  muted,
  handRaised,
  pushToTalk,
  loading,
  canEnd,
  messageDraft,
  onMessageDraftChange,
  onToggleMute,
  onToggleHand,
  onPushToTalkStart,
  onPushToTalkEnd,
  onLeave,
  onEnd,
  onSendMessage,
}: LiveTalkControlsProps) {
  return (
    <footer className="safe-area-bottom shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
      <div className="flex items-center gap-2 border-b border-slate-200/60 px-3 py-2 dark:border-white/10 sm:px-4">
        <input
          type="text"
          value={messageDraft}
          onChange={(e) => onMessageDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          placeholder="Message the room…"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
          maxLength={2000}
        />
        <button
          type="button"
          onClick={onSendMessage}
          disabled={!messageDraft.trim() || loading}
          aria-label="Send message"
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          className={`flex h-12 w-12 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition ${
            muted
              ? "bg-red-500/90 text-white"
              : "bg-slate-200 text-slate-800 dark:bg-white/15 dark:text-white"
          }`}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onPointerDown={onPushToTalkStart}
          onPointerUp={onPushToTalkEnd}
          onPointerLeave={onPushToTalkEnd}
          onPointerCancel={onPushToTalkEnd}
          aria-label="Hold to talk"
          className={`flex h-12 min-h-[44px] min-w-[5.5rem] items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold transition sm:min-w-[7rem] sm:text-sm ${
            pushToTalk
              ? "bg-emerald-500 text-white"
              : "border border-brand-primary/30 bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
          }`}
        >
          <Radio className="h-4 w-4" />
          {pushToTalk ? "Talking…" : "Hold"}
        </button>

        <button
          type="button"
          onClick={onToggleHand}
          aria-label={handRaised ? "Lower hand" : "Raise hand"}
          className={`flex h-12 w-12 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition ${
            handRaised
              ? "bg-amber-500/90 text-white"
              : "bg-slate-200 text-slate-800 dark:bg-white/15 dark:text-white"
          }`}
        >
          <Hand className="h-5 w-5" />
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={onLeave}
          className="flex h-12 min-h-[44px] items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white"
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </button>

        {canEnd ? (
          <button
            type="button"
            disabled={loading}
            onClick={onEnd}
            className="flex h-12 min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-slate-300 px-4 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-white/20 dark:text-slate-200"
          >
            <Square className="h-3.5 w-3.5" />
            End
          </button>
        ) : null}
      </div>
    </footer>
  );
}

export function LiveTalkAudioUnlockBanner({
  onUnlock,
}: {
  onUnlock: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onUnlock}
      className="mx-3 mb-2 flex min-h-11 w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-4 text-sm font-medium text-brand-primary dark:text-brand-secondary"
    >
      <Volume2 className="h-4 w-4" />
      Tap to enable audio
    </button>
  );
}
