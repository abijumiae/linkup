"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Send, Square, Trash2, X } from "lucide-react";

const MAX_RECORDING_SECONDS = 120;
const MIN_RECORDING_SECONDS = 1;
const RECORDER_TIMESLICE_MS = 250;

export type VoiceRecorderMode =
  | "idle"
  | "requestingPermission"
  | "recording"
  | "preview"
  | "uploading";

type VoiceNoteRecorderProps = {
  disabled?: boolean;
  isSending?: boolean;
  variant?: "full" | "icon";
  onSend: (file: File, durationSeconds: number) => Promise<void>;
  /** Local voice-note notice — do not use page-level error banners. */
  onNotice?: (message: string | null) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  /** @deprecated Use onNotice */
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
    "audio/aac",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function normalizeAudioMimeType(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? mimeType;
}

function isSecureRecordingContext() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export function isVoiceRecordingSupported() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    Boolean(getSupportedMimeType()) &&
    isSecureRecordingContext()
  );
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function fileExtensionForMime(normalizedMime: string): string {
  if (normalizedMime.includes("mp4") || normalizedMime.includes("aac")) {
    return "m4a";
  }
  if (normalizedMime.includes("ogg")) {
    return "ogg";
  }
  if (normalizedMime.includes("mpeg") || normalizedMime.includes("mp3")) {
    return "mp3";
  }
  return "webm";
}

export default function VoiceNoteRecorder({
  disabled = false,
  isSending = false,
  variant = "full",
  onSend,
  onNotice,
  onRecordingChange,
  onError,
}: VoiceNoteRecorderProps) {
  const notify = onNotice ?? onError;

  const [mode, setMode] = useState<VoiceRecorderMode>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>("audio/webm");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const discardOnStopRef = useRef(false);

  useEffect(() => {
    onRecordingChange?.(mode === "recording" || mode === "requestingPermission");
  }, [mode, onRecordingChange]);

  useEffect(() => {
    return () => {
      stopTracks();
      clearTimer();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!localNotice) {
      return;
    }

    const timer = window.setTimeout(() => setLocalNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [localNotice]);

  function showNotice(message: string | null) {
    setLocalNotice(message);
    notify?.(message);
  }

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
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
    setPreviewDuration(0);
    setElapsed(0);
    setMode("idle");
    discardOnStopRef.current = false;
  }

  async function startRecording() {
    showNotice(null);
    notify?.(null);

    if (!isVoiceRecordingSupported()) {
      showNotice("Voice recording is not supported in this browser.");
      return;
    }

    setMode("requestingPermission");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();

      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        setMode("idle");
        showNotice("Voice recording is not supported in this browser.");
        return;
      }

      mimeTypeRef.current = mimeType;
      mediaStreamRef.current = stream;

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType });
      } catch {
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        setMode("idle");
        showNotice("Voice recording is not supported in this browser.");
        return;
      }

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      discardOnStopRef.current = false;
      setElapsed(0);
      setMode("recording");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        showNotice("Could not send voice note. Please try again.");
        cancelRecording();
      };

      recorder.onstop = () => {
        stopTracks();

        if (discardOnStopRef.current) {
          chunksRef.current = [];
          return;
        }

        const normalizedMime = normalizeAudioMimeType(mimeTypeRef.current);
        const blob = new Blob(chunksRef.current, { type: normalizedMime });

        if (blob.size === 0) {
          setMode("idle");
          showNotice("Could not send voice note. Please try again.");
          return;
        }

        const durationSeconds = Math.max(
          MIN_RECORDING_SECONDS,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        const extension = fileExtensionForMime(normalizedMime);
        const file = new File([blob], `voice-note.${extension}`, {
          type: normalizedMime,
        });
        const objectUrl = URL.createObjectURL(blob);

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        setPreviewFile(file);
        setPreviewUrl(objectUrl);
        setPreviewDuration(durationSeconds);
        setMode("preview");
      };

      recorder.start(RECORDER_TIMESLICE_MS);

      timerRef.current = setInterval(() => {
        const nextElapsed = Math.floor(
          (Date.now() - startedAtRef.current) / 1000,
        );
        setElapsed(nextElapsed);
        if (nextElapsed >= MAX_RECORDING_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch (error) {
      stopTracks();
      setMode("idle");

      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError");

      showNotice(
        denied
          ? "Microphone permission is required to send a voice note."
          : "Could not send voice note. Please try again.",
      );
    }
  }

  function stopRecording() {
    clearTimer();
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      try {
        recorder.requestData();
      } catch {
        // Some browsers omit requestData; timeslice still collects chunks.
      }
      recorder.stop();
    }

    mediaRecorderRef.current = null;
  }

  function cancelRecording() {
    clearTimer();
    discardOnStopRef.current = true;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopTracks();
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];
    resetPreview();
    showNotice(null);
    notify?.(null);
  }

  async function handleSendPreview() {
    if (!previewFile || previewDuration < MIN_RECORDING_SECONDS) {
      showNotice("Could not send voice note. Please try again.");
      return;
    }

    setMode("uploading");

    try {
      await onSend(previewFile, previewDuration);
      resetPreview();
      showNotice(null);
      notify?.(null);
    } catch {
      setMode("preview");
      showNotice("Could not send voice note. Please try again.");
    }
  }

  function togglePreviewPlayback() {
    if (!previewUrl) {
      return;
    }

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(previewUrl);
      previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
    }

    const audio = previewAudioRef.current;

    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
      return;
    }

    void audio.play().catch(() => {
      setIsPreviewPlaying(false);
    });
    setIsPreviewPlaying(true);
  }

  const isBusy =
    mode === "uploading" || isSending || mode === "requestingPermission";

  const panelPositionClass =
    "fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-50 md:absolute md:inset-x-auto md:bottom-full md:right-0 md:left-auto md:mb-2 md:w-[min(calc(100vw-2rem),22rem)]";

  const noticeBanner = localNotice ? (
    <div
      className={`mb-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-100 ${
        variant === "icon" ? panelPositionClass : ""
      }`}
    >
      {localNotice}
    </div>
  ) : null;

  const recordingPanel =
    mode === "recording" ? (
      <div
        className={`rounded-2xl border border-brand-primary/25 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 px-3 py-3 shadow-lg shadow-brand-primary/10 ${
          variant === "icon" ? panelPositionClass : "mb-2"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-secondary opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-primary" />
            </span>
            <p className="text-sm font-medium text-brand-primary dark:text-brand-secondary">
              Recording… {formatTimer(elapsed)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-brand-dark/90 dark:text-slate-200"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 text-sm font-semibold text-white"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const previewPanel =
    mode === "preview" && previewUrl ? (
      <div
        className={`rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-3 dark:border-brand-primary/30 dark:bg-brand-primary/10 ${
          variant === "icon" ? panelPositionClass : "mb-2"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
            Voice note preview
          </p>
          <button
            type="button"
            onClick={cancelRecording}
            disabled={isBusy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 dark:hover:bg-white/10"
            aria-label="Discard voice note"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePreviewPlayback}
            disabled={isBusy}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white"
            aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"}
          >
            {isPreviewPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {formatTimer(previewDuration)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSendPreview()}
            disabled={isBusy || disabled}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isBusy ? "Sending…" : "Send voice note"}
          </button>
          <button
            type="button"
            onClick={cancelRecording}
            disabled={isBusy}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-brand-dark dark:text-slate-200"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    ) : null;

  const requestingPanel =
    mode === "requestingPermission" ? (
      <div
        className={`rounded-2xl border border-brand-primary/20 bg-brand-primary/5 px-3 py-2.5 text-sm text-brand-primary dark:text-brand-secondary ${
          variant === "icon" ? panelPositionClass : "mb-2"
        }`}
      >
        Requesting microphone access…
      </div>
    ) : null;

  if (variant === "icon") {
    if (!isVoiceRecordingSupported()) {
      return null;
    }

    return (
      <div className="relative shrink-0">
        {noticeBanner}
        {requestingPanel}
        {recordingPanel}
        {previewPanel}
        {mode === "idle" ? (
          <button
            type="button"
            disabled={disabled || isBusy}
            onClick={() => void startRecording()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-brand-primary disabled:opacity-60 dark:hover:bg-white/10 dark:hover:text-brand-secondary"
            aria-label="Record voice note"
          >
            <Mic className="h-5 w-5" />
          </button>
        ) : (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-brand-primary dark:text-brand-secondary">
            <Mic className="h-5 w-5" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {noticeBanner}
      {requestingPanel}
      {previewPanel}
      {recordingPanel}
      {mode === "idle" ? (
        <button
          type="button"
          disabled={disabled || isBusy}
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
