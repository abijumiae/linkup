"use client";

import { useCallback, useEffect, useRef } from "react";
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
import ChatInputActions from "./chat-input/ChatInputActions";
import { resizeTextarea } from "./chat-input/chatInputUtils";

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
  onSendQuickReaction: (emoji: string) => void;
};

const actionBtnBase =
  "flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-45";

const actionBtnGhost =
  "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100";

const actionBtnPrimary =
  "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md shadow-brand-primary/20";

const actionBtnDanger = "bg-red-600/90 text-white";

const actionBtnHandActive = "bg-amber-500/90 text-white";

const actionBtnHandIdle =
  "bg-slate-100 text-brand-primary dark:bg-white/10 dark:text-brand-secondary";

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
  onSendQuickReaction,
}: LiveTalkControlsProps) {
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const status = statusLine(
    holdingMic,
    micBusy,
    micAvailable,
    micHolderName,
  );

  const syncTextareaHeight = useCallback(() => {
    resizeTextarea(messageInputRef.current);
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [messageDraft, syncTextareaHeight]);

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

      <div className="flex items-end gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-2xl border border-slate-200/80 bg-slate-50 py-1 pl-1 pr-2 focus-within:border-brand-primary/40 focus-within:ring-2 focus-within:ring-brand-primary/15 dark:border-white/10 dark:bg-white/5 dark:focus-within:ring-brand-primary/20">
          <ChatInputActions
            draft={messageDraft}
            onDraftChange={onMessageDraftChange}
            inputRef={messageInputRef}
            onSendQuickReaction={onSendQuickReaction}
            disabled={loading}
          />
          <textarea
            ref={messageInputRef}
            rows={1}
            value={messageDraft}
            onChange={(e) => {
              onMessageDraftChange(e.target.value);
              resizeTextarea(e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            placeholder="Message the room…"
            aria-label="Room message"
            className="max-h-[7.5rem] min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-base leading-snug text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 sm:text-sm"
            maxLength={2000}
          />
        </div>
        <button
          type="button"
          onClick={onSendMessage}
          disabled={!messageDraft.trim() || loading}
          aria-label="Send message"
          className={`${actionBtnBase} ${actionBtnPrimary} mb-0.5 h-9 w-9 min-h-[36px] min-w-[36px] sm:mb-0`}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 px-3 pb-3">
        {holdingMic ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={onReleaseMic}
              aria-label="Release microphone"
              title="Release mic"
              className={`${actionBtnBase} ${actionBtnPrimary} sm:order-1`}
            >
              <MicOff className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              title={muted ? "Unmute" : "Mute"}
              className={`${actionBtnBase} ${
                muted ? actionBtnDanger : actionBtnGhost
              } sm:order-2`}
            >
              {muted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onLeave}
              aria-label="Leave room"
              title="Leave"
              className={`${actionBtnBase} ${actionBtnDanger} sm:order-3`}
            >
              <PhoneOff className="h-5 w-5" />
            </button>
            {canEnd ? (
              <button
                type="button"
                disabled={loading}
                onClick={onEnd}
                aria-label="End Live Talk for everyone"
                title="End Live Talk"
                className={`${actionBtnBase} ${actionBtnGhost} sm:order-4`}
              >
                <Square className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : micBusy ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={onToggleHand}
              aria-label={handRaised ? "Lower hand" : "Raise hand"}
              title={handRaised ? "Lower hand" : "Raise hand"}
              className={`${actionBtnBase} ${
                handRaised ? actionBtnHandActive : actionBtnHandIdle
              }`}
            >
              <Hand className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onLeave}
              aria-label="Leave room"
              title="Leave"
              className={`${actionBtnBase} ${actionBtnDanger}`}
            >
              <PhoneOff className="h-5 w-5" />
            </button>
            {canEnd ? (
              <button
                type="button"
                disabled={loading}
                onClick={onEnd}
                aria-label="End Live Talk for everyone"
                title="End Live Talk"
                className={`${actionBtnBase} ${actionBtnGhost}`}
              >
                <Square className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={onOpenMic}
              aria-label="Open microphone"
              title="Open mic"
              className={`${actionBtnBase} ${actionBtnPrimary}`}
            >
              <Radio className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onToggleHand}
              aria-label={handRaised ? "Lower hand" : "Raise hand"}
              title={handRaised ? "Lower hand" : "Raise hand"}
              className={`${actionBtnBase} ${
                handRaised ? actionBtnHandActive : actionBtnGhost
              }`}
            >
              <Hand className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onLeave}
              aria-label="Leave room"
              title="Leave"
              className={`${actionBtnBase} ${actionBtnDanger}`}
            >
              <PhoneOff className="h-5 w-5" />
            </button>
            {canEnd ? (
              <button
                type="button"
                disabled={loading}
                onClick={onEnd}
                aria-label="End Live Talk for everyone"
                title="End Live Talk"
                className={`${actionBtnBase} ${actionBtnGhost}`}
              >
                <Square className="h-4 w-4" />
              </button>
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
      className="mx-3 mb-1 flex min-h-10 w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-full bg-brand-primary/10 px-4 text-sm font-medium text-brand-primary dark:text-brand-secondary"
    >
      <Volume2 className="h-4 w-4 shrink-0" />
      <span className="truncate">Tap to enable audio</span>
    </button>
  );
}
