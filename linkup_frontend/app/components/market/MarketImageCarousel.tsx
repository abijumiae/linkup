"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

type MarketImageCarouselProps = {
  images: string[];
  title: string;
};

export default function MarketImageCarousel({
  images,
  title,
}: MarketImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const hasImages = images.length > 0;
  const current = hasImages ? images[index] : null;

  function goPrev() {
    setIndex((currentIndex) =>
      currentIndex === 0 ? images.length - 1 : currentIndex - 1,
    );
  }

  function goNext() {
    setIndex((currentIndex) =>
      currentIndex === images.length - 1 ? 0 : currentIndex + 1,
    );
  }

  if (!hasImages) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-brand-primary/20 via-slate-100 to-brand-secondary/10 dark:from-brand-primary/25 dark:via-brand-dark dark:to-brand-dark">
        <ShoppingBag className="h-16 w-16 text-brand-primary/40 dark:text-brand-secondary/50" />
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-brand-dark/80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current ?? ""}
        alt={title}
        className="h-full w-full object-cover"
      />

      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((image, dotIndex) => (
              <button
                key={image}
                type="button"
                onClick={() => setIndex(dotIndex)}
                className={`h-2 w-2 rounded-full transition ${
                  dotIndex === index ? "bg-white" : "bg-white/45"
                }`}
                aria-label={`Go to image ${dotIndex + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
