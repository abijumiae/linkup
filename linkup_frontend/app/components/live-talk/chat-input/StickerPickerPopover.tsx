"use client";

import { LIVE_TALK_STICKERS } from "./chatInputData";

type StickerPickerPopoverProps = {
  onPick: (sticker: string) => void;
};

export default function StickerPickerPopover({ onPick }: StickerPickerPopoverProps) {
  return (
    <div
      role="dialog"
      aria-label="Stickers"
      className="linkup-lt-popover-enter absolute bottom-full left-0 z-50 mb-2 w-[min(100vw-2rem,14rem)] rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95"
    >
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Stickers
      </p>
      <div className="grid grid-cols-4 gap-1">
        {LIVE_TALK_STICKERS.map((sticker) => (
          <button
            key={sticker}
            type="button"
            onClick={() => onPick(sticker)}
            aria-label={`Insert sticker ${sticker}`}
            className="linkup-focus-ring flex h-10 w-10 items-center justify-center rounded-xl text-xl transition duration-150 hover:scale-110 hover:bg-brand-secondary/10 active:scale-95 sm:h-11 sm:w-11"
          >
            <span className="leading-none" aria-hidden>
              {sticker}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
