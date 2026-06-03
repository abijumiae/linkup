"use client";

import { useCallback, useState } from "react";
import {
  isLinkupReactionEmoji,
  REACTION_META,
  type LinkupReactionEmoji,
} from "@/src/lib/reactions";

type ReactionButtonProps = {
  emoji: LinkupReactionEmoji;
  count: number;
  active: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick: (emoji: LinkupReactionEmoji) => void;
};

export default function ReactionButton({
  emoji,
  count,
  active,
  disabled = false,
  compact = false,
  onClick,
}: ReactionButtonProps) {
  const [animating, setAnimating] = useState(false);
  const meta = REACTION_META[emoji];
  const showCount = count > 1;

  const handleClick = useCallback(() => {
    if (disabled) {
      return;
    }
    setAnimating(true);
    window.setTimeout(() => setAnimating(false), 420);
    onClick(emoji);
  }, [disabled, emoji, onClick]);

  if (!isLinkupReactionEmoji(emoji)) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      aria-label={`${meta.label} reaction${showCount ? `, ${count}` : active ? ", selected" : ""}`}
      title={meta.label}
      className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-2xl border font-medium transition duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-brand-secondary/40 ${
        compact
          ? "min-h-[40px] min-w-[40px] px-2 py-1 text-lg sm:min-h-[44px] sm:min-w-[44px]"
          : "min-h-[44px] min-w-[44px] px-2.5 py-1.5 text-xl"
      } ${
        active
          ? "border-brand-primary/50 bg-brand-primary/15 shadow-sm shadow-brand-primary/15 dark:border-brand-secondary/50 dark:bg-brand-primary/25"
          : "border-slate-200/90 bg-white/90 text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-white/10"
      } ${animating ? meta.animation : ""}`}
    >
      <span className="leading-none" aria-hidden>
        {emoji}
      </span>
      {showCount ? (
        <span className="text-[11px] tabular-nums text-slate-600 dark:text-slate-300">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
