"use client";

import Link from "next/link";
import { Play, Share2, Sparkles } from "lucide-react";
import {
  formatWatchDuration,
  formatWatchType,
  WatchVideo,
} from "@/src/lib/watch";

type WatchVideoCardProps = {
  video: WatchVideo;
  featured?: boolean;
  onBoost?: (video: WatchVideo) => void;
  onShare?: (video: WatchVideo) => void;
};

export default function WatchVideoCard({
  video,
  featured = false,
  onBoost,
  onShare,
}: WatchVideoCardProps) {
  const progressPercent =
    video.progress && video.duration
      ? Math.min(100, Math.round((video.progress.progress / video.duration) * 100))
      : video.watchProgress && video.duration
        ? Math.min(
            100,
            Math.round((video.watchProgress / video.duration) * 100),
          )
        : 0;

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-brand-primary/10 dark:border-white/10 dark:bg-brand-dark/80 dark:shadow-slate-950/20 ${
        featured ? "sm:flex-row" : ""
      }`}
    >
      <Link
        href={`/watch/${video.id}`}
        className={`relative block overflow-hidden bg-slate-900 ${
          featured ? "sm:w-[45%]" : ""
        }`}
      >
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className={`w-full object-cover transition duration-500 group-hover:scale-105 ${
              featured ? "aspect-[16/10] sm:h-full sm:min-h-[220px]" : "aspect-video"
            }`}
          />
        ) : (
          <div
            className={`flex w-full items-center justify-center bg-gradient-to-br from-brand-primary/30 to-brand-secondary/30 ${
              featured ? "aspect-[16/10] sm:h-full sm:min-h-[220px]" : "aspect-video"
            }`}
          >
            <Play className="h-10 w-10 text-white/80" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {formatWatchType(video.type)}
        </span>

        <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {formatWatchDuration(video.duration)}
        </span>

        {progressPercent > 0 ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div
              className="h-full bg-brand-secondary"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        ) : null}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg">
            <Play className="h-4 w-4 fill-current" />
            Watch
          </span>
        </div>
      </Link>

      <div className={`flex flex-1 flex-col p-4 sm:p-5 ${featured ? "sm:justify-center" : ""}`}>
        {video.category ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-primary dark:text-brand-secondary">
            {video.category}
          </p>
        ) : null}

        <h3
          className={`mt-1 font-semibold text-slate-900 dark:text-white ${
            featured ? "text-xl sm:text-2xl" : "text-base line-clamp-2"
          }`}
        >
          {video.title}
        </h3>

        {video.creator ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            by {video.creator.name}
          </p>
        ) : null}

        {featured && video.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {video.description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Link
            href={`/watch/${video.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover"
          >
            <Play className="h-4 w-4" />
            Watch
          </Link>

          {onBoost ? (
            <button
              type="button"
              onClick={() => onBoost(video)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-primary/40 hover:text-brand-primary dark:border-white/10 dark:text-slate-300 dark:hover:text-brand-secondary"
            >
              <Sparkles className="h-4 w-4" />
              Boost
            </button>
          ) : null}

          {onShare ? (
            <button
              type="button"
              onClick={() => onShare(video)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-primary/40 hover:text-brand-primary dark:border-white/10 dark:text-slate-300 dark:hover:text-brand-secondary"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
