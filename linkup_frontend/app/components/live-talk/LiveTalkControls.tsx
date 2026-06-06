"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  Hand,
  LogOut,
  Mic,
  MicOff,
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

type ControlActionProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger" | "amber";
  icon: ReactNode;
  ariaLabel: string;
};

function ControlAction({
  label,
  onClick,
  disabled,
  variant = "ghost",
  icon,
  ariaLabel,
}: ControlActionProps) {
  const variantClass =
    variant === "primary"
      ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-sm"
      : variant === "danger"
        ? "bg-red-600/90 text-white"
        : variant === "amber"
          ? "bg-amber-500 text-white"
          : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex min-w-[3.5rem] flex-col items-center gap-1 disabled:opacity-45"
    >
      <span
        className={`flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition active:scale-95 ${variantClass}`}
      >
        {icon}
      </span>
      <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium text-slate-600 dark:text-slate-400">
        {label}
      </span>
    </button>
  );
}

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
    return "Tap Open Mic to speak";
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
      className="shrink-0 border-t border-slate-200/60 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {status ? (
        <p
          className="truncate px-3 py-1 text-center text-[11px] text-slate-500 dark:text-slate-400"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}

      <div className="flex items-end gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-2xl border border-slate-200/70 bg-slate-50/80 py-1 pl-0.5 pr-1.5 focus-within:border-brand-primary/35 dark:border-white/10 dark:bg-white/[0.04]">
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
            placeholder="Message…"
            aria-label="Room message"
            className="max-h-[6rem] min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm leading-snug text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
            maxLength={2000}
          />
        </div>
        <button
          type="button"
          onClick={onSendMessage}
          disabled={!messageDraft.trim() || loading}
          aria-label="Send message"
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-sm disabled:opacity-45"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-start justify-around gap-1 px-2 pb-3 pt-0.5">
        {holdingMic ? (
          <>
            <ControlAction
              label="Release"
              ariaLabel="Release microphone"
              variant="primary"
              disabled={loading}
              onClick={onReleaseMic}
              icon={<MicOff className="h-5 w-5" />}
            />
            <ControlAction
              label={muted ? "Unmute" : "Mute"}
              ariaLabel={muted ? "Unmute" : "Mute"}
              variant={muted ? "danger" : "ghost"}
              onClick={onToggleMute}
              icon={
                muted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )
              }
            />
            <ControlAction
              label="Leave"
              ariaLabel="Leave room"
              variant="danger"
              disabled={loading}
              onClick={onLeave}
              icon={<LogOut className="h-5 w-5" />}
            />
            {canEnd ? (
              <ControlAction
                label="End"
                ariaLabel="End Live Talk"
                variant="ghost"
                disabled={loading}
                onClick={onEnd}
                icon={<Square className="h-4 w-4" />}
              />
            ) : null}
          </>
        ) : micBusy ? (
          <>
            <ControlAction
              label={handRaised ? "Lower" : "Hand"}
              ariaLabel={handRaised ? "Lower hand" : "Raise hand"}
              variant={handRaised ? "amber" : "ghost"}
              disabled={loading}
              onClick={onToggleHand}
              icon={<Hand className="h-5 w-5" />}
            />
            <ControlAction
              label="Leave"
              ariaLabel="Leave room"
              variant="danger"
              disabled={loading}
              onClick={onLeave}
              icon={<LogOut className="h-5 w-5" />}
            />
            {canEnd ? (
              <ControlAction
                label="End"
                ariaLabel="End Live Talk"
                variant="ghost"
                disabled={loading}
                onClick={onEnd}
                icon={<Square className="h-4 w-4" />}
              />
            ) : null}
          </>
        ) : (
          <>
            <ControlAction
              label="Open Mic"
              ariaLabel="Open microphone"
              variant="primary"
              disabled={loading}
              onClick={onOpenMic}
              icon={<Radio className="h-5 w-5" />}
            />
            <ControlAction
              label={handRaised ? "Lower" : "Hand"}
              ariaLabel={handRaised ? "Lower hand" : "Raise hand"}
              variant={handRaised ? "amber" : "ghost"}
              onClick={onToggleHand}
              icon={<Hand className="h-5 w-5" />}
            />
            <ControlAction
              label="Leave"
              ariaLabel="Leave room"
              variant="danger"
              disabled={loading}
              onClick={onLeave}
              icon={<LogOut className="h-5 w-5" />}
            />
            {canEnd ? (
              <ControlAction
                label="End"
                ariaLabel="End Live Talk for everyone"
                variant="ghost"
                disabled={loading}
                onClick={onEnd}
                icon={<Square className="h-4 w-4" />}
              />
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
      className="mx-3 mb-1 flex min-h-10 items-center justify-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/5 px-4 text-sm font-medium text-brand-primary dark:text-brand-secondary"
    >
      <Volume2 className="h-4 w-4 shrink-0" />
      <span className="truncate">Tap to enable audio</span>
    </button>
  );
}
