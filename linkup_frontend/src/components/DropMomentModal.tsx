"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { createMoment } from "@/src/lib/moments";
import { ApiError } from "@/src/lib/api";
import { uploadFile, validateMediaFile } from "@/src/lib/uploads";

export const MOMENT_BACKGROUNDS = [
  {
    id: "linkup",
    label: "LinkUp",
    className: "from-brand-primary to-brand-secondary",
  },
  {
    id: "violet",
    label: "Violet",
    className: "from-violet-600 to-indigo-600",
  },
  {
    id: "ocean",
    label: "Ocean",
    className: "from-sky-500 to-blue-700",
  },
  {
    id: "sunset",
    label: "Sunset",
    className: "from-rose-500 to-orange-500",
  },
  {
    id: "midnight",
    label: "Midnight",
    className: "from-slate-800 to-slate-950",
  },
] as const;

type DropMomentModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function DropMomentModal({
  open,
  onClose,
  onCreated,
}: DropMomentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [background, setBackground] = useState<string>(
    MOMENT_BACKGROUNDS[0].className,
  );
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: "image" | "video";
    file: File;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setContent("");
    setBackground(MOMENT_BACKGROUNDS[0].className);
    setMediaPreview(null);
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const validationError = validateMediaFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const type = file.type.startsWith("video/") ? "video" : "image";
    const url = URL.createObjectURL(file);
    setMediaPreview({ url, type, file });
    setError(null);
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed && !mediaPreview) {
      setError("Add text, an image, or a video to drop a moment.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let mediaUrl: string | undefined;
      let mediaType: "image" | "video" | "text" | undefined;

      if (mediaPreview) {
        const uploaded = await uploadFile(mediaPreview.file);
        mediaUrl = uploaded.url;
        mediaType = mediaPreview.type;
      } else {
        mediaType = "text";
      }

      await createMoment({
        content: trimmed || undefined,
        mediaUrl,
        mediaType,
        background: !mediaPreview ? background : undefined,
      });

      setSuccess("Moment is live");
      onCreated();
      window.setTimeout(() => {
        onClose();
      }, 700);
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 404) {
        setError("Could not publish moment. Please try again.");
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not drop moment. Try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewIsTextOnly = !mediaPreview;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-white shadow-2xl dark:bg-brand-dark sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <p className="linkup-eyebrow">LinkUp Moments</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              Drop Moment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div
            className={`relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br p-5 ${
              previewIsTextOnly ? background : "from-slate-900 to-slate-800"
            }`}
          >
            {mediaPreview?.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaPreview.url}
                alt="Moment preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}

            {mediaPreview?.type === "video" ? (
              <video
                src={mediaPreview.url}
                className="absolute inset-0 h-full w-full object-cover"
                muted
                playsInline
              />
            ) : null}

            {(previewIsTextOnly || content.trim()) && (
              <p
                className={`relative z-10 whitespace-pre-wrap text-lg font-semibold leading-snug ${
                  previewIsTextOnly || mediaPreview
                    ? "text-white drop-shadow-md"
                    : "text-white"
                }`}
              >
                {content.trim() || "Say something worth remembering…"}
              </p>
            )}

            {mediaPreview ? (
              <button
                type="button"
                onClick={() => setMediaPreview(null)}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Caption
            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                if (error) setError(null);
              }}
              rows={3}
              maxLength={500}
              placeholder="What's happening right now?"
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-brand-primary/30 transition focus:border-brand-primary focus:ring-2 dark:border-white/10 dark:bg-brand-dark/60 dark:text-white"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-primary/40 hover:text-brand-primary dark:border-white/10 dark:text-slate-300 dark:hover:text-brand-secondary"
            >
              <ImagePlus className="h-4 w-4" />
              Add photo or video
            </button>
          </div>

          {previewIsTextOnly ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Background
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {MOMENT_BACKGROUNDS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setBackground(option.className)}
                    className={`h-9 w-9 rounded-full bg-gradient-to-br ${option.className} ring-2 ring-offset-2 ring-offset-white transition dark:ring-offset-brand-dark ${
                      background === option.className
                        ? "ring-brand-primary"
                        : "ring-transparent"
                    }`}
                    title={option.label}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="mt-4 flex items-center gap-2 rounded-2xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm font-medium text-brand-primary dark:text-brand-secondary">
              <Sparkles className="h-4 w-4" />
              {success}
            </p>
          ) : null}
        </div>

        <div className="border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Dropping…
              </>
            ) : (
              "Drop Moment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
