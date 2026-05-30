"use client";

import Link from "next/link";
import { memo, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Play,
  Share2,
  User,
} from "lucide-react";
import {
  formatWatchDuration,
  formatWatchType,
  WatchVideo,
} from "@/src/lib/watch";
import {
  displayLikeCount,
  formatViewCount,
  isVideoLiked,
  toggleVideoLike,
} from "@/src/lib/watchEngagement";

type WatchVideoCardProps = {
  video: WatchVideo;
  onPlay?: (video: WatchVideo) => void;
  onShare?: (video: WatchVideo) => void;
  onComment?: (video: WatchVideo) => void;
};

function WatchVideoCard({
  video,
  onPlay,
  onShare,
  onComment,
}: WatchVideoCardProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(() => isVideoLiked(video.id));
  const [previewActive, setPreviewActive] = useState(false);

  const progressPercent =
    video.progress && video.duration
      ? Math.min(100, Math.round((video.progress.progress / video.duration) * 100))
      : video.watchProgress && video.duration
        ? Math.min(
            100,
            Math.round((video.watchProgress / video.duration) * 100),
          )
        : 0;

  const likeCount = displayLikeCount(video.id, video.likesCount ?? 0);

  function handlePreviewEnter() {
    setPreviewActive(true);
    const element = previewRef.current;
    if (element) {
      element.currentTime = 0;
      void element.play().catch(() => undefined);
    }
  }

  function handlePreviewLeave() {
    setPreviewActive(false);
    previewRef.current?.pause();
  }

  return (
    <article className="group linkup-panel flex h-full flex-col overflow-hidden p-0 transition duration-300 hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-brand-primary/10">
      <button
        type="button"
        onClick={() => onPlay?.(video)}
        onMouseEnter={handlePreviewEnter}
        onMouseLeave={handlePreviewLeave}
        className="relative block w-full overflow-hidden bg-slate-900 text-left"
      >
        {previewActive ? (
          <video
            ref={previewRef}
            src={video.videoUrl}
            muted
            playsInline
            loop
            className="aspect-video w-full object-cover"
          />
        ) : video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            loading="lazy"
            className="aspect-video w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-brand-primary/30 to-brand-secondary/30">
            <Play className="h-10 w-10 text-white/80" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

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
            Play
          </span>
        </div>
      </button>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          {video.creator?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.creator.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-brand-dark"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary">
              <User className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
              {video.creator?.name ?? "LinkUp Creator"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatViewCount(video.viewsCount ?? 0)} views
            </p>
          </div>
        </div>

        <Link href={`/watch/${video.id}`}>
          <h3 className="mt-3 line-clamp-2 text-base font-semibold text-slate-900 transition group-hover:text-brand-primary dark:text-white dark:group-hover:text-brand-secondary">
            {video.title}
          </h3>
        </Link>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => setLiked(toggleVideoLike(video.id))}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition ${
              liked
                ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {likeCount}
          </button>
          <button
            type="button"
            onClick={() => onComment?.(video)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            <MessageCircle className="h-4 w-4" />
            {video.commentsCount ?? 0}
          </button>
          {onShare ? (
            <button
              type="button"
              onClick={() => onShare(video)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <Share2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default memo(WatchVideoCard);
