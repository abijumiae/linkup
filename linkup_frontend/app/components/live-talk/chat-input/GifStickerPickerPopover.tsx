"use client";

import { useEffect, useState } from "react";
import { fetchTrendingGifs, type GifItem } from "@/src/lib/giphy";
import { LIVE_TALK_STICKERS } from "./chatInputData";

type GifStickerPickerPopoverProps = {
  onPickSticker: (value: string) => void;
  onPickGifUrl: (url: string) => void;
};

export default function GifStickerPickerPopover({
  onPickSticker,
  onPickGifUrl,
}: GifStickerPickerPopoverProps) {
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(true);
  const [gifError, setGifError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingGifs(true);
    setGifError(false);

    void fetchTrendingGifs(8)
      .then((items) => {
        if (!cancelled) {
          setGifs(items);
          setGifError(items.length === 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGifs([]);
          setGifError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingGifs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-2">
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        GIFs
      </p>
      {loadingGifs ? (
        <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
          Loading GIFs…
        </p>
      ) : gifs.length > 0 ? (
        <div className="grid grid-cols-4 gap-1">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => onPickGifUrl(gif.url)}
              aria-label={`Insert GIF ${gif.title}`}
              className="linkup-focus-ring overflow-hidden rounded-lg border border-slate-200/80 bg-slate-100 transition hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-slate-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gif.preview}
                alt=""
                className="aspect-square h-14 w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : (
        <p className="px-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
          {gifError
            ? "GIFs unavailable — using stickers below."
            : "Add NEXT_PUBLIC_GIPHY_API_KEY for trending GIFs."}
        </p>
      )}

      <p className="px-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Stickers
      </p>
      <div className="grid grid-cols-5 gap-1">
        {LIVE_TALK_STICKERS.map((sticker) => (
          <button
            key={sticker}
            type="button"
            onClick={() => onPickSticker(sticker)}
            aria-label={`Insert sticker ${sticker}`}
            className="linkup-focus-ring flex h-9 w-9 items-center justify-center rounded-xl text-lg transition duration-150 hover:scale-110 hover:bg-brand-secondary/10 active:scale-95 sm:h-10 sm:w-10"
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
