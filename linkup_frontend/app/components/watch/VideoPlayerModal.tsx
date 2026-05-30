"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Maximize,
  MessageCircle,
  Pause,
  Play,
  Share2,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { WatchVideo } from "@/src/lib/watch";
import {
  displayLikeCount,
  formatViewCount,
  isVideoLiked,
  toggleVideoLike,
} from "@/src/lib/watchEngagement";

type VideoPlayerModalProps = {
  video: WatchVideo | null;
  onClose: () => void;
  onShare: (video: WatchVideo) => void;
  onComment?: (video: WatchVideo) => void;
};

export default function VideoPlayerModal({
  video,
  onClose,
  onShare,
  onComment,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!video) {
      return;
    }
    setLiked(isVideoLiked(video.id));
    setIsPlaying(true);
    setIsMuted(false);
  }, [video]);

  useEffect(() => {
    if (!video) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [video, onClose]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !video) {
      return;
    }

    void element.play().catch(() => setIsPlaying(false));
  }, [video]);

  const togglePlay = useCallback(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    if (element.paused) {
      void element.play();
      setIsPlaying(true);
    } else {
      element.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    element.muted = !element.muted;
    setIsMuted(element.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void element.requestFullscreen?.();
  }, []);

  if (!video) {
    return null;
  }

  const likeCount = displayLikeCount(video.id, video.likesCount ?? 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-dark/90 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-none bg-black sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:border sm:border-white/10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex-1 bg-black sm:aspect-video sm:flex-none">
          <video
            ref={videoRef}
            src={video.videoUrl}
            poster={video.thumbnailUrl ?? undefined}
            className="h-full w-full object-contain sm:aspect-video"
            playsInline
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 fill-current" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label="Fullscreen"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-brand-dark p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-white">{video.title}</h2>

          {video.creator ? (
            <div className="mt-3 flex items-center gap-3">
              {video.creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.creator.avatarUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/20 text-brand-secondary">
                  <User className="h-4 w-4" />
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  {video.creator.name}
                </p>
                <p className="text-xs text-slate-400">
                  @{video.creator.username} ·{" "}
                  {formatViewCount(video.viewsCount ?? 0)} views
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLiked(toggleVideoLike(video.id))}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
                liked
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                  : "border-white/15 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {likeCount}
            </button>
            <button
              type="button"
              onClick={() => onComment?.(video)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" />
              {video.commentsCount ?? 0}
            </button>
            <button
              type="button"
              onClick={() => onShare(video)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <Link
              href={`/watch/${video.id}`}
              className="linkup-btn-primary ml-auto min-h-[44px]"
            >
              Open full page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
