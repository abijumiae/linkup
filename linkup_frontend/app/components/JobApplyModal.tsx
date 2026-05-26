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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Apply to job</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={5}
            placeholder="Cover letter (optional)"
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
          />
          <input
            value={resumeUrl}
            onChange={(e) => setResumeUrl(e.target.value)}
            placeholder="Resume URL (optional)"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400/60 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/50"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-violet-500 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting…" : "Submit application"}
          </button>
        </form>
      </div>
    </div>
  );
}
