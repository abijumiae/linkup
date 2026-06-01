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
  holdingMic: boolean;
  micBusy: boolean;
  micAvailable: boolean;
  micHolderName: string | null;
  loading: boolean;
  canEnd: boolean;
  messageDraft: string;
  onMessageDraftChange: (value: string) => void;
  onOpenMic: () => void;
  onReleaseMic: () => void;
  onToggleMute: () => void;
  onToggleHand: () => void;
  onLeave: () => void;
  onEnd: () => void;
  onSendMessage: () => void;
};

export default function LiveTalkControls({
  muted,
  handRaised,
  holdingMic,
  micBusy,
  micAvailable,
  micHolderName,
  loading,
  canEnd,
  messageDraft,
  onMessageDraftChange,
  onOpenMic,
  onReleaseMic,
  onToggleMute,
  onToggleHand,
  onLeave,
  onEnd,
  onSendMessage,
}: LiveTalkControlsProps) {
  return (
    <footer className="safe-area-bottom shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
      <p className="border-b border-slate-200/60 px-3 py-2 text-center text-[11px] leading-relaxed text-slate-500 dark:border-white/10 dark:text-slate-400 sm:px-4">
        Your microphone is used only while you hold the mic or join Live Talk.
        Live audio is not recorded.
      </p>

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

      {micBusy && micHolderName ? (
        <p className="px-3 pt-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300 sm:px-4">
          Mic in use by{" "}
          <span className="text-brand-primary dark:text-brand-secondary">
            {micHolderName}
          </span>
        </p>
      ) : micAvailable ? (
        <p className="px-3 pt-2 text-center text-xs text-emerald-700 dark:text-emerald-300 sm:px-4">
          Mic is available
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        {holdingMic ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={onReleaseMic}
              className="flex h-12 min-h-[44px] min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 disabled:opacity-50 sm:flex-none sm:min-w-[10rem]"
            >
              <MicOff className="h-5 w-5" />
              Release Mic
            </button>
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
              {muted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          </>
        ) : micBusy ? (
          <button
            type="button"
            disabled={loading}
            onClick={onToggleHand}
            aria-label={handRaised ? "Lower hand" : "Raise hand"}
            className={`flex h-12 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold sm:flex-none sm:min-w-[9rem] ${
              handRaised
                ? "bg-amber-500/90 text-white"
                : "border border-brand-primary/30 bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
            }`}
          >
            <Hand className="h-5 w-5" />
            {handRaised ? "Lower Hand" : "Raise Hand"}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={onOpenMic}
            className="flex h-12 min-h-[44px] min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 disabled:opacity-50 sm:flex-none sm:min-w-[10rem]"
          >
            <Radio className="h-5 w-5" />
            Open Mic
          </button>
        )}

        {!holdingMic && !micBusy ? (
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
        ) : null}

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
