"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square, Trash2, X } from "lucide-react";

type VoiceNoteRecorderProps = {
  disabled?: boolean;
  isSending?: boolean;
  onSend: (file: File, durationSeconds: number) => Promise<void>;
  onError?: (message: string | null) => void;
};

function getSupportedMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return null;
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function isVoiceRecordingSupported() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    Boolean(getSupportedMimeType())
  );
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function VoiceNoteRecorder({
  disabled = false,
  isSending = false,
  onSend,
  onError,
}: VoiceNoteRecorderProps) {
  const [mode, setMode] = useState<"idle" | "recording" | "preview">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function stopTracks() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function resetPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
    setPreviewDuration(0);
    setElapsed(0);
    setMode("idle");
  }

  async function startRecording() {
    onError?.(null);

    if (!isVoiceRecordingSupported()) {
      onError?.("Voice notes are not supported on this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        stopTracks();
        onError?.("Voice notes are not supported on this browser.");
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setElapsed(0);
      setMode("recording");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        const extension = mimeType.includes("mp4")
          ? "m4a"
          : mimeType.includes("ogg")
            ? "ogg"
            : "webm";
        const file = new File([blob], `voice-note.${extension}`, {
          type: blob.type,
        });
        const objectUrl = URL.createObjectURL(blob);

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        setPreviewFile(file);
        setPreviewUrl(objectUrl);
        setPreviewDuration(durationSeconds);
        setMode("preview");
        stopTracks();
      };

      recorder.start();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch {
      stopTracks();
      onError?.("Microphone permission is required to send voice notes.");
    }
  }

  function stopRecording() {
    clearTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
  }

  function cancelRecording() {
    clearTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        stopTracks();
      };
      recorder.stop();
    } else {
      stopTracks();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    resetPreview();
    onError?.(null);
  }

  async function handleSendPreview() {
    if (!previewFile || previewDuration < 1) {
      return;
    }

    try {
      await onSend(previewFile, previewDuration);
      resetPreview();
      onError?.(null);
    } catch {
      onError?.("Could not send voice note. Please try again.");
    }
  }

  return (
    <div className="space-y-2">
      {mode === "preview" && previewUrl ? (
        <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-3 dark:border-brand-primary/30 dark:bg-brand-primary/10">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
              Voice note preview
            </p>
            <button
              type="button"
              onClick={cancelRecording}
              disabled={isSending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 dark:hover:bg-white/10"
              aria-label="Discard voice note"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <audio
            controls
            src={previewUrl}
            className="mt-2 h-10 w-full rounded-xl"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSendPreview()}
              disabled={isSending || disabled}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isSending ? "Sending…" : "Send voice note"}
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              disabled={isSending}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {mode === "recording" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
            <p className="text-sm font-medium text-rose-700 dark:text-rose-200">
              Recording… {formatTimer(elapsed)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-rose-500/20 bg-white/80 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-brand-dark/80 dark:text-rose-200"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        </div>
      ) : null}

      {mode === "idle" ? (
        <button
          type="button"
          disabled={disabled || isSending}
          onClick={() => void startRecording()}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-primary/30 hover:text-brand-primary disabled:opacity-60 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200 dark:hover:text-brand-secondary"
        >
          <Mic className="h-4 w-4" />
          Record voice note
        </button>
      ) : null}
    </div>
  );
}
