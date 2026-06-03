"use client";

import { useState } from "react";
import { LIVE_TALK_PICKER_EMOJIS } from "./chatInputData";

type EmojiPickerPopoverProps = {
  onPick: (emoji: string) => void;
};

export default function EmojiPickerPopover({ onPick }: EmojiPickerPopoverProps) {
  const [burst, setBurst] = useState<string | null>(null);

  function handlePick(emoji: string) {
    setBurst(emoji);
    window.setTimeout(() => setBurst(null), 360);
    onPick(emoji);
  }

  return (
    <>
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Emoji
      </p>
      <div className="grid grid-cols-6 gap-0.5 sm:grid-cols-6 sm:gap-1">
        {LIVE_TALK_PICKER_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handlePick(emoji)}
            aria-label={`Insert ${emoji}`}
            className="linkup-focus-ring flex h-9 w-9 items-center justify-center rounded-xl text-lg transition duration-150 hover:scale-110 hover:bg-brand-primary/10 active:scale-95 dark:hover:bg-brand-primary/20 sm:h-10 sm:w-10 sm:text-xl"
          >
            <span
              className={`leading-none ${
                burst === emoji ? "linkup-lt-react-pop" : ""
              }`}
              aria-hidden
            >
              {emoji}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
