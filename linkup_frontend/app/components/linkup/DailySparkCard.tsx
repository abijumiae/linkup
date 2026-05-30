"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Flame,
  ImageIcon,
  PlusCircle,
  Sparkles,
  Video,
  CircleDot,
} from "lucide-react";
import MediaUploader, {
  type MediaUploaderHandle,
} from "@/src/components/MediaUploader";
import { UploadMediaType } from "@/src/lib/uploads";
import {
  getDailySparkPrompt,
  hasDailySparkToday,
} from "@/src/lib/linkupFeatures";

type DailySparkCardProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
  success?: string | null;
  sparkDroppedToday?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  media?: { url: string; type: UploadMediaType } | null;
  onMediaChange?: (value: { url: string; type: UploadMediaType } | null) => void;
  onDropMoment?: () => void;
};

export default function DailySparkCard({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  error,
  success,
  sparkDroppedToday = false,
  inputRef,
  media = null,
  onMediaChange,
  onDropMoment,
}: DailySparkCardProps) {
  const prompt = getDailySparkPrompt();
  const [pulseActiveToday, setPulseActiveToday] = useState(sparkDroppedToday);
  const [pollNotice, setPollNotice] = useState<string | null>(null);
  const mediaUploaderRef = useRef<MediaUploaderHandle>(null);

  useEffect(() => {
    setPulseActiveToday(sparkDroppedToday || hasDailySparkToday());
  }, [sparkDroppedToday, success]);

  useEffect(() => {
    if (!pollNotice) {
      return;
    }
    const timer = setTimeout(() => setPollNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [pollNotice]);

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!value.trim() && !media) || isSubmitting) {
      return;
    }
    void onSubmit();
  }

  const toolbarButtonClass =
    "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-primary/35 hover:bg-brand-primary/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-brand-dark/70 dark:text-slate-200 dark:hover:border-brand-secondary/40 dark:hover:bg-brand-primary/10 sm:text-sm";

  return (
    <section className="linkup-panel overflow-hidden p-0">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-brand-primary/[0.06] via-transparent to-brand-secondary/[0.06] px-5 py-4 dark:border-white/10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="linkup-eyebrow">Daily Spark</p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              pulseActiveToday
                ? "border-brand-primary/40 bg-brand-primary/10 text-brand-primary dark:text-brand-secondary"
                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-brand-dark/60 dark:text-slate-400"
            }`}
          >
            {pulseActiveToday ? (
              <Sparkles className="h-3 w-3" />
            ) : (
              <Flame className="h-3 w-3" />
            )}
            {pulseActiveToday ? "Pulse active today" : "Keep your pulse active"}
          </span>
        </div>
        <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">
          What&apos;s sparking today?
        </h2>
        <p className="mt-2 rounded-2xl border border-brand-primary/15 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-brand-primary/25 dark:bg-brand-dark/50 dark:text-slate-200">
          {prompt}
        </p>
      </div>

      <form className="space-y-4 px-5 py-5 sm:px-6" onSubmit={handleFormSubmit}>
        <label className="sr-only" htmlFor="daily-spark-input">
          Drop your spark
        </label>
        <textarea
          id="daily-spark-input"
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isSubmitting}
          className="min-h-[120px] w-full resize-none rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15 disabled:opacity-60 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-secondary/40 dark:focus:ring-brand-secondary/15 sm:text-sm"
          placeholder="Share a spark, insight, or update with your network..."
        />

        <div className="flex flex-wrap gap-2">
          {onMediaChange ? (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => mediaUploaderRef.current?.openPicker("image")}
                className={toolbarButtonClass}
              >
                <ImageIcon className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                Image
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => mediaUploaderRef.current?.openPicker("video")}
                className={toolbarButtonClass}
              >
                <Video className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
                Video
              </button>
            </>
          ) : null}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setPollNotice("Polls are coming soon — stay tuned.")}
            className={toolbarButtonClass}
          >
            <BarChart3 className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
            Poll
          </button>
          {onDropMoment ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onDropMoment}
              className={toolbarButtonClass}
            >
              <CircleDot className="h-4 w-4 text-brand-primary dark:text-brand-secondary" />
              Moment
            </button>
          ) : null}
        </div>

        {pollNotice ? (
          <p className="text-xs font-medium text-brand-primary dark:text-brand-secondary">
            {pollNotice}
          </p>
        ) : null}

        {onMediaChange ? (
          <MediaUploader
            ref={mediaUploaderRef}
            label="Add photo or video"
            accept="both"
            disabled={isSubmitting}
            value={media}
            onChange={onMediaChange}
            compact
          />
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Posts as a Spark in your feed — prompt stays here for inspiration.
          </p>
          <button
            type="submit"
            disabled={(!value.trim() && !media) || isSubmitting}
            className="linkup-btn-primary shrink-0 min-h-[44px] w-full px-6 py-3 sm:w-auto"
          >
            <PlusCircle className="h-4 w-4" />
            {isSubmitting ? "Dropping…" : "Drop Spark"}
          </button>
        </div>
      </form>

      {success ? (
        <p className="linkup-alert-success mx-5 mb-5 sm:mx-6" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="linkup-alert-error mx-5 mb-5 sm:mx-6" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
