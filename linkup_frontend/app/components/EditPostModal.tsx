"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Video, X } from "lucide-react";
import { ApiError, resolveMediaUrl } from "@/src/lib/api";
import { FeedPost, updatePost } from "@/src/lib/posts";
import { uploadFile, UploadMediaType, validateMediaFile } from "@/src/lib/uploads";

type EditPostModalProps = {
  open: boolean;
  post: FeedPost | null;
  onClose: () => void;
  onUpdated: (post: FeedPost) => void;
};

export default function EditPostModal({
  open,
  post,
  onClose,
  onUpdated,
}: EditPostModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: UploadMediaType;
    isNew?: boolean;
  } | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !post) {
      return;
    }

    setContent(post.content ?? "");
    setRemoveMedia(false);
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);

    if (post.videoUrl) {
      setMediaPreview({
        url: post.videoUrl,
        type: "video",
      });
      return;
    }

    if (post.imageUrl) {
      setMediaPreview({
        url: post.imageUrl,
        type: "image",
      });
      return;
    }

    setMediaPreview(null);
  }, [open, post]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isSubmitting, onClose]);

  if (!open || !post) {
    return null;
  }

  const previewSrc = mediaPreview
    ? mediaPreview.isNew
      ? mediaPreview.url
      : resolveMediaUrl(mediaPreview.url)
    : undefined;

  async function handleFileSelect(file: File) {
    setError(null);
    const validationError = validateMediaFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const isVideo = file.type.startsWith("video/");
    setIsSubmitting(true);

    try {
      const uploaded = await uploadFile(file);
      setMediaPreview({
        url: uploaded.url,
        type: uploaded.type === "video" ? "video" : "image",
        isNew: true,
      });
      setRemoveMedia(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not upload file. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemoveMedia() {
    setMediaPreview(null);
    setRemoveMedia(true);
    setError(null);
  }

  async function handleSubmit() {
    if (!post) {
      return;
    }

    const trimmed = content.trim();
    const hasMedia = Boolean(mediaPreview) && !removeMedia;

    if (!trimmed && !hasMedia) {
      setError("Post cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Parameters<typeof updatePost>[1] = {
        content: trimmed,
      };

      if (removeMedia) {
        payload.removeMedia = true;
      } else if (mediaPreview) {
        payload.mediaUrl = mediaPreview.url;
        payload.mediaType =
          mediaPreview.type === "video" ? "video" : "image";
      }

      const updated = await updatePost(post.id, payload);
      setSuccess("Post updated.");
      onUpdated(updated);
      window.setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const message = err.message.toLowerCase();
        if (
          message.includes("empty") ||
          message.includes("mediaurl") ||
          message.includes("url")
        ) {
          setError(
            message.includes("empty")
              ? "Post cannot be empty."
              : "Media URL format is invalid. Please re-upload and try again.",
          );
          return;
        }
      }
      setError("Could not update post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-white shadow-2xl dark:bg-brand-dark sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <p className="linkup-eyebrow">Edit Spark</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              Update post
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Caption
            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                if (error) setError(null);
              }}
              rows={4}
              maxLength={2000}
              placeholder="What's on your mind?"
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-brand-primary/30 transition focus:border-brand-primary focus:ring-2 dark:border-white/10 dark:bg-brand-dark/60 dark:text-white"
            />
          </label>

          {previewSrc ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
              {mediaPreview?.type === "video" ? (
                <video
                  src={previewSrc}
                  controls
                  className="max-h-64 w-full bg-slate-100 object-contain dark:bg-brand-dark/60"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt="Post media preview"
                  className="max-h-64 w-full object-contain bg-slate-100 dark:bg-brand-dark/60"
                />
              )}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-primary/30 hover:bg-brand-primary/5 disabled:opacity-60 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-200"
            >
              <ImagePlus className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
              Replace media
            </button>
            {previewSrc ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRemoveMedia}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-500/15 disabled:opacity-60 dark:text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
                Remove media
              </button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            className="hidden"
            disabled={isSubmitting}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFileSelect(file);
              }
            }}
          />

          {error ? (
            <p className="mt-4 text-sm text-rose-600 dark:text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-4 text-sm text-brand-primary dark:text-brand-secondary">
              {success}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="linkup-btn-secondary min-h-[44px] flex-1 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="linkup-btn-primary min-h-[44px] flex-1 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
