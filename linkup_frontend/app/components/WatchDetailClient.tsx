"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  MessageCircle,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  fetchWatchVideo,
  formatWatchDuration,
  formatWatchType,
  getDemoWatchVideo,
  isDemoWatchVideo,
  updateWatchProgress,
  WatchVideo,
} from "@/src/lib/watch";

type WatchDetailClientProps = {
  videoId: string;
};

export default function WatchDetailClient({ videoId }: WatchDetailClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef(0);
  const [video, setVideo] = useState<WatchVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const saveProgress = useCallback(
    async (seconds: number, completed = false) => {
      if (isDemoWatchVideo(videoId)) {
        return;
      }

      try {
        await updateWatchProgress(videoId, Math.floor(seconds), completed);
      } catch {
        // Non-blocking — playback should continue.
      }
    },
    [videoId],
  );

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (isDemoWatchVideo(videoId)) {
      const demo = getDemoWatchVideo(videoId);
      if (demo) {
        setVideo(demo);
      } else {
        setError("Video not found.");
      }
      setIsLoading(false);
      return;
    }

    fetchWatchVideo(videoId)
      .then((data) => setVideo(data))
      .catch(() => {
        const demo = getDemoWatchVideo(videoId);
        if (demo) {
          setVideo(demo);
        } else {
          setError("Unable to load this video.");
        }
      })
      .finally(() => setIsLoading(false));
  }, [videoId]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !video) {
      return;
    }

    const initialProgress =
      video.progress?.progress ?? video.watchProgress ?? 0;
    if (initialProgress > 0) {
      element.currentTime = initialProgress;
    }

    const onTimeUpdate = () => {
      const current = element.currentTime;
      if (current - lastSavedRef.current >= 10) {
        lastSavedRef.current = current;
        void saveProgress(current);
      }
    };

    const onPause = () => {
      void saveProgress(element.currentTime);
    };

    const onEnded = () => {
      void saveProgress(element.duration || element.currentTime, true);
    };

    element.addEventListener("timeupdate", onTimeUpdate);
    element.addEventListener("pause", onPause);
    element.addEventListener("ended", onEnded);

    return () => {
      element.removeEventListener("timeupdate", onTimeUpdate);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("ended", onEnded);
    };
  }, [saveProgress, video]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function handleBoost() {
    if (!video) {
      return;
    }
    setNotice(`Boosted "${video.title}" — boosts are coming soon.`);
  }

  function handleShare() {
    if (!video) {
      return;
    }

    const url = `${window.location.origin}/watch/${video.id}`;
    if (navigator.share) {
      void navigator.share({ title: video.title, url }).catch(() => {
        void navigator.clipboard.writeText(url);
        setNotice("Link copied.");
      });
      return;
    }

    void navigator.clipboard.writeText(url);
    setNotice("Link copied.");
  }

  if (isLoading) {
    return (
      <div className="linkup-page">
        <div className="linkup-container max-w-5xl animate-pulse space-y-6">
          <div className="h-8 w-40 rounded bg-slate-200 dark:bg-white/10" />
          <div className="aspect-video rounded-3xl bg-slate-200 dark:bg-white/10" />
          <div className="h-6 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="linkup-page">
        <div className="linkup-container max-w-5xl">
          <div className="linkup-empty p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {error ?? "Video not found"}
            </h2>
            <Link
              href="/watch"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Watch
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent =
    video.progress && video.duration
      ? Math.min(100, Math.round((video.progress.progress / video.duration) * 100))
      : 0;

  return (
    <div className="linkup-page">
      <div className="linkup-container max-w-5xl space-y-6">
        <Link
          href="/watch"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-brand-primary dark:text-slate-400 dark:hover:text-brand-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Watch
        </Link>

        {notice ? (
          <p className="rounded-3xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm text-brand-primary dark:text-brand-secondary">
            {notice}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-2xl dark:border-white/10">
          <video
            ref={videoRef}
            controls
            playsInline
            className="max-h-[70vh] w-full bg-black object-contain"
            src={video.videoUrl}
            poster={video.thumbnailUrl ?? undefined}
          />
        </div>

        <div className="linkup-panel p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {video.category ? (
                  <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
                    {video.category}
                  </span>
                ) : null}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {formatWatchType(video.type)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatWatchDuration(video.duration)}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
                {video.title}
              </h1>

              {video.creator ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Creator · {video.creator.name} (@{video.creator.username})
                </p>
              ) : null}

              {video.description ? (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {video.description}
                </p>
              ) : null}

              {progressPercent > 0 ? (
                <div className="mt-5 max-w-md">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Continue watching</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBoost}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-primary/40 hover:text-brand-primary dark:border-white/10 dark:text-slate-300 dark:hover:text-brand-secondary"
              >
                <Sparkles className="h-4 w-4" />
                Boost
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-primary/40 hover:text-brand-primary dark:border-white/10 dark:text-slate-300 dark:hover:text-brand-secondary"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-white/15 dark:bg-brand-dark/60">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 text-brand-primary dark:text-brand-secondary" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Replies
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Watch replies and live reactions are coming soon. Drop a Boost for now.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
