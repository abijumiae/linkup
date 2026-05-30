"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { resolveMediaUrl } from "@/src/lib/messages";

type MessageBubbleProps = {
  text?: string;
  time: string;
  fromMe?: boolean;
  read?: boolean;
  senderName?: string;
  type?: string;
  mediaUrl?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function isAudioMessage(
  type: string | undefined,
  mediaUrl: string | null | undefined,
  audioUrl: string | null | undefined,
) {
  const normalized = type?.toLowerCase();
  return (
    (normalized === "voice" ||
      normalized === "audio" ||
      type === "AUDIO") &&
    Boolean(mediaUrl ?? audioUrl)
  );
}

function MessageBubbleComponent({
  text,
  time,
  fromMe,
  read,
  senderName,
  type,
  mediaUrl,
  audioUrl,
  duration,
}: MessageBubbleProps) {
  const audioSrc = resolveMediaUrl(mediaUrl ?? audioUrl ?? undefined);
  const isVoice = isAudioMessage(type, mediaUrl, audioUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function togglePlayback() {
    if (!audioSrc) {
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(audioSrc);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onpause = () => setIsPlaying(false);
    }

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    void audio.play().catch(() => setIsPlaying(false));
    setIsPlaying(true);
  }

  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative max-w-[88%] rounded-[1.35rem] px-4 py-2.5 text-sm leading-6 shadow-sm transition duration-200 sm:max-w-[78%] sm:px-4 sm:py-3 ${
          fromMe
            ? "rounded-br-md bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-brand-primary/20"
            : "rounded-bl-md border border-slate-200/90 bg-white text-slate-800 dark:border-white/10 dark:bg-brand-dark/90 dark:text-slate-100"
        }`}
      >
        {!fromMe && senderName ? (
          <p className="mb-1 text-xs font-semibold text-brand-primary dark:text-brand-secondary">
            {senderName}
          </p>
        ) : null}

        {isVoice ? (
          <div className="flex min-w-[200px] max-w-full items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                fromMe
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 dark:text-brand-secondary"
              }`}
              aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Voice note
              </p>
              <p className="text-xs opacity-75">
                {duration ? formatDuration(duration) : "Audio"}
              </p>
            </div>
          </div>
        ) : text ? (
          <p className="whitespace-pre-wrap break-words">{text}</p>
        ) : null}

        <div
          className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
            fromMe ? "text-white/70" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <span>{time}</span>
          {fromMe && read !== undefined ? (
            <span className="font-medium">{read ? "· Seen" : "· Sent"}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const MessageBubble = memo(MessageBubbleComponent);
MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
