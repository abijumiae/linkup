"use client";

import { useState } from "react";
import {
  LIVE_TALK_QUICK_REACTIONS,
  type LiveTalkQuickReaction,
} from "./chatInputData";

type QuickReactionPopoverProps = {
  onReact: (emoji: string) => void;
};

export default function QuickReactionPopover({
  onReact,
}: QuickReactionPopoverProps) {
  const [burstId, setBurstId] = useState<string | null>(null);

  function handlePick(item: LiveTalkQuickReaction) {
    setBurstId(item.emoji);
    window.setTimeout(() => setBurstId(null), 380);
    onReact(item.emoji);
  }

  return (
    <div
      role="dialog"
      aria-label="Quick reactions"
      className="linkup-lt-popover-enter absolute bottom-full left-0 z-50 mb-2 w-[min(100vw-2rem,14.5rem)] rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-brand-primary/[0.04] p-2 shadow-xl shadow-brand-primary/15 backdrop-blur-md dark:border-white/10 dark:from-slate-900 dark:via-slate-900 dark:to-brand-primary/10 dark:shadow-black/40"
    >
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
        Quick vibe
      </p>
      <div className="flex flex-wrap gap-1">
        {LIVE_TALK_QUICK_REACTIONS.map((item) => (
          <button
            key={item.emoji}
            type="button"
            onClick={() => handlePick(item)}
            aria-label={`Send ${item.label}`}
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
    </div>
  );
}
