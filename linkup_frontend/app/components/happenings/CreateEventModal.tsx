"use client";

import { FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import MediaUploader from "@/src/components/MediaUploader";
import { UploadMediaType } from "@/src/lib/uploads";
import { createEvent, Event } from "@/src/lib/events";
import {
  appendTagsToDescription,
  HAPPENINGS_CATEGORIES,
} from "@/src/lib/happeningsConstants";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-primary/50";

type CreateEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: Event) => void;
};

export default function CreateEventModal({
  isOpen,
  onClose,
  onCreated,
}: CreateEventModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [coverImage, setCoverImage] = useState<{
    url: string;
    type: UploadMediaType;
  } | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    category: "Online" as string,
    tags: "",
    privacy: "public",
  });

  if (!isOpen) {
    return null;
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const location = isOnline
        ? "Online"
        : form.location.trim() || "TBD";

      const created = await createEvent({
        title: form.title.trim(),
        description: appendTagsToDescription(
          form.description.trim(),
          form.tags,
        ),
        location,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate
          ? new Date(form.endDate).toISOString()
          : undefined,
        category: form.category.trim() || undefined,
        imageUrl: coverImage?.url,
      });

      onCreated(created);
      setForm({
        title: "",
        description: "",
        location: "",
        startDate: "",
        endDate: "",
        category: "Online",
        tags: "",
        privacy: "public",
      });
      setCoverImage(null);
      setIsOnline(true);
      onClose();
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Creating events is getting ready.",
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
            <p className="linkup-eyebrow">Happenings</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              Create Event
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Event title"
            className={inputClass}
          />
          <textarea
            required
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={4}
            placeholder="Description"
            className={`${inputClass} resize-none`}
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
          >
            {HAPPENINGS_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              type="datetime-local"
              value={form.startDate}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
              className={inputClass}
            />
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200/90 px-4 py-3 dark:border-white/10">
            <input
              type="checkbox"
              checked={isOnline}
              onChange={(e) => setIsOnline(e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Online event
            </span>
          </label>
          {!isOnline ? (
            <input
              required
              value={form.location}
              onChange={(e) =>
                setForm({ ...form, location: e.target.value })
              }
              placeholder="Location"
              className={inputClass}
            />
          ) : null}
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="Tags (comma separated)"
            className={inputClass}
          />
          <MediaUploader
            label="Cover image"
            accept="image"
            disabled={isCreating}
            value={coverImage}
            onChange={setCoverImage}
          />
          <select
            value={form.privacy}
            onChange={(e) => setForm({ ...form, privacy: e.target.value })}
            className={inputClass}
          >
            <option value="public">Public</option>
            <option value="community">Community only</option>
            <option value="private">Private invite</option>
          </select>
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
            {isCreating ? "Creating…" : "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
}
