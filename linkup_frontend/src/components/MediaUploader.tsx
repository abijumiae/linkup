"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ImagePlus, Loader2, Trash2, Video } from "lucide-react";
import { ApiError, resolvePreviewMediaUrl } from "@/src/lib/api";
import {
  UploadMediaType,
  UploadResult,
  uploadFile,
  validateMediaFile,
} from "@/src/lib/uploads";

export type MediaUploaderHandle = {
  openPicker: (mode?: "image" | "video" | "both") => void;
};

type MediaUploaderProps = {
  label?: string;
  accept?: "image" | "video" | "both";
  disabled?: boolean;
  compact?: boolean;
  validateFile?: (file: File) => string | null;
  value?: {
    url: string;
    type: UploadMediaType;
  } | null;
  onChange: (value: { url: string; type: UploadMediaType } | null) => void;
  onError?: (message: string | null) => void;
};

function getAcceptAttribute(accept: "image" | "video" | "both") {
  if (accept === "image") {
    return "image/jpeg,image/png,image/webp";
  }
  if (accept === "video") {
    return "video/mp4,video/webm,video/quicktime";
  }
  return "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";
}

const MediaUploader = forwardRef<MediaUploaderHandle, MediaUploaderProps>(
  function MediaUploader(
    {
      label = "Add media",
      accept = "both",
      disabled = false,
      compact = false,
      validateFile,
      value = null,
      onChange,
      onError,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [activeAccept, setActiveAccept] = useState(accept);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
      value?.url ?? null,
    );
    const [previewType, setPreviewType] = useState<UploadMediaType | null>(
      value?.type ?? null,
    );
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      setActiveAccept(accept);
    }, [accept]);

    useEffect(() => {
      setPreviewUrl(value?.url ?? null);
      setPreviewType(value?.type ?? null);
    }, [value?.url, value?.type]);

    useImperativeHandle(ref, () => ({
      openPicker: (mode) => {
        const next = mode ?? accept;
        setActiveAccept(next);
        window.requestAnimationFrame(() => {
          inputRef.current?.click();
        });
      },
    }));

    function reportError(message: string | null) {
      setError(message);
      onError?.(message);
    }

    async function handleFileSelect(file: File) {
      reportError(null);

      const validationError = validateFile?.(file) ?? validateMediaFile(file);
      if (validationError) {
        reportError(validationError);
        return;
      }

      const isVideo = file.type.startsWith("video/");
      if (activeAccept === "image" && isVideo) {
        reportError("Please choose an image file.");
        return;
      }
      if (activeAccept === "video" && !isVideo) {
        reportError("Please choose a video file.");
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setPreviewType(isVideo ? "video" : "image");
      setIsUploading(true);
      setProgress(0);

      try {
        const result: UploadResult = await uploadFile(file, setProgress);
        onChange({ url: result.url, type: result.type });
        setPreviewUrl(result.url);
        setPreviewType(result.type);
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        setPreviewUrl(value?.url ?? null);
        setPreviewType(value?.type ?? null);
        URL.revokeObjectURL(objectUrl);
        reportError(
          err instanceof ApiError
            ? err.message
            : "Could not upload file. Please try again.",
        );
      } finally {
        setIsUploading(false);
        setProgress(0);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    }

    function handleRemove() {
      onChange(null);
      setPreviewUrl(null);
      setPreviewType(null);
      reportError(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }

    return (
      <div className="space-y-3">
        {!compact ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-200 dark:hover:bg-brand-primary/10"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
              ) : accept === "video" ? (
                <Video className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
              ) : (
                <ImagePlus className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
              )}
              {isUploading ? `Uploading ${progress}%` : label}
            </button>

            {previewUrl ? (
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={handleRemove}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-500/15 active:scale-[0.98] disabled:opacity-60 dark:text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            ) : null}
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept={getAcceptAttribute(activeAccept)}
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
          }}
        />

        {compact && isUploading ? (
          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
            Uploading {progress}%
          </p>
        ) : null}

        {previewUrl ? (
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
            {compact ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {previewType === "video" ? "Video attached" : "Image attached"}
                </p>
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={handleRemove}
                  className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-300"
                >
                  Remove
                </button>
              </div>
            ) : null}
            {previewType === "video" ? (
              <video
                src={resolvePreviewMediaUrl(previewUrl) ?? previewUrl}
                controls
                preload="metadata"
                playsInline
                className="max-h-72 w-full rounded-2xl object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvePreviewMediaUrl(previewUrl) ?? previewUrl}
                alt="Selected media preview"
                className="max-h-72 w-full object-contain"
              />
            )}
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-rose-600 dark:text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

export default MediaUploader;
