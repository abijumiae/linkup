"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { applyToJob } from "@/src/lib/jobs";

type JobApplyModalProps = {
  jobId: string;
  onClose: () => void;
  onApplied: (jobId: string) => void;
  onApplyingChange?: (jobId: string | null) => void;
};

export default function JobApplyModal({
  jobId,
  onClose,
  onApplied,
  onApplyingChange,
}: JobApplyModalProps) {
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    onApplyingChange?.(jobId);

    try {
      await applyToJob(jobId, {
        coverLetter: coverLetter.trim() || undefined,
        resumeUrl: resumeUrl.trim() || undefined,
      });
      onApplied(jobId);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to submit application.",
      );
      onApplyingChange?.(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-brand-dark/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="my-8 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark sm:rounded-[2rem]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Apply</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Cover letter (optional)
            </span>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={5}
              placeholder="Tell the employer why you're a great fit"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Resume URL (optional)
            </span>
            <input
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              type="url"
              placeholder="https://example.com/resume.pdf"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 transition hover:from-brand-primary-hover hover:to-brand-secondary-hover disabled:opacity-50"
          >
            {isSubmitting ? "Applying…" : "Apply"}
          </button>
        </form>
      </div>
    </div>
  );
}
