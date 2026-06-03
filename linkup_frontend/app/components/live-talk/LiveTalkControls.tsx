"use client";

import {
  Hand,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  ActionButton,
  IconButton,
} from "@/app/components/buttons/LinkupButtons";

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

function statusLine(
  holdingMic: boolean,
  micBusy: boolean,
  micAvailable: boolean,
  micHolderName: string | null,
): string | null {
  if (holdingMic) {
    return "You are speaking";
  }
  if (micBusy && micHolderName) {
    return `${micHolderName} has the mic`;
  }
  if (micAvailable) {
    return "Mic available";
  }
  return null;
}

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
  const status = statusLine(
    holdingMic,
    micBusy,
    micAvailable,
    micHolderName,
  );

  return (
    <footer
      className="shrink-0 border-t border-slate-200/70 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {status ? (
        <p
          className={`truncate px-3 py-1.5 text-center text-[11px] font-medium ${
            micAvailable && !holdingMic && !micBusy
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-slate-600 dark:text-slate-300"
          }`}
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}

      <div className="flex items-center gap-2 px-3 py-2">
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
          aria-label="Room message"
          className="min-h-11 min-w-0 flex-1 rounded-full border border-slate-200/80 bg-slate-50 px-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 sm:text-sm"
          maxLength={2000}
        />
        <IconButton
          icon={Send}
          variant="primary"
          size="sm"
          onClick={onSendMessage}
          disabled={!messageDraft.trim() || loading}
          aria-label="Send message"
          title="Send"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 px-3 pb-3">
        {holdingMic ? (
          <>
            <ActionButton
              icon={MicOff}
              variant="primary"
              compact
              rounded="full"
              disabled={loading}
              onClick={onReleaseMic}
              aria-label="Release microphone"
              title="Release mic"
            >
              Release
            </ActionButton>
            <ActionButton
              icon={muted ? VolumeX : Mic}
              variant={muted ? "danger" : "secondary"}
              compact
              rounded="full"
              onClick={onToggleMute}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? "Unmute" : "Mute"}
            </ActionButton>
            <ActionButton
              icon={PhoneOff}
              variant="danger"
              compact
              rounded="full"
              disabled={loading}
              onClick={onLeave}
              aria-label="Leave room"
              title="Leave"
            >
              Leave
            </ActionButton>
            {canEnd ? (
              <ActionButton
                icon={Square}
                variant="secondary"
                compact
                rounded="full"
                disabled={loading}
                onClick={onEnd}
                aria-label="End Live Talk"
                title="End room"
              >
                End
              </ActionButton>
            ) : null}
          </>
        ) : micBusy ? (
          <>
            <ActionButton
              icon={Hand}
              variant={handRaised ? "hand" : "handIdle"}
              compact
              rounded="full"
              disabled={loading}
              onClick={onToggleHand}
              aria-label={handRaised ? "Lower hand" : "Raise hand"}
              title={handRaised ? "Lower hand" : "Raise hand"}
            >
              {handRaised ? "Lower" : "Raise"}
            </ActionButton>
            <ActionButton
              icon={PhoneOff}
              variant="danger"
              compact
              rounded="full"
              disabled={loading}
              onClick={onLeave}
              aria-label="Leave room"
              title="Leave"
            >
              Leave
            </ActionButton>
            {canEnd ? (
              <ActionButton
                icon={Square}
                variant="secondary"
                compact
                rounded="full"
                disabled={loading}
                onClick={onEnd}
                aria-label="End Live Talk"
                title="End room"
              >
                End
              </ActionButton>
            ) : null}
          </>
        ) : (
          <>
            <ActionButton
              icon={Mic}
              variant="primary"
              compact
              rounded="full"
              disabled={loading}
              onClick={onOpenMic}
              aria-label="Open microphone"
              title="Open mic"
            >
              Open Mic
            </ActionButton>
            <ActionButton
              icon={Hand}
              variant={handRaised ? "hand" : "handIdle"}
              compact
              rounded="full"
              onClick={onToggleHand}
              aria-label={handRaised ? "Lower hand" : "Raise hand"}
              title={handRaised ? "Lower hand" : "Raise hand"}
            >
              {handRaised ? "Lower" : "Raise"}
            </ActionButton>
            <ActionButton
              icon={PhoneOff}
              variant="danger"
              compact
              rounded="full"
              disabled={loading}
              onClick={onLeave}
              aria-label="Leave room"
              title="Leave"
            >
              Leave
            </ActionButton>
            {canEnd ? (
              <ActionButton
                icon={Square}
                variant="secondary"
                compact
                rounded="full"
                disabled={loading}
                onClick={onEnd}
                aria-label="End Live Talk"
                title="End room"
              >
                End
              </ActionButton>
            ) : null}
          </>
        )}
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
      aria-label="Tap to enable audio"
      className="mx-3 mb-1 inline-flex min-h-[44px] w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-2xl bg-brand-primary/10 px-4 text-sm font-medium text-brand-primary transition duration-150 hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 dark:text-brand-secondary"
    >
      <Volume2 className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">Tap to enable audio</span>
    </button>
  );
}
