"use client";

import { useState } from "react";
import {
  LIVE_TALK_QUICK_REACTIONS,
  type LiveTalkQuickReaction,
  type QuickReactionMode,
} from "./chatInputData";

type QuickReactionPopoverProps = {
  mode: QuickReactionMode;
  onModeChange: (mode: QuickReactionMode) => void;
  onSend: (emoji: string) => void;
  onInsert: (emoji: string) => void;
};

export default function QuickReactionPopover({
  mode,
  onModeChange,
  onSend,
  onInsert,
}: QuickReactionPopoverProps) {
  const [burstId, setBurstId] = useState<string | null>(null);

  function handlePick(item: LiveTalkQuickReaction) {
    setBurstId(item.emoji);
    window.setTimeout(() => setBurstId(null), 380);
    if (mode === "send") {
      onSend(item.emoji);
    } else {
      onInsert(item.emoji);
    }
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
          Quick vibe
        </p>
        <div
          className="flex rounded-full border border-slate-200/80 bg-slate-50 p-0.5 text-[10px] font-semibold dark:border-white/10 dark:bg-white/5"
          role="group"
          aria-label="Reaction mode"
        >
          <button
            type="button"
            onClick={() => onModeChange("send")}
            className={`rounded-full px-2 py-0.5 transition ${
              mode === "send"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => onModeChange("insert")}
            className={`rounded-full px-2 py-0.5 transition ${
              mode === "insert"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Insert
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {LIVE_TALK_QUICK_REACTIONS.map((item) => (
          <button
            key={item.emoji}
            type="button"
            onClick={() => handlePick(item)}
            aria-label={
              mode === "send"
                ? `Send ${item.label}`
                : `Insert ${item.label}`
            }
            className="linkup-focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-xl transition duration-150 hover:scale-110 hover:border-brand-primary/30 hover:shadow-md hover:shadow-brand-primary/15 active:scale-95 dark:border-white/10 dark:bg-slate-800/90 sm:h-11 sm:w-11"
          >
            <span
              className={`leading-none ${
                burstId === item.emoji ? item.animation : ""
              }`}
              aria-hidden
            >
              {item.emoji}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
