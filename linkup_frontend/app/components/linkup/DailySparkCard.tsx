"use client";

import { PlusCircle } from "lucide-react";
import { getDailySparkPrompt } from "@/src/lib/linkupFeatures";

type DailySparkCardProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export default function DailySparkCard({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  error,
  inputRef,
}: DailySparkCardProps) {
  const prompt = getDailySparkPrompt();

  return (
    <section className="linkup-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="linkup-eyebrow">Daily Spark</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            Today&apos;s prompt
          </h2>
          <p className="mt-2 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-brand-primary/30 dark:bg-brand-primary/10 dark:text-slate-200">
            {prompt}
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isSubmitting}
          className="linkup-btn-primary shrink-0 min-h-[44px] px-5 py-3"
        >
          <PlusCircle className="h-4 w-4" />
          {isSubmitting ? "Dropping…" : "Drop Spark"}
        </button>
      </div>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-5 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50 sm:text-sm"
        placeholder={`Answer: ${prompt}`}
      />
      {error ? (
        <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>
      ) : null}
    </section>
  );
}
