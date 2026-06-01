"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Copy, Heart, Pause, Play, Reply } from "lucide-react";
import { resolveMediaUrl } from "@/src/lib/messages";
import {
  getChatGradient,
  getChatSenderLabelClass,
} from "@/src/lib/chatColors";

type MessageBubbleProps = {
  text?: string;
  time: string;
  fromMe?: boolean;
  read?: boolean;
  senderName?: string;
  senderId?: string | null;
  type?: string;
  mediaUrl?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
  onReply?: (quote: string) => void;
  onCopied?: () => void;
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

const actionButtonClass =
  "inline-flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-slate-500 transition duration-150 hover:scale-105 hover:bg-slate-100 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 sm:h-8 sm:w-8";

function MessageBubbleComponent({
  text,
  time,
  fromMe,
  read,
  senderName,
  senderId,
  type,
  mediaUrl,
  audioUrl,
  duration,
  onReply,
  onCopied,
}: MessageBubbleProps) {
  const audioSrc = resolveMediaUrl(mediaUrl ?? audioUrl ?? undefined);
  const isVoice = isAudioMessage(type, mediaUrl, audioUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const accentId = fromMe ? null : senderId;
  const accentGradient = getChatGradient(accentId);
  const copyText = isVoice ? "Voice note" : text?.trim() ?? "";

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlayback = useCallback(() => {
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
  }, [audioSrc, isPlaying]);

  const handleCopy = useCallback(async () => {
    if (!copyText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(copyText);
      onCopied?.();
    } catch {
      // Clipboard may be unavailable on some mobile browsers.
    }
  }, [copyText, onCopied]);

  const handleReply = useCallback(() => {
    if (!copyText || !onReply) {
      return;
    }
    onReply(copyText);
  }, [copyText, onReply]);

  return (
    <div
      className={`group/message flex flex-col gap-1 ${fromMe ? "items-end" : "items-start"}`}
    >
      <div
        className={`flex max-w-[88%] items-end gap-2 sm:max-w-[78%] ${
          fromMe ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`relative overflow-hidden rounded-[1.35rem] px-4 py-2.5 text-sm leading-6 shadow-sm transition duration-200 ${
            fromMe
              ? "rounded-br-md bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-brand-primary/20"
              : "rounded-bl-md border border-slate-200/90 bg-white text-slate-800 dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-100"
          }`}
        >
          {!fromMe ? (
            <div
              className={`absolute bottom-2 left-0 top-2 w-1 rounded-full bg-gradient-to-b ${accentGradient}`}
              aria-hidden
            />
          ) : null}

          <div className={fromMe ? "" : "pl-2"}>
            {!fromMe && senderName ? (
              <p
                className={`mb-1 text-xs font-semibold ${getChatSenderLabelClass(senderId)}`}
              >
                {senderName}
              </p>
            ) : null}

            {isVoice ? (
              <div className="flex min-w-[200px] max-w-full items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition duration-150 hover:scale-105 active:scale-95 ${
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
      </div>

      <div
        className={`flex items-center gap-0.5 px-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100 ${
          fromMe ? "justify-end" : "justify-start"
        }`}
      >
        {onReply && copyText ? (
          <button
            type="button"
            onClick={handleReply}
            className={actionButtonClass}
            aria-label="Reply"
          >
            <Reply className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setLiked((current) => !current)}
          className={`${actionButtonClass} ${
            liked
              ? "text-rose-500 hover:text-rose-600 dark:text-rose-400"
              : ""
          }`}
          aria-label={liked ? "Unlike message" : "Like message"}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
        </button>
        {copyText ? (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className={actionButtonClass}
            aria-label="Copy message"
          >
            <Copy className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

const MessageBubble = memo(MessageBubbleComponent);
MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
