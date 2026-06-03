"use client";

import { LIVE_TALK_PICKER_EMOJIS } from "./chatInputData";

type EmojiPickerPopoverProps = {
  onPick: (emoji: string) => void;
};

export default function EmojiPickerPopover({ onPick }: EmojiPickerPopoverProps) {
  return (
    <div
      role="dialog"
      aria-label="Emoji picker"
      className="linkup-lt-popover-enter absolute bottom-full left-0 z-50 mb-2 w-[min(100vw-2rem,17.5rem)] rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-xl shadow-brand-primary/10 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 dark:shadow-black/40"
    >
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Emoji
      </p>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {LIVE_TALK_PICKER_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            aria-label={`Insert ${emoji}`}
            className="linkup-focus-ring flex h-9 w-9 items-center justify-center rounded-xl text-lg transition duration-150 hover:scale-110 hover:bg-brand-primary/10 active:scale-95 dark:hover:bg-brand-primary/20 sm:h-10 sm:w-10 sm:text-xl"
          >
            <span className="leading-none" aria-hidden>
              {emoji}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
