"use client";

import { FormEvent, useEffect, useState } from "react";
import { Flame, PlusCircle, Sparkles } from "lucide-react";
import MediaUploader from "@/src/components/MediaUploader";
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
}: DailySparkCardProps) {
  const prompt = getDailySparkPrompt();
  const [pulseActiveToday, setPulseActiveToday] = useState(sparkDroppedToday);

  useEffect(() => {
    setPulseActiveToday(sparkDroppedToday || hasDailySparkToday());
  }, [sparkDroppedToday, success]);

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!value.trim() && !media) || isSubmitting) {
      return;
    }
    void onSubmit();
  }

  return (
    <section className="linkup-panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
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
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            Today&apos;s prompt
          </h2>
          <p className="mt-2 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-brand-primary/30 dark:bg-brand-primary/10 dark:text-slate-200">
            {prompt}
          </p>
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleFormSubmit}>
        <label className="sr-only" htmlFor="daily-spark-input">
          Drop your spark
        </label>
        <textarea
          id="daily-spark-input"
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isSubmitting}
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 disabled:opacity-60 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50 sm:text-sm"
          placeholder="Drop your spark..."
        />
        {onMediaChange ? (
          <MediaUploader
            label="Add photo or video"
            accept="both"
            disabled={isSubmitting}
            value={media}
            onChange={onMediaChange}
          />
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your answer posts as a normal Spark — the prompt stays visible here only.
          </p>
          <button
            type="submit"
            disabled={(!value.trim() && !media) || isSubmitting}
            className="linkup-btn-primary shrink-0 min-h-[44px] w-full px-5 py-3 sm:w-auto"
          >
            <PlusCircle className="h-4 w-4" />
            {isSubmitting ? "Dropping…" : "Drop Spark"}
          </button>
        </div>
      </form>

      {success ? (
        <p className="linkup-alert-success mt-4" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="linkup-alert-error mt-4" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
