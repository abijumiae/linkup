"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import {
  createReport,
  REPORT_CATEGORIES,
  ReportTargetType,
} from "@/src/lib/safety";

type ReportModalProps = {
  open: boolean;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function ReportModal({
  open,
  targetType,
  targetId,
  targetLabel,
  onClose,
  onSubmitted,
}: ReportModalProps) {
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createReport({
        targetType,
        targetId,
        category,
        description: description.trim() || undefined,
      });
      setSuccess(result.message ?? "Thanks. Your report has been sent.");
      onSubmitted?.();
      window.setTimeout(() => {
        onClose();
        setDescription("");
        setSuccess(null);
      }, 1400);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not submit report. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close report dialog"
        className="absolute inset-0 bg-brand-dark/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-brand-dark sm:rounded-[2rem]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0 pr-4">
            <p className="linkup-eyebrow">Report</p>
            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
              {targetLabel ?? "Report content"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {success ? (
            <p className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
              {success}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Category
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={submitting}
              className="linkup-input w-full min-h-[44px]"
            >
              {REPORT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Details (optional)
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={submitting}
              rows={4}
              maxLength={1000}
              placeholder="Tell us what happened..."
              className="linkup-input min-h-[120px] w-full resize-y"
            />
          </label>
        </div>

        <div className="border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <button
            type="submit"
            disabled={submitting}
            className="linkup-btn-primary min-h-[44px] w-full disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit report"}
          </button>
        </div>
      </form>
    </div>
  );
}
