"use client";

import { FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { createJob, Job } from "@/src/lib/jobs";
import { WORK_TYPES } from "@/src/lib/workConstants";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50";

type PostWorkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (job: Job) => void;
};

export default function PostWorkModal({
  isOpen,
  onClose,
  onCreated,
}: PostWorkModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isRemote, setIsRemote] = useState(false);
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    location: "",
    jobType: "Full-time" as string,
    salary: "",
    skills: "",
    applyInstructions: "",
  });

  if (!isOpen) {
    return null;
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const location = isRemote ? "Remote" : form.location.trim() || "Remote";
      const created = await createJob({
        title: form.title.trim(),
        company: form.company.trim(),
        description: form.description.trim(),
        location,
        jobType: form.jobType.trim() || undefined,
        salary: form.salary.trim() || undefined,
        requirements: form.skills.trim() || undefined,
        contactEmail: form.applyInstructions.includes("@")
          ? form.applyInstructions.trim()
          : undefined,
      });

      onCreated(created);
      setForm({
        title: "",
        company: "",
        description: "",
        location: "",
        jobType: "Full-time",
        salary: "",
        skills: "",
        applyInstructions: "",
      });
      setIsRemote(false);
      onClose();
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Posting work is getting ready.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-brand-dark/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="my-8 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="linkup-eyebrow">Work</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              Post Work
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Share a role, project, or collaboration opportunity.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Title
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Role or project title"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Company / project name
            </span>
            <input
              required
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company, creator, or project"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Description
            </span>
            <textarea
              required
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={4}
              placeholder="What you're looking for and what you'll work on"
              className={`${inputClass} resize-none`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Work type
              </span>
              <select
                value={form.jobType}
                onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                className={inputClass}
              >
                {WORK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Salary / budget
              </span>
              <input
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                placeholder="e.g. $80k or $500/project"
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200/90 px-4 py-3 dark:border-white/10">
            <input
              type="checkbox"
              checked={isRemote}
              onChange={(e) => setIsRemote(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-primary"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Remote opportunity
            </span>
          </label>

          {!isRemote ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Location
              </span>
              <input
                required={!isRemote}
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                placeholder="City, country, or region"
                className={inputClass}
              />
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Skills / tags
            </span>
            <input
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="React, Design, Marketing"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Contact / apply instructions
            </span>
            <textarea
              value={form.applyInstructions}
              onChange={(e) =>
                setForm({ ...form, applyInstructions: e.target.value })
              }
              rows={2}
              placeholder="How to apply or contact email"
              className={`${inputClass} resize-none`}
            />
          </label>

          {createError ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              {createError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isCreating}
            className="linkup-btn-primary flex w-full min-h-[44px] items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? "Posting…" : "Post Work"}
          </button>
        </form>
      </div>
    </div>
  );
}
